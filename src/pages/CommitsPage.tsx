import { useMemo, useState } from "react";
import { GitCommitHorizontal, GitMerge, Plus, Search } from "lucide-react";
import { useVault } from "../context/VaultContext";
import { activeRecords, formatDate, matchesSearch, taskPath } from "../lib/utils";
import type { Selection } from "../types/domain";
import { EntityCard } from "../components/entities/EntityCard";
import { useEntityUi } from "../components/entities/EntityUiProvider";
import { RecordDetailDrawer } from "../components/entities/RecordDetailDrawer";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";

export function CommitsPage() {
  const { data } = useVault();
  const { openCreate, openEdit, requestArchive } = useEntityUi();
  const [tab, setTab] = useState<"local" | "global">("local");
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const locals = useMemo(() => activeRecords(data.localCommits).filter((record) => matchesSearch(record, query)), [data.localCommits, query]);
  const globals = useMemo(() => activeRecords(data.globalCommits).filter((record) => matchesSearch(record, query)), [data.globalCommits, query]);

  return <>
    <PageHeader eyebrow="Change tracking" title="Commits" description="Record specific changes as local commits, then group selected local commits into milestone-oriented global commits." actions={<><Button icon={<Plus size={17} />} onClick={() => openCreate("localCommits")}>Local commit</Button><Button variant="primary" icon={<GitMerge size={17} />} onClick={() => openCreate("globalCommits")}>Global commit</Button></>} />
    <div className="segmented-control"><button className={tab === "local" ? "active" : ""} onClick={() => setTab("local")}><GitCommitHorizontal size={16} /> Local commits <Badge>{activeRecords(data.localCommits).length}</Badge></button><button className={tab === "global" ? "active" : ""} onClick={() => setTab("global")}><GitMerge size={16} /> Global commits <Badge>{activeRecords(data.globalCommits).length}</Badge></button></div>
    <Card className="filter-bar"><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${tab} commits…`} /></label></Card>
    {tab === "local" ? (locals.length ? <div className="entity-grid">{locals.map((commit) => <EntityCard key={commit.id} title={`${commit.displayId} — ${commit.message}`} meta={`${taskPath(data, commit.taskId)} · ${formatDate(commit.commitTimestamp)}`} excerpt={commit.description} icon={<GitCommitHorizontal />} badges={<><Badge tone="info">{commit.changedArtifacts.length} artifacts</Badge>{commit.commitToCommitSummary ? <Badge tone="success">Evolution summarized</Badge> : <Badge tone="warning">Summary empty</Badge>}</>} onOpen={() => setSelection({ collection: "localCommits", id: commit.id })} onEdit={() => openEdit("localCommits", commit.id)} onArchive={() => requestArchive("localCommits", commit.id)} />)}</div> : <Card><EmptyState icon={<GitCommitHorizontal />} title="No local commits found" description={query ? "Adjust the search query." : "Record a specific change to a task-related artifact."} action={!query ? <Button variant="primary" onClick={() => openCreate("localCommits")}>Create local commit</Button> : undefined} /></Card>) : (globals.length ? <div className="entity-grid">{globals.map((commit) => <EntityCard key={commit.id} title={`${commit.displayId} — ${commit.title}`} meta={`${commit.authorName} · ${formatDate(commit.commitTimestamp)}`} excerpt={commit.summary} icon={<GitMerge />} badges={<><Badge tone="purple">{commit.localCommitIds.length} local commits</Badge><Badge>{commit.taskIds.length} tasks</Badge></>} onOpen={() => setSelection({ collection: "globalCommits", id: commit.id })} onEdit={() => openEdit("globalCommits", commit.id)} onArchive={() => requestArchive("globalCommits", commit.id)} />)}</div> : <Card><EmptyState icon={<GitMerge />} title="No global commits found" description={query ? "Adjust the search query." : "Group related local commits into a milestone, release, stage, or thematic evolution."} action={!query ? <Button variant="primary" onClick={() => openCreate("globalCommits")}>Create global commit</Button> : undefined} /></Card>)}
    <RecordDetailDrawer selection={selection} onClose={() => setSelection(null)} />
  </>;
}
