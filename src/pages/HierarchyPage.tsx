import { useState, type ReactNode } from "react";
import {
  Archive,
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  FileCode2,
  Pencil,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { useVault } from "../context/VaultContext";
import { activeRecords, cx, taskPath } from "../lib/utils";
import type { Selection } from "../types/domain";
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
  return (
    <motion.div
      layout
      className={cx("tree-row", selected && "selected")}
      style={{ paddingLeft: 8 + depth * 18 }}
    >
      <button
        className="tree-toggle"
        onClick={onToggle}
        disabled={!expandable}
        aria-label={expanded ? "Collapse" : "Expand"}
      >
        {expandable ? expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} /> : <span />}
      </button>
      <button className="tree-row__main" onClick={onSelect}>
        {icon}
        <span>
          <strong>{label}</strong>
          {helper ? <small>{helper}</small> : null}
        </span>
      </button>
    </motion.div>
  );
}

export function HierarchyPage() {
  const { data } = useVault();
  const { openCreate, openEdit, requestArchive, requestDelete } = useEntityUi();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const endeavors = activeRecords(data.endeavors);
  const tasks = activeRecords(data.tasks);
  const prompts = activeRecords(data.prompts);

  function toggle(key: string) {
    setExpanded((current) => {
      const next = new Set(current);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function renderTask(taskId: string, depth: number) {
    const task = data.tasks[taskId];
    if (!task) return null;
    const key = `task:${task.id}`;
    const taskPrompts = prompts.filter((prompt) => prompt.taskId === task.id);
    return (
      <div key={key}>
        <TreeRow
          depth={depth}
          icon={<Target size={16} />}
          label={task.name}
          helper={`${taskPrompts.length} prompt${taskPrompts.length === 1 ? "" : "s"}`}
          selected={selection?.collection === "tasks" && selection.id === task.id}
          expandable={taskPrompts.length > 0}
          expanded={expanded.has(key)}
          onToggle={() => toggle(key)}
          onSelect={() => setSelection({ collection: "tasks", id: task.id })}
        />
        {expanded.has(key)
          ? taskPrompts.map((prompt) => (
              <TreeRow
                key={prompt.id}
                depth={depth + 1}
                icon={<FileCode2 size={15} />}
                label={prompt.title}
                helper={prompt.description}
                selected={selection?.collection === "prompts" && selection.id === prompt.id}
                onSelect={() => setSelection({ collection: "prompts", id: prompt.id })}
              />
            ))
          : null}
      </div>
    );
  }

  const selectedTitle = selection
    ? selection.collection === "tasks"
      ? taskPath(data, selection.id)
      : selection.collection === "prompts"
        ? `${taskPath(data, data.prompts[selection.id]?.taskId || "")} / ${data.prompts[selection.id]?.title || "Prompt"}`
        : data.endeavors[selection.id]?.name || "Endeavor"
    : "";

  return (
    <>
      <PageHeader
        eyebrow="Direct organization"
        title="Hierarchy"
        description="Organize work directly as Endeavor → Task → Prompt → Prompt version. Folder entities are not used."
        actions={
          <>
            <Button icon={<Target size={17} />} onClick={() => openCreate("tasks")}>New task</Button>
            <Button variant="primary" icon={<Plus size={17} />} onClick={() => openCreate("endeavors")}>New endeavor</Button>
          </>
        }
      />
      {endeavors.length ? (
        <div className="hierarchy-layout">
          <Card className="tree-card">
            <div className="card-header">
              <div>
                <span className="eyebrow">Vault tree</span>
                <h2>{endeavors.length} endeavors</h2>
              </div>
            </div>
            <div className="tree-list">
              {endeavors.map((endeavor) => {
                const key = `endeavor:${endeavor.id}`;
                const endeavorTasks = tasks.filter((task) => task.endeavorId === endeavor.id);
                return (
                  <div key={key}>
                    <TreeRow
                      depth={0}
                      icon={<BriefcaseBusiness size={17} />}
                      label={endeavor.name}
                      helper={`${endeavorTasks.length} task${endeavorTasks.length === 1 ? "" : "s"}`}
                      selected={selection?.collection === "endeavors" && selection.id === endeavor.id}
                      expandable={endeavorTasks.length > 0}
                      expanded={expanded.has(key)}
                      onToggle={() => toggle(key)}
                      onSelect={() => setSelection({ collection: "endeavors", id: endeavor.id })}
                    />
                    {expanded.has(key) ? endeavorTasks.map((task) => renderTask(task.id, 1)) : null}
                  </div>
                );
              })}
            </div>
          </Card>
          <Card className="hierarchy-inspector">
            {selection ? (
              <div className="inspector-summary">
                <span className="eyebrow">Selected record</span>
                <h2>{selectedTitle}</h2>
                <p>Create, inspect, edit, archive, or permanently delete the selected record here.</p>
                <div className="button-row">
                  <Button
                    variant="primary"
                    icon={<Pencil size={16} />}
                    onClick={() => openEdit(selection.collection, selection.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    icon={<Archive size={16} />}
                    onClick={() => requestArchive(selection.collection, selection.id)}
                  >
                    Archive
                  </Button>
                  <Button
                    variant="danger"
                    icon={<Trash2 size={16} />}
                    onClick={() => requestDelete(selection.collection, selection.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<NetworkIcon />}
                title="Select a record"
                description="Choose an endeavor, task, or prompt in the tree to inspect and manage it."
              />
            )}
          </Card>
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<BriefcaseBusiness />}
            title="Create the first endeavor"
            description="Endeavors are the root areas of work. Tasks belong directly to an endeavor."
            action={<Button variant="primary" onClick={() => openCreate("endeavors")}>Create endeavor</Button>}
          />
        </Card>
      )}
      <RecordDetailDrawer selection={selection} onClose={() => setSelection(null)} />
    </>
  );
}

function NetworkIcon() {
  return <BriefcaseBusiness />;
}
