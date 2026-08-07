import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Archive, Brain, BrainCircuit, BriefcaseBusiness, Camera, Command, FileCode2, Search, Settings2, SlidersHorizontal, Target, X } from "lucide-react";
import { useNavigate } from "react-router";
import { useVault } from "../../context/VaultContext";
import { activeRecords, recordTitle } from "../../lib/utils";
import type { CollectionName, VaultRecord } from "../../types/domain";
import { useEntityUi } from "../entities/EntityUiProvider";

const routes = [
  ["Dashboard", "/dashboard", Target],
  ["Hierarchy", "/hierarchy", BriefcaseBusiness],
  ["Prompts", "/prompts", FileCode2],
  ["Mindsets", "/mindsets", Brain],
  ["Mindset construction", "/mindset-construction", BrainCircuit],
  ["Preferences", "/preferences", SlidersHorizontal],
  ["Versions", "/commits", Camera],
  ["Archive", "/archive", Archive],
  ["Settings", "/settings", Settings2],
] as const;

export function CommandPalette() {
  const navigate = useNavigate();
  const { data } = useVault();
  const { openCreate } = useEntityUi();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const records = useMemo(() => {
    const kinds: CollectionName[] = ["endeavors", "tasks", "prompts", "promptVersions", "mindsets", "preferences", "globalCommits", "decisions"];
    return kinds.flatMap((kind) => activeRecords(data[kind] as Record<string, VaultRecord>).map((record) => ({ kind, record })))
      .filter(({ record }) => !query || JSON.stringify(record).toLowerCase().includes(query.toLowerCase()))
      .slice(0, 8);
  }, [data, query]);

  return <>
    <button className="command-trigger" onClick={() => setOpen(true)}><Search size={16} /><span>Search or jump to…</span><kbd><Command size={12} />K</kbd></button>
    <AnimatePresence>
      {open ? <motion.div className="command-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <button className="command-scrim" aria-label="Close command palette" onClick={() => setOpen(false)} />
        <motion.div className="command-palette" role="dialog" aria-modal="true" initial={{ opacity: 0, y: -12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: .99 }}>
          <div className="command-input"><Search size={18} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records or pages…" /><button aria-label="Close" onClick={() => setOpen(false)}><X size={17} /></button></div>
          <div className="command-results">
            {!query ? <>
              <span className="command-label">Navigate</span>
              {routes.map(([label, path, Icon]) => <button key={path} onClick={() => { navigate(path); setOpen(false); }}><Icon size={17} /><span>{label}</span></button>)}
              <span className="command-label">Create</span>
              <div className="command-create-grid">{(["endeavors", "tasks", "prompts", "mindsets", "preferences"] as CollectionName[]).map((kind) => <button key={kind} onClick={() => { openCreate(kind); setOpen(false); }}>New {kind.slice(0, -1)}</button>)}</div>
            </> : <>
              <span className="command-label">Records</span>
              {records.map(({ kind, record }) => <button key={`${kind}:${record.id}`} onClick={() => { navigate(`/search?q=${encodeURIComponent(query)}`); setOpen(false); }}><Search size={16} /><span><strong>{recordTitle(kind, record)}</strong><small>{kind === "globalCommits" ? "global version" : kind}</small></span></button>)}
              <button onClick={() => { navigate(`/search?q=${encodeURIComponent(query)}`); setOpen(false); }}><Search size={16} /><span>See all results for “{query}”</span></button>
            </>}
          </div>
        </motion.div>
      </motion.div> : null}
    </AnimatePresence>
  </>;
}
