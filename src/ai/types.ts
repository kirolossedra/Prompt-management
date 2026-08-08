export interface SearchablePrompt {
  id: string;
  title: string;
  description: string;
  purpose: string;
  content: string;
  task: string;
  endeavor: string;
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
