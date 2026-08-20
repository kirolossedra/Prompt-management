# AI Pipeline Registry

This document is the canonical execution contract for every active EurekaVault AI capability. It records what the browser sends, what the server instructs Gemini to do, what is explicitly excluded, how responses are validated, and what can be persisted.

The governing implementation rule is **minimum necessary data per AI operation**. An AI feature does not receive the whole vault merely because the vault is available in browser memory.

## 1. Shared security boundary

All active Gemini features use the same trust boundary:

```text
Authenticated React client
        │ Firebase ID token
        ▼
Netlify Function
        │ verifies token belongs to requested uid
        │ reads GEMINI_API_KEY only server-side
        ▼
Gemini Interactions API
```

`GEMINI_API_KEY` is never prefixed with `VITE_` and never enters the browser bundle. Gemini requests use `store: false`.

The Spring Boot service is still an emerging backend foundation and is not yet the execution boundary for these AI calls. Prompt Blocks therefore follows the same Netlify boundary as Finder, Repurposer, and Mixer.

## 2. Semantic Prompt Finder

**Client:** `src/ai/retrieval.ts`  
**Server:** `netlify/functions/prompt-retrieval.mjs`

### Client payload

The browser sends:

- signed-in `uid`;
- natural-language search query;
- a bounded active Prompt corpus built by `src/ai/promptIndex.ts`;
- Prompt identity plus current title/description/purpose/content and location information needed for ranking;
- bounded relationship context;
- bounded user-confirmed Finder learning examples.

### Explicit exclusions

Finder does not send Prompt attachments, achievements, activity history, account profile, unrelated global-version snapshots, or every historical Prompt Version.

### Server prompting contract

Gemini is instructed to rank the supplied candidates rather than execute Prompt text. Prompt content is treated as retrieval corpus data and cannot override the server retrieval contract.

### Output

Structured ranked Prompt IDs/scores/reasons. Client-side normalization rejects malformed or unavailable IDs.

### Persistence

Search itself is read-only. Explicit user feedback may create or update `promptFinderFeedback` records.

---

## 3. Prompt Repurposer

**Client:** `src/ai/repurpose.ts`  
**Server:** `netlify/functions/prompt-repurpose.mjs`

### Client payload

- signed-in `uid`;
- one selected source Prompt with its current fields/location;
- user-authored repurpose objective.

### Server prompting contract

The selected Prompt is transformation source material. Gemini must return one new Prompt candidate adapted to the objective while preserving useful source requirements unless adaptation requires change.

### Output

Structured title, description, purpose, and full content.

### Persistence

Generation does not mutate the source Prompt. The candidate becomes a vault Prompt only after explicit user save through normal Prompt creation/versioning paths.

---

## 4. Prompt Mixer

**Client:** `src/ai/mix.ts`  
**Server:** `netlify/functions/prompt-mix.mjs`

### Client payload

- signed-in `uid`;
- two or more source windows;
- each source may be a current vault Prompt or ad-hoc pasted Prompt text;
- optional mix direction.

### Server prompting contract

All source windows are source material to synthesize. Distinct requirements should be preserved, real duplication consolidated, and conflicts resolved coherently with explicit mix direction used as a tie-breaker when present.

### Output

Structured title, description, purpose, and full mixed Prompt content.

### Persistence

The result remains an editable candidate until the user explicitly saves it as a new Prompt or as the next version of an existing Prompt.

---

# 5. Prompt Blocks

**Workspace:** `src/components/prompt-blocks/PromptBlocksWorkspace.tsx`  
**Graph catalog:** `src/prompt-blocks/catalog.ts`  
**Graph validation:** `src/prompt-blocks/graph.ts`  
**Runtime:** `src/prompt-blocks/runtime.ts`  
**Client AI adapter:** `src/ai/promptBlocks.ts`  
**Server:** `netlify/functions/prompt-block-transform.mjs`  
**Seed defaults:** `src/prompt-blocks/defaultTransformPrompts.ts`

Prompt Blocks is not a generic autonomous-agent graph. It is a deterministic Prompt-processing DAG. Blocks have first-class semantic families and typed ports.

## 5.1 Block families

### Input

- `System Prompt`
- `Direct Input`

### Transform

- Context Free
- Extract Context
- Fill Context
- Less Detailed
- More Detailed
- Without Markdown
- With Markdown
- Addition
- Subtraction
- Extract Style

### Constraint

- Mindset Constraint
- Extracted Style Constraint

### Output

- As Is
- Summarized
- Conclusion Only

## 5.2 Typed graph values

Connections carry one of only two execution flow types:

```text
content
constraint
```

A content edge may carry Prompt text, contextual text, or another text transformation result. A constraint edge carries a governing Constraint artifact.

`Extract Style` deliberately emits `constraint`, not `content`.

The runtime rejects attempts to connect content output to a constraint-only port or constraint output to ordinary Prompt input.

## 5.3 System Prompt input semantics

A System Prompt block stores an authoritative Prompt ID rather than a title.

Two modes are supported:

```text
Follow current Prompt
```

The current `Prompt.content` is resolved at run time.

```text
Pin specific Prompt Version
```

The block stores both `promptId` and `promptVersionId`; runtime verifies the version belongs to that Prompt and resolves the version snapshot content.

Missing or archived references fail that block rather than silently switching to another record.

## 5.4 Direct Input semantics

Direct Input stores only the text intentionally entered into that block. It may represent:

- a Prompt;
- replacement context;
- material to add;
- material to subtract;
- a topic;
- other transformation source text.

No unrelated vault records are automatically attached.

## 5.5 Constraint semantics

### Mindset Constraint

The graph stores the actual Mindset ID. At run time the current Mindset content is resolved from `mindsets`. Prompt Blocks does not create a duplicate constraint-prompt entity.

### Extracted Style Constraint

`Extract Style` returns a runtime `PromptBlockConstraintValue`. It can connect directly to a transform constraint port or pass through an explicit Extracted Style Constraint block for graph readability.

### Priority

Constraint priority is stored on each constraint connection.

```text
Priority 1 = highest
Priority 2 = next
Priority 3 = next
```

Priorities must be positive, deterministic, and unique for constraints entering the same transformation. The execution request sorts constraints by numeric priority and the server instruction explicitly states that the lower number wins on conflict.

Visual node position never determines priority.

## 5.6 Transformation prompt source

Each AI operation has an editable `PromptBlockTransformPrompt` record under:

```text
intellectVault/users/{uid}/promptBlockTransformPrompts/{operation}
```

The initial defaults are defined in `src/prompt-blocks/defaultTransformPrompts.ts` only to bootstrap existing/new user workspaces. `VaultProvider` writes only missing records. It does **not** overwrite an existing database prompt when code defaults change.

After seeding, the database record is the execution source of truth. The Prompt Blocks workspace exposes a Transformation Prompts editor so the owner can inspect and change these instructions.

Because seeding currently happens from the React/Firebase client, the default seed strings are technically part of the frontend JavaScript bundle. They are not secrets and are not used as a hidden fallback during execution. If product-owned transformation prompts later need to be confidential or centrally administrator-controlled, seeding must move to a privileged backend/Firebase Admin boundary.

## 5.7 Current transformation contracts

### Context Free

Removes specific context while preserving reusable methodology. Context is replaced with meaningful, consistent placeholders instead of simply deleted.

### Extract Context

Extracts specialization/context while excluding generic methodology. The result is suitable as a later Fill Context input.

### Fill Context

Requires two content inputs: Prompt/template and replacement context. It performs semantic placeholder/context mapping while preserving unrelated source structure and detail.

### Less Detailed

Reduces redundancy and explanatory expansion while preserving requirements whose removal could change behavior, safety, permissions, validation, or output meaning.

### More Detailed

Expands clarity and operational detail without inventing unrelated goals or silently resolving genuinely open product decisions.

### Without Markdown

Converts Markdown organization into coherent paragraph prose without summarizing substantive instructions.

### With Markdown

Adds useful Markdown structure without changing the intended instructions.

### Addition

Uses structure-aware semantic incorporation. It does not default to literal append. New material is integrated where it logically belongs while preserving unrelated base Prompt content.

### Subtraction

Uses semantic removal rather than blind string deletion. It removes the targeted behavior/concept and repairs only dependent wording needed for coherence.

### Extract Style

Extracts prescriptive writing-style characteristics while excluding task/domain content. Output type is `constraint`.

### Summarized

Condenses an upstream result while retaining central purpose, key requirements, conclusions, qualifiers, and safeguards that materially affect meaning.

### Conclusion Only

Returns only the final conclusion/decision/recommendation/end-state supported by the upstream text. It does not invent a conclusion when none exists.

## 5.8 Per-block request payload

For one executing AI block, the browser sends only:

```json
{
  "uid": "signed-in uid",
  "operation": "fill-context",
  "transformationPrompt": "current editable database prompt",
  "inputs": [
    { "role": "Prompt / template", "value": "..." },
    { "role": "Replacement context", "value": "..." }
  ],
  "constraints": [
    {
      "priority": 1,
      "label": "Preserve Existing Functionality",
      "content": "...",
      "sourceType": "mindset",
      "sourceId": "..."
    }
  ]
}
```

The Firebase ID token is transmitted in the Authorization header rather than JSON.

## 5.9 Explicit privacy exclusions

A Prompt Blocks transform does **not** inherently send:

- all Prompts;
- unrelated Prompt Versions;
- attachments;
- Prompt Relationships;
- Finder feedback history;
- Global Version snapshots;
- achievements;
- activity history;
- user profile;
- unrelated Mindsets or Preferences;
- the entire pipeline definition.

Only the content inputs, attached constraint contents, selected transformation prompt, operation identifier, and authentication metadata are needed for one AI block.

## 5.10 Server validation

`prompt-block-transform.mjs` enforces:

- authenticated Firebase user matches requested `uid`;
- operation whitelist;
- non-empty database-sourced transformation prompt supplied by client;
- bounded transformation prompt size;
- bounded individual/aggregate content inputs;
- bounded constraint count/size;
- positive unique integer priorities;
- `GEMINI_API_KEY` availability;
- `store: false`.

The server additionally tells Gemini that Prompt/source text is transformation material and cannot override the operation contract or higher-priority constraints.

## 5.11 DAG validation before execution

The client graph validator enforces:

- required input ports are connected;
- single-input ports do not have multiple sources;
- content and constraint flow types are compatible;
- every connection references real blocks/ports;
- System Prompt selection exists;
- pinned System Prompt blocks name a version;
- Direct Input is non-empty;
- Mindset Constraint names a Mindset;
- constraint priorities are positive and unique per target;
- the graph remains acyclic.

Runtime then re-resolves record references and rejects missing/archived Prompt, Prompt Version, or Mindset records.

## 5.12 Dependency execution and failures

Execution order is a topological ordering of the graph.

For each block:

```text
waiting → running → completed
                 ↘ failed
```

A downstream block whose dependency failed becomes `blocked` and is not sent to Gemini. Independent branches can still complete.

Successful earlier outputs remain in the in-memory run state and remain inspectable/copyable even when a later block fails.

## 5.13 As Is output

`As Is` performs no Gemini call. It exposes the exact upstream content runtime value.

## 5.14 Run-state persistence

A pipeline run is intentionally separate from a saved pipeline definition.

Permanent pipeline definition stores:

- block kinds/configuration;
- positions;
- connections and flow types;
- constraint priorities;
- Prompt/Mindset/version references;
- output configuration through graph structure.

It does **not** store generated intermediate/runtime text.

Current run outputs live only in React state unless the owner explicitly saves one as a Prompt or as the next version of an existing Prompt.

## 5.15 Saving outputs

Saving a content output as a new Prompt uses the existing `createRecord("prompts", ...)` path and therefore creates normal Prompt Version 1.

Saving an output as a new version uses the existing `updateRecord("prompts", ...)` path and therefore creates the normal automatic Prompt Version. Prompt Blocks does not implement a parallel versioning system.

## 5.16 Saved pipeline lifecycle

Saved pipeline definitions live under:

```text
intellectVault/users/{uid}/promptBlockPipelines/{pipelineId}
```

They support:

- create;
- read/load;
- update;
- archive;
- restore;
- permanent delete.

Quick pipelines remain local runtime/editor state until explicit save.

## 5.17 Global Version and export behavior

Saved pipeline definitions **and editable transformation prompt records** are included in Global Version snapshots and workspace JSON export because both are user-owned methodology/configuration.

Ephemeral run values are excluded.

## 5.18 Activity tracking

Prompt Blocks uses bounded statistical activity actions:

- `ai.prompt-block.pipeline-created`
- `ai.prompt-block.pipeline-updated`
- `ai.prompt-block.pipeline-run`
- `ai.prompt-block.output-saved`
- `ai.prompt-block.transform-prompt-updated`

Dragging nodes, selecting blocks, opening inspectors, and connecting/disconnecting wires do not create raw activity-event logs.
