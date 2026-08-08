import { useMemo, useState } from "react";
import {
  Archive,
  CheckSquare,
  Copy,
  FileCode2,
  Files,
  Grid2X2,
  List,
  MoveRight,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { ContextMenu } from "radix-ui";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useVault } from "../context/VaultContext";
import { copyTextToClipboard } from "../lib/clipboard";
import { activeRecords, matchesPromptWords, taskPath } from "../lib/utils";
import { useEntityUi } from "../components/entities/EntityUiProvider";
import { ActionMenu } from "../components/ui/ActionMenu";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { HighlightText } from "../components/ui/HighlightText";

export function PromptsPage() {
  const { data, updateRecord, archiveRecord, deleteRecord, copyPrompt } = useVault();
  const { openCreate, requestArchive, requestDelete } = useEntityUi();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [endeavorFilter, setEndeavorFilter] = useState("");
  const [taskFilter, setTaskFilter] = useState("");
  const [sort, setSort] = useState<"recent" | "title" | "version">("recent");
  const [view, setView] = useState<"list" | "grid">("list");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkTask, setBulkTask] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const versions = activeRecords(data.promptVersions);
  const endeavors = activeRecords(data.endeavors);
  const tasks = activeRecords(data.tasks);

  const prompts = useMemo(() => {
    const result = activeRecords(data.prompts)
      .filter((prompt) => matchesPromptWords(prompt, versions.filter((version) => version.promptId === prompt.id), query))
      .filter((prompt) => !taskFilter || prompt.taskId === taskFilter)
      .filter((prompt) => !endeavorFilter || data.tasks[prompt.taskId]?.endeavorId === endeavorFilter);
    return [...result].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "version") return versions.filter((version) => version.promptId === b.id).length - versions.filter((version) => version.promptId === a.id).length;
      return b.updatedAt - a.updatedAt;
    });
  }, [data.prompts, data.tasks, endeavorFilter, query, sort, taskFilter, versions]);

  const filteredTasks = tasks.filter((task) => !endeavorFilter || task.endeavorId === endeavorFilter);
  const allSelected = prompts.length > 0 && prompts.every((prompt) => selected.has(prompt.id));

  function toggleSelected(id: string) {
    setSelected((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  async function copyPromptText(id: string) {
    const prompt = data.prompts[id];
    if (!prompt) return;
    try {
      await copyTextToClipboard(prompt.content || "");
      toast.success("Prompt text copied to clipboard.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not copy prompt text.");
    }
  }

  async function duplicate(id: string) {
    const newId = await copyPrompt(id);
    toast.success("Prompt duplicated with independent version history.");
    navigate(`/prompts/${newId}`);
  }

  async function bulkMove() {
    if (!bulkTask || !selected.size) return;
    await Promise.all([...selected].map((id) => updateRecord("prompts", id, { taskId: bulkTask })));
    toast.success(`${selected.size} prompt${selected.size === 1 ? "" : "s"} moved and versioned.`);
    setSelected(new Set());
    setBulkTask("");
  }

  async function bulkArchive() {
    const ids = [...selected];
    for (const id of ids) {
      try { await archiveRecord("prompts", id); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not archive a prompt."); }
    }
    toast.success("Selected prompts processed.");
    setSelected(new Set());
  }

  async function bulkDelete() {
    const ids = [...selected];
    for (const id of ids) {
      try { await deleteRecord("prompts", id); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete a prompt."); }
    }
    setSelected(new Set());
    setDeleteConfirmOpen(false);
  }

  return (
    <div className="prompt-library-page">
      <header className="workspace-heading workspace-heading--compact">
        <div><span className="eyebrow">Knowledge library</span><h1>Prompts</h1><p>Search every prompt across every endeavor and task. Each saved edit becomes a new local version.</p></div>
        <Button variant="primary" icon={<Plus size={17} />} onClick={() => openCreate("prompts")}>New prompt</Button>
      </header>

      <div className="library-toolbar">
        <label className="library-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, purpose, description, content, or history…" /></label>
        <select value={endeavorFilter} onChange={(event) => { setEndeavorFilter(event.target.value); setTaskFilter(""); }} aria-label="Filter by endeavor"><option value="">All endeavors</option>{endeavors.map((endeavor) => <option key={endeavor.id} value={endeavor.id}>{endeavor.name}</option>)}</select>
        <select value={taskFilter} onChange={(event) => setTaskFilter(event.target.value)} aria-label="Filter by task"><option value="">All tasks</option>{filteredTasks.map((task) => <option key={task.id} value={task.id}>{task.name}</option>)}</select>
        <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label="Sort prompts"><option value="recent">Recently updated</option><option value="title">Title A–Z</option><option value="version">Most versions</option></select>
        <div className="view-switch"><button className={view === "list" ? "active" : ""} onClick={() => setView("list")} aria-label="List view"><List size={17} /></button><button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} aria-label="Grid view"><Grid2X2 size={17} /></button></div>
      </div>

      {selected.size ? <div className="bulk-toolbar"><span><CheckSquare size={16} /> {selected.size} selected</span><select value={bulkTask} onChange={(event) => setBulkTask(event.target.value)}><option value="">Move to task…</option>{tasks.map((task) => <option key={task.id} value={task.id}>{taskPath(data, task.id)}</option>)}</select><Button size="sm" disabled={!bulkTask} icon={<MoveRight size={15} />} onClick={bulkMove}>Move</Button><Button size="sm" variant="ghost" icon={<Archive size={15} />} onClick={bulkArchive}>Archive</Button><Button size="sm" variant="danger" icon={<Trash2 size={15} />} onClick={() => setDeleteConfirmOpen(true)}>Delete</Button><button className="text-action" onClick={() => setSelected(new Set())}>Clear</button></div> : null}

      <div className="library-meta"><span>{prompts.length} prompt{prompts.length === 1 ? "" : "s"}</span>{query ? <span>All words must match somewhere in the prompt or its history.</span> : null}</div>

      {view === "list" ? <div className="prompt-table" role="table" aria-label="Prompt library">
        <div className="prompt-table__header" role="row"><label><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(prompts.map((prompt) => prompt.id)))} aria-label="Select all prompts" /></label><span>Prompt</span><span>Task / Endeavor</span><span>Version</span><span>Updated</span><span>Actions</span></div>
        {prompts.map((prompt) => {
          const count = versions.filter((version) => version.promptId === prompt.id).length;
          const row = <div className="prompt-table__row" role="row" key={prompt.id}><label className="row-select"><input type="checkbox" checked={selected.has(prompt.id)} onChange={() => toggleSelected(prompt.id)} aria-label={`Select ${prompt.title}`} /></label><button className="prompt-table__primary" onClick={() => navigate(`/prompts/${prompt.id}`)}><span className="artifact-icon"><FileCode2 size={16} /></span><span><strong><HighlightText text={prompt.title} query={query} /></strong><small><HighlightText text={prompt.description || prompt.purpose || "No description"} query={query} /></small></span></button><span className="prompt-table__path">{taskPath(data, prompt.taskId)}</span><span className="version-pill">v{count}</span><time>{new Date(prompt.updatedAt).toLocaleDateString()}</time><div className="prompt-table__actions"><Button size="sm" variant="ghost" icon={<Copy size={14} />} onClick={() => void copyPromptText(prompt.id)}>Copy</Button><ActionMenu items={[{ label: "Open", onSelect: () => navigate(`/prompts/${prompt.id}`) }, { label: "Copy prompt text", icon: <Copy size={15} />, onSelect: () => void copyPromptText(prompt.id) }, { label: "Duplicate prompt", icon: <Files size={15} />, onSelect: () => void duplicate(prompt.id) }, { label: "Archive", icon: <Archive size={15} />, onSelect: () => requestArchive("prompts", prompt.id), separatorBefore: true }, { label: "Delete", icon: <Trash2 size={15} />, onSelect: () => requestDelete("prompts", prompt.id), danger: true }]} /></div></div>;
          return <ContextMenu.Root key={prompt.id}><ContextMenu.Trigger asChild>{row}</ContextMenu.Trigger><ContextMenu.Portal><ContextMenu.Content className="menu-content"><ContextMenu.Item className="menu-item" onSelect={() => navigate(`/prompts/${prompt.id}`)}>Open prompt</ContextMenu.Item><ContextMenu.Item className="menu-item" onSelect={() => void copyPromptText(prompt.id)}>Copy prompt text</ContextMenu.Item><ContextMenu.Item className="menu-item" onSelect={() => void duplicate(prompt.id)}>Duplicate prompt</ContextMenu.Item><ContextMenu.Separator className="menu-separator" /><ContextMenu.Item className="menu-item" onSelect={() => requestArchive("prompts", prompt.id)}>Archive</ContextMenu.Item><ContextMenu.Item className="menu-item menu-item--danger" onSelect={() => requestDelete("prompts", prompt.id)}>Delete</ContextMenu.Item></ContextMenu.Content></ContextMenu.Portal></ContextMenu.Root>;
        })}
      </div> : <div className="prompt-grid">{prompts.map((prompt) => { const count = versions.filter((version) => version.promptId === prompt.id).length; return <article className="prompt-grid-card" key={prompt.id}><button className="prompt-grid-card__main" onClick={() => navigate(`/prompts/${prompt.id}`)}><span className="artifact-icon"><FileCode2 size={17} /></span><span><small>{taskPath(data, prompt.taskId)}</small><strong><HighlightText text={prompt.title} query={query} /></strong><p><HighlightText text={prompt.description || prompt.purpose || "No description"} query={query} /></p></span></button><footer><span className="version-pill">v{count}</span><div className="prompt-grid-card__actions"><Button size="sm" variant="ghost" icon={<Copy size={14} />} onClick={() => void copyPromptText(prompt.id)}>Copy</Button><ActionMenu items={[{ label: "Open", onSelect: () => navigate(`/prompts/${prompt.id}`) }, { label: "Copy prompt text", icon: <Copy size={15} />, onSelect: () => void copyPromptText(prompt.id) }, { label: "Duplicate prompt", icon: <Files size={15} />, onSelect: () => void duplicate(prompt.id) }, { label: "Archive", icon: <Archive size={15} />, onSelect: () => requestArchive("prompts", prompt.id), separatorBefore: true }, { label: "Delete", icon: <Trash2 size={15} />, onSelect: () => requestDelete("prompts", prompt.id), danger: true }]} /></div></footer></article>; })}</div>}

      {!prompts.length ? <div className="empty-surface"><FileCode2 size={28} /><h2>No matching prompts</h2><p>{query || endeavorFilter || taskFilter ? "Change the search or filters." : "Create a prompt to begin building your versioned knowledge library."}</p>{!query && !endeavorFilter && !taskFilter ? <Button variant="primary" onClick={() => openCreate("prompts")}>Create prompt</Button> : null}</div> : null}

      <Modal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title={`Delete ${selected.size} selected prompt${selected.size === 1 ? "" : "s"}?`}
        description="This permanently removes the selected prompts and their saved version histories from Firebase."
        size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => void bulkDelete()}>Delete permanently</Button>
        </>}
      >
        <div className="danger-callout"><strong>This cannot be undone.</strong><span>Use Archive instead if you may need these prompts later.</span></div>
      </Modal>
    </div>
  );
}
