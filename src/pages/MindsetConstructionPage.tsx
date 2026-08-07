import { useMemo, useState } from "react";
import { BrainCircuit, Check, FileCode2, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useVault } from "../context/VaultContext";
import { activeRecords, matchesPromptWords, taskPath } from "../lib/utils";
import type { Mindset, Prompt, RecordInput } from "../types/domain";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { FormField } from "../components/ui/FormField";
import { PageHeader } from "../components/ui/PageHeader";

function assemblePersona(title: string, prompts: Prompt[]): string {
  const header = [
    `# ${title || "Constructed Persona"}`,
    "",
    "This mindset was manually constructed from selected prompts. No AI model generated or interpreted this content.",
    "",
  ];
  const sections = prompts.flatMap((prompt, index) => [
    `## Source ${index + 1}: ${prompt.title}`,
    "",
    `Purpose: ${prompt.purpose}`,
    "",
    `High-level role: ${prompt.description}`,
    "",
    "Prompt instructions:",
    prompt.content,
    "",
  ]);
  return [...header, ...sections].join("\n").trim();
}

export function MindsetConstructionPage() {
  const { data, createRecord } = useVault();
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const prompts = useMemo(() => {
    const versions = Object.values(data.promptVersions);
    return activeRecords(data.prompts).filter((prompt) =>
      matchesPromptWords(prompt, versions.filter((version) => version.promptId === prompt.id), query),
    );
  }, [data.promptVersions, data.prompts, query]);

  const selectedPrompts = selectedIds
    .map((id) => data.prompts[id])
    .filter((prompt): prompt is Prompt => Boolean(prompt));

  function toggle(promptId: string) {
    setSelectedIds((current) => current.includes(promptId)
      ? current.filter((id) => id !== promptId)
      : [...current, promptId]);
  }

  function construct() {
    if (!selectedPrompts.length) {
      toast.error("Select at least one prompt.");
      return;
    }
    const nextTitle = title.trim() || `Persona from ${selectedPrompts.length} prompts`;
    setTitle(nextTitle);
    setContent(assemblePersona(nextTitle, selectedPrompts));
    toast.success("Mindset draft assembled from the selected prompts.");
  }

  async function save() {
    if (!selectedPrompts.length) {
      toast.error("Select at least one prompt.");
      return;
    }
    if (!title.trim()) {
      toast.error("Mindset title is required.");
      return;
    }
    if (!content.trim()) {
      toast.error("Construct or enter the mindset content first.");
      return;
    }
    setSaving(true);
    try {
      const input: RecordInput<Mindset> = {
        title: title.trim(),
        content: content.trim(),
        scopeType: "global",
        scopeId: "",
        manualAiGeneratedMindset: "",
        sourcePromptIds: selectedIds,
        constructionMethod: "prompt-selection",
      };
      await createRecord<Mindset>("mindsets", input);
      toast.success("Constructed mindset saved.");
      setSelectedIds([]);
      setTitle("");
      setContent("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The mindset could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return <>
    <PageHeader
      eyebrow="Manual persona assembly"
      title="Mindset construction"
      description="Select prompts from anywhere in the vault, assemble their methodology into one editable persona-style mindset, then save it as a normal CRUD mindset."
      actions={<Button variant="primary" icon={<Sparkles size={17} />} onClick={construct}>Construct from selection</Button>}
    />
    <div className="inline-callout page-callout"><strong>No AI is used.</strong><span>The application deterministically combines the selected prompt text. You can fully edit the result before saving.</span></div>
    <div className="construction-layout">
      <Card className="construction-picker">
        <div className="card-header"><div><span>Source prompts</span><h2>Select prompts</h2><p>{selectedIds.length} selected</p></div><Badge tone="info">Vault-wide</Badge></div>
        <label className="search-field construction-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search prompt words…" /></label>
        {prompts.length ? <div className="prompt-selection-list">{prompts.map((prompt) => {
          const selected = selectedIds.includes(prompt.id);
          return <button key={prompt.id} className={selected ? "selected" : ""} onClick={() => toggle(prompt.id)}>
            <span className="prompt-selection-check">{selected ? <Check size={15} /> : <FileCode2 size={15} />}</span>
            <span><strong>{prompt.title}</strong><small>{taskPath(data, prompt.taskId)}</small><p>{prompt.description}</p></span>
          </button>;
        })}</div> : <EmptyState icon={<Search />} title="No prompts match" description="Change the search words or create prompts first." />}
      </Card>
      <Card className="construction-editor">
        <div className="card-header"><div><span>Constructed artifact</span><h2>Persona mindset</h2><p>Edit the assembled text before saving.</p></div><BrainCircuit size={22} /></div>
        <div className="entity-form">
          <FormField label="Mindset title" required>{(props) => <input {...props} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Example: Evidence-driven software engineering persona" />}</FormField>
          <FormField label="Mindset content" required hint="Select prompts, press Construct from selection, then refine the result manually.">{(props) => <textarea {...props} className="code-input" rows={24} value={content} onChange={(event) => setContent(event.target.value)} />}</FormField>
          <div className="button-row"><Button icon={<Sparkles size={16} />} onClick={construct}>Rebuild draft</Button><Button variant="primary" loading={saving} icon={<BrainCircuit size={16} />} onClick={save}>Save constructed mindset</Button></div>
        </div>
      </Card>
    </div>
  </>;
}
