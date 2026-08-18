# Prompt Workspace

## Purpose

The Prompt Workspace is the primary editing and inspection surface for one Prompt.

## Tabs

### Editor

Edits:

- title
- description
- purpose
- content
- Task assignment
- manual agentic summary
- manual suggested improvement
- manual AI evaluation
- manual generated context

The page keeps a draft separate from the last saved snapshot and marks the Prompt as saved/unsaved/saving.

### History

Shows active Prompt versions, supports comparison between two versions and can restore a historical snapshot as a new current version.

### Files

Shows Prompt attachments and supports upload/download/removal subject to attachment limits.

### Relationships

Shows Prompt lineage from both directions:

- Prompts that inspired the current Prompt;
- Prompts inspired by the current Prompt.

The relationship dialog filters invalid parents before creation and delegates final validation to the relationship library/provider.

## Editing safeguards

- Browser `beforeunload` protection when unsaved.
- Ctrl/Cmd+S save shortcut.
- Save disabled when there is no meaningful draft change.
- Historical restore uses the normal update path so history remains append-only in effect.

## Toolbar actions

- Focus mode
- Toggle details inspector
- Copy Prompt text
- Repurpose with AI
- Mix with other Prompts
- Duplicate Prompt
- Archive Prompt
- Delete Prompt
- Save

## Version integration

A save is not only a current-record mutation. It also produces Prompt-local history. The workspace displays the current version number and provides Git-style diff review.

## Evolution

- Core editor/CRUD: 2026-08-06 baseline.
- Copy and versioning: 2026-08-07 (`417b29d`).
- Git-style diff: 2026-08-08 (`1ac483e`).
- Files tab: 2026-08-08 (`3920b8d`).
- Relationships tab: 2026-08-08 (`c09415a`).
- Repurpose/Mix entry points: 2026-08-08 AI feature sequence.
