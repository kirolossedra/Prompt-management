# Authentication and Security

**Snapshot:** `main` at `7e45248`.

## 1. Authentication

EurekaVault uses Firebase Authentication for the browser session. Implemented account operations include sign-up, sign-in, sign-out, password reset, verification email/resend, and session-aware application access.

## 2. Owner-scoped Firebase data

The primary persisted workspace is:

```text
intellectVault/users/{uid}/
```

Realtime Database rules require the authenticated Firebase UID to match the path UID for reads/writes. Client-side UI checks are convenience controls; Realtime Database rules are the authorization boundary.

The current workspace is owner-private. This is a description of current security behavior, not a roadmap commitment to add multi-user collaboration.

## 3. Gemini secret boundary

Current Gemini features are:

- Semantic Prompt Finder;
- Prompt Repurposer;
- Prompt Mixer;
- Prompt Blocks AI transformations.

They use Netlify Functions so `GEMINI_API_KEY` remains server-side and is not compiled into the Vite browser bundle.

Each AI function receives a Firebase ID token and verifies that the authenticated identity matches the requested user context before invoking Gemini.

## 4. Data minimization by AI feature

### Finder

Sends the bounded active Prompt corpus needed for semantic ranking plus bounded user-confirmed retrieval examples. It does not require the entire persisted vault or all historical versions.

### Repurposer

Sends one selected source Prompt and the explicit repurpose objective.

### Mixer

Sends only the selected/pasted non-empty Prompt sources and optional mix direction.

### Prompt Blocks

Each executing AI block receives only:

- the selected operation;
- that operation's database-resolved transformation instruction;
- current required content inputs;
- constraints connected to that block, ordered by explicit priority;
- authentication/user identifiers required by the server boundary.

The entire vault, unrelated Prompt history, attachments, activity, and the whole pipeline runtime are not required for one block call.

## 5. Source-record safety

AI generation is non-destructive by default:

- Finder is read-only except explicit feedback recording;
- Repurposer/Mixer candidates persist only after explicit save;
- Prompt Blocks runs do not mutate referenced Prompts, Prompt Versions, or Mindsets;
- Prompt Blocks runtime values are ephemeral unless explicitly saved through the normal Prompt/version lifecycle.

## 6. Editable Prompt Blocks transformation instructions

Default transform instructions are shipped as client constants and seeded to the owner's Firebase subtree only when a corresponding record is absent. After seeding, the Firebase record is authoritative and owner-editable.

Because the initial seed strings exist in the browser bundle, they are **not secrets**. Confidential instructions would require a different server-side storage/retrieval design; no such design is claimed as current scope.

## 7. Spring Boot migration security boundary

GitHub Issue #12 explicitly selects Spring Boot for the 2-tier → 3-tier migration, and `4a3cc23` creates the backend foundation. No Firebase user-data CRUD or Gemini operation has yet been moved behind Spring Boot.

When an operation is actually migrated, the server must authenticate the request from a verified identity rather than trusting a browser-supplied UID. The current repository does not contain a Firebase Admin credential for Render and does not pretend the functional migration is already complete.

## 8. Deployment-hook secret history

Commit `54373c9` accidentally tracked a local environment file containing Netlify/Render deployment-hook URLs. Commit `daa6f7b` removed that file after the gitignore naming problem was recognized.

Removing a secret from the current tree does **not** remove it from Git history. Those deployment hooks should be treated as exposed and rotated if they have not already been rotated. This document intentionally does not reproduce their values.

## 9. Security-sensitive operational requirements

- Keep Gemini and deployment secrets out of tracked files and browser-bundled `VITE_` variables.
- Keep owner-only Firebase rules deployed while the current owner-private model is in use.
- Preserve Firebase ID-token verification for server-side AI calls.
- Treat Prompt/Prompt Block text as user-controlled content, not trusted server instructions.
- Maintain the distinction between a deployable Spring Boot service and a functionally migrated authenticated backend.
