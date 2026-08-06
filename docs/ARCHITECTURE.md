# Architecture

## Frontend

The application is a client-side React application built with Vite. Routes correspond to major product areas. Firebase listeners are centralized in `VaultProvider`, while authentication is isolated in `AuthProvider`.

## Data model

All private records live under the authenticated user's UID:

```text
intellectVault/users/{uid}
├── profile
├── endeavors
├── tasks
├── prompts
├── promptVersions
├── mindsets
├── preferences
├── localCommits
├── globalCommits
└── decisions
```

The content hierarchy is direct:

```text
Endeavor
└── Task
    └── Prompt
        └── Prompt version
```

Records are maps keyed by Firebase push IDs.

## CRUD and lifecycle

Every implemented content collection supports:

- Create through entity forms
- Read through cards, hierarchy rows, search, and detail drawers
- Update through edit forms
- Archive and restore
- Permanent deletion

Permanent deletion is dependency-safe. A record cannot be deleted while another stored record still references it. For example, an endeavor must have no tasks or endeavor-scoped records before it can be permanently deleted.

## UI architecture

- `AppShell`: responsive navigation, search, command palette, theme controls
- `VaultProvider`: subscriptions, CRUD operations, archive/restore, permanent deletion, dependency checks
- `EntityUiProvider`: shared create/edit/archive/delete dialogs
- `EntityDialog`: entity-specific validated forms
- `RecordDetailDrawer`: reusable side panel for reading and managing records
- Pages: composed views with minimal direct data mutation

## Release boundary

No stored field triggers an AI call. Future-AI fields are plain manually editable text.
