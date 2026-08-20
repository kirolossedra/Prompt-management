# EurekaVault Roadmap Evidence Policy

This directory exists to answer two different questions without mixing them:

1. **What has actually shipped?** — current code and Git commits.
2. **What has the product owner actually raised as future/open work?** — GitHub Issues, Issue comments, labels, and real GitHub Milestones if any exist.

**Evidence baseline:** `kirolossedra/Prompt-management`, branch `main`, commit `7e45248a408e372088d18cab74faef5a79523075` (2026-08-20 UTC). The files in this cleanup package are modified on top of that baseline and intentionally have no invented commit SHA.

## Governing rule

No document in this directory may invent a roadmap commitment.

A proposed feature may appear as future/open scope only when there is direct evidence such as a user-created GitHub Issue or explicit product-owner decision. AI-generated grouping, “likely next steps,” estimated dates, inferred priorities, percentages, and speculative initiatives are not product commitments and are not stored as such.

## Source-of-truth order

```text
Current source code
  → authoritative for what exists now

Git commit history
  → authoritative for when implementation entered the repository

GitHub Issues + Issue comments + labels
  → authoritative for explicitly raised backlog/epic scope

GitHub Milestones
  → authoritative for milestone assignment/dates only when actually configured
```

At this snapshot, GitHub reports **no milestone assignment on any Issue**. Therefore this roadmap contains no fabricated GitHub milestone schedule.

## Important interpretation rules

- **Open Issue ≠ unimplemented.** Issues #7, #11, #17, and #18 have implementation evidence while still open.
- **Epic body ≠ commitment to every sentence.** Issue #7 contains a broad design exploration; only code-backed Prompt Blocks behavior is documented as delivered.
- **A design question remains a design question.** Issue #15 is not silently converted into an approved relationship-instance migration.
- **No delivery date without direct evidence.** There are no future target dates in this roadmap snapshot.
- **No inferred priority/complexity.** Those fields were removed because GitHub does not contain them for the current backlog.
- **No invented initiatives.** `initiatives.yaml` mirrors Issues carrying the actual `epic` label.

## Files

| File | Purpose |
|---|---|
| `roadmap.yaml` | Snapshot facts, evidence policy, actual epic IDs, and unscheduled open-Issue set. |
| `initiatives.yaml` | Actual GitHub Issues labeled `epic`; no synthetic strategic initiatives. |
| `issue-mapping.yaml` | Issues #1–#18 with labels, GitHub state, implementation status, and evidence commits. |
| `milestones.yaml` | Retrospective delivery groups derived from commits. These are **not** GitHub Milestones. |
| `generated-gantt.md` | Historical commit-backed delivery Gantt only. |
| `weekly-velocity.yaml` | Commit counts by week, including zero-activity weeks. |
| `weekly-velocity.svg` | Visualization of the same factual commit-count series. |
| `product-audit.md` | Narrative evidence audit and removed-speculation record. |
| `github-milestones.md` | Actual GitHub planning-state summary. |

## Gantt generation

Run:

```bash
npm run roadmap:gantt
```

The generator reads only completed retrospective delivery groups from `milestones.yaml`. It writes `generated-gantt.md` and refreshes the marked Gantt block in the root README. It does not forecast future work.

## Updating this roadmap

When a new change lands:

1. Read the new commit(s) and affected code.
2. Read any referenced Issue and its current labels/comments.
3. Update the implementation status of that Issue without closing or relabeling it unless the product owner separately asks for a GitHub mutation.
4. Add a retrospective delivery group only when the commit history supports one.
5. Never create dates, priorities, dependencies, or epics merely to make the roadmap look complete.
