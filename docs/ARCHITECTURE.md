# Architecture

## 1. Snapshot and source of truth

The current repository baseline inspected for this architecture is commit `4a3cc23134da6133deab04bafa53df3c285e3113` (2026-08-19), which contains the first Spring Boot migration foundation. This document then incorporates the CI/CD hardening and deployment-state updates prepared after that commit. Current code, Firebase rules, Netlify functions, backend configuration, host configuration and tests take precedence over older prose.

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

### Physical hosting topology as of 2026-08-19

```text
GitHub repository
  |
  +-- GitHub Actions CI/CD
  |     |
  |     +-- Netlify deployment trigger
  |     |     -> React/Vite static application
  |     |     -> Netlify Functions
  |     |
  |     +-- Render deployment trigger
  |           -> Render Web Service
  |              -> Docker container
  |                 -> Eclipse Temurin Java 21 JRE
  |                    -> Spring Boot JAR
  |                       -> embedded Tomcat
  |
  +-- source of both frontend and backend artifacts

Firebase
  +-- Authentication
  +-- Realtime Database

UptimeRobot
  -> external GET every 5 minutes
     -> https://eurekavault-backend.onrender.com/actuator/health
```

The physical deployment topology is already multi-service, but the application data path is **not yet fully 3-tier**. The browser still talks directly to Firebase for persisted vault data, and AI calls still use Netlify Functions. Spring Boot currently provides only the migration foundation and health endpoint. Calling the system fully migrated at this point would be inaccurate.

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

### Prompt Blocks

Prompt Blocks adds a visual, typed Prompt-processing DAG without introducing an autonomous-agent runtime. The main boundaries are:

```text
Prompt Blocks workspace
  ├─ graph definition editor
  ├─ typed connection validation
  ├─ block inspector / priority editor
  ├─ transformation-prompt editor
  └─ run inspector
          │
          ▼
src/prompt-blocks/runtime.ts
  ├─ validates DAG
  ├─ resolves Prompt / Prompt Version / Mindset references
  ├─ topologically schedules ready blocks
  ├─ keeps intermediate runtime values in memory
  └─ invokes AI only for AI blocks
          │
          ▼
/.netlify/functions/prompt-block-transform
          │
          ▼
Gemini
```

Saved methodology and runtime execution are separate. `promptBlockPipelines` stores graph definitions; generated run values are not persisted by default. `promptBlockTransformPrompts` stores owner-editable AI behavior. Both are included in Global Version snapshots and JSON export, while ephemeral run outputs are excluded.

Prompt Blocks wires are not Prompt Relationships. Relationship records represent Prompt provenance/lineage; Prompt Blocks connections represent execution flow.

The graph has two wire types: `content` and `constraint`. `Extract Style` emits a constraint value. Mindset blocks reference existing Mindset IDs. Constraint priority is explicit connection data rather than inferred from visual position.

The first execution model is a DAG: cycles are rejected. Failed upstream blocks mark dependent blocks as blocked, while independent branches and previously completed intermediate results remain available.

On mobile, the desktop canvas is replaced with an ordered block-flow representation instead of merely shrinking the canvas. The semantic graph, ports, run states, and inspector remain the same.

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

### Frontend host: Netlify

Netlify continues to host the Vite/React frontend and the three existing AI functions. `netlify.toml` builds with Node 22.12.0, executes `npm run build`, publishes `dist`, applies the SPA fallback to `/index.html`, and sets `ignore = "exit 0"` so ordinary Git-triggered builds are skipped. Build-hook-triggered builds bypass that ignore rule and are therefore reserved for the post-CI production path.

During this migration stage, Netlify is therefore both a static frontend host and the temporary server-side AI boundary. Removing Netlify Functions before the Spring Boot replacement is implemented would break current AI functionality.

### Backend host: Render

The Spring Boot service is deployed as the Render Web Service `eurekavault-backend` from the `main` branch. The repository is a monorepo, so Render's service root is `backend/`.

Current public endpoint:

```text
https://eurekavault-backend.onrender.com
```

Current infrastructure health endpoint:

```text
https://eurekavault-backend.onrender.com/actuator/health
```

Both local execution and the deployed Render endpoint were verified on 2026-08-19. The local service ran on Windows with Maven 3.9.16 and Java 25; the project itself targets Java 21, and the production container deliberately uses Java 21. The deployed health endpoint returned `UP`.

### Why Render runs Docker instead of a native JVM service

Render does not expose Java/JVM as a native language runtime for this service. The backend is therefore packaged and executed through `backend/Dockerfile`.

The runtime chain is not merely "Render runs Spring Boot"; the actual boundary is:

```text
Render Web Service
  -> Docker
     -> Java 21 JRE / JVM
        -> packaged Spring Boot executable JAR
           -> embedded Tomcat
              -> HTTP endpoints
```

The Dockerfile uses a Maven + Eclipse Temurin 21 builder stage and a smaller Eclipse Temurin 21 JRE runtime stage. This keeps the Maven toolchain out of the final runtime image.

### Monorepo path contract

Frontend build context remains the repository root. The Spring Boot project is isolated under:

```text
backend/
  Dockerfile
  pom.xml
  src/
```

The live Render service was created manually through **New Web Service**, with Root Directory set to `backend`. It was not created as a Blueprint resource. Consequently, `render.yaml` is currently a version-controlled desired/recreation specification, not an automatically authoritative controller for the already-created service. Dashboard settings must still be changed in the Render service itself unless the resource is later brought under Blueprint management.

This distinction is intentional documentation because treating an unattached YAML file as active infrastructure-as-code would obscure the real operational state.

### Port and lifecycle contract

Spring Boot binds to:

```text
${PORT:8080}
```

so local development defaults to port 8080 while Render can inject its platform port. Graceful shutdown is enabled.

Actuator web exposure is deliberately limited to `health`; environment/configuration Actuator endpoints are not intended to be public.

## 17. Uptime and wake-up architecture

UptimeRobot is a separate third-party service from Render. It does not execute code and does not host the backend.

The configured relationship is:

```text
UptimeRobot Free monitor
  -> every 5 minutes
     -> HTTPS GET
        -> Render
           -> /actuator/health
```

The five-minute monitor serves two low-cost migration purposes: external reachability monitoring and periodic inbound requests to reduce the chance of the Render Free service remaining idle. UptimeRobot status-change notifications are separate from the five-minute requests; the initial UP/DOWN emails observed during setup were test notifications.

This arrangement must not be mistaken for a production SLA. Periodic pings do not create redundancy, eliminate cold starts under every failure mode, or replace application-level observability.

## 18. CI/CD architecture

Before any functional migration begins, frontend and backend changes are gated by GitHub Actions. The repository contains two workflows:

```text
.github/workflows/ci.yml
.github/workflows/deploy-production.yml
```

### CI path

```text
pull request or push to main
  |
  +-- Frontend quality job
  |     +-- dependency install
  |     +-- ESLint
  |     +-- Vitest
  |     +-- TypeScript + Vite production build
  |     +-- Netlify Function syntax checks
  |
  +-- Backend test job
  |     +-- Java 21
  |     +-- Maven clean verify
  |     +-- unit/context tests
  |     +-- Failsafe integration tests
  |
  +-- Backend container job
        +-- build backend/Dockerfile
        +-- start packaged container
        +-- verify /actuator/health -> UP
        +-- verify /actuator/env -> 404
```

The container job matters architecturally because Render runs the Docker artifact, not `mvn spring-boot:run`. Passing Spring tests while shipping a broken Dockerfile would otherwise remain possible.

### CD path

A production deployment is eligible only after a successful CI workflow caused by a push to `main`. Pull-request CI cannot deploy production.

The deployment workflow uses two repository secrets:

```text
NETLIFY_BUILD_HOOK_URL
RENDER_DEPLOY_HOOK_URL
```

GitHub Actions triggers Netlify through its build hook and Render through its deploy hook. The Render request includes the exact CI-tested commit SHA.

Deploy-hook URLs are credentials: anyone possessing one can trigger deployments. They therefore belong in GitHub Actions secrets rather than source code. This is a narrower privilege surface than storing broad Netlify/Render account API credentials for the current need.

### One authoritative deployment path

For the test gate to be real, native host auto-deployment must be disabled after the hook-based workflow is configured:

```text
Git push
  -> GitHub Actions CI
     -> success
        -> deploy hooks
           -> Netlify and Render
```

If Netlify or Render also deploys immediately on every commit, failing code could begin deployment before CI finishes, nullifying the intended safety property. `render.yaml` therefore records `autoDeployTrigger: off` for future/recreated Blueprint-managed services, and the manually created live Render service must also be set to Auto-Deploy Off in its dashboard.

Netlify uses a repository-level gating mechanism rather than stopping builds globally: `netlify.toml` contains `ignore = "exit 0"`. Ordinary Git-triggered Netlify builds are therefore skipped, while Netlify explicitly does not apply the `ignore` command to build-hook-triggered builds. A successful GitHub Actions run can consequently trigger Netlify through `NETLIFY_BUILD_HOOK_URL`, but an unvalidated push cannot deploy the frontend directly. Builds remain active because stopping Netlify builds globally would also disable build hooks.

### CI/CD does not collapse service boundaries

GitHub Actions coordinates validation and deployment but does not become an application runtime. Runtime responsibility remains local to each host. This preserves a clear distinction between:

- source/version control: GitHub;
- validation/release orchestration: GitHub Actions;
- frontend + transitional AI hosting: Netlify;
- Spring Boot hosting: Render;
- identity/data services: Firebase;
- external availability monitoring: UptimeRobot.

Full CI/CD details and required operational setup are documented in `docs/CI-CD.md`.

## 19. Migration safety boundary

The migration remains incremental. CI/CD hardening does **not** itself move any user operation to Spring Boot. Current behavior remains:

```text
Authentication: browser <-> Firebase Auth
Vault data:     browser <-> Firebase Realtime Database
AI:             browser -> Netlify Functions -> Gemini
Spring Boot:    health/infrastructure only
```

When functional migration begins, each bounded capability must carry its tests with it before its old path is retired. In particular, future Firebase Admin access will be a privileged server-side boundary: the backend must derive identity from a verified Firebase token rather than trusting a browser-supplied UID. No Firebase Admin credential has been provisioned to Render yet.

## 20. Architectural boundaries and known non-features

Current implementation still does **not** provide:

- collaborative multi-user editing/sync;
- markup parsing based on a finalized custom markup format;
- Prompt Rating.

Prompt Blocks is implemented in the 2026-08-19 delivery. Its MVP deliberately excludes loops, conditional routing, autonomous-agent behavior and dedicated pipeline-local automatic version history; those exclusions should not be mistaken for missing core Prompt Blocks execution.

The Spring Boot service is now a real deployed backend foundation, but it is not yet the application's data/API authority. That distinction should remain explicit until actual capabilities are migrated.
