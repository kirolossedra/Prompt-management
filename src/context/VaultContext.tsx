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
import { archiveBlockers, cleanText } from "../lib/utils";
import { useAuth } from "./AuthContext";
import type {
  CollectionName,
  Decision,
  Endeavor,
  Folder,
  GlobalCommit,
  LocalCommit,
  Mindset,
  Preference,
  Prompt,
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
  restoreRecord: (collection: CollectionName, id: string) => Promise<void>;
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

function userStamp(user: NonNullable<ReturnType<typeof useAuth>["user"]>): UserStamp {
  return {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || user.email || "User",
  };
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
          folders: normalizeCollection<Folder>(value.folders),
          tasks: normalizeCollection<Task>(value.tasks),
          prompts: normalizeCollection<Prompt>(value.prompts),
          promptVersions: normalizeCollection<PromptVersion>(value.promptVersions),
          mindsets: normalizeCollection<Mindset>(value.mindsets),
          preferences: normalizeCollection<Preference>(value.preferences),
          localCommits: normalizeCollection<LocalCommit>(value.localCommits),
          globalCommits: normalizeCollection<GlobalCommit>(value.globalCommits),
          decisions: normalizeCollection<Decision>(value.decisions),
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
      await update(ref(database), {
        [`${VAULT_ROOT}/${user.uid}/${collection}/${itemRef.key}`]: {
          ...input,
          id: itemRef.key,
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
    [user],
  );

  const updateRecord = useCallback(
    async (collection: CollectionName, id: string, patch: Record<string, unknown>) => {
      if (!user) throw new Error("A signed-in user is required.");
      if (!id) throw new Error("A record identifier is required.");
      await update(ref(database, `${VAULT_ROOT}/${user.uid}/${collection}/${id}`), {
        ...patch,
        updatedAt: Date.now(),
        updatedBy: userStamp(user),
      });
    },
    [user],
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
      restoreRecord,
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
      restoreRecord,
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
