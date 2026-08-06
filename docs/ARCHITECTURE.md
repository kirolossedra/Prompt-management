# Architecture

## Frontend

The application is a client-side React application built with Vite. Routes correspond to major product areas. Firebase listeners are centralized in `VaultProvider`, while authentication is isolated in `AuthProvider`.

## Data model

All private records live under the authenticated user's UID:

```text
intellectVault/users/{uid}
├── profile
├── endeavors
├── folders
├── tasks
├── prompts
├── promptVersions
├── mindsets
├── preferences
├── localCommits
├── globalCommits
└── decisions
```

Records are maps keyed by Firebase push IDs. Historical and operational records use archival fields instead of irreversible deletion because deletion semantics remain open.

## UI architecture

- `AppShell`: responsive navigation, search, command palette, theme controls
- `VaultProvider`: subscriptions, derived relationships, CRUD operations, blocker checks
- `EntityDialog`: entity-specific validated forms
- `DetailDrawer`: reusable side panel for reading records and related history
- Pages: composed views with minimal direct data mutation

## Release boundary

No stored field triggers an AI call. Future-AI fields are plain manually editable text.
