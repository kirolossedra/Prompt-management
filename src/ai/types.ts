export interface PromptRelationshipPeer {
  promptId: string;
  title: string;
  task: string;
  endeavor: string;
}

export interface PromptRelationshipContext {
  inspiredBy: PromptRelationshipPeer[];
  inspires: PromptRelationshipPeer[];
}

export interface SearchablePrompt {
  id: string;
  title: string;
  description: string;
  purpose: string;
  content: string;
  task: string;
  endeavor: string;
  relationships: PromptRelationshipContext;
}

export interface PromptFinderMatch {
  promptId: string;
  score: number;
  reason: string;
}

export interface PromptFinderResponse {
  matches: PromptFinderMatch[];
  provider: "gemini";
  model: string;
  corpusSize: number;
}

export interface PromptFinderRequest {
  query: string;
  prompts: SearchablePrompt[];
  uid: string;
}

export interface RepurposePromptSource {
  id: string;
  title: string;
  description: string;
  purpose: string;
  content: string;
  task: string;
  endeavor: string;
}

export interface RepurposedPromptDraft {
  title: string;
  description: string;
  purpose: string;
  content: string;
}

export interface PromptRepurposeRequest {
  uid: string;
  goal: string;
  prompt: RepurposePromptSource;
}

export interface PromptRepurposeResponse {
  draft: RepurposedPromptDraft;
  provider: "gemini";
  model: string;
  sourcePromptId: string;
}
