import { auth } from "./firebase";

const backendApiUrl = (import.meta.env.VITE_BACKEND_API_URL || "").replace(/\/+$/, "");

export interface BackendAuthenticatedUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

export function isBackendApiConfigured(): boolean {
  return Boolean(backendApiUrl);
}

export async function getBackendAuthenticatedUser(): Promise<BackendAuthenticatedUser> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("A Firebase user must be signed in before calling the backend.");
  }
  if (!backendApiUrl) {
    throw new Error("VITE_BACKEND_API_URL is not configured.");
  }

  const idToken = await user.getIdToken();

  const response = await fetch(`${backendApiUrl}/api/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Backend authentication verification failed (${response.status}).`);
  }

  return (await response.json()) as BackendAuthenticatedUser;
}
