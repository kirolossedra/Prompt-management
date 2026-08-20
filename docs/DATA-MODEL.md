# Data Model

## 1. Root and ownership

All EurekaVault user data is scoped beneath:

```text
intellectVault/users/{firebaseUid}/
```

The Realtime Database rule for this subtree requires the authenticated Firebase UID to equal the path UID for both reads and writes.

## 2. Shared record metadata

Most stored content entities derive from the equivalent of `BaseRecord` and contain:

| Field | Meaning |
|---|---|
| `id` | Firebase push ID / record identifier. |
| `createdAt` | Creation timestamp in milliseconds. |
| `updatedAt` | Last update timestamp. |
| `createdBy` | User stamp for creator. |
| `updatedBy` | User stamp for latest updater. |
| `archivedAt` | Optional archive timestamp. |
| `archivedBy` | Optional user stamp for archive action. |

A user stamp carries `uid`, `email`, and `displayName`.

## 3. Workspace profile

`profile` stores the current workspace identity:

- `workspaceName`
- `ownerName`
- `ownerEmail`
- `createdAt`
- `updatedAt`

The profile is initialized at account creation and can be edited from Settings.

## 4. Endeavor

An Endeavor is the top-level organizational area.

Fields:

- `name`
- `description`
- `manualAgenticSummary`
- base lifecycle metadata

Relationship:

```text
Endeavor 1 --- N Task
```

## 5. Task

A Task belongs to exactly one Endeavor.

Fields:

- `name`
- `description`
- `purpose`
- `endeavorId`
- `manualSuggestedImprovement`
- base lifecycle metadata

Relationship:

```text
Task N --- 1 Endeavor
Task 1 --- N Prompt
```

## 6. Prompt

A Prompt is the primary working artifact.

Fields:

- `title`
- `description`
- `purpose`
- `content`
- `taskId`
- `manualAgenticSummary`
- `manualSuggestedImprovement`
- `manualAiEvaluation`
- `manualGeneratedContext`
- base lifecycle metadata

The four `manual*` fields are persisted text fields. They do not, by themselves, trigger an AI operation.

A Prompt belongs to one Task and indirectly one Endeavor.

## 7. Prompt snapshot

A `PromptSnapshot` captures the complete versioned Prompt state relevant to local history:

- title
- description
- purpose
- content
- taskId
- manual agentic summary
- manual suggested improvement
- manual AI evaluation
- manual generated context

This design allows historical versions to restore more than only the Prompt body.

## 8. Prompt Version

A `PromptVersion` is the Prompt-local history record.

Fields include:

- `promptId`
- `versionLabel`
- optional `versionNumber`
- `content`
- optional complete `snapshot`
- `changeDescription`
- optional `changedFields`
- optional `source`: `automatic`, `manual`, or `copied`
- optional `changeType`: `created`, `updated`, `copied`, or `manual`
- `localCommitId`
- base lifecycle metadata

Current behavior creates history automatically for Prompt creation and saved Prompt changes. Legacy fields remain in the model for compatibility with the earlier commit-oriented design.

## 9. Prompt Attachment

A Prompt file record contains:

- `promptId`
- `fileName`
- `mimeType`
- `sizeBytes`
- `base64`
- base lifecycle metadata

Current persistence is inline Base64 in Realtime Database.

Enforced limits:

- 2 MiB per file
- 20 files per Prompt
- 10 MiB total per Prompt

## 10. Prompt Relation

A directed Prompt lineage edge contains:

- `parentPromptId`
- `childPromptId`
- `relationshipType`, currently fixed to `inspired-by`
- base lifecycle metadata

Semantics:

```text
parent Prompt  --inspires-->  child Prompt
child Prompt   --inspired by--> parent Prompt
```

Validation prevents self-links, duplicates and cycles.

## 11. Prompt Finder Feedback

A feedback record captures a user-confirmed semantic retrieval outcome.

Fields:

- `query`
- `selectedPromptId`
- `selectedPromptTitleSnapshot`
- `matches[]` containing `promptId` and score at the time of the search
- `model`
- `corpusSize`
- `learningExampleCount`
- base lifecycle metadata

The selected Prompt remains authoritative only while it still exists and is active when building future learning examples. Historical title is retained as a snapshot for recordkeeping.

## 12. Prompt Blocks Pipeline

Stored at:

```text
intellectVault/users/{uid}/promptBlockPipelines/{pipelineId}
```

`PromptBlockPipeline` extends `BaseRecord` and contains:

```text
title
description
schemaVersion = 1
blocks: Record<blockId, PromptBlockNodeDefinition>
connections: Record<connectionId, PromptBlockConnection>
```

A `PromptBlockNodeDefinition` stores:

```text
id
family: input | transform | constraint | output
kind
label
variableLabel
position { x, y }
config
```

Block configuration may contain only the fields relevant to that block, including:

- Direct Input text;
- referenced `promptId`;
- Prompt reference mode `current | pinned`;
- pinned `promptVersionId`;
- referenced `mindsetId`.

A `PromptBlockConnection` stores:

```text
id
sourceBlockId
sourcePortId
targetBlockId
targetPortId
flowType: content | constraint
priority?
```

`priority` is required for constraint flow. It is not derived from node position.

Generated intermediate/output text is deliberately absent from this record. A saved Pipeline describes reusable methodology, not one execution.

## 13. Prompt Blocks Transformation Prompt

Stored at:

```text
intellectVault/users/{uid}/promptBlockTransformPrompts/{operation}
```

`PromptBlockTransformPrompt` extends `BaseRecord` and contains:

```text
operation
title
content
seedVersion
```

Operations are currently:

- `context-free`
- `extract-context`
- `fill-context`
- `less-detailed`
- `more-detailed`
- `without-markdown`
- `with-markdown`
- `addition`
- `subtraction`
- `extract-style`
- `summarized`
- `conclusion-only`

These records are owner-editable behavior/configuration. Code defaults seed only missing records. Existing database values are not overwritten during normal loading.

## 14. Mindset

Fields:

- `title`
- `content`
- `scopeType`: `global`, `endeavor`, `task`, or `prompt`
- `scopeId`
- `manualAiGeneratedMindset`
- optional `sourcePromptIds[]`
- optional `constructionMethod`: `manual` or `prompt-selection`
- base lifecycle metadata

The Mindset Construction workflow creates a global Mindset with selected Prompt IDs and `constructionMethod: prompt-selection` after deterministic text assembly and user editing.

## 15. Preference

Fields:

- `title`
- `instruction`
- `scopeType`: `global`, `endeavor`, or `task`
- `scopeId`
- base lifecycle metadata

Prompt-level Preference scope is not part of the current `PreferenceScopeType`.

## 16. Decision

Fields:

- `title`
- `category`
- `status`: `Open` or `Finalized`
- `question`
- `resolution`
- `notes`
- base lifecycle metadata

The provider contains normalization logic that upgrades certain early seeded Decision text to reflect later finalized implementation decisions.

## 17. Legacy Local Commit

`LocalCommit` remains part of the persisted domain model with fields such as display ID, message, task, changed artifacts, previous/resulting state and manual summaries. The current user-facing Prompt workflow is centered on automatic Prompt Versions rather than requiring explicit manual local commits.

## 18. Global Version / Global Commit

`GlobalCommit` is the persisted type backing the current **Global Versions** UI.

Fields include:

- `displayId`
- `title`
- `authorName`
- `summary`
- `commitToCommitSummary`
- `commitTimestamp`
- optional `versionNumber`
- optional complete `snapshot`
- optional `recordCounts`
- optional `taskIds`
- optional `localCommitIds`
- base lifecycle metadata

The historical type name `GlobalCommit` remains in code, while the product UI uses Global Version terminology.

## 19. Global Version Snapshot

The current snapshot type can contain:

- `capturedAt`
- `profile`
- `activityDays`
- `activityStats`
- `achievements`
- `endeavors`
- `tasks`
- `prompts`
- `promptVersions`
- `promptAttachments`
- `promptRelations`
- `promptFinderFeedback`
- `promptBlockPipelines`
- `promptBlockTransformPrompts`
- `mindsets`
- `preferences`
- `localCommits`
- `decisions`

This makes a Global Version a substantially broader baseline than a Prompt-local version.

## 20. Activity data

### ActivityDay

One record per active local calendar date:

- date
- `lastAt`
- `eventCount`
- optional action-type flags

### ActivityStats

Aggregated counters and timestamps:

- tracking start
- last activity/action/entity/label
- total events
- per-action counts
- per-action first timestamp
- per-action last timestamp

### Achievement unlock

An unlock stores:

- achievement ID
- unlock timestamp
- progress value at unlock

Unlocks are persisted so already-earned achievements remain earned even when the live state later changes.

## 21. Collection map

The current `VaultCollections` aggregate contains:

```text
endeavors
 tasks
 prompts
 promptVersions
 promptAttachments
 promptRelations
 promptFinderFeedback
 promptBlockPipelines
 promptBlockTransformPrompts
 mindsets
 preferences
 localCommits
 globalCommits
 decisions
```

Activity and profile structures are managed alongside the collection aggregate rather than all being represented as generic CRUD collections.

## 22. Important invariants

- The hierarchy is direct: Endeavor -> Task -> Prompt.
- Folder records do not exist in the current domain model.
- Prompt relationships are separate from hierarchy membership.
- Prompt relationships must remain acyclic.
- AI Finder feedback points only to a selected Prompt ID and is filtered against the current active corpus before use as a learning example.
- Prompt attachment limits are enforced before writes.
- Prompt Blocks saved definitions contain no generated run values.
- Prompt Blocks connections are typed as content or constraint and v1 graphs must remain acyclic.
- Constraint priority is explicit persisted execution data.
- Saved Pipeline Prompt/Prompt Version/Mindset references participate in dependency-safe archive/delete behavior.
- Prompt Blocks transformation prompts are seeded only when missing; database-edited values are not overwritten by code defaults.
- Archived records remain persisted and can be restored where supported.
- Permanent deletion is dependency-aware.
