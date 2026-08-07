import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onValue, push, ref, update } from "firebase/database";
import { toast } from "sonner";
import { database, VAULT_ROOT } from "../lib/firebase";
import { EMPTY_COLLECTIONS } from "../lib/constants";
import {
  archiveBlockers,
  cleanText,
  deleteBlockers,
  promptChangedFields,
  promptSnapshot,
} from "../lib/utils";
import { useAuth } from "./AuthContext";
import type {
  CollectionName,
  Decision,
  Endeavor,
  GlobalCommit,
  GlobalVersionSnapshot,
  LocalCommit,
  Mindset,
  Preference,
  Prompt,
  PromptSnapshot,
  PromptVersion,
  RecordInput,
  Task,
  UserStamp,
  VaultCollections,
  VaultRecord,
  WorkspaceProfile,
} from "../types/domain";

type ConnectionState = "idle" | "connecting" | "connected" | "error";

interface VaultContextValue {
  data: VaultCollections;
  profile: WorkspaceProfile | null;
  loading: boolean;
  connection: ConnectionState;
  createRecord: <T extends VaultRecord>(collection: CollectionName, input: RecordInput<T>) => Promise<string>;
  updateRecord: (collection: CollectionName, id: string, patch: Record<string, unknown>) => Promise<void>;
  archiveRecord: (collection: CollectionName, id: string) => Promise<void>;
  deleteRecord: (collection: CollectionName, id: string) => Promise<void>;
  restoreRecord: (collection: CollectionName, id: string) => Promise<void>;
  copyPrompt: (promptId: string) => Promise<string>;
  createGlobalVersion: (title: string, summary: string) => Promise<string>;
  saveProfile: (patch: Partial<WorkspaceProfile>) => Promise<void>;
  exportWorkspace: () => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

function normalizeCollection<T extends VaultRecord>(value: unknown): Record<string, T> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, Omit<T, "id">>).map(([id, record]) => [
      id,
      { id, ...(record || {}) } as T,
    ]),
  );
}

function normalizeDecisions(value: unknown): Record<string, Decision> {
  const decisions = normalizeCollection<Decision>(value);
  return Object.fromEntries(
    Object.entries(decisions).map(([id, decision]) => {
      if (decision.title === "Unlimited nested folders") {
        return [id, {
          ...decision,
          title: "Direct hierarchy",
          question: "Direct hierarchy",
          status: "Finalized",
          resolution: "The hierarchy is Endeavor → Task → Prompt → Prompt version.",
          notes: "Updated from the previous seeded hierarchy decision.",
        } as Decision] as const;
      }
      if (decision.title === "Prompt-version creation behavior") {
        return [id, {
          ...decision,
          title: "Automatic prompt history",
          question: "Automatic prompt history",
          status: "Finalized",
          resolution: "Every prompt creation and every saved prompt change automatically creates a complete prompt snapshot in that prompt's local history.",
          notes: "Finalized by the vault owner on 2026-08-06.",
        } as Decision] as const;
      }
      if (decision.title === "Two commit levels") {
        return [id, {
          ...decision,
          title: "Prompt-local and vault-global versions",
          question: "Prompt-local and vault-global versions",
          status: "Finalized",
          resolution: "Each prompt has automatic local versions. The owner can explicitly release a global version containing the current vault snapshot.",
          notes: "Replaces the earlier manual local/global commit workflow.",
        } as Decision] as const;
      }
      return [id, decision] as const;
    }),
  );
}

function userStamp(user: NonNullable<ReturnType<typeof useAuth>["user"]>): UserStamp {
  return {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || user.email || "User",
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function snapshotRecordFromInput(input: Record<string, unknown>): PromptSnapshot {
  return promptSnapshot({
    title: String(input.title || ""),
    description: String(input.description || ""),
    purpose: String(input.purpose || ""),
    content: String(input.content || ""),
    taskId: String(input.taskId || ""),
    manualAgenticSummary: String(input.manualAgenticSummary || ""),
    manualSuggestedImprovement: String(input.manualSuggestedImprovement || ""),
    manualAiEvaluation: String(input.manualAiEvaluation || ""),
    manualGeneratedContext: String(input.manualGeneratedContext || ""),
  });
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<VaultCollections>(EMPTY_COLLECTIONS as VaultCollections);
  const [profile, setProfile] = useState<WorkspaceProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(user));
  const [connection, setConnection] = useState<ConnectionState>("idle");

  useEffect(() => {
    if (!user) {
      setData(EMPTY_COLLECTIONS as VaultCollections);
      setProfile(null);
      setLoading(false);
      setConnection("idle");
      return;
    }

    setLoading(true);
    setConnection("connecting");
    const workspaceRef = ref(database, `${VAULT_ROOT}/${user.uid}`);
    return onValue(
      workspaceRef,
      (snapshot) => {
        const value = snapshot.val() || {};
        setProfile(value.profile || null);
        setData({
          endeavors: normalizeCollection<Endeavor>(value.endeavors),
          tasks: normalizeCollection<Task>(value.tasks),
          prompts: normalizeCollection<Prompt>(value.prompts),
          promptVersions: normalizeCollection<PromptVersion>(value.promptVersions),
          mindsets: normalizeCollection<Mindset>(value.mindsets),
          preferences: normalizeCollection<Preference>(value.preferences),
          localCommits: normalizeCollection<LocalCommit>(value.localCommits),
          globalCommits: normalizeCollection<GlobalCommit>(value.globalCommits),
          decisions: normalizeDecisions(value.decisions),
        });
        setLoading(false);
        setConnection("connected");
      },
      (error) => {
        console.error(error);
        setLoading(false);
        setConnection("error");
        toast.error("Firebase could not load this workspace.", {
          description: error.message,
        });
      },
    );
  }, [user]);

  const createRecord = useCallback(
    async <T extends VaultRecord>(collection: CollectionName, input: RecordInput<T>) => {
      if (!user) throw new Error("A signed-in user is required.");
      const itemRef = push(ref(database, `${VAULT_ROOT}/${user.uid}/${collection}`));
      if (!itemRef.key) throw new Error("Firebase could not allocate a record identifier.");
      const now = Date.now();
      const stamp = userStamp(user);
      const record = {
        ...input,
        id: itemRef.key,
        createdAt: now,
        updatedAt: now,
        createdBy: stamp,
        updatedBy: stamp,
        archivedAt: null,
        archivedBy: null,
      };

      if (collection === "prompts") {
        const versionRef = push(ref(database, `${VAULT_ROOT}/${user.uid}/promptVersions`));
        if (!versionRef.key) throw new Error("Firebase could not allocate a prompt version identifier.");
        const snapshot = snapshotRecordFromInput(input as unknown as Record<string, unknown>);
        await update(ref(database), {
          [`${VAULT_ROOT}/${user.uid}/prompts/${itemRef.key}`]: record,
          [`${VAULT_ROOT}/${user.uid}/promptVersions/${versionRef.key}`]: {
            id: versionRef.key,
            promptId: itemRef.key,
            versionLabel: "Version 1",
            versionNumber: 1,
            content: snapshot.content,
            snapshot,
            changeDescription: "Initial prompt snapshot created automatically.",
            changedFields: Object.keys(snapshot),
            source: "automatic",
            changeType: "created",
            localCommitId: "",
            createdAt: now,
            updatedAt: now,
            createdBy: stamp,
            updatedBy: stamp,
            archivedAt: null,
            archivedBy: null,
          },
        });
        return itemRef.key;
      }

      await update(ref(database), {
        [`${VAULT_ROOT}/${user.uid}/${collection}/${itemRef.key}`]: record,
      });
      return itemRef.key;
    },
    [user],
  );

  const updateRecord = useCallback(
    async (collection: CollectionName, id: string, patch: Record<string, unknown>) => {
      if (!user) throw new Error("A signed-in user is required.");
      if (!id) throw new Error("A record identifier is required.");
      const now = Date.now();
      const stamp = userStamp(user);

      if (collection === "prompts") {
        const current = data.prompts[id];
        if (!current) throw new Error("The prompt could not be found.");
        const versionedFields = new Set([
          "title",
          "description",
          "purpose",
          "content",
          "taskId",
          "manualAgenticSummary",
          "manualSuggestedImprovement",
          "manualAiEvaluation",
          "manualGeneratedContext",
        ]);
        const changesPromptState = Object.keys(patch).some((key) => versionedFields.has(key));
        if (!changesPromptState) {
          await update(ref(database, `${VAULT_ROOT}/${user.uid}/prompts/${id}`), {
            ...patch,
            updatedAt: now,
            updatedBy: stamp,
          });
          return;
        }
        const previousSnapshot = promptSnapshot(current);
        const nextSnapshot = snapshotRecordFromInput({ ...previousSnapshot, ...patch });
        const changedFields = promptChangedFields(previousSnapshot, nextSnapshot);
        if (!changedFields.length) return;
        const versionRef = push(ref(database, `${VAULT_ROOT}/${user.uid}/promptVersions`));
        if (!versionRef.key) throw new Error("Firebase could not allocate a prompt version identifier.");
        const versionNumber = Object.values(data.promptVersions).filter((version) => version.promptId === id).length + 1;
        await update(ref(database), {
          [`${VAULT_ROOT}/${user.uid}/prompts/${id}`]: {
            ...current,
            ...patch,
            updatedAt: now,
            updatedBy: stamp,
          },
          [`${VAULT_ROOT}/${user.uid}/promptVersions/${versionRef.key}`]: {
            id: versionRef.key,
            promptId: id,
            versionLabel: `Version ${versionNumber}`,
            versionNumber,
            content: nextSnapshot.content,
            snapshot: nextSnapshot,
            changeDescription: `Automatic snapshot after changing: ${changedFields.join(", ")}.`,
            changedFields,
            source: "automatic",
            changeType: "updated",
            localCommitId: "",
            createdAt: now,
            updatedAt: now,
            createdBy: stamp,
            updatedBy: stamp,
            archivedAt: null,
            archivedBy: null,
          },
        });
        return;
      }

      await update(ref(database, `${VAULT_ROOT}/${user.uid}/${collection}/${id}`), {
        ...patch,
        updatedAt: now,
        updatedBy: stamp,
      });
    },
    [data.prompts, data.promptVersions, user],
  );

  const copyPrompt = useCallback(
    async (promptId: string) => {
      const source = data.prompts[promptId];
      if (!source) throw new Error("The prompt to copy could not be found.");
      const existingTitles = new Set(Object.values(data.prompts).map((prompt) => prompt.title.toLowerCase()));
      let title = `${source.title} (Copy)`;
      let copyNumber = 2;
      while (existingTitles.has(title.toLowerCase())) {
        title = `${source.title} (Copy ${copyNumber})`;
        copyNumber += 1;
      }
      return createRecord<Prompt>("prompts", {
        title,
        description: source.description,
        purpose: source.purpose,
        content: source.content,
        taskId: source.taskId,
        manualAgenticSummary: source.manualAgenticSummary,
        manualSuggestedImprovement: source.manualSuggestedImprovement,
        manualAiEvaluation: source.manualAiEvaluation,
        manualGeneratedContext: source.manualGeneratedContext,
      });
    },
    [createRecord, data.prompts],
  );

  const createGlobalVersion = useCallback(
    async (title: string, summary: string) => {
      if (!user) throw new Error("A signed-in user is required.");
      const cleanTitle = cleanText(title, 240);
      if (!cleanTitle) throw new Error("Global version title is required.");
      const itemRef = push(ref(database, `${VAULT_ROOT}/${user.uid}/globalCommits`));
      if (!itemRef.key) throw new Error("Firebase could not allocate a global version identifier.");
      const now = Date.now();
      const stamp = userStamp(user);
      const versionNumber = Object.keys(data.globalCommits).length + 1;
      const snapshot: GlobalVersionSnapshot = clone({
        capturedAt: now,
        profile,
        endeavors: data.endeavors,
        tasks: data.tasks,
        prompts: data.prompts,
        promptVersions: data.promptVersions,
        mindsets: data.mindsets,
        preferences: data.preferences,
        localCommits: data.localCommits,
        decisions: data.decisions,
      });
      const recordCounts = {
        endeavors: Object.keys(data.endeavors).length,
        tasks: Object.keys(data.tasks).length,
        prompts: Object.keys(data.prompts).length,
        promptVersions: Object.keys(data.promptVersions).length,
        mindsets: Object.keys(data.mindsets).length,
        preferences: Object.keys(data.preferences).length,
        decisions: Object.keys(data.decisions).length,
      };
      await update(ref(database), {
        [`${VAULT_ROOT}/${user.uid}/globalCommits/${itemRef.key}`]: {
          id: itemRef.key,
          displayId: `GV-${String(versionNumber).padStart(4, "0")}`,
          title: cleanTitle,
          authorName: stamp.displayName,
          summary: cleanText(summary, 10_000),
          commitToCommitSummary: "",
          commitTimestamp: now,
          versionNumber,
          snapshot,
          recordCounts,
          createdAt: now,
          updatedAt: now,
          createdBy: stamp,
          updatedBy: stamp,
          archivedAt: null,
          archivedBy: null,
        },
      });
      return itemRef.key;
    },
    [data, profile, user],
  );

  const archiveRecord = useCallback(
    async (collection: CollectionName, id: string) => {
      if (!user) throw new Error("A signed-in user is required.");
      const blockers = archiveBlockers(collection, id, data);
      if (blockers.length) {
        throw new Error(`Archive dependent records first: ${blockers.join(", ")}.`);
      }
      await updateRecord(collection, id, {
        archivedAt: Date.now(),
        archivedBy: userStamp(user),
      });
    },
    [data, updateRecord, user],
  );

  const deleteRecord = useCallback(
    async (collection: CollectionName, id: string) => {
      if (!user) throw new Error("A signed-in user is required.");
      if (!id) throw new Error("A record identifier is required.");
      const blockers = deleteBlockers(collection, id, data);
      if (blockers.length) {
        throw new Error(`Delete dependent records first: ${blockers.join(", ")}.`);
      }
      if (collection === "prompts") {
        const writes: Record<string, null> = {
          [`${VAULT_ROOT}/${user.uid}/prompts/${id}`]: null,
        };
        Object.values(data.promptVersions)
          .filter((version) => version.promptId === id)
          .forEach((version) => {
            writes[`${VAULT_ROOT}/${user.uid}/promptVersions/${version.id}`] = null;
          });
        await update(ref(database), writes);
        return;
      }
      await update(ref(database), {
        [`${VAULT_ROOT}/${user.uid}/${collection}/${id}`]: null,
      });
    },
    [data, user],
  );

  const restoreRecord = useCallback(
    async (collection: CollectionName, id: string) => {
      await updateRecord(collection, id, { archivedAt: null, archivedBy: null });
    },
    [updateRecord],
  );

  const saveProfile = useCallback(
    async (patch: Partial<WorkspaceProfile>) => {
      if (!user) throw new Error("A signed-in user is required.");
      const sanitized: Partial<WorkspaceProfile> = { ...patch, updatedAt: Date.now() };
      if (typeof patch.workspaceName === "string") {
        sanitized.workspaceName = cleanText(patch.workspaceName, 160);
        if (!sanitized.workspaceName) throw new Error("Workspace name is required.");
      }
      await update(ref(database, `${VAULT_ROOT}/${user.uid}/profile`), sanitized);
    },
    [user],
  );

  const exportWorkspace = useCallback(() => {
    if (!user) return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            ownerUid: user.uid,
            profile,
            ...data,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `intellectvault-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [data, profile, user]);

  const value = useMemo<VaultContextValue>(
    () => ({
      data,
      profile,
      loading,
      connection,
      createRecord,
      updateRecord,
      archiveRecord,
      deleteRecord,
      restoreRecord,
      copyPrompt,
      createGlobalVersion,
      saveProfile,
      exportWorkspace,
    }),
    [
      data,
      profile,
      loading,
      connection,
      createRecord,
      updateRecord,
      archiveRecord,
      deleteRecord,
      restoreRecord,
      copyPrompt,
      createGlobalVersion,
      saveProfile,
      exportWorkspace,
    ],
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const value = useContext(VaultContext);
  if (!value) throw new Error("useVault must be used inside VaultProvider.");
  return value;
}
