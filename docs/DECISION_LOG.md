# Decision Log

This file distinguishes **current finalized decisions**, **superseded historical decisions**, and **still-open decisions**. Superseded entries are retained because they explain how the product evolved.

## Current finalized decisions

### Direct hierarchy

**Status:** Finalized

The hierarchy is:

```text
Endeavor -> Task -> Prompt -> Prompt Version
```

There is no Folder entity in the current domain model.

### Automatic Prompt history

**Status:** Finalized

Prompt creation and saved Prompt changes create Prompt-local historical snapshots automatically. Restoring an old snapshot produces another new version instead of deleting later history.

### Prompt-local vs vault-global versions

**Status:** Finalized

Each Prompt has automatic local versions. Separately, the owner may explicitly release a Global Version containing a snapshot of the current vault.

### Private workspace

**Status:** Finalized

The current product is owner-private. Realtime Database access under `intellectVault/users/{{uid}}` is restricted to the authenticated matching UID.

### CRUD and lifecycle

**Status:** Finalized for current implemented content model

Implemented content records support create/read/update and archive/restore where applicable. Permanent deletion is implemented with dependency safety rather than universally forbidden.

### AI exists, but only in explicit AI workflows

**Status:** Finalized by implementation

AI calls now exist in Semantic Prompt Finder, Prompt Repurposer and Prompt Mixer. Manual analysis/context fields on records do not automatically trigger AI calls.

### AI secret boundary

**Status:** Finalized by implementation

Gemini calls use Netlify Functions so `GEMINI_API_KEY` remains server-side. AI functions authenticate the Firebase session before calling Gemini.

### Mindset Construction is deterministic

**Status:** Finalized by implementation

Mindset Construction does not call Gemini. It assembles selected Prompt text deterministically, allows the owner to edit the result and saves it as a normal Mindset.

### Prompt relationships are explicit lineage

**Status:** Finalized by implementation

Prompt relationships use directed `inspired-by` semantics, support cross-Endeavor links, prevent cycles/duplicates and are created explicitly by the user.

### AI-generated Repurposer output does not create an automatic lineage link

**Status:** Finalized by implementation

Saving a repurposed Prompt creates a new Prompt and Version 1, but no Prompt relationship is automatically created. The user can add one manually if semantically appropriate.

### Incremental migration to a Spring Boot 3-tier architecture

**Status:** Finalized by product-owner direction on 2026-08-19

EurekaVault will migrate incrementally from the current browser-to-Firebase architecture to a 3-tier architecture with a Spring Boot backend. The migration is deliberately non-big-bang: existing working paths remain active until bounded backend replacements are implemented and verified.

The backend deployment target is Render. During the low-cost migration/testing phase, UptimeRobot is intended to call the backend health endpoint every 5 minutes. Existing Netlify Functions remain in place until their responsibilities are explicitly migrated to Spring Boot.

## Superseded historical decisions

### "Release 1 is manual-first and performs no AI calls"

**Historical status:** Superseded on 2026-08-08.

Semantic Prompt Finder, Prompt Repurposer and Prompt Mixer now make authenticated Gemini calls through Netlify Functions.

### "Prompts have manual version history"

**Historical status:** Superseded by the automatic Prompt-history workflow introduced by 2026-08-07.

Prompt saves now create history automatically.

### "Changes support local and global commits with manual commit-to-commit summaries"

**Historical status:** Partially superseded / terminology evolved.

Legacy commit-oriented data structures remain, but the current UI is centered on automatic Prompt Versions and deliberate Global Versions.

### "Permanent historical deletion remains undecided"

**Historical status:** Superseded for implemented record lifecycle.

Permanent deletion is now implemented with dependency checks.

### "AI execution/generation/evaluation is deliberately not implemented"

**Historical status:** Superseded on 2026-08-08 for the explicit AI tools.

This statement still appears in stale repository documentation and the in-app Roadmap page but no longer describes implementation reality.

## Still-open product/architecture decisions

### Markup format

The exact custom markup format remains unresolved. No markup parser should be documented as implemented until a format is approved and code exists.

### Collaboration

Ownership, roles, permissions, invitations, synchronization, replica behavior and conflict handling are not finalized. The current Firebase rule is intentionally owner-only.

### Mindset inheritance/conflict semantics

Current Mindsets have scopes and can be constructed from Prompts, but a formal inheritance/conflict-resolution system is not established in the inspected code.

### Preference precedence

Preferences can be scoped globally, by Endeavor or by Task. A formal merge/override precedence model remains an architectural/product decision.

### Account/workspace deletion

The exact full-account deletion and whole-workspace deletion policy is not represented as a finalized product workflow in the inspected code.

## Current implementation boundary after Prompt Blocks delivery

Prompt Rating remains unimplemented in the supplied baseline.

Prompt Blocks is implemented in the 2026-08-19 delivery with the following finalized product decisions:

- Prompt Blocks is a typed Prompt-transformation DAG, not a generic autonomous-agent graph.
- Input, Transformation, Constraint and Output blocks remain semantically distinct.
- Prompt/content flow and Constraint flow use different typed connections.
- Mindset constraints reference existing Mindset entities rather than duplicate constraint records.
- Multiple constraints use explicit, editable integer priority; lower numbers take precedence.
- The v1 execution model is deterministic and acyclic; loops/conditional routing are not silently introduced.
- Running a pipeline never overwrites source Prompts. Generated values remain runtime-only unless explicitly saved.
- Saved pipelines are first-class owner artifacts with create/update/archive/restore/delete lifecycle.
- Quick pipelines do not require persistence.
- System Prompt inputs support following the current Prompt or pinning a specific Prompt Version.
- Transformation prompts are product behavior: initial thorough defaults are seeded only when missing, then the owner's Firebase records are authoritative and editable.
- Prompt Blocks retains the existing authenticated Netlify/Gemini boundary while Spring Boot remains an emerging infrastructure-only backend.
- Addition performs structure-aware semantic incorporation rather than literal append. Subtraction performs semantic removal while preserving unrelated meaning rather than literal string deletion.
- Dedicated pipeline-local automatic version history is deferred; saved pipeline definitions are included in Global Version snapshots/export so future methodology versioning can be introduced deliberately.

### CI must gate both frontend and backend production deployment

**Status:** Finalized by product-owner direction on 2026-08-19

Before any functional 2-tier-to-3-tier migration continues, EurekaVault will establish substantial automated validation for both frontend and Spring Boot backend. GitHub Actions is the common validation/release gate. Frontend checks include lint, Vitest, production build and Netlify Function syntax validation. Backend checks include Spring Boot unit/configuration tests, integration tests, Maven `verify`, Docker image build and a live container health/exposure smoke test.

Production deployment is automatic only after successful CI on a push to `main`. GitHub Actions triggers the existing Netlify deployment and the Render backend deployment using protected deploy-hook secrets. Native host auto-deploy should be disabled once this path is active so a host cannot bypass CI by deploying immediately on push.

### Render backend runs as Docker -> JVM -> Spring Boot

**Status:** Finalized and verified on 2026-08-19

The Render backend is a Docker Web Service rooted at `backend/`. Render builds `backend/Dockerfile`; the runtime image contains an Eclipse Temurin Java 21 JRE that runs the packaged Spring Boot JAR and embedded Tomcat. The public service is `https://eurekavault-backend.onrender.com`, and `/actuator/health` was verified externally as `UP`.

The current Render service was created manually through the Web Service UI rather than from a Blueprint. `render.yaml` therefore records the desired/recreation configuration but is not automatically authoritative for the existing service unless it is later placed under Blueprint management.

### UptimeRobot is an external monitor, not a backend host or deployment system

**Status:** Finalized and configured on 2026-08-19

UptimeRobot independently requests the Render health endpoint every 5 minutes using its free monitoring interval. It does not host Spring Boot, perform deployments, run CI, or replace application observability. Its present purpose is external reachability monitoring and periodic traffic during the Render Free migration/testing phase.

### Netlify direct Git-triggered builds are skipped; build-hook deploys remain active

**Status:** Finalized on 2026-08-19

GitHub Actions is the frontend release gate. Netlify builds must remain active because the production workflow uses a Netlify build hook, but ordinary Git pushes must not bypass CI. `netlify.toml` therefore uses `ignore = "exit 0"`: ordinary Git-triggered builds are skipped, while Netlify's build-hook path bypasses the ignore command and can run after CI succeeds. The build-hook URL is stored locally only in git-ignored `.env.local` for developer reference and separately in GitHub Actions as `NETLIFY_BUILD_HOOK_URL` for hosted workflow execution.
