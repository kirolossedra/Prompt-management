import { executePromptBlockOperation, type PromptBlockExecuteRequest, type PromptBlockExecuteResponse } from "../ai/promptBlocks";
import { PROMPT_BLOCK_CATALOG, blockPorts } from "./catalog";
import { validatePipelineGraph, validatePipelineReferences } from "./graph";
import { promptVersionSnapshot } from "../lib/utils";
import type {
  PromptBlockConnection,
  PromptBlockConstraintValue,
  PromptBlockNodeDefinition,
  PromptBlockRunNodeState,
  PromptBlockRunState,
  PromptBlockRuntimeValue,
  VaultCollections,
} from "../types/domain";

export type PromptBlockExecutor = (request: PromptBlockExecuteRequest) => Promise<PromptBlockExecuteResponse>;

export interface RunPromptBlockPipelineOptions {
  blocks: Record<string, PromptBlockNodeDefinition>;
  connections: Record<string, PromptBlockConnection>;
  vault: VaultCollections;
  uid: string;
  idToken: string;
  pipelineId?: string;
  onNodeState?: (blockId: string, state: PromptBlockRunNodeState) => void;
  executor?: PromptBlockExecutor;
}

function completed(output: PromptBlockRuntimeValue, model?: string): PromptBlockRunNodeState {
  const now = Date.now();
  return { status: "completed", startedAt: now, completedAt: now, output, model };
}

function contentValue(text: string): PromptBlockRuntimeValue {
  return { flowType: "content", text };
}

function constraintValue(constraint: PromptBlockConstraintValue): PromptBlockRuntimeValue {
  return { flowType: "constraint", constraint };
}

function upstreamConnectionValues(
  blockId: string,
  connections: Record<string, PromptBlockConnection>,
  states: Record<string, PromptBlockRunNodeState>,
) {
  return Object.values(connections)
    .filter((connection) => connection.targetBlockId === blockId)
    .map((connection) => ({ connection, state: states[connection.sourceBlockId] }))
    .filter(({ state }) => Boolean(state));
}

function resolveSystemPrompt(block: PromptBlockNodeDefinition, vault: VaultCollections): string {
  const promptId = block.config.promptId || "";
  const prompt = vault.prompts[promptId];
  if (!prompt) throw new Error("The referenced Prompt no longer exists.");
  if (prompt.archivedAt) throw new Error(`The referenced Prompt “${prompt.title}” is archived. Restore it or select another source.`);
  if (block.config.promptReferenceMode === "pinned") {
    const version = vault.promptVersions[block.config.promptVersionId || ""];
    if (!version || version.promptId !== prompt.id) throw new Error("The pinned Prompt Version no longer exists for this Prompt.");
    if (version.archivedAt) throw new Error("The pinned Prompt Version is archived.");
    return promptVersionSnapshot(version).content;
  }
  return prompt.content;
}

function resolveMindset(block: PromptBlockNodeDefinition, vault: VaultCollections): PromptBlockConstraintValue {
  const mindset = vault.mindsets[block.config.mindsetId || ""];
  if (!mindset) throw new Error("The referenced Mindset no longer exists.");
  if (mindset.archivedAt) throw new Error(`The referenced Mindset “${mindset.title}” is archived. Restore it or select another constraint.`);
  return { label: mindset.title, content: mindset.content || mindset.manualAiGeneratedMindset || "", sourceType: "mindset", sourceId: mindset.id };
}

export async function runPromptBlockPipeline(options: RunPromptBlockPipelineOptions): Promise<PromptBlockRunState> {
  const { blocks, connections, vault, uid, idToken, pipelineId, onNodeState } = options;
  const executor = options.executor || executePromptBlockOperation;
  const validation = validatePipelineGraph(blocks, connections);
  const referenceErrors = validatePipelineReferences(blocks, vault);
  const transformationErrors = Object.values(blocks).flatMap((block) => {
    const operation = PROMPT_BLOCK_CATALOG[block.kind].aiOperation;
    if (!operation) return [];
    const configured = vault.promptBlockTransformPrompts[operation];
    return configured?.content?.trim() ? [] : [`${block.variableLabel} · ${block.label} has no initialized transformation prompt.`];
  });
  const preflightErrors = [...validation.errors, ...referenceErrors, ...transformationErrors];
  if (preflightErrors.length) throw new Error([...new Set(preflightErrors)].join("\n"));
  const run: PromptBlockRunState = { startedAt: Date.now(), pipelineId, nodeStates: {} };

  const setState = (blockId: string, state: PromptBlockRunNodeState) => {
    run.nodeStates[blockId] = state;
    onNodeState?.(blockId, state);
  };

  for (const blockId of validation.order) {
    const block = blocks[blockId];
    if (!block) continue;
    const incoming = upstreamConnectionValues(blockId, connections, run.nodeStates);
    const failedDependency = incoming.find(({ state }) => state.status === "failed" || state.status === "blocked");
    if (failedDependency) {
      setState(blockId, { status: "blocked", error: "A required upstream block did not complete successfully." });
      continue;
    }

    try {
      setState(blockId, { status: "running", startedAt: Date.now() });
      if (block.kind === "system-prompt") {
        setState(blockId, completed(contentValue(resolveSystemPrompt(block, vault))));
        continue;
      }
      if (block.kind === "direct-input") {
        const text = block.config.directText?.trim() || "";
        if (!text) throw new Error("Direct Input is empty.");
        setState(blockId, completed(contentValue(text)));
        continue;
      }
      if (block.kind === "mindset-constraint") {
        setState(blockId, completed(constraintValue(resolveMindset(block, vault))));
        continue;
      }
      if (block.kind === "extracted-style-constraint") {
        const source = incoming.find(({ connection }) => connection.targetPortId === "constraint")?.state.output?.constraint;
        if (!source) throw new Error("Extracted Style Constraint has no style constraint input.");
        setState(blockId, completed(constraintValue(source)));
        continue;
      }
      if (block.kind === "as-is") {
        const source = incoming.find(({ connection }) => connection.targetPortId === "input")?.state.output?.text;
        if (!source) throw new Error("As Is has no upstream content.");
        setState(blockId, completed(contentValue(source)));
        continue;
      }

      const catalog = PROMPT_BLOCK_CATALOG[block.kind];
      const operation = catalog.aiOperation;
      if (!operation) throw new Error(`Block ${catalog.label} has no execution operation.`);
      const transformationPrompt = vault.promptBlockTransformPrompts[operation];
      if (!transformationPrompt?.content?.trim()) throw new Error(`The editable transformation prompt for ${catalog.label} is missing.`);

      const inputPorts = blockPorts(block.kind, "input").filter((port) => port.flowType === "content");
      const inputs = inputPorts.map((port) => {
        const source = incoming.find(({ connection }) => connection.targetPortId === port.id)?.state.output?.text;
        if (port.required && !source) throw new Error(`${catalog.label} is missing ${port.label}.`);
        return { role: port.label, value: source || "" };
      }).filter((item) => item.value.trim());

      const constraints = incoming
        .filter(({ connection, state }) => connection.flowType === "constraint" && state.output?.constraint)
        .map(({ connection, state }) => ({ ...state.output!.constraint!, priority: Number(connection.priority || 1) }))
        .sort((a, b) => a.priority - b.priority);

      const response = await executor({ uid, idToken, operation, transformationPrompt: transformationPrompt.content, inputs, constraints });
      const output = operation === "extract-style"
        ? constraintValue({ label: `${block.variableLabel} · Extracted style`, content: response.output, sourceType: "extracted-style", sourceId: block.id })
        : contentValue(response.output);
      setState(blockId, { status: "completed", startedAt: run.nodeStates[blockId]?.startedAt, completedAt: Date.now(), output, model: response.model });
    } catch (error) {
      setState(blockId, {
        status: "failed",
        startedAt: run.nodeStates[blockId]?.startedAt,
        completedAt: Date.now(),
        error: error instanceof Error ? error.message : "This block failed.",
      });
    }
  }

  run.completedAt = Date.now();
  return run;
}
