import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { useVault } from "../../context/VaultContext";
import { COLLECTION_LABELS } from "../../lib/constants";
import {
  activeRecords,
  cleanText,
  promptPath,
  recordTitle,
  scopeLabel,
  taskPath,
} from "../../lib/utils";
import type {
  CollectionName,
  EntityDialogState,
  VaultRecord,
} from "../../types/domain";
import { Button } from "../ui/Button";
import { FormField } from "../ui/FormField";
import { Modal } from "../ui/Modal";

interface FormState {
  [key: string]: string | string[];
}

function recordToForm(record: VaultRecord | undefined, defaults?: Record<string, string>): FormState {
  const result: FormState = { ...(defaults || {}) };
  if (!record) return result;
  Object.entries(record).forEach(([key, value]) => {
    if (typeof value === "string") result[key] = value;
    if (typeof value === "number" && key === "commitTimestamp") {
      result[key] = new Date(value).toISOString().slice(0, 16);
    }
    if (Array.isArray(value)) result[key] = value.map(String);
  });
  return result;
}

function text(form: FormState, key: string): string {
  const value = form[key];
  return Array.isArray(value) ? value.join(",") : String(value ?? "");
}

function list(form: FormState, key: string): string[] {
  const value = form[key];
  return Array.isArray(value) ? value : value ? [String(value)] : [];
}

function TextInput({
  label,
  name,
  form,
  setForm,
  required,
  hint,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  form: FormState;
  setForm: (next: FormState) => void;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <FormField label={label} required={required} hint={hint}>
      {(props) => (
        <input
          {...props}
          type={type}
          value={text(form, name)}
          placeholder={placeholder}
          required={required}
          onChange={(event) => setForm({ ...form, [name]: event.target.value })}
        />
      )}
    </FormField>
  );
}

function TextArea({
  label,
  name,
  form,
  setForm,
  required,
  hint,
  rows = 5,
  code,
}: {
  label: string;
  name: string;
  form: FormState;
  setForm: (next: FormState) => void;
  required?: boolean;
  hint?: string;
  rows?: number;
  code?: boolean;
}) {
  return (
    <FormField label={label} required={required} hint={hint}>
      {(props) => (
        <textarea
          {...props}
          className={code ? "code-input" : undefined}
          rows={rows}
          value={text(form, name)}
          required={required}
          onChange={(event) => setForm({ ...form, [name]: event.target.value })}
        />
      )}
    </FormField>
  );
}

function SelectField({
  label,
  name,
  form,
  setForm,
  options,
  required,
  hint,
  disabled,
}: {
  label: string;
  name: string;
  form: FormState;
  setForm: (next: FormState) => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <FormField label={label} required={required} hint={hint}>
      {(props) => (
        <select
          {...props}
          value={text(form, name)}
          required={required}
          disabled={disabled}
          onChange={(event) => setForm({ ...form, [name]: event.target.value })}
        >
          <option value="">Select…</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FormField>
  );
}

function MultiSelectField({
  label,
  name,
  form,
  setForm,
  options,
  hint,
}: {
  label: string;
  name: string;
  form: FormState;
  setForm: (next: FormState) => void;
  options: Array<{ value: string; label: string }>;
  hint?: string;
}) {
  return (
    <FormField label={label} hint={hint}>
      {(props) => (
        <select
          {...props}
          multiple
          className="multi-select"
          value={list(form, name)}
          onChange={(event) =>
            setForm({
              ...form,
              [name]: Array.from(event.target.selectedOptions, (option: HTMLOptionElement) => option.value),
            })
          }
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FormField>
  );
}

export function EntityDialog({
  state,
  onClose,
}: {
  state: EntityDialogState | null;
  onClose: () => void;
}) {
  const { data, createRecord, updateRecord } = useVault();
  const [form, setForm] = useState<FormState>({});
  const [saving, setSaving] = useState(false);

  const record = state?.id ? (data[state.kind][state.id] as VaultRecord | undefined) : undefined;
  const isEditing = Boolean(record);

  useEffect(() => {
    if (!state) return;
    const next = recordToForm(record, state.defaults);
    if (state.kind === "promptVersions" && !record) {
      const promptId = String(state.defaults?.promptId || "");
      const prompt = data.prompts[promptId];
      next.promptId = promptId;
      next.content = prompt?.content || "";
      next.versionLabel = `Version ${activeRecords(data.promptVersions).filter((v) => v.promptId === promptId).length + 1}`;
    }
    if ((state.kind === "localCommits" || state.kind === "globalCommits") && !record) {
      const prefix = state.kind === "localCommits" ? "LC" : "GV";
      const count = activeRecords(data[state.kind] as Record<string, VaultRecord>).length + 1;
      next.displayId = `${prefix}-${String(count).padStart(4, "0")}`;
      next.commitTimestamp = new Date().toISOString().slice(0, 16);
    }
    if (state.kind === "decisions" && !record) next.status = "Open";
    if ((state.kind === "mindsets" || state.kind === "preferences") && !record) next.scopeType = "global";
    setForm(next);
  }, [state, record, data.promptVersions, data.prompts, data.localCommits, data.globalCommits]);

  const options = useMemo(() => ({
    endeavors: activeRecords(data.endeavors).map((item) => ({ value: item.id, label: item.name })),
    tasks: activeRecords(data.tasks).map((item) => ({ value: item.id, label: taskPath(data, item.id) })),
    prompts: activeRecords(data.prompts).map((item) => ({ value: item.id, label: promptPath(data, item.id) })),
    localCommits: activeRecords(data.localCommits).map((item) => ({ value: item.id, label: `${item.displayId} — ${item.message}` })),
  }), [data]);

  if (!state) return null;
  const dialogState = state;


  const scopeType = text(form, "scopeType");
  const scopeOptions =
    scopeType === "endeavor"
      ? options.endeavors
      : scopeType === "task"
        ? options.tasks
        : scopeType === "prompt"
          ? options.prompts
          : [];

  const artifactOptions = [
    ...options.endeavors.map((item) => ({ value: `endeavors:${item.value}`, label: `Endeavor — ${item.label}` })),
    ...options.tasks.map((item) => ({ value: `tasks:${item.value}`, label: `Task — ${item.label}` })),
    ...options.prompts.map((item) => ({ value: `prompts:${item.value}`, label: `Prompt — ${item.label}` })),
  ];

  function required(name: string, label: string, max = 10_000): string {
    const value = cleanText(text(form, name), max);
    if (!value) throw new Error(`${label} is required.`);
    return value;
  }

  function payloadFor(kind: CollectionName): Record<string, unknown> {
    if (kind === "endeavors") return {
      name: required("name", "Endeavor name", 160),
      description: cleanText(text(form, "description"), 5_000),
      manualAgenticSummary: cleanText(text(form, "manualAgenticSummary"), 5_000),
    };
    if (kind === "tasks") {
      const nextEndeavor = required("endeavorId", "Endeavor");
      return {
        name: required("name", "Task name", 160),
        description: cleanText(text(form, "description"), 5_000),
        purpose: required("purpose", "Task purpose", 3_000),
        endeavorId: nextEndeavor,
        manualSuggestedImprovement: cleanText(text(form, "manualSuggestedImprovement"), 5_000),
      };
    }
    if (kind === "prompts") return {
      title: required("title", "Prompt title", 160),
      description: required("description", "High-level description", 5_000),
      purpose: required("purpose", "Prompt purpose", 3_000),
      content: required("content", "Prompt content", 50_000),
      taskId: required("taskId", "Task"),
      manualAgenticSummary: cleanText(text(form, "manualAgenticSummary"), 5_000),
      manualSuggestedImprovement: cleanText(text(form, "manualSuggestedImprovement"), 5_000),
      manualAiEvaluation: cleanText(text(form, "manualAiEvaluation"), 5_000),
      manualGeneratedContext: cleanText(text(form, "manualGeneratedContext"), 10_000),
    };
    if (kind === "promptVersions") {
      const currentVersion = dialogState.id ? data.promptVersions[dialogState.id] : undefined;
      const content = required("content", "Version content", 50_000);
      const payload: Record<string, unknown> = {
        promptId: required("promptId", "Prompt"),
        versionLabel: required("versionLabel", "Version label", 120),
        content,
        changeDescription: required("changeDescription", "Change description", 5_000),
        changedFields: currentVersion?.changedFields || ["content"],
        source: currentVersion?.source || "manual",
        changeType: currentVersion?.changeType || "manual",
        localCommitId: text(form, "localCommitId"),
      };
      if (currentVersion?.versionNumber !== undefined) payload.versionNumber = currentVersion.versionNumber;
      if (currentVersion?.snapshot) payload.snapshot = { ...currentVersion.snapshot, content };
      return payload;
    }
    if (kind === "mindsets") {
      const nextScope = required("scopeType", "Scope type");
      return {
        title: required("title", "Mindset title", 160),
        content: required("content", "Mindset content", 15_000),
        scopeType: nextScope,
        scopeId: nextScope === "global" ? "" : required("scopeId", "Scope"),
        manualAiGeneratedMindset: cleanText(text(form, "manualAiGeneratedMindset"), 10_000),
        sourcePromptIds: dialogState.id ? data.mindsets[dialogState.id]?.sourcePromptIds || [] : [],
        constructionMethod: dialogState.id ? data.mindsets[dialogState.id]?.constructionMethod || "manual" : "manual",
      };
    }
    if (kind === "preferences") {
      const nextScope = required("scopeType", "Scope type");
      return {
        title: required("title", "Preference title", 160),
        instruction: required("instruction", "Preference instruction", 10_000),
        scopeType: nextScope,
        scopeId: nextScope === "global" ? "" : required("scopeId", "Scope"),
      };
    }
    if (kind === "localCommits") {
      const displayId = required("displayId", "Commit identifier", 80);
      const duplicate = Object.values(data.localCommits).some((commit) => commit.id !== dialogState.id && commit.displayId.toLowerCase() === displayId.toLowerCase());
      if (duplicate) throw new Error("That local commit identifier already exists.");
      return {
        displayId,
        message: required("message", "Commit message", 240),
        authorName: required("authorName", "Author", 160),
        taskId: required("taskId", "Task"),
        changedArtifacts: list(form, "changedArtifacts"),
        description: required("description", "Change description", 10_000),
        commitToCommitSummary: cleanText(text(form, "commitToCommitSummary"), 10_000),
        previousState: cleanText(text(form, "previousState"), 20_000),
        resultingState: cleanText(text(form, "resultingState"), 20_000),
        commitTimestamp: new Date(required("commitTimestamp", "Commit timestamp")).getTime(),
      };
    }
    if (kind === "globalCommits") {
      const currentVersion = dialogState.id ? data.globalCommits[dialogState.id] : undefined;
      return {
        displayId: currentVersion?.displayId || required("displayId", "Global version identifier", 80),
        title: required("title", "Global version title", 240),
        authorName: currentVersion?.authorName || required("authorName", "Author", 160),
        summary: cleanText(text(form, "summary"), 10_000),
        commitToCommitSummary: cleanText(text(form, "commitToCommitSummary"), 10_000),
        commitTimestamp: currentVersion?.commitTimestamp || new Date(required("commitTimestamp", "Version timestamp")).getTime(),
      };
    }
    return {
      title: required("title", "Decision title", 200),
      category: required("category", "Category", 120),
      status: required("status", "Status"),
      question: required("question", "Research question", 5_000),
      resolution: cleanText(text(form, "resolution"), 10_000),
      notes: cleanText(text(form, "notes"), 10_000),
    };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = payloadFor(dialogState.kind);
      if (isEditing && dialogState.id) {
        await updateRecord(dialogState.kind, dialogState.id, payload);
      } else {
        await createRecord(dialogState.kind, payload as never);
      }
      toast.success(`${COLLECTION_LABELS[dialogState.kind]} ${isEditing ? "updated" : "created"}.`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The record could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  let fields: ReactNode;
  if (dialogState.kind === "endeavors") fields = <>
    <TextInput label="Endeavor name" name="name" form={form} setForm={setForm} required />
    <TextArea label="Description" name="description" form={form} setForm={setForm} rows={4} />
    <TextArea label="Agentic summary" name="manualAgenticSummary" form={form} setForm={setForm} hint="Manual Release 1 placeholder. Nothing generates this field." />
  </>;
  else if (dialogState.kind === "tasks") fields = <>
    <TextInput label="Task name" name="name" form={form} setForm={setForm} required />
    <SelectField label="Endeavor" name="endeavorId" form={form} setForm={setForm} options={options.endeavors} required />
    <TextArea label="Purpose" name="purpose" form={form} setForm={setForm} required rows={3} />
    <TextArea label="Description" name="description" form={form} setForm={setForm} rows={4} />
    <TextArea label="Suggested improvement" name="manualSuggestedImprovement" form={form} setForm={setForm} hint="Manual future-AI placeholder." />
  </>;
  else if (dialogState.kind === "prompts") fields = <>
    <TextInput label="Prompt title" name="title" form={form} setForm={setForm} required />
    <SelectField label="Task" name="taskId" form={form} setForm={setForm} options={options.tasks} required />
    <TextArea label="High-level description" name="description" form={form} setForm={setForm} required rows={4} hint="Explain the prompt's role without requiring the reader to inspect its full content." />
    <TextArea label="Purpose / function" name="purpose" form={form} setForm={setForm} required rows={3} />
    <TextArea label="Prompt content" name="content" form={form} setForm={setForm} required rows={14} code />
    <div className="form-section"><span>Manual future-AI placeholders</span><p>These fields are editable text only. They do not call or connect to an AI model.</p></div>
    <TextArea label="Agentic summary" name="manualAgenticSummary" form={form} setForm={setForm} />
    <TextArea label="Suggested improvement" name="manualSuggestedImprovement" form={form} setForm={setForm} />
    <TextArea label="AI evaluation" name="manualAiEvaluation" form={form} setForm={setForm} />
    <TextArea label="Generated context" name="manualGeneratedContext" form={form} setForm={setForm} rows={6} />
  </>;
  else if (dialogState.kind === "promptVersions") fields = <>
    <SelectField label="Prompt" name="promptId" form={form} setForm={setForm} options={options.prompts} required disabled={isEditing} />
    <TextInput label="Version label" name="versionLabel" form={form} setForm={setForm} required />
    <TextArea label="Change description" name="changeDescription" form={form} setForm={setForm} required rows={4} />
    <TextArea label="Preserved version content" name="content" form={form} setForm={setForm} required rows={16} code />
    <div className="inline-callout warning"><strong>Historical snapshot</strong><span>Editing this record changes saved history. Normal prompt edits create new versions automatically and do not modify prior versions.</span></div>
  </>;
  else if (dialogState.kind === "mindsets") fields = <>
    <TextInput label="Mindset title" name="title" form={form} setForm={setForm} required />
    <SelectField label="Scope type" name="scopeType" form={form} setForm={(next) => setForm({ ...next, scopeId: "" })} options={[
      { value: "global", label: "Global" }, { value: "endeavor", label: "Endeavor" }, { value: "task", label: "Task" }, { value: "prompt", label: "Prompt" },
    ]} required />
    {scopeType !== "global" ? <SelectField label="Scope" name="scopeId" form={form} setForm={setForm} options={scopeOptions} required /> : null}
    <TextArea label="Mindset content" name="content" form={form} setForm={setForm} required rows={10} />
    <TextArea label="AI-generated mindset placeholder" name="manualAiGeneratedMindset" form={form} setForm={setForm} hint="Manual text only in Release 1." />
  </>;
  else if (dialogState.kind === "preferences") fields = <>
    <TextInput label="Preference title" name="title" form={form} setForm={setForm} required />
    <SelectField label="Scope type" name="scopeType" form={form} setForm={(next) => setForm({ ...next, scopeId: "" })} options={[
      { value: "global", label: "Global" }, { value: "endeavor", label: "Endeavor" }, { value: "task", label: "Task" },
    ]} required />
    {scopeType !== "global" ? <SelectField label="Scope" name="scopeId" form={form} setForm={setForm} options={scopeOptions} required /> : null}
    <TextArea label="Instruction" name="instruction" form={form} setForm={setForm} required rows={10} />
    <div className="inline-callout warning"><strong>Precedence remains open.</strong><span>The app displays applicable preferences together without silently choosing an override rule.</span></div>
  </>;
  else if (dialogState.kind === "localCommits") fields = <>
    <div className="form-grid form-grid--2">
      <TextInput label="Unique identifier" name="displayId" form={form} setForm={setForm} required />
      <TextInput label="Commit timestamp" name="commitTimestamp" form={form} setForm={setForm} required type="datetime-local" />
    </div>
    <TextInput label="Commit message" name="message" form={form} setForm={setForm} required />
    <div className="form-grid form-grid--2">
      <TextInput label="Author" name="authorName" form={form} setForm={setForm} required />
      <SelectField label="Related task" name="taskId" form={form} setForm={setForm} options={options.tasks} required />
    </div>
    <MultiSelectField label="Changed artifacts" name="changedArtifacts" form={form} setForm={setForm} options={artifactOptions} hint="Hold Ctrl/Cmd to select multiple records." />
    <TextArea label="Description of the change" name="description" form={form} setForm={setForm} required rows={6} />
    <div className="form-grid form-grid--2">
      <TextArea label="Previous state" name="previousState" form={form} setForm={setForm} rows={7} code />
      <TextArea label="Resulting state" name="resultingState" form={form} setForm={setForm} rows={7} code />
    </div>
    <TextArea label="Commit-to-commit summary" name="commitToCommitSummary" form={form} setForm={setForm} rows={5} hint="Explain the meaning of the change, not only raw field differences." />
  </>;
  else if (dialogState.kind === "globalCommits") fields = <>
    <div className="form-grid form-grid--2">
      <TextInput label="Global version identifier" name="displayId" form={form} setForm={setForm} required />
      <TextInput label="Snapshot timestamp" name="commitTimestamp" form={form} setForm={setForm} required type="datetime-local" />
    </div>
    <TextInput label="Global version title" name="title" form={form} setForm={setForm} required />
    <TextInput label="Author" name="authorName" form={form} setForm={setForm} required />
    <TextArea label="Summary" name="summary" form={form} setForm={setForm} rows={7} />
    <TextArea label="Version-to-version summary" name="commitToCommitSummary" form={form} setForm={setForm} rows={5} />
    <div className="inline-callout"><strong>The captured snapshot is immutable here.</strong><span>This form edits only the global version metadata. It does not rewrite the stored vault snapshot.</span></div>
  </>;
  else fields = <>
    <div className="form-grid form-grid--2">
      <TextInput label="Decision title" name="title" form={form} setForm={setForm} required />
      <TextInput label="Category" name="category" form={form} setForm={setForm} required />
    </div>
    <SelectField label="Status" name="status" form={form} setForm={setForm} options={[{ value: "Open", label: "Open" }, { value: "Finalized", label: "Finalized" }]} required />
    <TextArea label="Research question" name="question" form={form} setForm={setForm} required rows={5} hint="Every research question must have an explicit Open or Finalized status." />
    <TextArea label="Resolution" name="resolution" form={form} setForm={setForm} rows={5} />
    <TextArea label="Notes" name="notes" form={form} setForm={setForm} rows={5} />
  </>;

  const descriptor = isEditing ? recordTitle(dialogState.kind, record) : `New ${COLLECTION_LABELS[dialogState.kind].toLowerCase()}`;
  const subtitle = dialogState.kind === "mindsets" || dialogState.kind === "preferences"
    ? scopeLabel(data, text(form, "scopeType"), text(form, "scopeId"))
    : undefined;

  return (
    <Modal
      open
      onClose={onClose}
      title={`${isEditing ? "Edit" : "Create"} ${COLLECTION_LABELS[dialogState.kind].toLowerCase()}`}
      description={subtitle ? `${descriptor} · ${subtitle}` : descriptor}
      size={dialogState.kind === "prompts" || dialogState.kind.includes("Commits") ? "xl" : "lg"}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={saving} icon={<Save size={17} />} type="submit" form="entity-form">Save {COLLECTION_LABELS[dialogState.kind].toLowerCase()}</Button>
      </>}
    >
      <form id="entity-form" onSubmit={submit} className="entity-form">{fields}</form>
    </Modal>
  );
}
