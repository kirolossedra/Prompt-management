# IntellectVault — React Release 1 Foundation

A manual-first, version-controlled workspace for prompts, mindsets, preferences, tasks, and methodology evolution.

## Stack

- React 19 + TypeScript
- Vite 8
- Firebase Authentication + Realtime Database
- Motion for accessible layout, page, drawer, and dialog animation
- React Router
- Lucide icons
- Sonner notifications

## Run locally

```bash
npm install
npm run dev
```

Production validation:

```bash
npm run lint
npm run test
npm run build
```

## Firebase setup

The supplied Firebase project configuration is included as a fallback in `src/lib/firebase.ts`. The public Firebase web configuration is safe to ship, but database access must be enforced by server-side Realtime Database rules.

Merge `database.rules.json` with the project's existing rules. The important owner-only branch is:

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

Enable Email/Password in Firebase Authentication.

## Implemented Release 1 areas

- Account creation, sign-in, sign-out, verification email, password reset
- Owner-private workspace
- Endeavors, unlimited nested folders, tasks, prompts
- Manual prompt versions preserving previous content
- Mindsets at global, endeavor, task, and prompt scopes
- Preferences at global, endeavor, and task scopes
- Local and global commits with manual commit-to-commit summaries
- Open/finalized product decision log
- Archive/restore workflows while permanent historical deletion remains undecided
- Search, command palette, responsive layout, light/dark/system theme
- Accessible reduced-motion behavior

## Deliberately not implemented

These are displayed as gated future areas because the specification keeps their underlying decisions open:

- Markup parsing, until the markup format is approved
- Collaboration storage/edit/sync, until ownership, roles, conflict, and replica decisions are finalized
- AI execution, AI generation, AI evaluation, or automated summaries

## Data root

```text
intellectVault/users/{firebaseUid}/
```

See `docs/ARCHITECTURE.md` and `docs/DECISION_LOG.md`.
