import { useMemo, useState, type ReactNode } from "react";
import { BriefcaseBusiness, ChevronDown, ChevronRight, FileCode2, Folder, FolderPlus, Plus, Target } from "lucide-react";
import { motion } from "motion/react";
import { useVault } from "../context/VaultContext";
import { activeRecords, cx, taskPath } from "../lib/utils";
import type { Folder as FolderType, Selection } from "../types/domain";
import { useEntityUi } from "../components/entities/EntityUiProvider";
import { RecordDetailDrawer } from "../components/entities/RecordDetailDrawer";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";

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
}) {
  return <motion.div layout className={cx("tree-row", selected && "selected")} style={{ paddingLeft: 8 + depth * 18 }}>
    <button className="tree-toggle" onClick={onToggle} disabled={!expandable} aria-label={expanded ? "Collapse" : "Expand"}>{expandable ? expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} /> : <span />}</button>
    <button className="tree-row__main" onClick={onSelect}>{icon}<span><strong>{label}</strong>{helper ? <small>{helper}</small> : null}</span></button>
  </motion.div>;
}

export function HierarchyPage() {
  const { data } = useVault();
  const { openCreate } = useEntityUi();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const endeavors = activeRecords(data.endeavors);
  const folders = activeRecords(data.folders);
  const tasks = activeRecords(data.tasks);
  const prompts = activeRecords(data.prompts);

  const grouped = useMemo(() => ({
    foldersByParent: folders.reduce<Record<string, FolderType[]>>((acc, folder) => {
      const key = `${folder.endeavorId}:${folder.parentFolderId || "root"}`;
      (acc[key] ||= []).push(folder);
      return acc;
    }, {}),
  }), [folders]);

  function toggle(key: string) {
    setExpanded((current) => {
      const next = new Set(current);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function renderTask(taskId: string, depth: number) {
    const task = data.tasks[taskId];
    const key = `task:${task.id}`;
    const taskPrompts = prompts.filter((prompt) => prompt.taskId === task.id);
    return <div key={key}>
      <TreeRow depth={depth} icon={<Target size={16} />} label={task.name} helper={`${taskPrompts.length} prompt${taskPrompts.length === 1 ? "" : "s"}`} selected={selection?.collection === "tasks" && selection.id === task.id} expandable={taskPrompts.length > 0} expanded={expanded.has(key)} onToggle={() => toggle(key)} onSelect={() => setSelection({ collection: "tasks", id: task.id })} />
      {expanded.has(key) ? taskPrompts.map((prompt) => <TreeRow key={prompt.id} depth={depth + 1} icon={<FileCode2 size={15} />} label={prompt.title} helper={prompt.description} selected={selection?.collection === "prompts" && selection.id === prompt.id} onSelect={() => setSelection({ collection: "prompts", id: prompt.id })} />) : null}
    </div>;
  }

  function renderFolder(folder: FolderType, depth: number): ReactNode {
    const key = `folder:${folder.id}`;
    const childFolders = grouped.foldersByParent[`${folder.endeavorId}:${folder.id}`] || [];
    const folderTasks = tasks.filter((task) => task.folderId === folder.id);
    const hasChildren = childFolders.length + folderTasks.length > 0;
    return <div key={key}>
      <TreeRow depth={depth} icon={<Folder size={16} />} label={folder.name} helper={`${childFolders.length} folders · ${folderTasks.length} tasks`} selected={selection?.collection === "folders" && selection.id === folder.id} expandable={hasChildren} expanded={expanded.has(key)} onToggle={() => toggle(key)} onSelect={() => setSelection({ collection: "folders", id: folder.id })} />
      {expanded.has(key) ? <>{childFolders.map((child) => renderFolder(child, depth + 1))}{folderTasks.map((task) => renderTask(task.id, depth + 1))}</> : null}
    </div>;
  }

  return <>
    <PageHeader eyebrow="Flexible organization" title="Hierarchy" description="Build endeavors with unlimited nested folders, then place tasks and prompts where they belong." actions={<><Button icon={<FolderPlus size={17} />} onClick={() => openCreate("folders")}>New folder</Button><Button variant="primary" icon={<Plus size={17} />} onClick={() => openCreate("endeavors")}>New endeavor</Button></>} />
    {endeavors.length ? <div className="hierarchy-layout">
      <Card className="tree-card">
        <div className="card-header"><div><span className="eyebrow">Vault tree</span><h2>{endeavors.length} endeavors</h2></div></div>
        <div className="tree-list">{endeavors.map((endeavor) => {
          const key = `endeavor:${endeavor.id}`;
          const rootFolders = grouped.foldersByParent[`${endeavor.id}:root`] || [];
          const rootTasks = tasks.filter((task) => task.endeavorId === endeavor.id && !task.folderId);
          const hasChildren = rootFolders.length + rootTasks.length > 0;
          return <div key={key}>
            <TreeRow depth={0} icon={<BriefcaseBusiness size={17} />} label={endeavor.name} helper={`${rootFolders.length} root folders · ${tasks.filter((task) => task.endeavorId === endeavor.id).length} tasks`} selected={selection?.collection === "endeavors" && selection.id === endeavor.id} expandable={hasChildren} expanded={expanded.has(key)} onToggle={() => toggle(key)} onSelect={() => setSelection({ collection: "endeavors", id: endeavor.id })} />
            {expanded.has(key) ? <>{rootFolders.map((folder) => renderFolder(folder, 1))}{rootTasks.map((task) => renderTask(task.id, 1))}</> : null}
          </div>;
        })}</div>
      </Card>
      <Card className="hierarchy-inspector">
        {selection ? <div className="inspector-summary"><span className="eyebrow">Selected path</span><h2>{selection.collection === "tasks" ? taskPath(data, selection.id) : selection.collection === "prompts" ? `${taskPath(data, data.prompts[selection.id]?.taskId || "")} / ${data.prompts[selection.id]?.title}` : selection.collection === "folders" ? data.folders[selection.id]?.name : data.endeavors[selection.id]?.name}</h2><p>Open the record for full details, related artifacts, editing, and archive controls.</p><Button variant="primary" onClick={() => setSelection({ ...selection })}>View details</Button></div> : <EmptyState icon={<NetworkIcon />} title="Select a record" description="Choose an endeavor, folder, task, or prompt in the tree to inspect it." />}
      </Card>
    </div> : <Card><EmptyState icon={<BriefcaseBusiness />} title="Create the first endeavor" description="Endeavors are the root areas of work in your hierarchy." action={<Button variant="primary" onClick={() => openCreate("endeavors")}>Create endeavor</Button>} /></Card>}
    <RecordDetailDrawer selection={selection} onClose={() => setSelection(null)} />
  </>;
}

function NetworkIcon() {
  return <BriefcaseBusiness />;
}
