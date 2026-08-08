import { useEffect, useMemo, useState } from "react";
import { Archive, Camera, Download, Eye, FileCode2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useVault } from "../context/VaultContext";
import { activeRecords, formatDate } from "../lib/utils";
import type { GlobalCommit } from "../types/domain";
import { useEntityUi } from "../components/entities/EntityUiProvider";
import { ActionMenu } from "../components/ui/ActionMenu";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

function changedPromptIds(a?: GlobalCommit, b?: GlobalCommit) {
  if (!a?.snapshot || !b?.snapshot) return [] as string[];
  const ids = new Set([...Object.keys(a.snapshot.prompts || {}), ...Object.keys(b.snapshot.prompts || {})]);
  return [...ids].filter((id) => JSON.stringify(a.snapshot?.prompts?.[id] || null) !== JSON.stringify(b.snapshot?.prompts?.[id] || null));
}

export function CommitsPage() {
  const { data, createGlobalVersion } = useVault();
  const { openEdit, requestArchive, requestDelete } = useEntityUi();
  const versions = activeRecords(data.globalCommits).sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0));
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [releasing, setReleasing] = useState(false);
  const [browse, setBrowse] = useState<GlobalCommit | null>(null);
  const [compareA, setCompareA] = useState(versions[1]?.id || versions[0]?.id || "");
  const [compareB, setCompareB] = useState(versions[0]?.id || "");

  useEffect(() => {
    if (!versions.length) return;
    setCompareB((current) => current || versions[0]?.id || "");
    setCompareA((current) => current || versions[Math.min(1, versions.length - 1)]?.id || versions[0]?.id || "");
  }, [versions]);

  const a = data.globalCommits[compareA];
  const b = data.globalCommits[compareB];
  const changedPrompts = useMemo(() => changedPromptIds(a, b), [a, b]);

  async function release() {
    setReleasing(true);
    try {
      const defaultTitle = title.trim() || `Global Version ${versions.length + 1}`;
      await createGlobalVersion(defaultTitle, summary);
      toast.success("Global Version released.");
      setTitle(""); setSummary(""); setReleaseOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Global Version could not be released.");
    } finally { setReleasing(false); }
  }

  return (
    <div className="versions-page">
      <header className="workspace-heading workspace-heading--compact"><div><span className="eyebrow">Vault-level version control</span><h1>Global Versions</h1><p>Release deliberate, immutable snapshots of the entire current vault. Prompt edits remain tracked separately in each prompt.</p></div><Button variant="primary" icon={<Camera size={17} />} onClick={() => setReleaseOpen(true)}>Release Global Version</Button></header>

      <section className="global-version-hero">
        <div><span className="eyebrow">Current vault</span><h2>Ready for a baseline whenever you decide.</h2><p>A Global Version captures prompts, prompt histories, mindsets, preferences, endeavors, tasks, decisions, and profile state at one instant.</p></div>
        <div className="snapshot-counts"><span><strong>{activeRecords(data.prompts).length}</strong><small>Prompts</small></span><span><strong>{activeRecords(data.promptVersions).length}</strong><small>Local versions</small></span><span><strong>{activeRecords(data.mindsets).length}</strong><small>Mindsets</small></span><span><strong>{activeRecords(data.preferences).length}</strong><small>Preferences</small></span></div>
      </section>

      {versions.length >= 2 ? <section className="version-compare-panel"><div className="section-heading"><div><span className="eyebrow">Compare baselines</span><h2>Global Version diff</h2></div><Badge tone="info">{changedPrompts.length} changed prompts</Badge></div><div className="global-compare-controls"><label>From<select value={compareA} onChange={(event) => setCompareA(event.target.value)}>{versions.map((version) => <option key={version.id} value={version.id}>{version.displayId} — {version.title}</option>)}</select></label><span>→</span><label>To<select value={compareB} onChange={(event) => setCompareB(event.target.value)}>{versions.map((version) => <option key={version.id} value={version.id}>{version.displayId} — {version.title}</option>)}</select></label></div><div className="global-compare-summary"><div><strong>{(b?.recordCounts?.prompts || 0) - (a?.recordCounts?.prompts || 0) >= 0 ? "+" : ""}{(b?.recordCounts?.prompts || 0) - (a?.recordCounts?.prompts || 0)}</strong><small>Prompt count</small></div><div><strong>{(b?.recordCounts?.promptVersions || 0) - (a?.recordCounts?.promptVersions || 0) >= 0 ? "+" : ""}{(b?.recordCounts?.promptVersions || 0) - (a?.recordCounts?.promptVersions || 0)}</strong><small>Local versions</small></div><div><strong>{changedPrompts.length}</strong><small>Prompt states changed</small></div></div>{changedPrompts.length ? <div className="changed-prompt-list">{changedPrompts.slice(0, 10).map((id) => <span key={id}>{b?.snapshot?.prompts?.[id]?.title || a?.snapshot?.prompts?.[id]?.title || id}</span>)}</div> : <p className="muted-copy">No prompt state changed between these snapshots.</p>}</section> : null}

      <section className="versions-timeline-section"><div className="section-heading"><div><span className="eyebrow">Release history</span><h2>{versions.length} Global Version{versions.length === 1 ? "" : "s"}</h2></div></div>{versions.length ? <div className="global-version-timeline">{versions.map((version, index) => <article key={version.id} className="global-version-row"><div className="global-version-rail"><span /><i /></div><button className="global-version-row__main" onClick={() => setBrowse(version)}><div><span className="global-version-id">{version.displayId || `GV-${version.versionNumber}`}</span>{index === 0 ? <Badge tone="success">Latest</Badge> : null}</div><h3>{version.title}</h3><p>{version.summary || "No release summary."}</p><div className="global-version-row__meta"><span>{formatDate(version.commitTimestamp)}</span><span>{version.recordCounts?.prompts || 0} prompts</span><span>{version.recordCounts?.promptVersions || 0} local versions</span></div></button><ActionMenu items={[{ label: "Browse snapshot", icon: <Eye size={15} />, onSelect: () => setBrowse(version) }, { label: "Download JSON", icon: <Download size={15} />, disabled: !version.snapshot, onSelect: () => version.snapshot && downloadJson(`${version.displayId}.json`, version.snapshot) }, { label: "Edit metadata", icon: <Pencil size={15} />, onSelect: () => openEdit("globalCommits", version.id) }, { label: "Archive", icon: <Archive size={15} />, onSelect: () => requestArchive("globalCommits", version.id), separatorBefore: true }, { label: "Delete", icon: <Trash2 size={15} />, onSelect: () => requestDelete("globalCommits", version.id), danger: true }]} /></article>)}</div> : <div className="empty-surface"><Camera size={28} /><h2>No Global Versions yet</h2><p>Release the current vault when you want a durable baseline.</p><Button variant="primary" onClick={() => setReleaseOpen(true)}>Release first version</Button></div>}</section>

      <Modal open={releaseOpen} onClose={() => setReleaseOpen(false)} title="Release Global Version" description="Capture the complete current vault as an immutable baseline." size="md" footer={<><Button variant="ghost" onClick={() => setReleaseOpen(false)}>Cancel</Button><Button variant="primary" loading={releasing} icon={<Camera size={16} />} onClick={() => void release()}>Release snapshot</Button></>}><div className="entity-form"><label className="form-field"><span>Version title</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`Global Version ${versions.length + 1}`} /></label><label className="form-field"><span>Release summary</span><textarea rows={6} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="What does this vault baseline represent?" /></label></div></Modal>

      <Modal open={Boolean(browse)} onClose={() => setBrowse(null)} title={browse ? `${browse.displayId} · ${browse.title}` : "Global Version"} description={browse ? formatDate(browse.commitTimestamp) : undefined} size="xl" footer={browse?.snapshot ? <Button icon={<Download size={16} />} onClick={() => browse.snapshot && downloadJson(`${browse.displayId}.json`, browse.snapshot)}>Download snapshot JSON</Button> : undefined}>{browse ? <div className="snapshot-browser"><div className="snapshot-counts snapshot-counts--modal">{Object.entries(browse.recordCounts || {}).map(([key, value]) => <span key={key}><strong>{value}</strong><small>{key}</small></span>)}</div><section><h3>Prompts in this snapshot</h3><div className="snapshot-list">{Object.values(browse.snapshot?.prompts || {}).sort((x, y) => x.title.localeCompare(y.title)).map((prompt) => <div key={prompt.id}><FileCode2 size={15} /><span><strong>{prompt.title}</strong><small>{prompt.description || prompt.purpose}</small></span></div>)}</div></section></div> : null}</Modal>
    </div>
  );
}
