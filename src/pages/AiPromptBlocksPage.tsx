import { Boxes } from "lucide-react";
import { PromptBlocksWorkspace } from "../components/prompt-blocks/PromptBlocksWorkspace";

export function AiPromptBlocksPage() {
  return <div className="ai-prompt-blocks-page">
    <header className="workspace-heading workspace-heading--compact pb-page-heading"><div><span className="eyebrow">AI · Visual Prompt transformation</span><h1>Prompt Blocks</h1><p>Simulink for Prompts: build deterministic, reusable transformation graphs with typed Prompt flow, typed Constraints, explicit priority, inspectable intermediate values, branching outputs, and database-controlled transformation behavior.</p></div><div className="ai-finder-provider"><Boxes size={15} /><span>Prompt Blocks</span><small>DAG execution · Gemini per AI block · Firebase definitions</small></div></header>
    <PromptBlocksWorkspace />
  </div>;
}
