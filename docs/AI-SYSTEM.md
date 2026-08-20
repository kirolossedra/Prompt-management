# AI System

## 1. Overview

EurekaVault currently implements four Gemini-backed workflow families:

1. Semantic Prompt Finder
2. Prompt Repurposer
3. Prompt Mixer
4. Prompt Blocks

All Gemini calls pass through Netlify Functions. The browser does not receive `GEMINI_API_KEY`.

## 2. Server-side boundary

Functions:

```text
netlify/functions/prompt-retrieval.mjs
netlify/functions/prompt-repurpose.mjs
netlify/functions/prompt-mix.mjs
netlify/functions/prompt-block-transform.mjs
```

Each AI request is associated with the signed-in Firebase user. The browser sends a Firebase ID token and UID. The function verifies the ID token through Firebase Identity Toolkit and requires the verified local ID to match the requested UID before calling Gemini.

## 3. Environment variables

Server-side:

- `GEMINI_API_KEY` - required secret; never use a `VITE_` prefix.
- `GEMINI_MODEL` - optional Finder override; default `gemini-3.5-flash-lite`.
- `GEMINI_REPURPOSE_MODEL` - optional Repurposer override; default `gemini-3.5-flash`.
- `GEMINI_MIXER_MODEL` - optional Mixer override; default `gemini-3.5-flash`.
- `GEMINI_PROMPT_BLOCKS_MODEL` - optional Prompt Blocks override; falls back to `GEMINI_MIXER_MODEL`, then `gemini-3.5-flash`.
- `FIREBASE_WEB_API_KEY` - optional override used for server-side Firebase ID-token lookup.

Client Firebase variables use `VITE_FIREBASE_*` names and may be omitted when using the repository's fallback Firebase project configuration.

## 4. Semantic Prompt Finder

### Goal

Finder is a retrieval feature. It ranks existing active Prompts that best fit a natural-language description of what the user needs. It does not execute those stored Prompts.

### Client corpus construction

`buildActivePromptIndex` creates a bounded active-Prompt index. Per Prompt, the Finder may include:

- Prompt ID
- title
- description
- purpose
- content
- Task name
- Endeavor name
- direct `inspiredBy` relationship peers
- direct `inspires` relationship peers

The client currently caps the index at 200 active Prompts and compacts very large Prompt content to a maximum of 24,000 characters, retaining a head and tail when truncation is necessary.

### Explicitly excluded from Finder payload

The Finder UI states that it does not send:

- attachments;
- Prompt version history;
- profile data;
- Mindsets;
- Preferences;
- Decisions.

### Query limits

The current Finder query is capped at 2,000 characters.

### Prompt-injection boundary

The retrieval function's system instruction explicitly defines the stored Prompt corpus as **untrusted data**. Gemini is told not to follow instructions inside titles/descriptions/purposes/content and to treat them only as retrieval material.

### Response constraints

The function requires structured JSON and validates output so that:

- returned Prompt IDs must exist in the supplied corpus;
- duplicate IDs are removed;
- scores are normalized to integer 0-100;
- reasons are bounded;
- at most five matches are returned.

The UI describes scores as approximate AI relevance, not mathematical vector similarity.

### Storage behavior

The Gemini interaction request uses `store: false`.

## 5. Finder feedback-learning loop

### User interaction

After a Finder result, the user can:

- press **This is it** on a returned match; or
- choose any active Prompt in the feedback selector and save it as the correct result.

The same feedback record can be updated if the user changes the selected answer for that search instance.

### Persisted training example

`PromptFinderFeedback` stores:

- the original query;
- selected Prompt ID;
- selected Prompt title snapshot;
- the match list and scores returned at that time;
- Gemini model;
- corpus size;
- number of learning examples used for that search.

### Building future examples

`buildPromptFinderLearningExamples`:

- uses non-archived feedback records;
- sorts most-recent first;
- requires the selected target Prompt still to exist and be active;
- caps each historical query to 800 characters;
- deduplicates query + Prompt pairs;
- caps examples to 24;
- caps the aggregate example text budget to approximately 12,000 characters.

### Server-side revalidation

The retrieval function re-sanitizes examples and only accepts a selected Prompt ID if it is present in the **current authoritative Prompt corpus** sent for the new request. This prevents stale feedback from forcing IDs that no longer exist in the active search corpus.

### How Gemini is instructed to use feedback

Past confirmed examples are framed as user-specific retrieval preference evidence. They are few-shot guidance for how the user expresses intent and which distinctions matter. They are not allowed to override the current user need or current corpus, and historical example text is explicitly treated as data rather than executable instruction.

### Implementation date

Introduced 2026-08-18 in commit `6818b80` (`feat: implementing feedback for AI search`).

## 6. Prompt Repurposer

### Input model

Conceptually:

```text
Original Prompt Y + new objective X -> repurposed candidate Z
```

The source payload includes the original Prompt's title, description, purpose, content, Task and Endeavor plus the user's new objective.

### Transformation rule

The UI instructs the system to preserve, as much as possible:

- structure;
- constraints;
- formatting;
- specificity;
- level of detail.

Only changes necessary to achieve the new objective should be introduced.

### Output

Gemini returns an editable draft containing:

- title
- description
- purpose
- full Prompt content

### Save behavior

Saving uses normal Prompt creation. The result becomes a **new Prompt with independent Version 1 history**. The original Prompt is not modified by generation. No lineage relationship is auto-created; the user may explicitly create one later.

### Implementation date

Introduced 2026-08-08 in commit `fe018b7` (`Improving AI prompts`).

## 7. Prompt Mixer

### Input model

The Mixer requires at least two non-empty source windows. Each source window can be:

- an existing active vault Prompt; or
- a custom Prompt pasted/typed directly into the Mixer.

An optional mixing direction tells Gemini what the synthesis should emphasize.

### Data sent for vault sources

A loaded vault source can contribute title, description, purpose, content and location metadata. The Mixer UI explicitly states that relationships, versions, attachments, Mindsets, Preferences, activity and achievements are not sent to this feature.

### Generation rule

The Mixer is instructed to use every non-empty source, preserve distinct requirements/detail, consolidate real duplication and resolve conflicts into one coherent standalone Prompt.

### Output

Gemini returns an editable title, description, purpose and complete Prompt body.

### Post-generation choices

The user can:

- discard the preview;
- copy the generated Prompt content;
- save as a new Prompt with Version 1;
- save as the next version of an existing active Prompt.

The version-save path refuses an identical result so an unnecessary version is not created.

### Implementation dates

- initial Mixer: 2026-08-08, `40fc00e` (`Prompt Mixer Feature`);
- arbitrary pasted/custom source windows: 2026-08-08, `6923740` (`Prompt Mixer generic instead of forcing existing ones`).


## 8. Prompt Blocks

Prompt Blocks is a typed Prompt-transformation DAG rather than a single AI action. Its execution engine lives in `src/prompt-blocks/runtime.ts`, graph invariants in `src/prompt-blocks/graph.ts`, and per-block Gemini execution in `netlify/functions/prompt-block-transform.mjs`.

### Transform behavior source

Each AI operation resolves an editable `PromptBlockTransformPrompt` from the signed-in user's Firebase subtree. Defaults are seeded only when a corresponding database record is missing. Existing database instructions are never silently overwritten by code defaults.

The owner can inspect and edit every transformation instruction from the Prompt Blocks workspace. The currently seeded operations are Context Free, Extract Context, Fill Context, Less Detailed, More Detailed, Without Markdown, With Markdown, Addition, Subtraction, Extract Style, Summarized, and Conclusion Only.

### Per-block data minimization

One executing transform receives only its current content inputs, applicable ordered constraints, current database transformation prompt, operation identifier, UID, and authentication token. The whole vault and the whole pipeline definition are not sent.

### Typed Constraints

Mindset Constraints resolve actual Mindset entities at run time. `Extract Style` emits a constraint-compatible runtime artifact. Constraint connections store explicit numeric priority; the server receives them sorted and is instructed that priority 1 is highest.

### Dependency and failure behavior

The graph is validated as a DAG before execution. Required ports, type compatibility, single-input cardinality, source references, and priority determinism are checked. Runtime resolves blocks in topological order. A failed block prevents dependent downstream blocks from running while successful earlier/intermediate results remain inspectable.

### Output behavior

`As Is` is local and performs no AI call. Summarized and Conclusion Only are AI output transforms with their own editable transformation prompts. Runtime output does not mutate source Prompts. Explicit save uses the existing Prompt creation or automatic Prompt-version update paths.

For the complete request/validation/privacy contract, see [`AI_PIPELINES.md`](AI_PIPELINES.md) and [`features/prompt-blocks.md`](features/prompt-blocks.md).

## 9. Failure isolation

AI feature failures return feature-specific errors while the normal Firebase-backed vault remains usable. For example, quota or network errors in Finder do not make the vault itself unavailable.

## 10. AI activity tracking

Current activity action types include:

- `ai.prompt-finder.searched`
- `ai.prompt-finder.feedback`
- `ai.prompt-repurpose.generated`
- `ai.prompt-mixer.generated`
- `ai.prompt-block.pipeline-created`
- `ai.prompt-block.pipeline-updated`
- `ai.prompt-block.pipeline-run`
- `ai.prompt-block.output-saved`
- `ai.prompt-block.transform-prompt-updated`

This allows AI usage to contribute to the broader engagement/activity record without conflating AI output with deterministic vault state.

## 11. Current architectural boundary

A Spring Boot backend foundation now exists, but it remains infrastructure/health-only. Functional Firebase CRUD still occurs directly from the React client and live Gemini workflows still use authenticated Netlify Functions. Prompt Blocks deliberately preserves that boundary rather than making this feature an implicit backend migration. When Spring Boot gains the required authenticated application/data layer, moving Gemini execution and `GEMINI_API_KEY` handling there can be evaluated as a separate migration.
