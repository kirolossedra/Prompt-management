import { useMemo, useState } from "react";
import { FileCode2, Plus, Search } from "lucide-react";
import { useVault } from "../context/VaultContext";
import { activeRecords, matchesSearch, taskPath } from "../lib/utils";
import type { Selection } from "../types/domain";
import { EntityCard } from "../components/entities/EntityCard";
import { useEntityUi } from "../components/entities/EntityUiProvider";
import { RecordDetailDrawer } from "../components/entities/RecordDetailDrawer";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";

export function PromptsPage() {
  const { data } = useVault();
  const { openCreate, openEdit, requestArchive, requestDelete } = useEntityUi();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [query, setQuery] = useState("");
  const [taskId, setTaskId] = useState("");

  const prompts = useMemo(() => activeRecords(data.prompts).filter((prompt) => (!taskId || prompt.taskId === taskId) && matchesSearch(prompt, query)), [data.prompts, query, taskId]);
  const tasks = activeRecords(data.tasks);

  return <>
    <PageHeader eyebrow="Function-specific artifacts" title="Prompts" description="Store complete prompt content with a high-level description, defined purpose, manual future-AI placeholders, and preserved versions." actions={<Button variant="primary" icon={<Plus size={17} />} onClick={() => openCreate("prompts")}>New prompt</Button>} />
    <Card className="filter-bar"><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search prompt titles, descriptions, purposes, or content…" /></label><select value={taskId} onChange={(event) => setTaskId(event.target.value)}><option value="">All tasks</option>{tasks.map((task) => <option key={task.id} value={task.id}>{taskPath(data, task.id)}</option>)}</select></Card>
    {prompts.length ? <div className="entity-grid">{prompts.map((prompt) => {
      const versions = activeRecords(data.promptVersions).filter((version) => version.promptId === prompt.id).length;
      return <EntityCard key={prompt.id} title={prompt.title} meta={taskPath(data, prompt.taskId)} excerpt={prompt.description} icon={<FileCode2 />} badges={<><Badge tone="info">{versions} version{versions === 1 ? "" : "s"}</Badge><Badge tone="purple">Manual R1</Badge></>} onOpen={() => setSelection({ collection: "prompts", id: prompt.id })} onEdit={() => openEdit("prompts", prompt.id)} onArchive={() => requestArchive("prompts", prompt.id)} onDelete={() => requestDelete("prompts", prompt.id)} />;
    })}</div> : <Card><EmptyState icon={<FileCode2 />} title={query || taskId ? "No prompts match these filters" : "No prompts yet"} description={query || taskId ? "Adjust the search or task filter." : "Create a prompt under a task to start preserving its purpose and evolution."} action={!query && !taskId ? <Button variant="primary" onClick={() => openCreate("prompts")}>Create prompt</Button> : undefined} /></Card>}
    <RecordDetailDrawer selection={selection} onClose={() => setSelection(null)} />
  </>;
}
