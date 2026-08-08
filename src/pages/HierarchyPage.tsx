import { useMemo, useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
import {
  Archive,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Copy,
  FileCode2,
  Network,
  Pencil,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useVault } from "../context/VaultContext";
import { activeRecords, cx, formatRelativeTime, taskPath } from "../lib/utils";
import type { Selection } from "../types/domain";
import { useEntityUi } from "../components/entities/EntityUiProvider";
import { ActionMenu } from "../components/ui/ActionMenu";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";

function TreeRow({
  depth,
  icon,
  label,
  helper,
  selected,
  expandable,
  expanded,
  onToggle,
  onSelect,
  onDrop,
  draggable,
  onDragStart,
  actions,
}: {
  depth: number;
  icon: ReactNode;
  label: string;
  helper?: string;
  selected?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  onSelect: () => void;
  onDrop?: (event: DragEvent<HTMLDivElement>) => void;
  draggable?: boolean;
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
  actions?: ReactNode;
}) {
  return (
    <div
      className={cx("explorer-row", selected && "selected")}
      style={{ "--tree-depth": depth } as CSSProperties}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDrop ? (event) => event.preventDefault() : undefined}
      onDrop={onDrop}
    >
      <button className="explorer-toggle" onClick={onToggle} disabled={!expandable} aria-label={expanded ? "Collapse" : "Expand"}>
        {expandable ? expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : null}
      </button>
      <button className="explorer-row__main" onClick={onSelect}>{icon}<span><strong>{label}</strong>{helper ? <small>{helper}</small> : null}</span></button>
      {actions ? <div className="explorer-row__actions">{actions}</div> : null}
    </div>
  );
}

export function HierarchyPage() {
  const { data, updateRecord, copyPrompt } = useVault();
  const { openCreate, openEdit, requestArchive, requestDelete } = useEntityUi();
  const navigate = useNavigate();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");

  const endeavors = activeRecords(data.endeavors);
  const tasks = activeRecords(data.tasks);
  const prompts = activeRecords(data.prompts);

  const visibleEndeavors = useMemo(() => {
    if (!filter.trim()) return endeavors;
    const q = filter.toLowerCase();
    return endeavors.filter((endeavor) => {
      const linkedTasks = tasks.filter((task) => task.endeavorId === endeavor.id);
      return endeavor.name.toLowerCase().includes(q) || linkedTasks.some((task) => task.name.toLowerCase().includes(q) || prompts.some((prompt) => prompt.taskId === task.id && prompt.title.toLowerCase().includes(q)));
    });
  }, [endeavors, filter, prompts, tasks]);

  function toggle(key: string) {
    setExpanded((current) => { const next = new Set(current); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }

  async function moveTask(taskId: string, endeavorId: string) {
    const task = data.tasks[taskId];
    if (!task || task.endeavorId === endeavorId) return;
    await updateRecord("tasks", taskId, { endeavorId });
    toast.success("Task moved.");
  }

  async function movePrompt(promptId: string, taskId: string) {
    const prompt = data.prompts[promptId];
    if (!prompt || prompt.taskId === taskId) return;
    await updateRecord("prompts", promptId, { taskId });
    toast.success("Prompt moved and the change was versioned.");
  }

  const selectedRecord = selection ? data[selection.collection][selection.id] : undefined;

  return (
    <div className="vault-explorer-page">
      <header className="workspace-heading workspace-heading--compact">
        <div><span className="eyebrow">Structure</span><h1>Vault explorer</h1><p>Endeavor → Task → Prompt. Drag tasks or prompts to reorganize the vault.</p></div>
        <Button variant="primary" icon={<Plus size={17} />} onClick={() => openCreate("endeavors")}>New endeavor</Button>
      </header>

      <div className="explorer-layout">
        <aside className="explorer-pane">
          <div className="explorer-toolbar"><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter vault…" /><Button variant="ghost" size="icon" aria-label="New endeavor" onClick={() => openCreate("endeavors")}><Plus size={17} /></Button></div>
          <div className="explorer-tree">
            {visibleEndeavors.map((endeavor) => {
              const endeavorKey = `endeavor:${endeavor.id}`;
              const endeavorTasks = tasks.filter((task) => task.endeavorId === endeavor.id);
              const showEndeavor = expanded.has(endeavorKey) || Boolean(filter);
              return <div key={endeavor.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const payload = event.dataTransfer.getData("text/intellectvault"); if (payload.startsWith("task:")) void moveTask(payload.slice(5), endeavor.id); }}>
                <TreeRow depth={0} icon={<Network size={16} />} label={endeavor.name} helper={`${endeavorTasks.length} task${endeavorTasks.length === 1 ? "" : "s"}`} selected={selection?.collection === "endeavors" && selection.id === endeavor.id} expandable={endeavorTasks.length > 0} expanded={showEndeavor} onToggle={() => toggle(endeavorKey)} onSelect={() => setSelection({ collection: "endeavors", id: endeavor.id })} actions={<ActionMenu items={[
                  { label: "New task", icon: <Plus size={15} />, onSelect: () => openCreate("tasks", { endeavorId: endeavor.id }) },
                  { label: "Edit endeavor", icon: <Pencil size={15} />, onSelect: () => openEdit("endeavors", endeavor.id) },
                  { label: "Archive", icon: <Archive size={15} />, onSelect: () => requestArchive("endeavors", endeavor.id), separatorBefore: true },
                  { label: "Delete", icon: <Trash2 size={15} />, onSelect: () => requestDelete("endeavors", endeavor.id), danger: true },
                ]} />} />
                {showEndeavor ? endeavorTasks.map((task) => {
                  const taskKey = `task:${task.id}`;
                  const taskPrompts = prompts.filter((prompt) => prompt.taskId === task.id);
                  const showTask = expanded.has(taskKey) || Boolean(filter);
                  return <div key={task.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.stopPropagation(); const payload = event.dataTransfer.getData("text/intellectvault"); if (payload.startsWith("prompt:")) void movePrompt(payload.slice(7), task.id); }}>
                    <TreeRow depth={1} icon={<Target size={15} />} label={task.name} helper={`${taskPrompts.length} prompt${taskPrompts.length === 1 ? "" : "s"}`} selected={selection?.collection === "tasks" && selection.id === task.id} expandable={taskPrompts.length > 0} expanded={showTask} onToggle={() => toggle(taskKey)} onSelect={() => setSelection({ collection: "tasks", id: task.id })} draggable onDragStart={(event) => event.dataTransfer.setData("text/intellectvault", `task:${task.id}`)} actions={<ActionMenu items={[
                      { label: "New prompt", icon: <Plus size={15} />, onSelect: () => openCreate("prompts", { taskId: task.id }) },
                      { label: "Edit task", icon: <Pencil size={15} />, onSelect: () => openEdit("tasks", task.id) },
                      { label: "Archive", icon: <Archive size={15} />, onSelect: () => requestArchive("tasks", task.id), separatorBefore: true },
                      { label: "Delete", icon: <Trash2 size={15} />, onSelect: () => requestDelete("tasks", task.id), danger: true },
                    ]} />} />
                    {showTask ? taskPrompts.map((prompt) => <TreeRow key={prompt.id} depth={2} icon={<FileCode2 size={15} />} label={prompt.title} helper={prompt.description || "No description"} selected={selection?.collection === "prompts" && selection.id === prompt.id} onSelect={() => setSelection({ collection: "prompts", id: prompt.id })} draggable onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.setData("text/intellectvault", `prompt:${prompt.id}`); }} actions={<ActionMenu items={[
                      { label: "Open prompt", icon: <ArrowRight size={15} />, onSelect: () => navigate(`/prompts/${prompt.id}`) },
                      { label: "Duplicate", icon: <Copy size={15} />, onSelect: async () => { const id = await copyPrompt(prompt.id); toast.success("Prompt copied."); navigate(`/prompts/${id}`); } },
                      { label: "Edit metadata", icon: <Pencil size={15} />, onSelect: () => openEdit("prompts", prompt.id) },
                      { label: "Archive", icon: <Archive size={15} />, onSelect: () => requestArchive("prompts", prompt.id), separatorBefore: true },
                      { label: "Delete", icon: <Trash2 size={15} />, onSelect: () => requestDelete("prompts", prompt.id), danger: true },
                    ]} />} />) : null}
                  </div>;
                }) : null}
              </div>;
            })}
            {!visibleEndeavors.length ? <div className="explorer-empty">{filter ? "No matching hierarchy." : "No endeavors yet."}</div> : null}
          </div>
        </aside>

        <section className="explorer-inspector">
          {!selection || !selectedRecord ? <EmptyState icon={<Network />} title="Select something in the vault" description="Inspect an endeavor, task, or prompt here. Drag items in the explorer to reorganize them." /> : selection.collection === "endeavors" ? (() => { const endeavor = data.endeavors[selection.id]; const linkedTasks = tasks.filter((task) => task.endeavorId === endeavor.id); return <><div className="inspector-heading"><span className="artifact-icon"><Network /></span><div><span className="eyebrow">Endeavor</span><h2>{endeavor.name}</h2><p>{endeavor.description || "No description."}</p></div><ActionMenu items={[{ label: "Edit", icon: <Pencil size={15} />, onSelect: () => openEdit("endeavors", endeavor.id) }, { label: "Archive", icon: <Archive size={15} />, onSelect: () => requestArchive("endeavors", endeavor.id), separatorBefore: true }, { label: "Delete", icon: <Trash2 size={15} />, onSelect: () => requestDelete("endeavors", endeavor.id), danger: true }]} /></div><div className="inspector-metrics"><span><strong>{linkedTasks.length}</strong><small>Tasks</small></span><span><strong>{linkedTasks.reduce((sum, task) => sum + prompts.filter((prompt) => prompt.taskId === task.id).length, 0)}</strong><small>Prompts</small></span></div><Button icon={<Plus size={16} />} onClick={() => openCreate("tasks", { endeavorId: endeavor.id })}>Add task</Button></>; })() : selection.collection === "tasks" ? (() => { const task = data.tasks[selection.id]; const taskPrompts = prompts.filter((prompt) => prompt.taskId === task.id); return <><div className="inspector-heading"><span className="artifact-icon"><Target /></span><div><span className="eyebrow">Task</span><h2>{task.name}</h2><p>{task.purpose}</p></div><ActionMenu items={[{ label: "Edit", icon: <Pencil size={15} />, onSelect: () => openEdit("tasks", task.id) }, { label: "Archive", icon: <Archive size={15} />, onSelect: () => requestArchive("tasks", task.id), separatorBefore: true }, { label: "Delete", icon: <Trash2 size={15} />, onSelect: () => requestDelete("tasks", task.id), danger: true }]} /></div><div className="inspector-path">{taskPath(data, task.id)}</div><div className="inspector-metrics"><span><strong>{taskPrompts.length}</strong><small>Prompts</small></span><span><strong>{formatRelativeTime(task.updatedAt)}</strong><small>Updated</small></span></div><Button icon={<Plus size={16} />} onClick={() => openCreate("prompts", { taskId: task.id })}>Add prompt</Button></>; })() : (() => { const prompt = data.prompts[selection.id]; const versions = activeRecords(data.promptVersions).filter((version) => version.promptId === prompt.id); return <><div className="inspector-heading"><span className="artifact-icon"><FileCode2 /></span><div><span className="eyebrow">Prompt</span><h2>{prompt.title}</h2><p>{prompt.description || "No description."}</p></div><ActionMenu items={[{ label: "Duplicate", icon: <Copy size={15} />, onSelect: async () => { const id = await copyPrompt(prompt.id); navigate(`/prompts/${id}`); } }, { label: "Edit", icon: <Pencil size={15} />, onSelect: () => navigate(`/prompts/${prompt.id}`) }, { label: "Archive", icon: <Archive size={15} />, onSelect: () => requestArchive("prompts", prompt.id), separatorBefore: true }, { label: "Delete", icon: <Trash2 size={15} />, onSelect: () => requestDelete("prompts", prompt.id), danger: true }]} /></div><div className="inspector-path">{taskPath(data, prompt.taskId)}</div><div className="inspector-metrics"><span><strong>{versions.length}</strong><small>Versions</small></span><span><strong>{formatRelativeTime(prompt.updatedAt)}</strong><small>Updated</small></span></div><Button variant="primary" icon={<ArrowRight size={16} />} onClick={() => navigate(`/prompts/${prompt.id}`)}>Open prompt workspace</Button></>; })()}
        </section>
      </div>
    </div>
  );
}
