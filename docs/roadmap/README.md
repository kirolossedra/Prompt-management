# EurekaVault Roadmap Sources

This directory is the maintainable planning source for the EurekaVault product roadmap.

**Repository snapshot:** `main` at `3b61d7050f905a5c591971f6e8ecbdc8588870ac`.  
**Analysis cutoff:** 2026-08-18T12:39:00-04:00.  
**GitHub was inspected read-only; these files are proposals and do not imply that Milestones, labels, issue state, or target dates have already been applied on GitHub.**

## Source files

| File | Purpose |
|---|---|
| `roadmap.yaml` | Current product phase, current/next milestones, forecast policy, unscheduled decision gates |
| `milestones.yaml` | Historical/current/planned milestone definitions, progress, dependencies, DoD, estimated dates |
| `initiatives.yaml` | Strategic initiatives above milestones |
| `issue-mapping.yaml` | All current open Issues mapped to type, proposed priority, complexity, status, milestone and dependencies |
| `weekly-velocity.yaml` | One record for every calendar Agile week since repository inception |
| `weekly-velocity.svg` | Generated weekly Engineering/Feature/Architecture/Product delivery chart |
| `product-audit.md` | Full evidence-based historical reconstruction and product review |
| `github-milestones.md` | Practical GitHub Milestone/label/issue-management proposal |

## Source-of-truth hierarchy

```text
Repository implementation + Git history + Issues
                  ↓
        weekly-velocity.yaml
                  ↓
 initiatives.yaml / milestones.yaml / issue-mapping.yaml
                  ↓
             roadmap.yaml
                  ↓
    docs/roadmap/product-audit.md
                  ↓
        Root README roadmap summary
```

Current implementation is authoritative for what exists. Git history is authoritative for when implementation entered the repository. GitHub Issues and finalized/open Decisions are authoritative evidence of planned or unresolved work. Forecast dates and percentages are explicitly tagged as estimates.

## Roadmap hierarchy

```text
Product Phase
  → Strategic Initiative
    → Milestone
      → GitHub Issue
        → Implementation / commit evidence
```

## Update rules

1. Never mark a feature complete from an Issue title or commit message alone; verify implementation.
2. Add every calendar project week to `weekly-velocity.yaml`, including zero-activity weeks.
3. Keep historical dates immutable once verified against Git history.
4. Mark future dates with `type: estimated` and confidence.
5. Reforecast from observed velocity; never convert an estimate into a historical fact.
6. Close or move Issues only in GitHub when the product owner explicitly chooses to do so; the files here may recommend actions but do not perform them.
7. Keep the root README concise; detailed reasoning lives in this directory.

## Monthly review

Use the seven-step process in `product-audit.md`: review delivery → current milestone → velocity → reforecast → groom backlog → update structured sources → refresh README.
## Generated Gantt chart

The roadmap Gantt chart is generated from `milestones.yaml`; do not maintain the Mermaid task list independently.

Run from the repository root:

```bash
npm run roadmap:gantt
```

The generator:

1. reads milestone name, status, start date, target date, and provenance from `docs/roadmap/milestones.yaml`;
2. writes `docs/roadmap/generated-gantt.md`;
3. replaces only the content between `ROADMAP-GANTT` markers in the root `README.md`;
4. classifies `completed` milestones under **Completed**, `active` milestones under **Current - forecast**, and `planned` milestones under **Planned - forecast**;
5. preserves historical dates as historical facts while keeping forecast milestones visibly separated.

`milestones.yaml` now contains both historical and future milestones specifically so this visualization has one structured source of truth.

