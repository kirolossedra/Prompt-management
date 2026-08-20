# EurekaVault Feature Catalog

**Implementation evidence baseline:** `main` at `7e45248a408e372088d18cab74faef5a79523075` (2026-08-20 UTC). The documentation cleanup itself is an uncommitted package change and is not assigned a fabricated SHA.

This catalog documents current implementation and explicitly raised GitHub backlog. It does not turn absent features into future commitments.

## 1. Implementation ledger

| Capability | Introduced / materially changed | Commit evidence |
|---|---|---|
| React/TypeScript/Vite application | 2026-08-06 | `c80d143` |
| Core CRUD lifecycle | 2026-08-06 | `18ab918` |
| Prompt copy + automatic Prompt versioning | 2026-08-07 | `417b29d` |
| Major GUI/navigation overhaul | 2026-08-07/08 | `fca6117`, `8fcb57b`, `81e662f` |
| Git-style Prompt line diff | 2026-08-08 | `1ac483e` |
| Activity + Achievements | 2026-08-08 | `6f45937` |
| Prompt file attachments | 2026-08-08 | `3920b8d`, `4e0310d` |
| Prompt lineage relationships | 2026-08-08 | `c09415a`, `37dc892` |
| Semantic Prompt Finder | 2026-08-08 | `2038bdb` |
| Prompt Repurposer | 2026-08-08 | `fe018b7` |
| Prompt Mixer | 2026-08-08 | `40fc00e`, `6923740` |
| Finder feedback learning | 2026-08-18 | `6818b80` |
| EurekaVault naming/identity/navigation work | 2026-08-18 | `3b61d70`, `22916bb`, `66ecfbb`, `a5e27b5`, `349b24f` |
| Spring Boot migration foundation | 2026-08-19 | `4a3cc23` |
| CI/CD quality/deployment gate | 2026-08-19 | `3d2bfa9`, `54373c9`, `3259398`, `6aad9a0` |
| Prompt Blocks MVP | 2026-08-20 UTC | `b556e64`, `e079616`, `90b6799` |
| Prompt Blocks live-workspace refinements | 2026-08-20 UTC | `7e45248` |

## 2. Core workspace

### Account and owner-private workspace

Implemented: sign-up, sign-in, sign-out, password reset, verification email/resend, workspace initialization, and owner-scoped Firebase data.

Current persisted root:

```text
intellectVault/users/{firebaseUid}/
```

The current product is owner-private. This is a statement of current behavior, not a commitment to add collaboration.

### Direct hierarchy

```text
Endeavor → Task → Prompt → Prompt Version
```

There is no Folder entity in the current domain model.

### Lifecycle

Content entities use create/read/update plus archive/restore where implemented. Permanent delete paths apply dependency checks where a referenced entity would otherwise be left dangling.

## 3. Version control

### Prompt-local history

Prompt creation establishes Version 1. Saving changed Prompt content creates another historical snapshot. Restoring an old version produces a new current version rather than deleting later history.

### Git-style version comparison

Historical Prompt versions can be compared with line-oriented change presentation and statistics. This comparison is deterministic; GitHub Issue #2 separately requests **AI version comparison**, which is not implemented.

### Global Versions

The user can create vault-level snapshots spanning the collections included by the current snapshot implementation. Prompt Blocks pipeline definitions and transform-prompt configuration participate in current Global Version/export behavior; runtime-generated pipeline values do not.

## 4. Knowledge and methodology assets

### Prompt files

Attachments are Base64-backed with application limits of 2 MiB/file, 20 files/Prompt, and 10 MiB aggregate per Prompt.

### Prompt lineage

Explicit directed `inspired-by` relationships support cross-Endeavor links, reject duplicate/cyclic relationships, and can be visualized/exported. GitHub Issue #15 asks whether this model should be replaced by an “instance” concept; that Issue is a design proposal and no migration is treated as approved.

### Mindsets and Mindset Construction

Mindsets support scoped storage. Mindset Construction deterministically assembles selected Prompt material into an editable artifact and does not call Gemini.

### Preferences

Preferences are persisted with the scopes implemented by the current domain model. No separate future precedence system is claimed by this documentation.

### Decisions

Open/Finalized Decisions are persisted as product artifacts. Their presence in a user vault is not used by the repository roadmap generator to invent product commitments.

## 5. Engagement and discovery

Implemented areas include activity tracking, Achievements, conventional Prompt/history search, command palette, responsive navigation, and light/dark/system theming.

The EurekaVault identity work includes an epsilon mark, Alexandrian lighthouse motif, Greek identity text, and the light-blue/gold/royal-red visual palette.

## 6. AI features

All currently deployed Gemini workflows use authenticated Netlify Functions. The browser does not receive `GEMINI_API_KEY`.

### Semantic Prompt Finder

Ranks a bounded active Prompt corpus by semantic fit. Prompt content is corpus data, not executable instructions for the retrieval contract.

### Finder feedback learning

Explicit user confirmation of the intended Prompt for a query can be stored and supplied later as bounded few-shot retrieval evidence.

### Prompt Repurposer

Transforms one source Prompt toward a user objective. Generation is non-destructive; persistence requires an explicit save.

### Prompt Mixer

Synthesizes two or more vault/custom Prompt sources. The generated candidate can be discarded, copied, saved as a new Prompt, or saved through the normal version lifecycle.

### Prompt Blocks

Prompt Blocks is a deterministic visual Prompt-processing DAG rather than a generic autonomous-agent graph.

Implemented capabilities include:

- System Prompt inputs using current or pinned Prompt Versions;
- Direct Input blocks;
- typed content and constraint ports;
- Context Free, Extract Context, Fill Context, Less Detailed, More Detailed, Without Markdown, With Markdown, Addition, Subtraction, and Extract Style transforms;
- Mindset and extracted-style constraints;
- explicit stored constraint priority;
- As Is, Summarized, and Conclusion Only output blocks;
- DAG validation, cycle rejection, and topological execution;
- inspectable intermediates and failure/downstream-blocking states;
- quick and persisted pipelines;
- create/update/archive/restore/delete lifecycle for saved pipelines;
- editable Firebase-backed transformation prompts seeded only when missing;
- explicit output save through the existing Prompt/version lifecycle;
- desktop visual editing and a separate mobile ordered workflow interaction;
- compact IDE-style run/save controls;
- deterministic graph beautification and automatic beautification when loading saved pipelines;
- no-output warning before execution;
- independently scrollable desktop run inspection;
- printable pipeline methodology diagrams.

Prompt Blocks MVP implementation is backed by `b556e64`, with correctness fixes in `e079616`/`90b6799` and Issue #17/#18 refinements in `7e45248`.

Issue #7 remains open. The large Issue body contains additional design possibilities; those are **not** documented as promised work merely because they were discussed inside the Issue.

## 7. Explicit open GitHub work

The authoritative open backlog is GitHub Issues #1–#18. Relevant not-yet-implemented or unresolved requests include:

- #2 — AI version comparison;
- #3 — broad configurable base prompts + revision history (partial Prompt Blocks-specific support exists);
- #4 — architecture helper AI;
- #5 — AI-generated commit/change messages;
- #6 — Explorer hover + AI summary;
- #8 — New Prompt lingering UI bug;
- #13 — Favorite/bookmark Prompts;
- #14 — mobile Decisions/bottom-bar bug;
- #15 — relationship-instance design proposal;
- #16 — frontend-only changes triggering backend deployment.

Rebrand/frontend Issues #9/#10 are partially evidenced but remain open. Prompt Blocks/CI/CD Issues #7/#11 have major implementation despite remaining open. Issues #17/#18 are directly addressed in `7e45248` but also remain open in GitHub.

There is **no** repository-backed roadmap commitment for markup parsing, collaboration, formal Mindset inheritance, Preference precedence, or a workspace-deletion initiative in the inspected GitHub Issue set.
