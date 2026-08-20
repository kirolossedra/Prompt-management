# GitHub Milestone and Issue-Management Proposal

## 1. Current GitHub planning state

At the inspected snapshot, EurekaVault has 10 open Issues and no closed Issues. The inspected Issue records do not contain labels, assignees or Milestones. Only the `main` branch was found, and no pull requests were found.

This is enough to capture ideas, but not enough to make GitHub the maintainable source of truth for product planning.

This document is a **proposal only**. It does not apply any GitHub changes.

---

# 2. Proposed milestone structure

## Milestone 1 — EurekaVault Productization & UX Hardening

| Field | Value |
|---|---|
| Objective | Finish roadmap/identity/UX hardening so the existing capability set is coherent and maintainable |
| Issues | #1, #8, #9, #10 |
| Dependencies | None hard; recommended to complete rebrand visual direction before broad theme overhaul |
| Start | Aug 18, 2026 — historical fact |
| Estimated target | Sep 6, 2026; completion window Aug 24–Sep 6 |
| Duration | ~2–3 weeks |
| Progress | ~30% estimated |
| Confidence | Low / Medium |

**Definition of Done**

- roadmap source exists and README is accurate;
- #8 is reproduced/fixed/regression-checked;
- #9 accepted identity scope is fully implemented rather than only textual part1 replacement;
- #10 has acceptance criteria and agreed UX/theme/motion work is implemented/tested;
- stale public/in-app product statements do not claim that implemented AI is absent.

## Milestone 2 — Configurable AI & Version Intelligence

| Field | Value |
|---|---|
| Objective | Make AI behavior owner-configurable/versioned and add AI interpretation to Prompt history |
| Issues | #2, #3, #5 |
| Dependencies | Existing Prompt versioning/diff and authenticated Gemini boundary are completed foundations |
| Estimated start | Sep 7, 2026 |
| Estimated target | Oct 11, 2026; likely completion Sep 21–Oct 11 |
| Duration | ~3–5 weeks |
| Progress | 0% repository implementation |
| Confidence | Low |

**Definition of Done**

- base/system AI prompts are editable without source-code deployment;
- base-prompt changes have revision history and safe fallback/default behavior;
- AI version comparison uses authoritative historical versions and complements deterministic diff;
- Issue #5 “commit” semantics are explicitly resolved;
- generated version/change narratives remain reviewable and do not rewrite historical source truth.

## Milestone 3 — Vault Intelligence & Contextual Assistance

| Field | Value |
|---|---|
| Objective | Help users understand vault architecture and Prompt meaning in context |
| Issues | #4, #6 |
| Dependencies | Implementation-led docs are complete; configurable AI milestone is recommended but not a hard blocker |
| Estimated start | Oct 12, 2026 |
| Estimated target | Nov 1, 2026 |
| Duration | ~2–3 weeks |
| Progress | 0% |
| Confidence | Low |

**Definition of Done**

- helper AI uses bounded authoritative architecture/product data and can explain major object/payload distinctions;
- contextual Prompt summaries define freshness/caching/generation rules;
- hover/detail interaction does not silently send excessive vault data;
- AI failure degrades to current non-AI behavior.

## Milestone 4 — Prompt Blocks MVP

> **Implementation update (2026-08-19):** The MVP described by this milestone is implemented in the delivery working tree. GitHub Issue #7 remains remotely open because this documentation update does not mutate Issue state.

| Field | Value |
|---|---|
| Objective | Introduce persisted, reusable, typed DAG-style Prompt methodology execution |
| Issues | #7 |
| Dependencies | Existing Prompt/version model and authenticated AI boundary |
| Delivered | Aug 19, 2026 |
| Progress | 100% implementation delivery |
| Confidence | High |

**Delivered MVP boundary**

- pipeline artifact create/update/archive/restore/delete;
- named variables with readable multi-stage graph semantics;
- typed content and constraint wires;
- desktop visual DAG builder plus mobile ordered workflow interaction;
- current vs pinned Prompt-version references;
- dependency validation, cycle rejection and topological execution;
- authenticated per-block execution with intermediate outputs/error states;
- Mindset and extracted-style constraints with explicit priority;
- owner-viewable/editable Firebase transformation prompts seeded only when missing;
- As Is, Summarized and Conclusion Only branching outputs;
- explicit output save through existing Prompt/version lifecycle;
- saved definition/configuration preservation in Global Version snapshots/export;
- focused tests around cycles/dependency ordering/runtime failure/type semantics.

Dedicated pipeline-local automatic history/reproducibility objects, loops, conditional routing and typed non-text values remain post-MVP rather than being silently added.

---

# 3. Existing Issue mapping

| Issue | Short description | Proposed Milestone | Proposed Priority | Dependency / note |
|---:|---|---|---|---|
| #1 | Documentation + roadmap/timelines | Productization & UX Hardening | P1 | Partially implemented by docs commit; roadmap absent at snapshot |
| #2 | AI version comparison | Configurable AI & Version Intelligence | P1 | Deterministic diff/version history already exists |
| #3 | Editable/versioned base AI prompts | Configurable AI & Version Intelligence | P1 | Hard-coded AI system prompts are current implementation |
| #4 | Architecture helper AI | Vault Intelligence & Contextual Assistance | P2 | New technical docs provide potential authoritative source |
| #5 | AI commit/change messages | Configurable AI & Version Intelligence | P2 | Clarify meaning of “commit”; recommended reuse of #2 |
| #6 | Explorer hover AI summary | Vault Intelligence & Contextual Assistance | P2 | Needs freshness/cache/payload design |
| #7 | Prompt Blocks | Prompt Blocks MVP | P1 Strategic | MVP implemented Aug 19; Issue state still open until Product Owner chooses closure |
| #8 | New Prompt lingering defect | Productization & UX Hardening | **P0** | Reproduce/root-cause first |
| #9 | EurekaVault rebrand | Productization & UX Hardening | P1 | Explicit part1 commit exists |
| #10 | Frontend overhaul | Productization & UX Hardening | P1 | Scope too vague; define acceptance criteria |

No current Issue should be closed merely from this audit. #1 and #9 are In Progress, not complete.

---

# 4. Issue quality actions

## #1 — Keep, refine completion checklist

Add explicit checkboxes for:

- technical docs current;
- `docs/roadmap/` source created;
- root README roadmap current;
- in-app Roadmap page aligned or separately tracked;
- monthly maintenance process documented.

## #2 — Keep

Acceptance should explicitly state that AI comparison augments deterministic diff and identifies which exact Prompt versions were analyzed.

## #3 — Split

Recommended child Issues:

1. base-prompt data model + safe defaults;
2. base-prompt version history;
3. base-prompt editor/restore UX;
4. migrate Finder instructions to configurable prompt source;
5. migrate Repurposer instructions;
6. migrate Mixer instructions;
7. security/validation/testing.

## #4 — Split

1. define authoritative architecture knowledge source and allowed scope;
2. helper AI server-side retrieval/answer path;
3. assistant UI + citations/source transparency;
4. tests for incorrect/stale architecture claims.

## #5 — Refine terminology

Clarify whether “commit” means:

- Prompt Version;
- legacy `localCommits`;
- Global Version;
- Git commit.

Do not implement until the intended artifact is explicit.

## #6 — Keep, add non-functional requirements

Define when summaries regenerate, where they persist/cache, how stale summaries are detected, and what exact Prompt data is sent.

## #7 — Convert to Epic/tracker and decompose

Recommended child Issues:

1. **Prompt Blocks domain model and Firebase persistence**
2. **Workflow CRUD, archive/restore and deletion dependencies**
3. **Workflow version snapshots and change history**
4. **Named variables + current/pinned Prompt dependency model**
5. **Visual DAG builder**
6. **Graph validation, cycle prevention and topological run planner**
7. **Execution preview**
8. **Authenticated Gemini block-execution function/runtime**
9. **Intermediate variable inspector and per-block run/error state**
10. **Run reproducibility + Prompt dependency drift reporting**
11. **Tests/security/snapshot/export integration**

Keep loops/conditions and typed non-text variables as explicit post-MVP follow-ups because Issue #7 itself describes them as later evolution.

## #8 — Keep as P0 bug

The current code's successful submit path calls `onClose()`, so do not assume a missing close call. Reproduce the exact reported linger, capture browser/route/dialog state, then fix the actual cause and add a regression test/manual scenario.

## #9 — Split identity work

1. textual/product-name sweep;
2. Greek/Archimedes visual identity and asset decision;
3. landing/auth messaging/slogan;
4. legacy-name acceptance sweep;
5. decision whether internal storage/local event keys are intentionally retained for migration compatibility.

The last item is a decision, not an automatic rename requirement.

## #10 — Refine before scheduling implementation

“Animations, themes” is not acceptance criteria because Motion and light/dark/system themes already exist. Define:

- which screens/components change;
- desired motion language;
- theme palette/token changes;
- accessibility/reduced-motion rules;
- responsive behavior;
- regression criteria.

---

# 5. Minimal label taxonomy

Avoid dozens of labels. A maintainable starting set:

## Type

- `type:bug`
- `type:feature`
- `type:enhancement`
- `type:architecture`
- `type:documentation`
- `type:research`
- `type:epic`

## Priority

- `priority:p0` — core-path defect / immediate
- `priority:p1` — current or next milestone / strategic blocker
- `priority:p2` — important but not milestone-critical
- `priority:p3` — backlog

## Optional domain labels only if useful

- `area:ai`
- `area:ux`
- `area:versioning`
- `area:workflow`

Do not create a label for every feature name; Milestones/Issues already provide that grouping.

---

# 6. Recommended initial labels by Issue

| Issue | Type | Priority | Optional area |
|---:|---|---|---|
| #1 | `type:documentation` | `priority:p1` | — |
| #2 | `type:feature` | `priority:p1` | `area:ai`, `area:versioning` |
| #3 | `type:architecture` | `priority:p1` | `area:ai` |
| #4 | `type:feature` | `priority:p2` | `area:ai` |
| #5 | `type:enhancement` | `priority:p2` | `area:ai`, `area:versioning` |
| #6 | `type:enhancement` | `priority:p2` | `area:ai`, `area:ux` |
| #7 | `type:epic` | `priority:p1` | `area:workflow`, `area:ai` |
| #8 | `type:bug` | `priority:p0` | `area:ux` |
| #9 | `type:enhancement` | `priority:p1` | `area:ux` |
| #10 | `type:enhancement` | `priority:p1` | `area:ux` |

---

# 7. Milestone operating rules

1. One Issue belongs to the Milestone representing the product outcome it advances.
2. Epic #7 should remain a tracker; child Issues carry actual implementation closure.
3. Do not mark a Milestone complete because code volume is high. Definition of Done and issue scope decide completion.
4. Target dates are forecasts. Update them during monthly review, preserving the old forecast in Git history.
5. Keep no more than one active primary Milestone unless genuinely parallel work is being executed.
6. Bugs that block core workflows can enter the active Milestone even if unplanned; record them as unplanned scope during the monthly review.

---

# 8. Planned vs unplanned tracking

At the start of each Milestone, record the intended Issue list in `milestones.yaml`. If a new Issue is added after start, mark it `scope_change: added_during_milestone` in `issue-mapping.yaml` during the next roadmap update.

This enables a future burn-up chart showing cumulative completed scope vs total identified scope without inventing historical scope for the current repository.

---

# 9. First GitHub planning actions if the product owner chooses to apply them later

1. Create the four proposed Milestones.
2. Add the minimal type/priority labels.
3. Assign #1/#8/#9/#10 to Productization & UX Hardening.
4. Refine #10 before coding it.
5. Reproduce #8 immediately.
6. Split #7 into child Issues but keep #7 as the strategic epic.
7. Add explicit acceptance criteria to #3/#4/#9.
8. Begin monthly review only after the first milestone baseline is frozen.

This audit does **not** perform these GitHub mutations.
