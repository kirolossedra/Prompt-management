# Prompt Blocks

## Purpose

Prompt Blocks is EurekaVault's visual Prompt-transformation environment: **Simulink for Prompts**.

Its primary unit of flow is Prompt/text content. Transformations modify that content, Constraints govern individual transformations, intermediate values remain inspectable, and one result can branch into multiple output representations.

It is deliberately not a generic autonomous-agent graph.

## Workspace entry point

Prompt Blocks is part of the existing AI navigation category and opens at:

```text
/ai/prompt-blocks
```

The navigation wheel and command palette both expose it. The graph itself is rendered in a dedicated workspace rather than compressed into the small AI navigation wheel.

## Core mental model

```text
X = source Prompt
C = replacement context

X ──► [Context Free] ──► Y
                         │
C ──────────────────────┤
                         ▼
                  [Fill Context]
                         │
                         ▼
                         Z
                      /  |  \
                     /   |   \
                As Is Summary Conclusion
```

The reusable object is not merely `Z`; it is the methodology encoded by the graph.

## First-class families

### Input Blocks

#### System Prompt

References an existing vault Prompt by ID.

Two reference modes exist:

- **Follow current Prompt** — uses the Prompt's current content at each run.
- **Pin specific Prompt Version** — uses one exact historical Prompt Version for reproducibility.

#### Direct Input

Stores manually supplied text within the pipeline definition/editor. It can provide Prompt text, context, addition/subtraction material, topics, or other transformation input.

### Transformation Blocks

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

Each AI transform maps to its own editable transformation prompt stored in Firebase.

### Constraint Blocks

#### Mindset Constraint

References a real EurekaVault Mindset. The pipeline does not duplicate the Mindset as another Prompt record.

#### Extracted Style Constraint

Receives an `Extract Style` constraint value and exposes it explicitly as a constraint source.

### Output Blocks

#### As Is

No AI call. Returns upstream text exactly.

#### Summarized

Uses the editable Summarized transformation prompt.

#### Conclusion Only

Uses the editable Conclusion Only transformation prompt.

## Typed ports and wires

A wire has a semantic flow type:

```text
content
constraint
```

Ports are compatible only with matching flow types. This prevents Extract Style output from accidentally becoming an ordinary Prompt input and prevents ordinary Prompt text from silently acting as a Constraint.

## Creating connections

On desktop or mobile:

1. click an output port;
2. the workspace enters connection mode;
3. click a compatible input port;
4. incompatible, duplicate, single-port-overflow, or cyclic connections are rejected.

Constraint wires receive an explicit numeric priority when created. Priorities are editable in the selected transformation's inspector.

## Constraint precedence

Priority is execution data, not a visual convention.

```text
P1 Preserve Existing Functionality
P2 Extracted Style
P3 English by Default
```

If constraints conflict, P1 governs before P2, then P3.

Two constraints entering the same transformation cannot share the same priority.

## Block Inspector

Selecting a block exposes the settings relevant to that block rather than one generic node schema.

Examples:

### System Prompt

- variable label;
- display label;
- vault Prompt selection;
- current/pinned mode;
- pinned Prompt Version selection.

### Direct Input

- variable label;
- display label;
- direct text.

### Mindset Constraint

- variable label;
- Mindset selection.

### Transform

- variable/display label;
- attached connections;
- incoming constraint priorities.

## Variables

Blocks use visible variable labels such as:

```text
X
Y
Z
A
B
```

The display label can remain semantic, for example:

```text
Y · Context-Free Prompt
C · Replacement Context
```

Variable names are presentation/understanding aids. Runtime dependencies come from graph connections, not variable-name matching.

## Quick pipelines

A Quick Pipeline is ordinary workspace state that has not been persisted.

```text
build → run → inspect → discard
```

Running it does not force creation of a Firebase pipeline record.

## Saved pipelines

Explicit Save creates a first-class `PromptBlockPipeline` record. Loading it restores block configuration, graph positions, wires, priorities, and references.

Saved pipelines support update, archive, restore, and permanent delete.

## Pipeline definition versus run

### Definition

Persistent methodology:

- title/description;
- schema version;
- block kinds;
- positions;
- block configuration;
- connections;
- flow types;
- priority;
- Prompt/Mindset/version references.

### Run

Ephemeral execution state:

- waiting/running/completed/failed/blocked status;
- resolved input text;
- generated intermediate values;
- style constraints;
- model name;
- errors;
- final outputs.

The current implementation deliberately does not create a massive permanent event/output log for every run.

## Run Pipeline

Before any Gemini request, graph validation checks structure and required configuration.

Then the runtime:

1. topologically orders blocks;
2. resolves ready inputs;
3. executes source/constraint blocks locally;
4. sends only ready AI transforms to the Netlify execution boundary;
5. stores runtime output in memory;
6. continues to downstream blocks;
7. marks dependent blocks blocked after failure;
8. keeps successful earlier results inspectable.

## Intermediate results

Every completed block with an output can be inspected.

Content values support:

- View;
- Copy;
- Save as a new Prompt;
- Save as a new Version of an existing Prompt.

Constraint outputs can be viewed/copied but are not automatically converted into ordinary Prompt records.

## Saving output

Prompt Blocks deliberately reuses normal Prompt lifecycle logic.

### New Prompt

Creates an independent Prompt and automatic Version 1.

### New Version

Updates the selected Prompt through the existing update/versioning path. Older history remains intact.

No pipeline execution automatically overwrites its source Prompt.

## Transformation prompt editor

The workspace provides a dedicated Transformation Prompts editor.

Every AI operation is inspectable and editable:

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
- Summarized
- Conclusion Only

The initial defaults are thorough seeded behavior, not an unchangeable hidden contract.

## Addition semantics

Addition uses semantic structure-aware insertion:

- place material in the most appropriate existing/new section;
- preserve unrelated base Prompt content;
- consolidate actual overlap;
- refine existing requirements in place when appropriate;
- do not default to literal append.

## Subtraction semantics

Subtraction uses semantic removal:

- identify the targeted concept/requirement;
- remove materially equivalent restatements;
- repair dependent wording minimally;
- preserve unrelated requirements;
- do not use blind string deletion.

## Responsive interaction

Desktop uses the full draggable visual canvas with SVG wires and side inspectors.

On narrow screens, the infinite-style canvas is not merely shrunk. The canvas is replaced by an ordered vertical workflow representation using the same blocks, ports, connection semantics, run statuses, and inspector.

The Block Library and inspector remain directly accessible on mobile.

## Accessibility

- ports and block actions are real buttons;
- controls have labels/ARIA descriptions where required;
- focus-visible styling is inherited from the design system;
- flow type is expressed by labels as well as color;
- run status includes text/icon state rather than color alone;
- reduced-motion preference is respected;
- touch targets use the existing mobile control system.

## Persistence and versioning strategy

Saved pipeline definitions are included in:

- workspace JSON export;
- Global Version snapshots.

There is no dedicated automatic `PromptBlockPipelineVersion` subsystem yet. The schema is versioned (`schemaVersion: 1`) so pipeline-local version history can be introduced deliberately later instead of duplicating Prompt Version architecture prematurely.

## Reference protection

Prompt/Mindset lifecycle logic recognizes saved Prompt Blocks references:

- a Prompt used by a saved System Prompt block is protected from dependency-unsafe deletion;
- a pinned Prompt Version is protected;
- a Mindset used by a Mindset Constraint is protected;
- active pipeline references can also block archive operations that would make an active methodology unrunnable.

## AI/data minimization

One AI transform receives only the data required for that block. It does not receive the whole vault, whole pipeline, attachments, activity history, achievements, unrelated relationships, or unrelated Prompt Versions.

For the exact request contract, see [`../AI_PIPELINES.md`](../AI_PIPELINES.md).
