# Feature Catalog

## 1. Status basis

This catalog describes code present at commit `6818b808dc51cf72d3698e61a6bfbfa059108f46`. Dates are taken from Git history. Where a single introducing commit can be identified, it is listed directly. Where the exact introduction is not uniquely isolated by commit message, the documentation uses the earliest commit snapshot in which the feature was verified and labels that distinction.

## 2. Implementation ledger

| Capability | Date | Commit | Evidence | Attribution |
|---|---|---|---|---|
| React/TypeScript application foundation | 2026-08-06 | `c80d143` | Converting the project to react | Exact commit |
| Core CRUD and lifecycle baseline | 2026-08-06 | `18ab918` | adding CRUD features | Exact commit |
| Prompt copy + Prompt versioning | 2026-08-07 | `417b29d` | Adding copy, versioning | Exact commit |
| Mindset Construction | 2026-08-07 | `417b29d` | Adding copy, versioning | Verified present in commit snapshot |
| Major GUI/navigation overhaul | 2026-08-07 | `fca6117 / 8fcb57b / 81e662f` | GUI overhaul sequence | Commit sequence |
| Git-style Prompt line diff | 2026-08-08 | `1ac483e` | Github Line Diff | Exact commit |
| Achievements + activity tracking | 2026-08-08 | `6f45937` | Achievements feature | Exact commit |
| Prompt file attachments | 2026-08-08 | `3920b8d` | Adding Files Functionality | Exact commit |
| Prompt relationship lineage | 2026-08-08 | `c09415a` | Adding Relationships between prompts | Exact commit |
| Relationship plotting correction | 2026-08-08 | `37dc892` | fixing relationship plotting | Exact fix commit |
| Semantic Prompt Finder | 2026-08-08 | `2038bdb` | prompt retrieval | Exact commit |
| Prompt Repurposer | 2026-08-08 | `fe018b7` | Improving AI prompts | Exact commit |
| Prompt Mixer | 2026-08-08 | `40fc00e` | Prompt Mixer Feature | Exact commit |
| Mixer arbitrary pasted/custom sources | 2026-08-08 | `6923740` | Prompt Mixer generic instead of forcing existing ones | Exact commit |
| Finder feedback-learning / few-shot retrieval adaptation | 2026-08-18 | `6818b80` | feat: implementing feedback for AI search | Exact commit |

## 3. Core workspace features

### Account and private workspace

Implemented functionality includes sign-up, sign-in, sign-out, password reset, verification email/resend, workspace initialization, owner-scoped Firebase data and settings diagnostics.

**Implementation timing:** part of the React/Firebase application foundation and core CRUD baseline by 2026-08-06.

### Direct hierarchy

The implemented hierarchy is Endeavor -> Task -> Prompt -> Prompt Version. There is no Folder entity.

**Implementation timing:** core React/CRUD baseline by 2026-08-06.

### CRUD, archive, restore and dependency-safe delete

Entity workflows provide normal create/read/update behavior, recoverable archive/restore and permanent deletion guarded by dependency checks.

**Implementation timing:** `18ab918` on 2026-08-06, with later features extending lifecycle behavior to their own records.

### Prompt library and workspace

The Prompt Workspace has Editor, History, Files and Relationships tabs. It supports editing, dirty-state detection, save shortcuts, copy, duplicate, archive/delete, historical restore and direct Repurpose/Mix entry points.

**Implementation timing:** progressively assembled across the CRUD/versioning/UI commits on 2026-08-06 and 2026-08-07, then extended by Files and Relationships on 2026-08-08.

## 4. Version-control features

### Automatic Prompt-local history

Prompt creation establishes Version 1. Saved Prompt changes create complete historical snapshots. Restoring an old version creates a new current version rather than erasing later history.

**Implementation timing:** `417b29d` on 2026-08-07.

### Git-style line comparison

Prompt versions can be reviewed using line-numbered diffs with change statistics, unified/side-by-side presentation and collapsed unchanged context.

**Implementation timing:** `1ac483e` on 2026-08-08.

### Global Versions

The owner can release deliberate vault-level snapshots and later browse, compare and download them. Snapshot breadth expanded as new collections were introduced: attachments on 2026-08-08, relationships on 2026-08-08, and Finder feedback on 2026-08-18.

**Implementation timing:** vault-level versioning was already part of the version-control architecture by 2026-08-07; snapshot content evolved with subsequent features.

## 5. Knowledge enrichment

### Files

Prompt attachments are stored as Base64 with 2 MiB/file, 20 files/Prompt and 10 MiB/Prompt limits. They can be uploaded, downloaded and removed.

**Implementation timing:** `3920b8d` on 2026-08-08, followed by `4e0310d` error correction.

### Prompt relationships

Directed `inspired-by` links capture lineage between Prompts. Cycles and duplicates are rejected. The relationship map groups Prompts by Endeavor, supports cross-Endeavor links, provides a searchable ledger and exports SVG/PNG.

**Implementation timing:** `c09415a` on 2026-08-08, plotting fix `37dc892` the same day.

### Mindsets

Mindsets support global, Endeavor, Task and Prompt scopes.

### Mindset Construction

A deterministic builder lets the user select vault Prompts, assemble their exact methodology into an editable persona-style artifact and save it as a normal Mindset. This workflow explicitly does not call an AI model.

**Implementation timing:** verified present in `417b29d` on 2026-08-07.

### Preferences

Preferences can be scoped globally, to an Endeavor, or to a Task. The current code does not define Prompt-level Preference scope.

### Decisions

Open/Finalized product Decisions are persisted in the vault. Provider normalization updates certain early seeded decisions to newer finalized implementation semantics.

## 6. Engagement and discoverability

### Activity tracking

The vault records sessions and important operations such as record lifecycle changes, Prompt commits, Global Versions, file actions, relationship actions and AI operations.

**Implementation timing:** `6f45937` on 2026-08-08, with later action types added as new features arrived.

### Achievements

Current achievements include:

- 1st Prompt Commit
- 1st Global Commit
- 1st Mindset
- 1st Endeavour
- 1 Week of Activity
- 30 Days of Activity
- Builder
- Fussy Builder
- Skeptical

**Implementation timing:** `6f45937` on 2026-08-08.

### Conventional Search

Search matches words across Prompt title, description, purpose, current content and saved history, optionally filtered by Endeavor. All query words must be present somewhere in the Prompt/history corpus for a match.

### Command palette, responsive layout and themes

These interaction features are part of the evolved application shell and UI overhaul sequence completed by 2026-08-07.

## 7. AI features

### Semantic Prompt Finder

The Finder sends a bounded active Prompt corpus to Gemini and returns up to five existing Prompt IDs ranked by semantic fit. It is retrieval, not Prompt execution. Stored Prompt text is treated as untrusted data.

**Implementation timing:** `2038bdb` on 2026-08-08.

### Finder feedback learning

After a search, the user can confirm "This is it" or choose any active Prompt as the correct result. That search/selection pair is stored. Future searches provide a bounded recent set of confirmed examples to Gemini as few-shot evidence of the user's retrieval style.

This is the latest implemented AI-side feature in the inspected repository.

**Implementation timing:** `6818b80` on 2026-08-18.

### Prompt Repurposer

One original Prompt plus a new objective is transformed into an editable candidate that preserves source structure, constraints, formatting, specificity and detail where possible. The source is never modified by generation. Saving creates a new Prompt and independent Version 1.

**Implementation timing:** `fe018b7` on 2026-08-08.

### Prompt Mixer

At least two non-empty sources are synthesized into one editable Prompt. Sources may come from the vault or arbitrary pasted/typed text. The output can be discarded, copied, saved as a new Prompt or saved as the next version of an existing Prompt.

**Implementation timing:** initial feature `40fc00e` on 2026-08-08; arbitrary pasted/custom sources generalized by `6923740` later the same day.

## 8. Current non-implemented/gated areas

No current implementation was found for:

- collaborative multi-user editing/sync;
- finalized markup parsing;
- Prompt Rating;
- Prompt Blocks.

These must not be presented as implemented features unless code is added later.
