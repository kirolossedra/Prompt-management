import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { increment, onValue, push, ref, update } from "firebase/database";
import { toast } from "sonner";
import { database, VAULT_ROOT } from "../lib/firebase";
import { EMPTY_COLLECTIONS } from "../lib/constants";
import { achievementById, evaluateAchievements } from "../lib/achievements";
import { downloadAttachmentFile, readFileAsBase64, validateAttachmentBatch } from "../lib/attachments";
import { validatePromptRelation } from "../lib/relationships";
import {
  archiveBlockers,
  cleanText,
  deleteBlockers,
  promptChangedFields,
  promptSnapshot,
} from "../lib/utils";
import { useAuth } from "./AuthContext";
import type {
  AchievementId,
  AchievementUnlock,
  ActivityAction,
  ActivityDay,
  ActivityStats,
  CollectionName,
  Decision,
  Endeavor,
  GlobalCommit,
  GlobalVersionSnapshot,
  LocalCommit,
  Mindset,
  Preference,
  Prompt,
  PromptAttachment,
  PromptRelation,
  PromptSnapshot,
  PromptVersion,
  RecordInput,
  Task,
  UserStamp,
  VaultCollections,
  VaultEngagement,
  VaultRecord,
  WorkspaceProfile,
} from "../types/domain";

type ConnectionState = "idle" | "connecting" | "connected" | "error";

interface VaultContextValue {
  data: VaultCollections;
  profile: WorkspaceProfile | null;
  loading: boolean;
  connection: ConnectionState;
  engagement: VaultEngagement;
  createRecord: <T extends VaultRecord>(collection: CollectionName, input: RecordInput<T>) => Promise<string>;
  updateRecord: (collection: CollectionName, id: string, patch: Record<string, unknown>) => Promise<void>;
  archiveRecord: (collection: CollectionName, id: string) => Promise<void>;
  deleteRecord: (collection: CollectionName, id: string) => Promise<void>;
  restoreRecord: (collection: CollectionName, id: string) => Promise<void>;
  copyPrompt: (promptId: string) => Promise<string>;
  addPromptAttachments: (promptId: string, files: File[]) => Promise<number>;
  removePromptAttachment: (attachmentId: string) => Promise<void>;
  downloadPromptAttachment: (attachmentId: string) => Promise<void>;
  createPromptRelation: (parentPromptId: string, childPromptId: string) => Promise<string>;
  updatePromptRelation: (relationId: string, parentPromptId: string, childPromptId: string) => Promise<void>;
  removePromptRelation: (relationId: string) => Promise<void>;
  recordRelationshipMapDownload: (format: "svg" | "png") => Promise<void>;
  createGlobalVersion: (title: string, summary: string) => Promise<string>;
  saveProfile: (patch: Partial<WorkspaceProfile>) => Promise<void>;
  exportWorkspace: () => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

function normalizeCollection<T extends { id: string }>(value: unknown): Record<string, T> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, Omit<T, "id">>).map(([id, record]) => [
      id,
      { id, ...(record || {}) } as T,
    ]),
  );
}

function normalizeActivityDays(value: unknown): Record<string, ActivityDay> {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, ActivityDay>;
}

function normalizeActivityStats(value: unknown): ActivityStats {
  if (!value || typeof value !== "object") return { totalEvents: 0, actionCounts: {}, actionFirstAt: {}, actionLastAt: {} };
  const stats = value as Partial<ActivityStats>;
  return {
    trackingStartedAt: stats.trackingStartedAt,
    lastActivityAt: stats.lastActivityAt,
    lastAction: stats.lastAction,
    lastEntityType: stats.lastEntityType,
    lastEntityId: stats.lastEntityId,
    lastLabel: stats.lastLabel,
    totalEvents: Number(stats.totalEvents || 0),
    actionCounts: stats.actionCounts || {},
    actionFirstAt: stats.actionFirstAt || {},
    actionLastAt: stats.actionLastAt || {},
  };
}

function normalizeAchievementUnlocks(value: unknown): Partial<Record<AchievementId, AchievementUnlock>> {
  if (!value || typeof value !== "object") return {};
  return value as Partial<Record<AchievementId, AchievementUnlock>>;
}

function localDateKey(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function activityActionForPatch(collection: CollectionName, patch: Record<string, unknown>): ActivityAction {
  if (Object.prototype.hasOwnProperty.call(patch, "archivedAt")) {
    return patch.archivedAt ? "record.archived" : "record.restored";
  }
  if (collection === "decisions" && (Object.prototype.hasOwnProperty.call(patch, "status") || Object.prototype.hasOwnProperty.call(patch, "resolution"))) {
    return "decision.changed";
  }
  return "record.updated";
}

function recordLabel(collection: CollectionName, record: Record<string, unknown> | undefined, fallback: string) {
  if (!record) return fallback;
  if (collection === "endeavors" || collection === "tasks") return String(record.name || fallback);
  if (collection === "prompts" || collection === "mindsets" || collection === "preferences" || collection === "decisions" || collection === "globalCommits") return String(record.title || fallback);
  return fallback;
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
  const [engagement, setEngagement] = useState<VaultEngagement>({ activityDays: {}, activityStats: { totalEvents: 0, actionCounts: {}, actionFirstAt: {}, actionLastAt: {} }, achievements: {} });
  const [loading, setLoading] = useState(Boolean(user));
  const [connection, setConnection] = useState<ConnectionState>("idle");
  const achievementWritesInFlight = useRef(new Set<AchievementId>());
  const sessionRecordedRef = useRef("");

  const recordActivity = useCallback(
    async (action: ActivityAction, entityType: string, entityId: string, label: string) => {
      if (!user) return;
      try {
        const now = Date.now();
        const date = localDateKey(new Date(now));
        const actionKey = action.replaceAll(".", "_");
        await update(ref(database), {
          [`${VAULT_ROOT}/${user.uid}/activityDays/${date}/date`]: date,
          [`${VAULT_ROOT}/${user.uid}/activityDays/${date}/lastAt`]: now,
          [`${VAULT_ROOT}/${user.uid}/activityDays/${date}/eventCount`]: increment(1),
          [`${VAULT_ROOT}/${user.uid}/activityDays/${date}/actionTypes/${actionKey}`]: true,
          [`${VAULT_ROOT}/${user.uid}/activityStats/lastActivityAt`]: now,
          [`${VAULT_ROOT}/${user.uid}/activityStats/lastAction`]: action,
          [`${VAULT_ROOT}/${user.uid}/activityStats/lastEntityType`]: entityType,
          [`${VAULT_ROOT}/${user.uid}/activityStats/lastEntityId`]: entityId,
          [`${VAULT_ROOT}/${user.uid}/activityStats/lastLabel`]: label,
          [`${VAULT_ROOT}/${user.uid}/activityStats/totalEvents`]: increment(1),
          [`${VAULT_ROOT}/${user.uid}/activityStats/actionCounts/${actionKey}`]: increment(1),
          [`${VAULT_ROOT}/${user.uid}/activityStats/actionFirstAt/${actionKey}`]: engagement.activityStats.actionFirstAt?.[actionKey] || now,
          [`${VAULT_ROOT}/${user.uid}/activityStats/actionLastAt/${actionKey}`]: now,
          [`${VAULT_ROOT}/${user.uid}/activityStats/trackingStartedAt`]: engagement.activityStats.trackingStartedAt || now,
        });
      } catch (error) {
        console.warn("IntellectVault activity tracking failed:", error);
      }
    },
    [engagement.activityStats.actionFirstAt, engagement.activityStats.trackingStartedAt, user],
  );

  useEffect(() => {
    if (!user) {
      setData(EMPTY_COLLECTIONS as VaultCollections);
      setProfile(null);
      setEngagement({ activityDays: {}, activityStats: { totalEvents: 0, actionCounts: {}, actionFirstAt: {}, actionLastAt: {} }, achievements: {} });
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
          promptAttachments: normalizeCollection<PromptAttachment>(value.promptAttachments),
          promptRelations: normalizeCollection<PromptRelation>(value.promptRelations),
          mindsets: normalizeCollection<Mindset>(value.mindsets),
          preferences: normalizeCollection<Preference>(value.preferences),
          localCommits: normalizeCollection<LocalCommit>(value.localCommits),
          globalCommits: normalizeCollection<GlobalCommit>(value.globalCommits),
          decisions: normalizeDecisions(value.decisions),
        });
        setEngagement({
          activityDays: normalizeActivityDays(value.activityDays),
          activityStats: normalizeActivityStats(value.activityStats),
          achievements: normalizeAchievementUnlocks(value.achievements),
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

  useEffect(() => {
    if (!user || connection !== "connected") return;
    const date = localDateKey();
    const sessionKey = `${user.uid}:${date}`;
    if (engagement.activityDays[date] || sessionRecordedRef.current === sessionKey) return;
    sessionRecordedRef.current = sessionKey;
    void recordActivity("session.opened", "workspace", user.uid, profile?.workspaceName || "Personal Vault");
  }, [connection, engagement.activityDays, profile?.workspaceName, recordActivity, user]);

  useEffect(() => {
    if (!user || connection !== "connected") return;
    const met = evaluateAchievements(data, engagement).filter(
      (achievement) => achievement.met && !achievement.unlock && !achievementWritesInFlight.current.has(achievement.id),
    );
    if (!met.length) return;
    const now = Date.now();
    const writes: Record<string, unknown> = {};
    met.forEach((achievement) => {
      achievementWritesInFlight.current.add(achievement.id);
      writes[`${VAULT_ROOT}/${user.uid}/achievements/${achievement.id}`] = {
        id: achievement.id,
        unlockedAt: achievement.earnedAt || now,
        progressAtUnlock: achievement.current,
      };
    });
    void update(ref(database), writes)
      .then(() => {
        if (met.length === 1) {
          const definition = achievementById(met[0].id);
          toast.success(`Achievement unlocked: ${definition?.title || met[0].title}`, { description: definition?.description });
        } else {
          toast.success(`${met.length} achievements unlocked`, { description: met.map((item) => item.title).join(" · ") });
        }
      })
      .catch((error) => console.error("Could not persist achievement unlocks:", error))
      .finally(() => met.forEach((achievement) => achievementWritesInFlight.current.delete(achievement.id)));
  }, [connection, data, engagement, user]);

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
        await recordActivity("record.created", "prompts", itemRef.key, String((input as unknown as Record<string, unknown>).title || "Prompt"));
        return itemRef.key;
      }

      await update(ref(database), {
        [`${VAULT_ROOT}/${user.uid}/${collection}/${itemRef.key}`]: record,
      });
      await recordActivity("record.created", collection, itemRef.key, recordLabel(collection, input as unknown as Record<string, unknown>, collection));
      return itemRef.key;
    },
    [recordActivity, user],
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
          await recordActivity(activityActionForPatch(collection, patch), "prompts", id, current.title);
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
        await recordActivity("prompt.committed", "prompts", id, String(patch.title || current.title));
        return;
      }

      const currentRecord = data[collection][id] as unknown as Record<string, unknown> | undefined;
      await update(ref(database, `${VAULT_ROOT}/${user.uid}/${collection}/${id}`), {
        ...patch,
        updatedAt: now,
        updatedBy: stamp,
      });
      await recordActivity(activityActionForPatch(collection, patch), collection, id, recordLabel(collection, { ...currentRecord, ...patch }, collection));
    },
    [data, recordActivity, user],
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
      const copiedPromptId = await createRecord<Prompt>("prompts", {
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

      if (user) {
        const sourceAttachments = Object.values(data.promptAttachments).filter((attachment) => attachment.promptId === promptId);
        if (sourceAttachments.length) {
          const now = Date.now();
          const stamp = userStamp(user);
          const writes: Record<string, unknown> = {};
          sourceAttachments.forEach((attachment) => {
            const attachmentRef = push(ref(database, `${VAULT_ROOT}/${user.uid}/promptAttachments`));
            if (!attachmentRef.key) return;
            writes[`${VAULT_ROOT}/${user.uid}/promptAttachments/${attachmentRef.key}`] = {
              ...attachment,
              id: attachmentRef.key,
              promptId: copiedPromptId,
              createdAt: now,
              updatedAt: now,
              createdBy: stamp,
              updatedBy: stamp,
              archivedAt: null,
              archivedBy: null,
            };
          });
          if (Object.keys(writes).length) await update(ref(database), writes);
        }
      }

      return copiedPromptId;
    },
    [createRecord, data.promptAttachments, data.prompts, user],
  );

  const addPromptAttachments = useCallback(
    async (promptId: string, files: File[]) => {
      if (!user) throw new Error("A signed-in user is required.");
      const prompt = data.prompts[promptId];
      if (!prompt) throw new Error("The prompt could not be found.");
      const existing = Object.values(data.promptAttachments).filter((attachment) => attachment.promptId === promptId);
      const validation = validateAttachmentBatch(existing, files);
      if (!validation.ok) throw new Error(validation.message);

      const now = Date.now();
      const stamp = userStamp(user);
      const writes: Record<string, unknown> = {};
      for (const file of files) {
        const attachmentRef = push(ref(database, `${VAULT_ROOT}/${user.uid}/promptAttachments`));
        if (!attachmentRef.key) throw new Error("Firebase could not allocate a file identifier.");
        const base64 = await readFileAsBase64(file);
        writes[`${VAULT_ROOT}/${user.uid}/promptAttachments/${attachmentRef.key}`] = {
          id: attachmentRef.key,
          promptId,
          fileName: file.name.slice(0, 240),
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          base64,
          createdAt: now,
          updatedAt: now,
          createdBy: stamp,
          updatedBy: stamp,
          archivedAt: null,
          archivedBy: null,
        };
      }
      await update(ref(database), writes);
      await recordActivity("attachment.added", "promptAttachments", promptId, `${files.length} file${files.length === 1 ? "" : "s"} · ${prompt.title}`);
      return files.length;
    },
    [data.promptAttachments, data.prompts, recordActivity, user],
  );

  const removePromptAttachment = useCallback(
    async (attachmentId: string) => {
      if (!user) throw new Error("A signed-in user is required.");
      const attachment = data.promptAttachments[attachmentId];
      if (!attachment) throw new Error("The file could not be found.");
      await update(ref(database), {
        [`${VAULT_ROOT}/${user.uid}/promptAttachments/${attachmentId}`]: null,
      });
      await recordActivity("attachment.removed", "promptAttachments", attachmentId, attachment.fileName);
    },
    [data.promptAttachments, recordActivity, user],
  );

  const downloadPromptAttachment = useCallback(
    async (attachmentId: string) => {
      const attachment = data.promptAttachments[attachmentId];
      if (!attachment) throw new Error("The file could not be found.");
      downloadAttachmentFile(attachment);
      await recordActivity("attachment.downloaded", "promptAttachments", attachmentId, attachment.fileName);
    },
    [data.promptAttachments, recordActivity],
  );

  const createPromptRelation = useCallback(
    async (parentPromptId: string, childPromptId: string) => {
      if (!user) throw new Error("A signed-in user is required.");
      const validation = validatePromptRelation(data, parentPromptId, childPromptId);
      if (!validation.ok) throw new Error(validation.message);
      const itemRef = push(ref(database, `${VAULT_ROOT}/${user.uid}/promptRelations`));
      if (!itemRef.key) throw new Error("Firebase could not allocate a relationship identifier.");
      const now = Date.now();
      const stamp = userStamp(user);
      await update(ref(database), {
        [`${VAULT_ROOT}/${user.uid}/promptRelations/${itemRef.key}`]: {
          id: itemRef.key,
          parentPromptId,
          childPromptId,
          relationshipType: "inspired-by",
          createdAt: now,
          updatedAt: now,
          createdBy: stamp,
          updatedBy: stamp,
          archivedAt: null,
          archivedBy: null,
        },
      });
      await recordActivity("relationship.added", "promptRelations", itemRef.key, `${data.prompts[parentPromptId]?.title || "Prompt"} → ${data.prompts[childPromptId]?.title || "Prompt"}`);
      return itemRef.key;
    },
    [data, recordActivity, user],
  );

  const updatePromptRelation = useCallback(
    async (relationId: string, parentPromptId: string, childPromptId: string) => {
      if (!user) throw new Error("A signed-in user is required.");
      const current = data.promptRelations[relationId];
      if (!current) throw new Error("The prompt relationship could not be found.");
      const validation = validatePromptRelation(data, parentPromptId, childPromptId, relationId);
      if (!validation.ok) throw new Error(validation.message);
      const now = Date.now();
      await update(ref(database, `${VAULT_ROOT}/${user.uid}/promptRelations/${relationId}`), {
        parentPromptId,
        childPromptId,
        relationshipType: "inspired-by",
        updatedAt: now,
        updatedBy: userStamp(user),
      });
      await recordActivity("relationship.updated", "promptRelations", relationId, `${data.prompts[parentPromptId]?.title || "Prompt"} → ${data.prompts[childPromptId]?.title || "Prompt"}`);
    },
    [data, recordActivity, user],
  );

  const removePromptRelation = useCallback(
    async (relationId: string) => {
      if (!user) throw new Error("A signed-in user is required.");
      const relation = data.promptRelations[relationId];
      if (!relation) throw new Error("The prompt relationship could not be found.");
      await update(ref(database), {
        [`${VAULT_ROOT}/${user.uid}/promptRelations/${relationId}`]: null,
      });
      await recordActivity("relationship.removed", "promptRelations", relationId, `${data.prompts[relation.parentPromptId]?.title || "Prompt"} → ${data.prompts[relation.childPromptId]?.title || "Prompt"}`);
    },
    [data.promptRelations, data.prompts, recordActivity, user],
  );

  const recordRelationshipMapDownload = useCallback(
    async (format: "svg" | "png") => {
      await recordActivity("relationship.map-downloaded", "promptRelations", format, `Relationship map · ${format.toUpperCase()}`);
    },
    [recordActivity],
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
        activityDays: engagement.activityDays,
        activityStats: engagement.activityStats,
        achievements: engagement.achievements,
        endeavors: data.endeavors,
        tasks: data.tasks,
        prompts: data.prompts,
        promptVersions: data.promptVersions,
        promptAttachments: data.promptAttachments,
        promptRelations: data.promptRelations,
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
        promptAttachments: Object.keys(data.promptAttachments).length,
        promptRelations: Object.keys(data.promptRelations).length,
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
      await recordActivity("global-version.released", "globalCommits", itemRef.key, cleanTitle);
      return itemRef.key;
    },
    [data, engagement.activityDays, engagement.activityStats, engagement.achievements, profile, recordActivity, user],
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
        Object.values(data.promptAttachments)
          .filter((attachment) => attachment.promptId === id)
          .forEach((attachment) => {
            writes[`${VAULT_ROOT}/${user.uid}/promptAttachments/${attachment.id}`] = null;
          });
        Object.values(data.promptRelations)
          .filter((relation) => relation.parentPromptId === id || relation.childPromptId === id)
          .forEach((relation) => {
            writes[`${VAULT_ROOT}/${user.uid}/promptRelations/${relation.id}`] = null;
          });
        await update(ref(database), writes);
        await recordActivity("record.deleted", "prompts", id, data.prompts[id]?.title || "Prompt");
        return;
      }
      const currentRecord = data[collection][id] as unknown as Record<string, unknown> | undefined;
      await update(ref(database), {
        [`${VAULT_ROOT}/${user.uid}/${collection}/${id}`]: null,
      });
      await recordActivity("record.deleted", collection, id, recordLabel(collection, currentRecord, collection));
    },
    [data, recordActivity, user],
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
      await recordActivity("record.updated", "profile", user.uid, String(sanitized.workspaceName || profile?.workspaceName || "Workspace"));
    },
    [profile?.workspaceName, recordActivity, user],
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
            engagement,
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
  }, [data, engagement, profile, user]);

  const value = useMemo<VaultContextValue>(
    () => ({
      data,
      profile,
      loading,
      connection,
      engagement,
      createRecord,
      updateRecord,
      archiveRecord,
      deleteRecord,
      restoreRecord,
      copyPrompt,
      addPromptAttachments,
      removePromptAttachment,
      downloadPromptAttachment,
      createPromptRelation,
      updatePromptRelation,
      removePromptRelation,
      recordRelationshipMapDownload,
      createGlobalVersion,
      saveProfile,
      exportWorkspace,
    }),
    [
      data,
      profile,
      loading,
      connection,
      engagement,
      createRecord,
      updateRecord,
      archiveRecord,
      deleteRecord,
      restoreRecord,
      copyPrompt,
      addPromptAttachments,
      removePromptAttachment,
      downloadPromptAttachment,
      createPromptRelation,
      updatePromptRelation,
      removePromptRelation,
      recordRelationshipMapDownload,
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
