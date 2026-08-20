# EurekaVault Implementation History

**GitHub evidence cutoff:** `7e45248a408e372088d18cab74faef5a79523075` on `main` (2026-08-20 UTC). The cleanup package modifies documentation/RoadmapPage on top of this evidence cutoff without inventing a new commit.

This chronology uses Git history for delivery facts. It does not infer release names or future phases.

## 2026-08-06 — repository and React/Firebase foundation

| Commit | Message | Evidence summary |
|---|---|---|
| `5eeec5f` | Initial commit | Repository baseline. |
| `622f93c` | Create index.html | Initial web surface. |
| `3f76f8b` | Update index.html | Early page update. |
| `c80d143` | Converting the project to react | React/TypeScript/Vite application direction. |
| `c35286a` | Fixing Files | Foundation correction. |
| `42412a8` | Update Button.tsx | UI component update. |
| `18ab918` | adding CRUD features | Core content CRUD/lifecycle functionality. |

## 2026-08-07 — versioned workspace and UI overhaul

| Commit | Message | Evidence summary |
|---|---|---|
| `417b29d` | Adding copy, versioning | Prompt copy/versioning; Mindset Construction is present by this snapshot. |
| `fca6117` | GUI overhaul | Major UI redesign. |
| `8fcb57b` | changing-gui | Continued UI work. |

## 2026-08-08 — knowledge graph, engagement, and AI tools

| Commit | Message | Evidence summary |
|---|---|---|
| `81e662f` | overhaul GUI | Continued application-shell/product UX work. |
| `2a5c345` | fix error | Correction. |
| `2b0f270` | adding back copy functionality | Copy behavior restoration. |
| `1ac483e` | Github Line Diff | Git-style Prompt version comparison. |
| `6f45937` | Achievements feature | Activity/Achievements. |
| `3920b8d` | Adding Files Functionality | Prompt attachments. |
| `4e0310d` | Fixing an error | File-feature correction. |
| `c09415a` | Adding Relationships between prompts | Directed Prompt lineage. |
| `37dc892` | fixing relationship plotting | Relationship visualization fix. |
| `2038bdb` | prompt retrieval | Semantic Prompt Finder. |
| `fe018b7` | Improving AI prompts | AI Prompt transformation/Repurposer path. |
| `40fc00e` | Prompt Mixer Feature | Prompt Mixer. |
| `6923740` | Prompt Mixer generic instead of forcing existing ones | Arbitrary pasted/custom Mixer sources. |

## 2026-08-18 — feedback learning, documentation, rebrand, and navigation

| Commit | Message | Evidence summary |
|---|---|---|
| `6818b80` | feat: implementing feedback for AI search | User-confirmed Finder feedback becomes bounded retrieval examples. |
| `5b9e61d` | documentation-upgrade | Large implementation-led documentation set. |
| `3b61d70` | Eureka-Vault Name Rebrand issue #9 part1 | EurekaVault naming transition. |
| `2e9aa3f` | up: adding roadmap to docs | First roadmap documentation. |
| `c7c2727` | up: adding gantt chart | Gantt tooling/documentation. |
| `22916bb` | feat: minimalist landing page | Landing-page productization. |
| `66ecfbb` | feat: efficient navigation | Navigation redesign. |
| `a5e27b5` | up: nav wheel but for phone | Mobile navigation counterpart. |
| `349b24f` | Eureka Identity | Epsilon mark, Alexandrian motif, Greek identity copy, and palette work. |

## 2026-08-19 — 3-tier foundation and deployment safety

### `4a3cc23` — starting 2-tier to 3-tier migration plan

Introduced:

- Spring Boot 4.1 / Java 21 backend under `backend/`;
- Actuator health endpoint;
- Docker packaging;
- Render service configuration;
- documentation explicitly preserving existing Firebase CRUD and Netlify AI paths during incremental migration.

This commit proves **migration foundation started**, not full 3-tier completion.

GitHub Issue #12 is an `architecture` + `epic` Issue. Its owner comment explicitly states: `It's gonna be springboot`.

### `3d2bfa9` — CI quality gates and gated deployments

Introduced:

- frontend lint/test/build checks;
- Netlify Function syntax checks;
- Maven backend verify/integration testing;
- Docker build/runtime health smoke tests;
- post-CI Netlify and Render deployment-hook workflow.

### `54373c9` — Netlify deployment gating

Added the `netlify.toml` ignore/build-hook gating behavior so ordinary Git-triggered builds do not bypass GitHub Actions.

The commit also accidentally included deployment hook URLs in a local environment file. `daa6f7b` subsequently removed that tracked file after the gitignore naming problem was recognized. Since deletion does not purge Git history, those historical hook values should be considered exposed unless rotated.

### Follow-up CI corrections

- `daa6f7b` — tracked local environment file removal;
- `3259398` — CI issue correction;
- `6aad9a0` — frontend CI correction.

## 2026-08-20 UTC — Prompt Blocks and live-use fixes

### `b556e64` — Prompt Blocks visual transformation pipelines

Introduced the Prompt Blocks MVP:

- typed DAG model;
- visual workspace;
- current/pinned Prompt inputs;
- direct inputs;
- transformation and constraint blocks;
- explicit constraint priority;
- deterministic graph validation/topological execution;
- per-block authenticated Gemini execution;
- saved and quick pipelines;
- intermediate result inspection;
- explicit output persistence through normal Prompt/version paths;
- editable Firebase-backed transformation prompts;
- focused tests and documentation.

### `e079616` and `90b6799` — Prompt Blocks correctness fixes

Cleaned a TypeScript issue and corrected graph-validation ordering so a cycle is reported as structural invalidity before single-input cardinality.

### `7e45248` — addressing Issues #17 and #18

Added live-workspace refinements:

- compact IDE-style controls instead of an obstructive large run panel;
- deterministic beautification, including on saved-pipeline load;
- print-friendly methodology diagrams;
- pre-run warning when no dedicated Output block is configured;
- independently scrollable desktop run inspection so the final output remains reachable;
- deterministic layout tests.

## Current interpretation

The repository now combines a mature frontend/Firebase product surface, multiple authenticated Gemini workflows, a substantial Prompt Blocks methodology layer, and an intentionally incremental Spring Boot migration foundation.

The current GitHub Issue state must be read alongside this history: all Issues #1–#18 remain open, even when commits have already implemented part or all of their requested behavior. The documentation therefore tracks **GitHub state** and **implementation state** separately.
