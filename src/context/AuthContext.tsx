import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { push, ref, update } from "firebase/database";
import { auth, database, VAULT_ROOT } from "../lib/firebase";
import { initialDecisions } from "../lib/constants";
import { cleanText } from "../lib/utils";
import type { UserStamp } from "../types/domain";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    displayName: string;
    workspaceName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function firebaseMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/^Firebase:\s*/i, "")
    .replace(/\s*\(auth\/[\w-]+\)\.?$/i, "")
    .replaceAll("auth/", "");
}

async function initializeWorkspace(
  user: User,
  displayName: string,
  workspaceName: string,
): Promise<void> {
  const now = Date.now();
  const stamp: UserStamp = {
    uid: user.uid,
    email: user.email || "",
    displayName,
  };
  const root = `${VAULT_ROOT}/${user.uid}`;
  const writes: Record<string, unknown> = {
    [`${root}/profile`]: {
      workspaceName,
      ownerName: displayName,
      ownerEmail: user.email || "",
      createdAt: now,
      updatedAt: now,
    },
  };

  initialDecisions().forEach((decision) => {
    const key = push(ref(database, `${root}/decisions`)).key;
    if (!key) throw new Error("Firebase could not allocate a decision identifier.");
    writes[`${root}/decisions/${key}`] = {
      ...decision,
      id: key,
      createdAt: now,
      updatedAt: now,
      createdBy: stamp,
      updatedBy: stamp,
    };
  });

  await update(ref(database), writes);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() =>
    onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    }), []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, cleanText(email, 320), password);
    } catch (error) {
      throw new Error(firebaseMessage(error));
    }
  }, []);

  const signUp = useCallback(async (input: {
    displayName: string;
    workspaceName: string;
    email: string;
    password: string;
  }) => {
    const displayName = cleanText(input.displayName, 120);
    const workspaceName = cleanText(input.workspaceName, 160);
    const email = cleanText(input.email, 320);
    if (!displayName || !workspaceName || !email || !input.password) {
      throw new Error("Complete all required account fields.");
    }
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, input.password);
      await updateProfile(credential.user, { displayName });
      await initializeWorkspace(credential.user, displayName, workspaceName);
      await sendEmailVerification(credential.user);
    } catch (error) {
      throw new Error(firebaseMessage(error));
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const normalized = cleanText(email, 320);
    if (!normalized) throw new Error("Enter your email address first.");
    try {
      await sendPasswordResetEmail(auth, normalized);
    } catch (error) {
      throw new Error(firebaseMessage(error));
    }
  }, []);

  const resendVerification = useCallback(async () => {
    if (!auth.currentUser) throw new Error("Sign in before requesting verification.");
    await sendEmailVerification(auth.currentUser);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signIn, signUp, signOut, resetPassword, resendVerification }),
    [user, loading, signIn, signUp, signOut, resetPassword, resendVerification],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
