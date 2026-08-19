# Architecture

## 1. Snapshot and source of truth

The application baseline comes from commit `6818b808dc51cf72d3698e61a6bfbfa059108f46` (2026-08-18). This document also includes the incremental Spring Boot migration foundation added on 2026-08-19; assign its final commit SHA after integration. Current code, Firebase rules, Netlify functions, backend configuration and tests take precedence over older prose.

## 2. High-level architecture

EurekaVault is a browser application with three principal runtime boundaries:

```text
Browser
  React 19 + TypeScript + Vite
  |
  +-- Firebase Authentication
  |
  +-- Firebase Realtime Database
  |     owner-scoped vault data (current path during migration)
  |
  +-- Netlify Functions
  |     authenticated server-side boundary for Gemini (current path during migration)
  |     |
  |     +-- Gemini Interactions API
  |
  +-- Spring Boot backend
        incremental 3-tier migration target
        currently exposes infrastructure health only
```

The browser is the main application runtime. Firebase supplies authentication and persistence. Netlify Functions exist specifically where a server-side trust boundary is required for Gemini credentials and authenticated AI requests.

The repository now also contains a Spring Boot backend under `backend/`. This is an intentionally non-disruptive migration foundation: no existing CRUD, Firebase subscription, authentication, or AI request has been rerouted yet. Subsequent migration steps can move one bounded capability at a time behind this backend while preserving the working client path until each replacement is verified.

## 3. Frontend composition

### Application shell and routing

`src/App.tsx` mounts:

- `AuthProvider` for Firebase session state and account operations.
- `VaultProvider` for realtime vault data, CRUD, versions, attachments, relationships, activity, achievements, AI activity recording, Global Versions and exports.
- `EntityUiProvider` for shared record dialogs and lifecycle actions.
- `AppShell` for authenticated navigation and shared layout.

Authenticated routes currently include:

```text
/dashboard
/achievements
/ai/find-prompt
/ai/prompt-mixer
/ai/repurpose-prompt
/hierarchy
/prompts
/prompts/:promptId
/relationships
/mindsets
/mindset-construction
/preferences
/versions
/decisions
/roadmap
/archive
/settings
/search
```

`/commits` redirects to `/versions`, reflecting the product's newer Global Version terminology while preserving an older route alias.

### State ownership

`AuthProvider` owns identity/session actions. `VaultProvider` subscribes to `intellectVault/users/{uid}` and normalizes persisted maps into the current domain model. Pages generally invoke provider operations instead of writing Firebase directly.

## 4. Authentication boundary

Firebase Email/Password authentication supports:

- account creation;
- sign-in;
- sign-out;
- password reset;
- verification email on sign-up;
- verification email resend;
- profile display-name initialization.

Workspace initialization creates a profile and seeded Decision records under the new user's UID.

## 5. Persistence boundary

The EurekaVault Firebase root is:

```text
intellectVault/users/{uid}/
```

Current persisted branches include:

```text
profile
activityDays
activityStats
achievements
endeavors
tasks
prompts
promptVersions
promptAttachments
promptRelations
promptFinderFeedback
mindsets
preferences
localCommits
globalCommits
decisions
```

Records are stored as maps keyed by Firebase push IDs unless a structure has a natural key, such as `activityDays/{YYYY-MM-DD}` or achievement IDs.

### Owner isolation

`database.rules.json` enforces, for the EurekaVault subtree:

```text
read  allowed only when auth.uid == $uid
write allowed only when auth.uid == $uid
```

This is the primary data-isolation mechanism for the current single-owner workspace design.

## 6. Direct knowledge hierarchy

The implemented content hierarchy is deliberately direct:

```text
Endeavor
  -> Task
      -> Prompt
          -> Prompt Version history
```

There is no implemented Folder entity. Prompt lineage relationships are orthogonal to this hierarchy and may connect Prompts across different Endeavors.

## 7. CRUD and lifecycle architecture

Base content records carry:

- `id`;
- `createdAt`, `updatedAt`;
- `createdBy`, `updatedBy` user stamps;
- optional `archivedAt`, `archivedBy`.

The application supports create/read/update plus recoverable archive/restore. Permanent deletion is implemented with dependency checks rather than being universally unconditional.

Examples of dependency behavior include preventing deletion of a parent object while stored children or references still depend on it. Prompt-specific cleanup and dependency handling also include attachments, versions and relationships.

## 8. Prompt Workspace architecture

The Prompt Workspace is the richest single artifact surface. It has four tabs:

1. **Editor** - edit the Prompt's metadata and content.
2. **History** - inspect local versions, compare them and restore a historical snapshot as a new current version.
3. **Files** - upload, download and remove Prompt attachments under bounded size/count limits.
4. **Relationships** - manage `inspired-by` lineage for the Prompt.

Workspace behavior includes dirty-state tracking, browser unload protection, Ctrl/Cmd+S saving, copy, duplicate, archive/delete actions, focus mode and direct entry points into Repurposer and Mixer.

## 9. Version-control architecture

### Prompt-local versions

A Prompt creation creates Version 1. Saving a meaningful Prompt change writes a new complete Prompt snapshot into `promptVersions`. Historical restoration does not mutate history: the selected old snapshot is written back as the current Prompt and becomes another new version.

### Diff engine

`src/lib/diff.ts` supplies line-oriented comparison used by the Prompt Workspace. The implementation supports:

- exact old/new line numbers;
- additions/removals statistics;
- unified review;
- side-by-side review;
- collapsing unchanged context;
- a bounded/fallback strategy for large comparisons.

### Global Versions

A Global Version is a deliberate vault-level snapshot created by the owner. It is distinct from automatic Prompt-local versions. Current snapshots may include profile, activity/achievements, hierarchy records, Prompts, Prompt histories, attachments, relationships, Finder feedback, Mindsets, Preferences, local commit records and Decisions.

## 10. Attachments architecture

Prompt files are currently persisted directly in Firebase as Base64 text rather than external object storage.

Limits enforced by `src/lib/attachments.ts`:

- maximum 2 MiB per file;
- maximum 20 files per Prompt;
- maximum 10 MiB total per Prompt.

The client reconstructs a Blob to download a stored attachment. Attachment kinds are classified for presentation as image, PDF, text, archive or generic file.

## 11. Relationship architecture

`PromptRelation` stores a directed parent-to-child lineage relationship using `relationshipType: "inspired-by"`.

The relationship layer enforces:

- both endpoints must be active Prompts;
- no self-relationship;
- no duplicate directed relation;
- no circular inspiration chain.

The graph renderer groups related Prompts by Endeavor, supports cross-Endeavor influence, computes routes for edges and exports SVG/PNG versions of the relationship map.

## 12. Activity and achievement architecture

The provider records activity events such as sessions, record lifecycle actions, Prompt commits, Global Version releases, file actions, relationship actions and AI operations.

Activity is aggregated into:

- distinct local-date `activityDays`;
- cumulative/action-specific `activityStats`;
- persisted achievement unlocks.

The achievement engine calculates live progress from actual vault state plus activity history, then persists an unlock when a criterion is first satisfied.

## 13. AI architecture

AI is implemented through three Netlify Functions:

```text
netlify/functions/prompt-retrieval.mjs
netlify/functions/prompt-repurpose.mjs
netlify/functions/prompt-mix.mjs
```

The browser obtains a Firebase ID token and calls the relevant function. The function verifies that token against the supplied UID before invoking Gemini. `GEMINI_API_KEY` remains server-side and is never exposed through a `VITE_` variable.

### Semantic Prompt Finder

The browser builds a bounded active-Prompt corpus including Prompt fields, hierarchy labels and direct relationship context. Gemini ranks existing Prompt IDs. Stored Prompt text is explicitly treated as untrusted retrieval material rather than executable instruction text.

### Feedback learning

A Finder search can be explicitly confirmed by selecting the Prompt that was actually intended. The mapping is stored in `promptFinderFeedback`. Future searches build a bounded set of recent `query -> confirmed Prompt` examples and send those to Gemini as user-specific few-shot retrieval preference evidence.

### Repurposer

The Repurposer sends one source Prompt plus a new objective. Gemini returns an editable draft designed to preserve the source's structure, specificity and constraints while changing its objective. Saving creates a normal new Prompt with independent Version 1 history.

### Mixer

The Mixer accepts at least two non-empty source windows. A source can be an existing vault Prompt or arbitrary pasted/typed Prompt text. Gemini synthesizes one editable Prompt. The result can be discarded, copied, saved as a new Prompt or saved as the next version of an existing Prompt.

## 14. Search and discovery

Conventional Search is separate from semantic Finder. `/search` performs deterministic word matching across active Prompt titles, descriptions, purposes, current content and saved version history, with an optional Endeavor filter.

The application also exposes navigation/search affordances through the AppShell and command palette.

## 15. Settings, diagnostics and export

Settings provides:

- workspace-name editing;
- Firebase connection/session/email-verification diagnostics;
- verification resend;
- owner email display;
- JSON export of the workspace;
- a visible reminder of the required owner-only Firebase rules.

## 16. Deployment architecture

Netlify runs `npm run build`, publishes `dist`, uses Node `22.12.0`, and applies an SPA fallback redirect to `/index.html`. Firebase provides auth/database services. Netlify Functions provide the server-side AI boundary.

## 17. Architectural boundaries and known non-features

Current code inspection does **not** show implementations for:

- collaborative multi-user editing/sync;
- markup parsing based on a finalized custom markup format;
- Prompt Rating;
- Prompt Blocks.

The first two are explicitly historical open/gated product areas. The latter two should not be documented as implemented unless corresponding code is added.

The current architecture also has no conventional application backend. If a future backend is introduced, the Gemini calls and secret handling are natural candidates to move from Netlify Functions into that backend.
