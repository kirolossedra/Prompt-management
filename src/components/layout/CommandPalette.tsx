import { useEffect, useMemo, useRef, useState } from "react";
import { Brain, BrainCircuit, Camera, FileCode2, Network, Plus, Search, Settings2, Share2, SlidersHorizontal, Trophy } from "lucide-react";
import { Dialog } from "radix-ui";
import { useNavigate } from "react-router";
import { useVault } from "../../context/VaultContext";
import { activeRecords, matchesPromptWords, taskPath } from "../../lib/utils";
import { HighlightText } from "../ui/HighlightText";
import { useEntityUi } from "../entities/EntityUiProvider";

const routes = [
  ["Achievements", "/achievements", Trophy],
  ["Vault explorer", "/hierarchy", Network],
  ["Prompt library", "/prompts", FileCode2],
  ["Relationship map", "/relationships", Share2],
  ["Mindsets", "/mindsets", Brain],
  ["Mindset builder", "/mindset-construction", BrainCircuit],
  ["Preferences", "/preferences", SlidersHorizontal],
  ["Global Versions", "/versions", Camera],
  ["Settings", "/settings", Settings2],
] as const;

export function CommandPalette() {
  const navigate = useNavigate();
  const { data } = useVault();
  const { openCreate } = useEntityUi();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const keyListener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); setOpen((value) => !value);
      }
    };
    const openListener = () => setOpen(true);
    window.addEventListener("keydown", keyListener);
    window.addEventListener("iv-open-command", openListener as EventListener);
    return () => { window.removeEventListener("keydown", keyListener); window.removeEventListener("iv-open-command", openListener as EventListener); };
  }, []);

  const prompts = useMemo(() => {
    const versions = activeRecords(data.promptVersions);
    return activeRecords(data.prompts)
      .filter((prompt) => matchesPromptWords(prompt, versions.filter((version) => version.promptId === prompt.id), query))
      .slice(0, query ? 12 : 6);
  }, [data.promptVersions, data.prompts, query]);

  const results = useMemo(() => query.trim()
    ? prompts.map((prompt) => ({ type: "prompt" as const, id: prompt.id, label: prompt.title }))
    : routes.map(([label, path]) => ({ type: "route" as const, id: path, label })), [prompts, query]);

  useEffect(() => setActiveIndex(0), [query, open]);

  function close() { setOpen(false); setQuery(""); }
  function openResult(item: (typeof results)[number]) {
    if (item.type === "prompt") navigate(`/prompts/${item.id}`); else navigate(item.id);
    close();
  }

  return (
    <>
      <button className="command-trigger" onClick={() => setOpen(true)}><Search size={16} /><span>Search prompts or jump to…</span><kbd>⌘ K</kbd></button>
      <Dialog.Root open={open} onOpenChange={(value) => { if (!value) close(); else setOpen(true); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="command-scrim" />
          <Dialog.Content className="command-palette" onOpenAutoFocus={(event) => { event.preventDefault(); inputRef.current?.focus(); }}>
            <Dialog.Title className="sr-only">Search IntellectVault</Dialog.Title>
            <div className="command-input"><Search size={19} /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search every prompt by title, purpose, description, or content…" onKeyDown={(event) => {
              if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((value) => Math.min(results.length - 1, value + 1)); }
              if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((value) => Math.max(0, value - 1)); }
              if (event.key === "Enter" && results[activeIndex]) { event.preventDefault(); openResult(results[activeIndex]); }
            }} /></div>
            <div className="command-results">
              {query ? <span className="command-label">Prompts</span> : <span className="command-label">Jump to</span>}
              {query && !prompts.length ? <div className="command-empty">No prompt contains all of those words.</div> : null}
              {query ? prompts.map((prompt, index) => <button key={prompt.id} className={index === activeIndex ? "active" : ""} onMouseEnter={() => setActiveIndex(index)} onClick={() => openResult({ type: "prompt", id: prompt.id, label: prompt.title })}><FileCode2 size={17} /><span><strong><HighlightText text={prompt.title} query={query} /></strong><small>{taskPath(data, prompt.taskId)}</small></span></button>)
                : routes.map(([label, path, Icon], index) => <button key={path} className={index === activeIndex ? "active" : ""} onMouseEnter={() => setActiveIndex(index)} onClick={() => openResult({ type: "route", id: path, label })}><Icon size={17} /><span><strong>{label}</strong></span></button>)}
              {!query ? <><span className="command-label">Create</span><div className="command-create-grid"><button onClick={() => { openCreate("endeavors"); close(); }}><Plus size={15} /> Endeavor</button><button onClick={() => { openCreate("tasks"); close(); }}><Plus size={15} /> Task</button><button onClick={() => { openCreate("prompts"); close(); }}><Plus size={15} /> Prompt</button><button onClick={() => { openCreate("mindsets"); close(); }}><Plus size={15} /> Mindset</button></div></> : null}
            </div>
            <div className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span><span><kbd>↵</kbd> Open</span><span><kbd>Esc</kbd> Close</span></div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
