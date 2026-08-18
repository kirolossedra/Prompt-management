# Prompt Relationships

## Implementation

- Initial feature: 2026-08-08, `c09415a` (`Adding Relationships between prompts`).
- Plotting correction: 2026-08-08, `37dc892` (`fixing relationship plotting`).

## Semantics

A stored relation has a parent Prompt and child Prompt with `relationshipType: inspired-by`.

User-facing language:

```text
Parent Prompt inspires Child Prompt
Child Prompt is inspired by Parent Prompt
```

## Validation

A relation is rejected when:

- either endpoint is missing or archived;
- the Prompt points to itself;
- the same directed relation already exists;
- the new edge would create a circular inspiration chain.

Cycle detection walks the active relation graph before accepting the new edge.

## Cross-Endeavor relationships

Lineage is not limited to Prompts in the same Task/Endeavor. Cross-Endeavor influence is supported and is one reason relationship data is modeled separately from the hierarchy.

## Relationship map

The map:

- groups related Prompts by Endeavor;
- draws directed arrows from parent to child;
- routes edges around groups;
- exposes relationship statistics;
- supports a searchable readable ledger;
- navigates from graph nodes/ledger rows back to the Prompt relationship tab;
- exports SVG and PNG.

## Activity integration

The vault tracks relationship add/update/remove operations and relationship map downloads.

## Global Version integration

Relationships are included in the Global Version snapshot model so lineage can be preserved as part of a vault baseline.
