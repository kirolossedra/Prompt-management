# EurekaVault Decision Log

**Snapshot:** `main` at `7e45248`.

This log records decisions only when current implementation, Git history, a GitHub Issue/comment, or an explicit product-owner statement supports them. It no longer manufactures “open decisions” merely because a feature is absent.

## Current decisions with evidence

### Direct hierarchy

**State:** implemented.

```text
Endeavor → Task → Prompt → Prompt Version
```

No Folder entity exists in the current domain model.

### Automatic Prompt-local history + deliberate Global Versions

**State:** implemented.

Prompt saves create Prompt-local historical snapshots. Global Versions are separate deliberate vault-level snapshots.

### Owner-private workspace

**State:** implemented current boundary.

Realtime Database data is owner-scoped under `intellectVault/users/{uid}`. This statement does not imply a future collaboration roadmap.

### Explicit AI workflows use a server-side key boundary

**State:** implemented.

Semantic Finder, Repurposer, Mixer, and Prompt Blocks execute Gemini requests through authenticated Netlify Functions so `GEMINI_API_KEY` is not bundled into the browser.

### Mindset Construction is deterministic

**State:** implemented.

Mindset Construction assembles selected Prompt material without a Gemini call and remains editable before save.

### Prompt relationships are explicit directed lineage

**State:** implemented current model.

`inspired-by / inspires` links are explicit, cycle-safe, and user-created. GitHub Issue #15 proposes an alternative “instance” concept, but that is an open design proposal rather than an approved replacement.

### Repurposer generation does not silently create lineage

**State:** implemented.

Saving Repurposer output creates a normal Prompt/version artifact. A relationship is added only if the user explicitly creates one.

### EurekaVault identity direction

**State:** partially implemented; GitHub Issue #9 remains open.

The repository contains EurekaVault naming, epsilon identity, Alexandrian lighthouse motif, Greek identity text, and the light-blue/gold/royal-red palette. The open Issue state is retained rather than declaring the rebrand “finished.”

### Incremental Spring Boot 3-tier migration

**State:** explicitly selected and in progress.

GitHub Issue #12 is labeled `architecture` + `epic`; the owner comment says **“It's gonna be springboot.”** Commit `4a3cc23` created the Java 21/Spring Boot backend foundation.

The migration is not called complete because current vault CRUD still talks directly to Firebase and current Gemini features still use Netlify Functions.

### CI/CD as release gate

**State:** core implemented; GitHub Issue #11 remains open.

Commits `3d2bfa9` and `54373c9` establish GitHub Actions quality gates and gated Netlify/Render deployment hooks, followed by CI fixes. Issue #16 remains open because frontend-only changes can still lead to the backend deployment job under the current non-path-split workflow.

### Prompt Blocks is deterministic methodology orchestration, not generic autonomous agents

**State:** MVP implemented; GitHub Issue #7 remains open.

Commit `b556e64` implements a typed DAG with explicit inputs, transformations, constraints, outputs, graph validation, topological execution, inspectable intermediates, and explicit persistence. Commit `7e45248` refines the live workspace.

The larger Issue #7 text contains additional possibilities. Their presence in the Issue does not, by itself, make them approved roadmap commitments.

## Superseded historical statements

### “Release 1 performs no AI calls”

Superseded by the 2026-08-08 AI feature commits and later Prompt Blocks implementation.

### “Prompt versions are manual commits”

Superseded by automatic Prompt-local history introduced in the versioning workflow.

### “No backend exists”

Superseded as a deployment statement by the Spring Boot foundation. It remains true that the **functional application data path** has not fully migrated behind that backend.

## Explicit open GitHub decisions / requests

The following are open because there is actual GitHub evidence:

- #2 — AI version comparison;
- #3 (`epic`) — owner-customizable base prompts + revision history;
- #4 (`epic`) — architecture helper AI;
- #5 — AI commit/change messages;
- #6 — Explorer hover + AI summary;
- #8 — New Prompt lingering bug;
- #9 — rebrand completion;
- #10 — broad frontend overhaul;
- #12 (`epic`) — remaining 3-tier migration work;
- #13 — Favorite/bookmark Prompts;
- #14 — mobile Decisions bottom-bar bug;
- #15 — relationship-instance model proposal;
- #16 — frontend/backend deployment coupling.

Issues #7, #11, #17, and #18 also remain open in GitHub even though substantial/direct implementation exists.

## Removed pseudo-decisions

Older generated documentation listed markup parsing, collaboration, formal Mindset inheritance/conflict rules, Preference precedence, and workspace deletion as if they were confirmed future product decisions. No corresponding GitHub Issue/epic exists in the inspected snapshot. They are therefore removed from this decision log as roadmap decisions.

The code may still document current facts — for example, “the workspace is owner-private” — without converting those facts into a future commitment.
