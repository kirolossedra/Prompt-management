import { blockPort, blockPorts } from "./catalog";
import type { PromptBlockConnection, PromptBlockNodeDefinition, VaultCollections } from "../types/domain";

export interface PipelineGraphValidation {
  valid: boolean;
  errors: string[];
  order: string[];
}

export function wouldCreateCycle(blocks: Record<string, PromptBlockNodeDefinition>, connections: Record<string, PromptBlockConnection>, sourceBlockId: string, targetBlockId: string): boolean {
  if (sourceBlockId === targetBlockId) return true;
  const adjacency = new Map<string, string[]>();
  Object.keys(blocks).forEach((id) => adjacency.set(id, []));
  Object.values(connections).forEach((connection) => adjacency.get(connection.sourceBlockId)?.push(connection.targetBlockId));
  adjacency.get(sourceBlockId)?.push(targetBlockId);
  const seen = new Set<string>();
  const stack = [targetBlockId];
  while (stack.length) {
    const current = stack.pop()!;
    if (current === sourceBlockId) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    (adjacency.get(current) || []).forEach((next) => stack.push(next));
  }
  return false;
}

export function validateConnection(
  blocks: Record<string, PromptBlockNodeDefinition>,
  connections: Record<string, PromptBlockConnection>,
  sourceBlockId: string,
  sourcePortId: string,
  targetBlockId: string,
  targetPortId: string,
): string | null {
  const source = blocks[sourceBlockId];
  const target = blocks[targetBlockId];
  if (!source || !target) return "Both connection endpoints must still exist.";
  const sourcePort = blockPort(source.kind, sourcePortId);
  const targetPort = blockPort(target.kind, targetPortId);
  if (!sourcePort || sourcePort.direction !== "output") return "Choose an output port as the source.";
  if (!targetPort || targetPort.direction !== "input") return "Choose an input port as the destination.";
  if (sourcePort.flowType !== targetPort.flowType) return `A ${sourcePort.flowType} output cannot connect to a ${targetPort.flowType} input.`;
  if (Object.values(connections).some((connection) => connection.sourceBlockId === sourceBlockId && connection.sourcePortId === sourcePortId && connection.targetBlockId === targetBlockId && connection.targetPortId === targetPortId)) return "That connection already exists.";
  if (!targetPort.multiple && Object.values(connections).some((connection) => connection.targetBlockId === targetBlockId && connection.targetPortId === targetPortId)) return `${targetPort.label} accepts only one upstream connection.`;
  if (wouldCreateCycle(blocks, connections, sourceBlockId, targetBlockId)) return "Prompt Blocks v1 uses a directed acyclic graph. This connection would create a cycle.";
  return null;
}

export function topologicalOrder(blocks: Record<string, PromptBlockNodeDefinition>, connections: Record<string, PromptBlockConnection>): string[] {
  const indegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  Object.keys(blocks).forEach((id) => { indegree.set(id, 0); adjacency.set(id, []); });
  Object.values(connections).forEach((connection) => {
    if (!blocks[connection.sourceBlockId] || !blocks[connection.targetBlockId]) return;
    adjacency.get(connection.sourceBlockId)?.push(connection.targetBlockId);
    indegree.set(connection.targetBlockId, (indegree.get(connection.targetBlockId) || 0) + 1);
  });
  const queue = [...indegree.entries()].filter(([, degree]) => degree === 0).map(([id]) => id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    (adjacency.get(id) || []).forEach((next) => {
      const degree = (indegree.get(next) || 0) - 1;
      indegree.set(next, degree);
      if (degree === 0) queue.push(next);
    });
  }
  return order;
}

export function validatePipelineGraph(blocks: Record<string, PromptBlockNodeDefinition>, connections: Record<string, PromptBlockConnection>): PipelineGraphValidation {
  const errors: string[] = [];
  if (!Object.keys(blocks).length) errors.push("Add at least one block before running the pipeline.");
  const order = topologicalOrder(blocks, connections);
  if (order.length !== Object.keys(blocks).length) errors.push("The pipeline contains a circular dependency and cannot run.");
  Object.values(connections).forEach((connection) => {
    const source = blocks[connection.sourceBlockId];
    const target = blocks[connection.targetBlockId];
    if (!source || !target) { errors.push(`Connection ${connection.id} references a missing block.`); return; }
    const sourcePort = blockPort(source.kind, connection.sourcePortId);
    const targetPort = blockPort(target.kind, connection.targetPortId);
    if (!sourcePort || sourcePort.direction !== "output" || !targetPort || targetPort.direction !== "input") errors.push(`Connection ${connection.id} references an invalid port.`);
    else if (sourcePort.flowType !== connection.flowType || targetPort.flowType !== connection.flowType) errors.push(`Connection ${connection.id} has an incompatible flow type.`);
  });
  Object.values(blocks).forEach((block) => {
    blockPorts(block.kind, "input").filter((port) => port.required).forEach((port) => {
      const count = Object.values(connections).filter((connection) => connection.targetBlockId === block.id && connection.targetPortId === port.id).length;
      if (!count) errors.push(`${block.variableLabel} · ${block.label} requires ${port.label}.`);
      if (!port.multiple && count > 1) errors.push(`${block.variableLabel} · ${block.label} has too many connections on ${port.label}.`);
    });
    if (block.kind === "system-prompt" && !block.config.promptId) errors.push(`${block.variableLabel} · System Prompt needs a vault Prompt selection.`);
    if (block.kind === "system-prompt" && block.config.promptReferenceMode === "pinned" && !block.config.promptVersionId) errors.push(`${block.variableLabel} · System Prompt is pinned but no Prompt Version is selected.`);
    if (block.kind === "direct-input" && !block.config.directText?.trim()) errors.push(`${block.variableLabel} · Direct Input cannot be empty.`);
    if (block.kind === "mindset-constraint" && !block.config.mindsetId) errors.push(`${block.variableLabel} · Mindset Constraint needs a Mindset selection.`);
  });
  const prioritiesByTarget = new Map<string, Set<number>>();
  Object.values(connections).filter((connection) => connection.flowType === "constraint").forEach((connection) => {
    const priority = Number(connection.priority || 0);
    if (!Number.isInteger(priority) || priority < 1) errors.push(`Constraint connection ${connection.id} needs a positive integer priority.`);
    const key = connection.targetBlockId;
    const set = prioritiesByTarget.get(key) || new Set<number>();
    if (priority > 0 && set.has(priority)) errors.push(`Constraints entering ${blocks[key]?.variableLabel || key} share priority ${priority}. Each priority must be explicit and unique.`);
    if (priority > 0) set.add(priority);
    prioritiesByTarget.set(key, set);
  });
  return { valid: errors.length === 0, errors: [...new Set(errors)], order };
}


export function validatePipelineReferences(
  blocks: Record<string, PromptBlockNodeDefinition>,
  vault: VaultCollections,
): string[] {
  const errors: string[] = [];
  Object.values(blocks).forEach((block) => {
    if (block.kind === "system-prompt") {
      const promptId = block.config.promptId || "";
      const prompt = vault.prompts[promptId];
      if (!prompt) {
        errors.push(`${block.variableLabel} · System Prompt references a Prompt that no longer exists.`);
        return;
      }
      if (prompt.archivedAt) errors.push(`${block.variableLabel} · System Prompt references archived Prompt “${prompt.title}”.`);
      if (block.config.promptReferenceMode === "pinned") {
        const versionId = block.config.promptVersionId || "";
        const version = vault.promptVersions[versionId];
        if (!version || version.promptId !== promptId) errors.push(`${block.variableLabel} · System Prompt references an invalid pinned Prompt Version.`);
        else if (version.archivedAt) errors.push(`${block.variableLabel} · System Prompt references an archived pinned Prompt Version.`);
      }
    }
    if (block.kind === "mindset-constraint") {
      const mindset = vault.mindsets[block.config.mindsetId || ""];
      if (!mindset) errors.push(`${block.variableLabel} · Mindset Constraint references a Mindset that no longer exists.`);
      else if (mindset.archivedAt) errors.push(`${block.variableLabel} · Mindset Constraint references archived Mindset “${mindset.title}”.`);
    }
  });
  return [...new Set(errors)];
}

export function nextConstraintPriority(connections: Record<string, PromptBlockConnection>, targetBlockId: string): number {
  const used = Object.values(connections).filter((connection) => connection.targetBlockId === targetBlockId && connection.flowType === "constraint").map((connection) => Number(connection.priority || 0));
  return used.length ? Math.max(...used) + 1 : 1;
}
