import { useMemo, useState } from "react";
import { Copy, FileCode2, History, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useVault } from "../context/VaultContext";
import { activeRecords, matchesPromptWords, taskPath } from "../lib/utils";
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
  const { data, copyPrompt } = useVault();
  const { openCreate, openEdit, requestArchive, requestDelete } = useEntityUi();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [query, setQuery] = useState("");
  const [copyingId, setCopyingId] = useState("");

  const prompts = useMemo(() => {
    const versions = Object.values(data.promptVersions);
    return activeRecords(data.prompts).filter((prompt) =>
      matchesPromptWords(
        prompt,
        versions.filter((version) => version.promptId === prompt.id),
        query,
      ),
    );
  }, [data.promptVersions, data.prompts, query]);

  async function duplicate(promptId: string) {
    setCopyingId(promptId);
    try {
      const newId = await copyPrompt(promptId);
      toast.success("Prompt copied with a new independent version history.");
      setSelection({ collection: "prompts", id: newId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The prompt could not be copied.");
    } finally {
      setCopyingId("");
    }
  }

  return <>
    <PageHeader
      eyebrow="Vault-wide prompt library"
      title="Prompts"
      description="Search every prompt by words across title, purpose, description, content, and preserved versions. Saving any prompt automatically records a complete local version."
      actions={<Button variant="primary" icon={<Plus size={17} />} onClick={() => openCreate("prompts")}>New prompt</Button>}
    />
    <Card className="filter-bar">
      <label className="search-field">
        <Search size={17} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search prompt words across the whole vault…"
        />
      </label>
    </Card>
    <div className="inline-callout page-callout">
      <strong>Automatic local versioning is active.</strong>
      <span>Creating a prompt records Version 1. Every later save records the complete resulting prompt state as the next version.</span>
    </div>
    {prompts.length ? <div className="entity-grid">{prompts.map((prompt) => {
      const versions = Object.values(data.promptVersions).filter((version) => version.promptId === prompt.id).length;
      return <EntityCard
        key={prompt.id}
        title={prompt.title}
        meta={taskPath(data, prompt.taskId)}
        excerpt={prompt.description}
        icon={<FileCode2 />}
        badges={<><Badge tone="info" icon={<History size={13} />}>{versions} version{versions === 1 ? "" : "s"}</Badge><Badge tone="success">Auto-tracked</Badge></>}
        extraActions={<Button
          variant="ghost"
          size="sm"
          loading={copyingId === prompt.id}
          icon={<Copy size={15} />}
          onClick={() => duplicate(prompt.id)}
        >Copy</Button>}
        onOpen={() => setSelection({ collection: "prompts", id: prompt.id })}
        onEdit={() => openEdit("prompts", prompt.id)}
        onArchive={() => requestArchive("prompts", prompt.id)}
        onDelete={() => requestDelete("prompts", prompt.id)}
      />;
    })}</div> : <Card><EmptyState
      icon={<FileCode2 />}
      title={query ? "No prompt contains all search words" : "No prompts yet"}
      description={query ? "The search checks all prompts and their saved version content, regardless of endeavor or task." : "Create a prompt to start its automatic local history."}
      action={!query ? <Button variant="primary" onClick={() => openCreate("prompts")}>Create prompt</Button> : undefined}
    /></Card>}
    <RecordDetailDrawer selection={selection} onClose={() => setSelection(null)} />
  </>;
}
