# Authentication and Security

## 1. Authentication provider

EurekaVault uses Firebase Authentication with Email/Password accounts.

Supported account operations in `AuthContext`:

- sign up with display name, workspace name, email and password;
- sign in;
- sign out;
- password reset email;
- verification email on account creation;
- verification email resend.

## 2. Workspace initialization

On sign-up, the application:

1. creates the Firebase account;
2. updates the Firebase profile display name;
3. initializes `intellectVault/users/{{uid}}/profile`;
4. seeds initial Decision records under the same UID;
5. sends an email-verification message.

## 3. Owner-private Realtime Database subtree

For EurekaVault records, `database.rules.json` requires:

```json
"intellectVault": {
  "users": {
    "$uid": {
      ".read": "auth != null && auth.uid === $uid",
      ".write": "auth != null && auth.uid === $uid"
    }
  }
}
```

This means a signed-in user can read/write only the vault stored under that user's Firebase UID.

## 4. Public Firebase web configuration

The Firebase browser configuration identifies the Firebase project and is not treated as a secret. Authorization must be enforced by Firebase Authentication plus Realtime Database rules.

## 5. Gemini secret isolation

`GEMINI_API_KEY` is server-side only. `.env.example` explicitly warns not to prefix it with `VITE_`, because Vite-prefixed variables are bundled for the browser.

## 6. AI request authentication

For Finder, Repurposer and Mixer:

1. the browser obtains a Firebase ID token from the active user;
2. the token is sent as a Bearer token to the Netlify Function;
3. the function looks up the token through Firebase Identity Toolkit;
4. the verified `localId` must match the request UID;
5. only then can the function call Gemini.

This prevents a caller from merely supplying a different user's UID in the request body.

## 7. Retrieval prompt-injection defense

The Semantic Prompt Finder sends Prompt text to a model for retrieval, so its system instruction explicitly classifies stored Prompt fields and historical feedback examples as **data, not instructions**. It forbids following instructions embedded in those records and constrains results to Prompt IDs from the authoritative supplied corpus.

## 8. Output validation

AI response handlers validate/normalize structured output before returning it to the UI. Finder in particular rejects invented Prompt IDs by checking against the current set of supplied IDs.

## 9. User data minimization by feature

The AI features intentionally send different bounded payloads rather than the full Firebase user record.

### Finder

Sends active Prompt retrieval fields + direct relationship context + bounded confirmed Finder examples.

Does not send attachments, version history, profile, Mindsets, Preferences or Decisions.

### Repurposer

Sends the selected source Prompt plus hierarchy labels and the explicit repurpose objective.

### Mixer

Sends only the non-empty source windows and optional direction. It does not send relationships, versions, attachments, Mindsets, Preferences, activity or achievements.

## 10. Gemini storage setting

The inspected Finder implementation sets `store: false` on the Gemini interaction request.

## 11. Current collaboration boundary

The current data model is owner-private rather than collaborative. There is no implemented role/invitation/shared-edit model for multiple users in one vault. Any future collaboration system must define ownership and authorization semantics before Realtime Database rules can safely broaden access.

## 12. Security-sensitive operational requirements

- Keep real Gemini keys in Netlify environment-variable configuration, never the repository.
- Deploy the EurekaVault owner-only Realtime Database rule.
- Treat client-side checks as usability validation, not authorization.
- Preserve server-side Firebase ID-token verification for every AI function.
- If a conventional backend replaces Netlify Functions, move AI secret handling and token validation to that backend rather than into the browser.
