import type {
  PromptBlockAiOperation,
  PromptBlockFamily,
  PromptBlockFlowType,
  PromptBlockKind,
  PromptBlockNodeDefinition,
} from "../types/domain";

export interface PromptBlockPortDefinition {
  id: string;
  label: string;
  flowType: PromptBlockFlowType;
  direction: "input" | "output";
  required?: boolean;
  multiple?: boolean;
}

export interface PromptBlockCatalogEntry {
  kind: PromptBlockKind;
  family: PromptBlockFamily;
  label: string;
  description: string;
  aiOperation?: PromptBlockAiOperation;
  ports: PromptBlockPortDefinition[];
}

const contentIn = (id = "input", label = "Prompt / text", required = true): PromptBlockPortDefinition => ({ id, label, flowType: "content", direction: "input", required });
const contentOut = (id = "output", label = "Prompt / text"): PromptBlockPortDefinition => ({ id, label, flowType: "content", direction: "output" });
const constraintIn = (): PromptBlockPortDefinition => ({ id: "constraint", label: "Constraints", flowType: "constraint", direction: "input", multiple: true });
const constraintOut = (): PromptBlockPortDefinition => ({ id: "constraint-output", label: "Constraint", flowType: "constraint", direction: "output" });

export const PROMPT_BLOCK_CATALOG: Record<PromptBlockKind, PromptBlockCatalogEntry> = {
  "system-prompt": {
    kind: "system-prompt", family: "input", label: "System Prompt", description: "Reference an existing EurekaVault Prompt, following current state or pinning a historical version.", ports: [contentOut()],
  },
  "direct-input": {
    kind: "direct-input", family: "input", label: "Direct Input", description: "Supply ad-hoc Prompt, context, topic, or other text directly to the pipeline.", ports: [contentOut()],
  },
  "context-free": {
    kind: "context-free", family: "transform", label: "Context Free", description: "Remove current specialization while preserving reusable structure with meaningful placeholders.", aiOperation: "context-free", ports: [contentIn(), constraintIn(), contentOut()],
  },
  "extract-context": {
    kind: "extract-context", family: "transform", label: "Extract Context", description: "Extract contextual specialization while excluding reusable methodology.", aiOperation: "extract-context", ports: [contentIn(), constraintIn(), contentOut("output", "Context")],
  },
  "fill-context": {
    kind: "fill-context", family: "transform", label: "Fill Context", description: "Apply a replacement context to a context-free or parameterized Prompt.", aiOperation: "fill-context", ports: [contentIn("prompt", "Prompt / template"), contentIn("context", "Replacement context"), constraintIn(), contentOut()],
  },
  "less-detailed": {
    kind: "less-detailed", family: "transform", label: "Less Detailed", description: "Reduce detail without losing requirements that materially affect meaning.", aiOperation: "less-detailed", ports: [contentIn(), constraintIn(), contentOut()],
  },
  "more-detailed": {
    kind: "more-detailed", family: "transform", label: "More Detailed", description: "Expand clarity and operational detail without inventing unrelated goals.", aiOperation: "more-detailed", ports: [contentIn(), constraintIn(), contentOut()],
  },
  "without-markdown": {
    kind: "without-markdown", family: "transform", label: "Without Markdown", description: "Convert structure into paragraph-style prose while preserving semantics.", aiOperation: "without-markdown", ports: [contentIn(), constraintIn(), contentOut()],
  },
  "with-markdown": {
    kind: "with-markdown", family: "transform", label: "With Markdown", description: "Organize unstructured prose into clear Markdown without changing intent.", aiOperation: "with-markdown", ports: [contentIn(), constraintIn(), contentOut()],
  },
  "addition": {
    kind: "addition", family: "transform", label: "Addition", description: "Semantically integrate new material into the most appropriate place in an existing Prompt.", aiOperation: "addition", ports: [contentIn("prompt", "Base Prompt"), contentIn("addition", "Material to add"), constraintIn(), contentOut()],
  },
  "subtraction": {
    kind: "subtraction", family: "transform", label: "Subtraction", description: "Semantically remove requested material while minimizing collateral change.", aiOperation: "subtraction", ports: [contentIn("prompt", "Base Prompt"), contentIn("subtraction", "Material to remove"), constraintIn(), contentOut()],
  },
  "extract-style": {
    kind: "extract-style", family: "transform", label: "Extract Style", description: "Extract a reusable style constraint instead of ordinary Prompt content.", aiOperation: "extract-style", ports: [contentIn(), constraintIn(), constraintOut()],
  },
  "mindset-constraint": {
    kind: "mindset-constraint", family: "constraint", label: "Mindset Constraint", description: "Reference an existing EurekaVault Mindset as a governing transformation constraint.", ports: [constraintOut()],
  },
  "extracted-style-constraint": {
    kind: "extracted-style-constraint", family: "constraint", label: "Extracted Style Constraint", description: "Pass an Extract Style result through an explicit constraint block for reusable graph clarity.", ports: [{ id: "constraint", label: "Extracted style", flowType: "constraint", direction: "input", required: true }, constraintOut()],
  },
  "as-is": {
    kind: "as-is", family: "output", label: "As Is", description: "Expose the upstream result exactly as produced, with no additional AI call.", ports: [contentIn()],
  },
  "summarized": {
    kind: "summarized", family: "output", label: "Summarized", description: "Produce a condensed representation of the upstream result.", aiOperation: "summarized", ports: [contentIn()],
  },
  "conclusion-only": {
    kind: "conclusion-only", family: "output", label: "Conclusion Only", description: "Expose only the conclusion, decision, recommendation, or final answer supported by the upstream result.", aiOperation: "conclusion-only", ports: [contentIn()],
  },
};

export const PROMPT_BLOCK_GROUPS: Array<{ family: PromptBlockFamily; label: string; kinds: PromptBlockKind[] }> = [
  { family: "input", label: "Input", kinds: ["system-prompt", "direct-input"] },
  { family: "transform", label: "Transforms", kinds: ["context-free", "extract-context", "fill-context", "less-detailed", "more-detailed", "without-markdown", "with-markdown", "addition", "subtraction", "extract-style"] },
  { family: "constraint", label: "Constraints", kinds: ["mindset-constraint", "extracted-style-constraint"] },
  { family: "output", label: "Output", kinds: ["as-is", "summarized", "conclusion-only"] },
];

export function blockPorts(kind: PromptBlockKind, direction?: "input" | "output") {
  const ports = PROMPT_BLOCK_CATALOG[kind].ports;
  return direction ? ports.filter((port) => port.direction === direction) : ports;
}

export function blockPort(kind: PromptBlockKind, portId: string) {
  return PROMPT_BLOCK_CATALOG[kind].ports.find((port) => port.id === portId);
}

export function createPromptBlock(kind: PromptBlockKind, index: number): PromptBlockNodeDefinition {
  const entry = PROMPT_BLOCK_CATALOG[kind];
  const alphabet = "XYZABCDEFGHIJKLMNOPQRSTUVW";
  const variableLabel = alphabet[index % alphabet.length] || `V${index + 1}`;
  return {
    id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    family: entry.family,
    kind,
    label: entry.label,
    variableLabel,
    position: { x: 80 + (index % 4) * 260, y: 80 + Math.floor(index / 4) * 190 },
    config: kind === "system-prompt" ? { promptReferenceMode: "current" } : {},
  };
}

export function isAiBlock(kind: PromptBlockKind): boolean {
  return Boolean(PROMPT_BLOCK_CATALOG[kind].aiOperation);
}
