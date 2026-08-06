# Decision Log

## Finalized

- Release 1 is manual-first and performs no AI calls.
- The direct content hierarchy is Endeavor → Task → Prompt → Prompt version.
- Folder entities are removed from the application.
- Prompts have manual version history.
- Preferences support global, endeavor, and task scopes at a high level.
- Changes support local and global commits.
- Commit-to-commit summaries are manual fields in Release 1.
- Workspaces are private by default.
- Implemented content records support create, read, update, archive/restore, and permanent deletion.
- Permanent deletion is blocked while dependent records or references still exist.
- Collaboration is a required future product area, but its storage behavior is not yet finalized.

## Open

- Exact markup format
- Prompt-version creation policy beyond explicit manual creation
- Mindset internal structure and inheritance/conflict rules
- Preference conflict, merge, and override precedence
- Collaboration ownership, roles, permissions, invitations, sync, replica, and conflict behavior
- Account deletion and workspace-wide deletion behavior
- Exact future-AI placeholders beyond the current manually editable examples

## Implementation choice

- **Status: Finalized for this project scaffold**
- Vite + React + TypeScript is used as the frontend stack.
- Firebase Authentication and Realtime Database are reused because credentials were explicitly supplied.
- Archive/restore is retained for recoverability, while dependency-safe permanent deletion provides the Delete portion of CRUD.
