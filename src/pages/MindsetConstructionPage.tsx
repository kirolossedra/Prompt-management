import { useMemo, useState, type DragEvent } from "react";
import { ArrowDown, ArrowUp, BrainCircuit, Check, FileCode2, Search, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { useVault } from "../context/VaultContext";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { activeRecords, matchesPromptWords, taskPath } from "../lib/utils";
import type { Mindset, Prompt, RecordInput } from "../types/domain";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";

function assemblePersona(title: string, prompts: Prompt[]): string {
  return [
    `# ${title || "Constructed Persona"}`,
    "",
    "This mindset is manually constructed from selected prompts. No AI model generated or interpreted this content.",
    "",
    ...prompts.flatMap((prompt, index) => [
      `## ${index + 1}. ${prompt.title}`,
      `Source: ${prompt.id}`,
      "",
      `Purpose: ${prompt.purpose}`,
      "",
      `Role: ${prompt.description}`,
      "",
      "Instructions:",
      prompt.content,
      "",
    ]),
  ].join("\n").trim();
}

export function MindsetConstructionPage() {
  const { data, createRecord } = useVault();
  const isPhone = useMediaQuery("(max-width: 680px)");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [mobileStep, setMobileStep] = useState<1 | 2 | 3>(1);

  const prompts = useMemo(() => {
    const versions = Object.values(data.promptVersions);
    return activeRecords(data.prompts).filter((prompt) => matchesPromptWords(prompt, versions.filter((version) => version.promptId === prompt.id), query));
  }, [data.promptVersions, data.prompts, query]);

  const selectedPrompts = selectedIds.map((id) => data.prompts[id]).filter((prompt): prompt is Prompt => Boolean(prompt));

  function toggle(promptId: string) {
    setSelectedIds((current) => current.includes(promptId) ? current.filter((id) => id !== promptId) : [...current, promptId]);
  }

  function move(id: string, direction: -1 | 1) {
    setSelectedIds((current) => {
      const index = current.indexOf(id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function drop(event: DragEvent<HTMLDivElement>, targetId: string) {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/intellectvault-prompt");
    if (!sourceId || sourceId === targetId) return;
    setSelectedIds((current) => {
      const next = current.filter((id) => id !== sourceId);
      const targetIndex = next.indexOf(targetId);
      next.splice(targetIndex, 0, sourceId);
      return next;
    });
  }

  function construct() {
    if (!selectedPrompts.length) { toast.error("Select at least one prompt."); return; }
    const nextTitle = title.trim() || `Persona from ${selectedPrompts.length} prompts`;
    setTitle(nextTitle);
    setContent(assemblePersona(nextTitle, selectedPrompts));
    if (isPhone) setMobileStep(3);
    toast.success("Mindset draft constructed from the selected prompts.");
  }

  async function save() {
    if (!selectedPrompts.length) { toast.error("Select at least one prompt."); return; }
    if (!title.trim() || !content.trim()) { toast.error("Title and mindset content are required."); return; }
    setSaving(true);
    try {
      const input: RecordInput<Mindset> = {
        title: title.trim(), content: content.trim(), scopeType: "global", scopeId: "", manualAiGeneratedMindset: "",
        sourcePromptIds: selectedIds, constructionMethod: "prompt-selection",
      };
      await createRecord<Mindset>("mindsets", input);
      toast.success("Constructed mindset saved.");
      setSelectedIds([]); setTitle(""); setContent(""); setMobileStep(1);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Mindset could not be saved."); }
    finally { setSaving(false); }
  }

  return (
    <div className="mindset-builder-page">
      <header className="workspace-heading workspace-heading--compact"><div><span className="eyebrow">Persona assembly</span><h1>Mindset Builder</h1><p>Select prompts, arrange their contribution order, construct a deterministic draft, and refine it into a reusable mindset.</p></div><Button variant="primary" icon={<Sparkles size={17} />} onClick={construct}>Construct mindset</Button></header>

      <div className="builder-principle"><BrainCircuit size={18} /><div><strong>Manual-first by design</strong><span>No AI calls occur here. Construction concatenates the exact source prompt methodology in your chosen order, then you edit the result.</span></div></div>

      {isPhone ? <div className="builder-mobile-steps"><button className={mobileStep === 1 ? "active" : ""} onClick={() => setMobileStep(1)}><span>1</span>Sources</button><button className={mobileStep === 2 ? "active" : ""} onClick={() => setMobileStep(2)} disabled={!selectedIds.length}><span>2</span>Selection</button><button className={mobileStep === 3 ? "active" : ""} onClick={() => setMobileStep(3)} disabled={!selectedIds.length}><span>3</span>Mindset</button></div> : null}

      <div className="mindset-builder-layout">
        <section className={`builder-pane builder-pane--library ${isPhone && mobileStep !== 1 ? "mobile-hidden" : ""}`}>
          <div className="builder-pane__header"><div><span className="eyebrow">Prompt library</span><h2>Choose sources</h2></div><Badge tone="info">{prompts.length}</Badge></div>
          <label className="builder-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search all prompt words…" /></label>
          <div className="builder-prompt-list">{prompts.map((prompt) => { const selected = selectedIds.includes(prompt.id); return <button key={prompt.id} className={selected ? "selected" : ""} onClick={() => toggle(prompt.id)}><span className="builder-check">{selected ? <Check size={14} /> : <FileCode2 size={14} />}</span><span><strong>{prompt.title}</strong><small>{taskPath(data, prompt.taskId)}</small><p>{prompt.description || prompt.purpose}</p></span></button>; })}</div>
          {isPhone ? <Button variant="primary" disabled={!selectedIds.length} onClick={() => setMobileStep(2)}>Review {selectedIds.length} selected</Button> : null}
        </section>

        <section className={`builder-pane builder-pane--selected ${isPhone && mobileStep !== 2 ? "mobile-hidden" : ""}`}>
          <div className="builder-pane__header"><div><span className="eyebrow">Contribution order</span><h2>Selected prompts</h2></div><Badge>{selectedIds.length}</Badge></div>
          {selectedPrompts.length ? <div className="selected-source-list">{selectedPrompts.map((prompt, index) => <div key={prompt.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/intellectvault-prompt", prompt.id)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, prompt.id)}><span className="source-order">{index + 1}</span><span><strong>{prompt.title}</strong><small>{taskPath(data, prompt.taskId)}</small></span><div><button aria-label="Move up" disabled={index === 0} onClick={() => move(prompt.id, -1)}><ArrowUp size={14} /></button><button aria-label="Move down" disabled={index === selectedPrompts.length - 1} onClick={() => move(prompt.id, 1)}><ArrowDown size={14} /></button><button aria-label="Remove source" onClick={() => toggle(prompt.id)}><X size={14} /></button></div></div>)}</div> : <div className="builder-empty"><p>No prompt sources selected yet.</p><span>Select prompts from the library to define the persona.</span></div>}
          <Button variant="primary" disabled={!selectedIds.length} icon={<Sparkles size={16} />} onClick={construct}>Construct draft</Button>
        </section>

        <section className={`builder-pane builder-pane--editor ${isPhone && mobileStep !== 3 ? "mobile-hidden" : ""}`}>
          <div className="builder-pane__header"><div><span className="eyebrow">Constructed artifact</span><h2>Persona mindset</h2></div><BrainCircuit size={20} /></div>
          <label className="builder-field"><span>Mindset title</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Evidence-driven engineering persona" /></label>
          <label className="builder-field builder-field--grow"><span>Mindset content</span><textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Construct from selected prompts, then refine the exact persona you want to preserve." /></label>
          <div className="builder-editor-actions"><Button icon={<Sparkles size={15} />} onClick={construct} disabled={!selectedIds.length}>Rebuild</Button><Button variant="primary" loading={saving} icon={<BrainCircuit size={15} />} onClick={() => void save()}>Save mindset</Button></div>
        </section>
      </div>
    </div>
  );
}
