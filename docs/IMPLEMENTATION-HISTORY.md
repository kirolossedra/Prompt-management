# Implementation History

## 1. Method

This history is based on the repository's Git commits and current code. It does not infer product release numbers that the repository does not explicitly establish. Dates below are calendar dates in the repository history; the important requirement is the commit SHA, which gives an immutable implementation reference.

## 2. Development chronology

| Date | Commit | Message | Implementation significance |
|---|---|---|---|
| 2026-08-06 | `5eeec5f` | Initial commit | Repository begins with a minimal README. |
| 2026-08-06 | `c80d143` | Converting the project to react | Establishes the React/TypeScript/Vite application foundation. |
| 2026-08-06 | `c35286a` | Fixing Files | Early project/file correction during React scaffold setup. |
| 2026-08-06 | `18ab918` | adding CRUD features | Adds core CRUD/lifecycle capability and the practical data-management baseline. |
| 2026-08-07 | `417b29d` | Adding copy, versioning | Adds Prompt copy/versioning; Mindset Construction is verified present in this commit snapshot. |
| 2026-08-07 | `fca6117` | GUI overhaul | Begins major application UI reorganization. |
| 2026-08-07 | `8fcb57b` | changing-gui | Continues UI/navigation evolution. |
| 2026-08-07 | `81e662f` | overhaul GUI | Completes another major UI restructuring pass. |
| 2026-08-07 | `2a5c345` | fix error | Corrective commit after the GUI changes. |
| 2026-08-08 | `2b0f270` | adding back copy functionality | Restores Prompt-copy behavior following UI refactors. |
| 2026-08-08 | `1ac483e` | Github Line Diff | Adds Git-style line-diff review for Prompt versions. |
| 2026-08-08 | `6f45937` | Achievements feature | Adds activity tracking and achievements. |
| 2026-08-08 | `3920b8d` | Adding Files Functionality | Adds Prompt attachments and integrates them into vault lifecycle/snapshots. |
| 2026-08-08 | `4e0310d` | Fixing an error | Immediate correction after file functionality. |
| 2026-08-08 | `c09415a` | Adding Relationships between prompts | Adds Prompt lineage relationships, relationship UI/map integration and snapshot support. |
| 2026-08-08 | `37dc892` | fixing relationship plotting | Corrects relationship visualization/layout. |
| 2026-08-08 | `2038bdb` | prompt retrieval | Introduces Gemini-backed Semantic Prompt Finder via Netlify Function. |
| 2026-08-08 | `fe018b7` | Improving AI prompts | Introduces Prompt Repurposer and related Gemini server-side path. |
| 2026-08-08 | `40fc00e` | Prompt Mixer Feature | Introduces multi-Prompt Gemini synthesis. |
| 2026-08-08 | `6923740` | Prompt Mixer generic instead of forcing existing ones | Generalizes Mixer sources so arbitrary pasted/typed Prompts are first-class inputs. |
| 2026-08-18 | `6818b80` | feat: implementing feedback for AI search | Adds user-confirmed Finder feedback storage and bounded few-shot learning examples for later retrievals. |

## 3. Phase interpretation

### Phase A - React product foundation (2026-08-06)

The project moved from a minimal repository into a React/TypeScript/Vite Firebase application. Authentication, owner-private persistence and CRUD/lifecycle behavior established the core workspace.

### Phase B - Prompt craftsmanship and version-control foundation (2026-08-07)

Prompt copying and versioning became explicit capabilities. Mindset Construction is already present in the `417b29d` snapshot. The UI underwent several large redesigns that established the current application-shell style and more productized workspace experience.

### Phase C - Prompt knowledge platform expansion (2026-08-08)

One day added most of the distinguishing non-AI and AI capabilities:

- Git-style Prompt diff;
- activity and achievements;
- Prompt files;
- Prompt lineage relationships and map;
- Semantic Prompt Finder;
- Prompt Repurposer;
- Prompt Mixer;
- arbitrary pasted/custom Mixer inputs.

This is the point where the product can no longer be accurately summarized as a simple manual Prompt CRUD/versioning application.

### Phase D - Adaptive retrieval (2026-08-18)

Finder gained an explicit learning loop. The user can confirm the Prompt actually intended for a search, persist that mapping, and feed bounded recent confirmations back into later Gemini retrieval requests as few-shot preference evidence.

This is a qualitative change: the AI retrieval layer starts adapting to the owner's retrieval language and distinctions rather than treating every search as isolated.

### Phase E - Executable Prompt methodology (2026-08-19 delivery)

Prompt Blocks introduces a reusable visual Prompt-processing methodology layer. Unlike Mixer, it represents multiple typed stages, explicit constraints and priorities, intermediate values, branching outputs and deterministic dependency order. Saved pipeline definitions become first-class Firebase artifacts while runtime generated values remain ephemeral unless explicitly saved.

The delivery also introduces owner-editable transformation prompts. Thorough initial defaults are seeded only when missing; thereafter the database copy is authoritative. Prompt Blocks reuses the existing authenticated Netlify/Gemini boundary and existing Prompt version lifecycle rather than introducing a parallel backend or versioning system.

Because the supplied delivery workspace is an extracted ZIP rather than a Git checkout, this phase is identified by delivery date and implementation files rather than by inventing a commit SHA.

## 4. Feature-by-feature date rules

When documenting dates elsewhere:

- Use the exact commit when the feature has a clear introducing commit.
- Use **present by** when the earliest verified code snapshot contains the feature but the commit message is broader.
- Distinguish initial introduction from a later fix or generalization.
- Do not assign an official Release 2/3/etc. label from package version or memory without a product-owner decision.

## 5. Important documentation drift discovered

The current root README was last materially aligned with the early 2026-08-06 foundation. It still claims:

- no AI calls;
- unlimited nested folders;
- manual Prompt versions;
- local/global commits as the primary model.

The current code contradicts each of those points in important ways. This docs package therefore documents implementation reality while preserving the old decisions as superseded history rather than silently deleting them.
