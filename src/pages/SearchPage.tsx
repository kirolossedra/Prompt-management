import { useMemo, useState } from "react";
import { FileCode2, Search, SlidersHorizontal } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { useVault } from "../context/VaultContext";
import { activeRecords, matchesPromptWords, taskPath } from "../lib/utils";
import { HighlightText } from "../components/ui/HighlightText";

export function SearchPage() {
  const { data } = useVault();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [endeavor, setEndeavor] = useState("");
  const versions = activeRecords(data.promptVersions);
  const endeavors = activeRecords(data.endeavors);

  const prompts = useMemo(() => activeRecords(data.prompts)
    .filter((prompt) => matchesPromptWords(prompt, versions.filter((version) => version.promptId === prompt.id), query))
    .filter((prompt) => !endeavor || data.tasks[prompt.taskId]?.endeavorId === endeavor), [data.prompts, data.tasks, endeavor, query, versions]);

  return <div className="search-page">
    <header className="workspace-heading workspace-heading--compact"><div><span className="eyebrow">Vault-wide discovery</span><h1>Search</h1><p>Find prompts by any words across titles, purposes, descriptions, content, and saved history.</p></div></header>
    <div className="search-hero"><Search size={21} /><input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setParams(event.target.value ? { q: event.target.value } : {}); }} placeholder="Search every prompt…" /><div className="search-filter"><SlidersHorizontal size={16} /><select value={endeavor} onChange={(event) => setEndeavor(event.target.value)} aria-label="Filter search by endeavor"><option value="">All endeavors</option>{endeavors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div></div>
    <div className="search-result-meta"><span>{query ? `${prompts.length} matching prompt${prompts.length === 1 ? "" : "s"}` : "Start typing to search the entire vault"}</span>{query ? <small>All query words must appear somewhere in the prompt or its history.</small> : null}</div>
    <div className="search-results-list">{query ? prompts.map((prompt) => <button key={prompt.id} onClick={() => navigate(`/prompts/${prompt.id}`)}><span className="artifact-icon"><FileCode2 size={16} /></span><span><strong><HighlightText text={prompt.title} query={query} /></strong><small>{taskPath(data, prompt.taskId)}</small><p><HighlightText text={`${prompt.description} ${prompt.purpose}`.trim() || prompt.content.slice(0, 180)} query={query} /></p></span><span className="version-pill">v{versions.filter((version) => version.promptId === prompt.id).length}</span></button>) : null}</div>
    {query && !prompts.length ? <div className="empty-surface"><Search size={28} /><h2>No prompt contains all those words</h2><p>Try fewer terms or remove the endeavor filter.</p></div> : null}
  </div>;
}
