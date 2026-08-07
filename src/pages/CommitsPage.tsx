import { useMemo, useState, type FormEvent } from "react";
import { Camera, FileClock, History, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useVault } from "../context/VaultContext";
import { activeRecords, formatDate, matchesSearch, promptPath, promptVersionSnapshot } from "../lib/utils";
import type { Selection } from "../types/domain";
import { EntityCard } from "../components/entities/EntityCard";
import { useEntityUi } from "../components/entities/EntityUiProvider";
import { RecordDetailDrawer } from "../components/entities/RecordDetailDrawer";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { FormField } from "../components/ui/FormField";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";

export function CommitsPage() {
  const { data, createGlobalVersion } = useVault();
  const { openEdit, requestArchive, requestDelete } = useEntityUi();
  const [tab, setTab] = useState<"prompt" | "global">("prompt");
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);

  const promptVersions = useMemo(() => activeRecords(data.promptVersions).filter((version) => {
    const prompt = data.prompts[version.promptId];
    return matchesSearch({ ...version, promptTitle: prompt?.title, path: prompt ? promptPath(data, prompt.id) : "" }, query);
  }), [data, query]);
  const globalVersions = useMemo(() => activeRecords(data.globalCommits).filter((record) => matchesSearch(record, query)), [data.globalCommits, query]);

  async function release(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const id = await createGlobalVersion(title, summary);
      toast.success("Global version released with the current vault snapshot.");
      setReleaseOpen(false);
      setTitle("");
      setSummary("");
      setTab("global");
      setSelection({ collection: "globalCommits", id });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The global version could not be created.");
    } finally {
      setSaving(false);
    }
  }

  return <>
    <PageHeader
      eyebrow="Version control"
      title="Versions"
      description="Prompt-local history is recorded automatically on every save. Global versions are owner-released snapshots of the complete current vault."
      actions={<Button variant="primary" icon={<Camera size={17} />} onClick={() => setReleaseOpen(true)}>Release global version</Button>}
    />
    <div className="segmented-control">
      <button className={tab === "prompt" ? "active" : ""} onClick={() => setTab("prompt")}><History size={16} /> Prompt history <Badge>{activeRecords(data.promptVersions).length}</Badge></button>
      <button className={tab === "global" ? "active" : ""} onClick={() => setTab("global")}><Camera size={16} /> Global versions <Badge>{activeRecords(data.globalCommits).length}</Badge></button>
    </div>
    <Card className="filter-bar"><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${tab === "prompt" ? "prompt history" : "global versions"}…`} /></label></Card>
    {tab === "prompt" ? (promptVersions.length ? <div className="entity-grid">{promptVersions.map((version) => {
      const snapshot = promptVersionSnapshot(version);
      return <EntityCard
        key={version.id}
        title={`${version.versionLabel} — ${snapshot.title || data.prompts[version.promptId]?.title || "Prompt"}`}
        meta={`${promptPath(data, version.promptId)} · ${formatDate(version.createdAt)}`}
        excerpt={version.changeDescription}
        icon={<FileClock />}
        badges={<><Badge tone="info">{version.source || "legacy"}</Badge><Badge>{version.changedFields?.length || 0} changed fields</Badge></>}
        onOpen={() => setSelection({ collection: "promptVersions", id: version.id })}
        onEdit={() => openEdit("promptVersions", version.id)}
        onArchive={() => requestArchive("promptVersions", version.id)}
        onDelete={() => requestDelete("promptVersions", version.id)}
      />;
    })}</div> : <Card><EmptyState icon={<History />} title="No prompt versions found" description={query ? "Adjust the search query." : "Create or edit a prompt. Its versions will appear here automatically."} /></Card>) : (globalVersions.length ? <div className="entity-grid">{globalVersions.map((version) => <EntityCard
      key={version.id}
      title={`${version.displayId} — ${version.title}`}
      meta={`${version.authorName} · ${formatDate(version.commitTimestamp)}`}
      excerpt={version.summary || "Complete vault snapshot"}
      icon={<Camera />}
      badges={<><Badge tone="purple">Global version {version.versionNumber || ""}</Badge><Badge>{version.recordCounts?.prompts || 0} prompts</Badge></>}
      onOpen={() => setSelection({ collection: "globalCommits", id: version.id })}
      onEdit={() => openEdit("globalCommits", version.id)}
      onArchive={() => requestArchive("globalCommits", version.id)}
      onDelete={() => requestDelete("globalCommits", version.id)}
    />)}</div> : <Card><EmptyState icon={<Camera />} title="No global versions found" description={query ? "Adjust the search query." : "Release the first named snapshot of the current vault."} action={!query ? <Button variant="primary" icon={<Plus size={17} />} onClick={() => setReleaseOpen(true)}>Release global version</Button> : undefined} /></Card>)}
    <RecordDetailDrawer selection={selection} onClose={() => setSelection(null)} />
    <Modal
      open={releaseOpen}
      onClose={() => setReleaseOpen(false)}
      title="Release global version"
      description="Capture the complete current vault exactly as it exists now."
      size="md"
      footer={<><Button variant="ghost" onClick={() => setReleaseOpen(false)}>Cancel</Button><Button variant="primary" loading={saving} icon={<Camera size={17} />} type="submit" form="global-version-form">Release snapshot</Button></>}
    >
      <form id="global-version-form" className="entity-form" onSubmit={release}>
        <FormField label="Version title" required>{(props) => <input {...props} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Example: August workflow baseline" required />}</FormField>
        <FormField label="Summary" hint="Explain what this global release represents.">{(props) => <textarea {...props} rows={7} value={summary} onChange={(event) => setSummary(event.target.value)} />}</FormField>
        <div className="inline-callout"><strong>The snapshot includes the current vault.</strong><span>Endeavors, tasks, prompts, all prompt versions, mindsets, preferences, decisions, and workspace profile are copied into this global version.</span></div>
      </form>
    </Modal>
  </>;
}
