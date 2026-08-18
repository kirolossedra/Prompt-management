# Version Control

## 1. Two distinct version layers

IntellectVault currently has two different version concepts:

1. **Prompt Version** - automatic history of one Prompt.
2. **Global Version** - a deliberate snapshot baseline of the entire vault.

Older code/type names still contain `LocalCommit` and `GlobalCommit`, but the current user-facing behavior should be explained with the two version concepts above.

## 2. Prompt-local history

### Creation

Creating a Prompt establishes its first version. The Prompt record remains the current mutable state; `promptVersions` preserves historical snapshots.

### Save behavior

A meaningful save from the Prompt Workspace calls the Prompt update path. The provider records a new historical snapshot and updates the current Prompt.

### Snapshot breadth

A Prompt history snapshot includes more than the body text. It captures title, description, purpose, content, task assignment and the current manual analysis/context fields.

### Dirty-state safety

The Prompt Workspace compares the editable draft with the last saved snapshot. It displays save state, warns on browser unload when dirty and supports Ctrl/Cmd+S.

### Restore semantics

Restore is intentionally non-destructive. Selecting a historical version writes that snapshot back into the current Prompt through the normal update path. The restoration therefore becomes another new version. Later history is not deleted.

## 3. Git-style diff review

The line diff implementation added on 2026-08-08 (`1ac483e`) provides:

- line-by-line additions/removals;
- old and new line numbers;
- addition/removal counts;
- unified diff review;
- side-by-side review;
- optional display of all lines or compact changed context;
- collapsed unchanged sections;
- a fallback strategy for very large inputs.

The diff is a text comparison feature; it is not a Git repository commit or patch object.

## 4. Prompt copying

Prompt duplication creates a new Prompt rather than another version of the original. Current duplication behavior also copies associated attachments so the duplicate can retain its file context. The new Prompt has independent history.

## 5. Global Versions

### Purpose

A Global Version is an explicit owner action used to establish a durable vault baseline at a meaningful moment.

### Snapshot contents

The current Global Version snapshot type can preserve:

- workspace profile;
- activity days and stats;
- achievement unlocks;
- Endeavors;
- Tasks;
- Prompts;
- Prompt Versions;
- Prompt Attachments;
- Prompt Relationships;
- Prompt Finder Feedback;
- Mindsets;
- Preferences;
- legacy Local Commit records;
- Decisions.

The exact stored breadth evolved as features were added. Files and relationships were incorporated on 2026-08-08; Finder feedback joined the snapshot model on 2026-08-18.

### Global Version metadata

A Global Version includes a display identifier, title, author, summary, timestamp, optional version number, record counts and snapshot data.

### Browsing

The Versions page can browse a selected snapshot and list Prompt state contained in it.

### Comparison

The page compares two Global Versions by:

- Prompt count delta;
- Prompt-local-version count delta;
- number of Prompt states that differ;
- a list of changed Prompt titles.

The comparison currently emphasizes Prompt-state changes rather than producing a deep diff for every collection.

### Export

A stored Global Version snapshot can be downloaded as JSON.

## 6. Archive/delete behavior

Global Version metadata records participate in the application's record lifecycle actions. The UI exposes archive and delete operations as well as metadata edit where supported.

## 7. Terminology migration

Historical documentation called the system "local and global commits." The implementation has evolved:

- automatic Prompt history is best called **Prompt Versions**;
- intentional vault-wide baselines are called **Global Versions** in the UI;
- some persisted TypeScript interfaces retain commit-oriented names for compatibility.

Documentation should describe behavior first and mention legacy type names only when relevant to code navigation.
