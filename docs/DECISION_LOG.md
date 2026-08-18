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

## Not implemented in the inspected code

Repository inspection found no current implementation corresponding to:

- Prompt Rating;
- Prompt Blocks.

Their future priority/status should be supplied by the product owner rather than inferred from old planning discussions.
