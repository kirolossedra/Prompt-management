# EurekaVault Documentation

This directory documents the **implemented EurekaVault codebase and evidence-backed GitHub roadmap** using `main` commit `7e45248a408e372088d18cab74faef5a79523075` as the evidence baseline. The distributed package includes the documentation/RoadmapPage cleanup itself on top of that baseline; no new Git commit SHA is invented.

The documentation uses a strict distinction:

- current code + commits define **implemented state**;
- GitHub Issues/comments/labels define **explicitly raised open scope**;
- no AI-inferred feature, date, priority, percentage, or initiative is treated as a product commitment.

## Documentation map

| Document | Purpose |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Runtime architecture, frontend/Firebase boundary, Spring Boot migration foundation, AI boundary, and data flow. |
| [DATA-MODEL.md](DATA-MODEL.md) | Persisted entities, fields, relationships, invariants, and snapshot behavior. |
| [FEATURES.md](FEATURES.md) | Current feature catalog plus explicit open GitHub requests. |
| [VERSION-CONTROL.md](VERSION-CONTROL.md) | Prompt-local history, Git-style diffs, restore behavior, and Global Versions. |
| [AI-SYSTEM.md](AI-SYSTEM.md) | Gemini integration and feature-level AI behavior. |
| [AI_PIPELINES.md](AI_PIPELINES.md) | Canonical AI payload, validation, privacy, persistence, and Prompt Blocks execution contracts. |
| [AUTHENTICATION-AND-SECURITY.md](AUTHENTICATION-AND-SECURITY.md) | Firebase auth, owner scoping, AI request verification, secret boundaries, and history-related secret handling. |
| [CI-CD.md](CI-CD.md) | GitHub Actions quality gates and deployment orchestration, including the current Issue #16 limitation. |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Netlify/Firebase/Render deployment topology and environment responsibilities. |
| [TESTING.md](TESTING.md) | Current automated test surface and validation commands. |
| [IMPLEMENTATION-HISTORY.md](IMPLEMENTATION-HISTORY.md) | Commit-backed chronology through Prompt Blocks and CI/CD. |
| [DECISION_LOG.md](DECISION_LOG.md) | Evidence-backed decisions and explicit open requests; unsupported pseudo-decisions removed. |
| [intellectvault-comprehensive-reference.tex](intellectvault-comprehensive-reference.tex) | Current LaTeX comprehensive reference (legacy filename retained for repository compatibility). |
| [intellectvault-comprehensive-reference.pdf](intellectvault-comprehensive-reference.pdf) | Rendered current comprehensive reference. |
| [`roadmap/`](roadmap/) | GitHub-Issue/epic + commit-backed roadmap evidence. |
| `features/` | Deep feature-specific documentation. |

## Feature deep dives

- [Prompt workspace](features/prompt-workspace.md)
- [Prompt files](features/prompt-files.md)
- [Prompt relationships](features/prompt-relationships.md)
- [Global Versions](features/global-versions.md)
- [Achievements and activity](features/achievements.md)
- [Mindset Builder](features/mindset-builder.md)
- [Semantic Prompt Finder](features/semantic-prompt-finder.md)
- [Prompt Repurposer](features/prompt-repurposer.md)
- [Prompt Mixer](features/prompt-mixer.md)
- [Prompt Blocks](features/prompt-blocks.md)

## Current product shape

EurekaVault currently combines:

1. owner-private Firebase-backed Prompt knowledge management;
2. automatic Prompt-local version history and Git-style comparison;
3. Global Version snapshots;
4. Prompt files and lineage relationships;
5. Mindsets, Preferences, Decisions, activity, and Achievements;
6. conventional and Gemini-assisted Prompt retrieval;
7. Gemini Repurposer and Mixer workflows;
8. Prompt Blocks typed visual methodology pipelines;
9. a Spring Boot/Render backend **foundation** for the explicit 3-tier migration;
10. GitHub Actions quality/deployment gates.

The backend migration is deliberately documented as unfinished because the browser still performs direct Firebase CRUD and current Gemini calls still use Netlify Functions.
