# EurekaVault Documentation

This directory documents the **implemented EurekaVault codebase** as inspected at Git commit `6818b808dc51cf72d3698e61a6bfbfa059108f46` on 2026-08-18.

The documentation is intentionally implementation-led: the current source code and commit history are treated as the source of truth for what the product actually does. Older repository prose that conflicts with the implementation is treated as stale or superseded rather than repeated as current behavior.

## Documentation map

| Document | Purpose |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Runtime architecture, component boundaries, Firebase structure, AI boundary, lifecycle and major data flows. |
| [DATA-MODEL.md](DATA-MODEL.md) | Detailed persisted entities, fields, relationships, invariants and snapshot behavior. |
| [FEATURES.md](FEATURES.md) | Current feature catalog with implementation dates and commit evidence. |
| [VERSION-CONTROL.md](VERSION-CONTROL.md) | Prompt-local history, Git-style diffs, restore behavior and vault-level Global Versions. |
| [AI-SYSTEM.md](AI-SYSTEM.md) | Gemini integration, Netlify functions, payload boundaries, retrieval learning, Repurposer and Mixer. |
| [AUTHENTICATION-AND-SECURITY.md](AUTHENTICATION-AND-SECURITY.md) | Firebase authentication, owner scoping, server-side AI request verification and security assumptions. |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Vite/Netlify/Firebase deployment architecture and environment variables. |
| [TESTING.md](TESTING.md) | Current automated test surface and validation commands. |
| [IMPLEMENTATION-HISTORY.md](IMPLEMENTATION-HISTORY.md) | Evidence-based chronology of the product's development. |
| [DECISION_LOG.md](DECISION_LOG.md) | Current, superseded and still-open architectural/product decisions. |
| [intellectvault-comprehensive-reference.tex](intellectvault-comprehensive-reference.tex) | Comprehensive LaTeX technical/product reference covering all major current functionality and when it entered the codebase. |
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

## Current product shape

EurekaVault is no longer accurately described as only a manual prompt CRUD application. The current implementation combines:

1. A private hierarchical Prompt knowledge base.
2. Automatic Prompt-local version history and Git-style line comparison.
3. Vault-level immutable Global Version snapshots.
4. Prompt file attachments.
5. Directed Prompt lineage relationships and a downloadable graph.
6. Mindsets, scoped Preferences and a product Decision Log.
7. Activity tracking and achievements.
8. Conventional full-text Prompt/history search.
9. Gemini-powered semantic Prompt retrieval.
10. User-confirmed retrieval feedback that becomes bounded few-shot guidance for later Finder searches.
11. Gemini-powered Prompt repurposing.
12. Gemini-powered multi-Prompt synthesis through Prompt Mixer.

## Important stale statements outside this documentation directory

At this snapshot, the root `README.md` and the in-application Roadmap page still contain historical Release 1 statements saying that AI calls are deliberately not implemented. That is no longer true. The implemented AI system is described in [AI-SYSTEM.md](AI-SYSTEM.md).

The root README also mentions "unlimited nested folders" although the implemented and documented hierarchy has **no Folder entity**. The direct hierarchy is:

```text
Endeavor -> Task -> Prompt -> Prompt Version
```

This documentation does not silently rewrite repository history. Superseded decisions are retained and labeled in [DECISION_LOG.md](DECISION_LOG.md).
