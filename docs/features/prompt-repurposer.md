# Prompt Repurposer

## Implementation

Introduced 2026-08-08 in `fe018b7` (`Improving AI prompts`).

## Concept

```text
Original Prompt Y + new objective X -> new candidate Z
```

## Source data

The selected active source Prompt contributes title, description, purpose, content, Task and Endeavor. The user separately supplies the new objective.

## Transformation contract

The interface directs Gemini to preserve the source Prompt's:

- structure;
- constraints;
- formatting;
- specificity;
- level of detail;

as much as possible while changing only what must change to accomplish the new objective.

## Generated draft

The result contains editable:

- title
- description
- purpose
- Prompt content

## Safety of the source Prompt

Generation never modifies the source Prompt.

## Saving

The user selects the destination Endeavor and Task. Saving creates a normal new Prompt with independent Version 1 history.

No Prompt lineage relationship is automatically created between source and result. The owner can add an explicit `inspired-by` relationship afterward when appropriate.

## Activity

Successful generation records an AI Repurposer activity event.
