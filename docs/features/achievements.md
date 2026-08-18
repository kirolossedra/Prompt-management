# Activity and Achievements

## Implementation

Introduced 2026-08-08 in `6f45937` (`Achievements feature`). Later feature commits extended the available activity action vocabulary.

## Activity model

The vault records events and aggregates them by local calendar date and action type. Activity days are cumulative distinct dates rather than consecutive streaks.

Current action vocabulary includes:

- session opened;
- generic record create/update/archive/restore/delete;
- Prompt committed;
- Global Version released;
- Decision changed;
- attachment added/removed/downloaded;
- relationship added/updated/removed/map downloaded;
- AI Finder searched;
- AI Finder feedback saved;
- AI Repurposer generated;
- AI Mixer generated.

## Achievements

### Foundation

- **1st Prompt Commit (L.C.)** - first meaningful Prompt history commit.
- **1st Global Commit** - first Global Version release.
- **1st Mindset** - first Mindset created.
- **1st Endeavour** - first Endeavor created.

### Consistency

- **1 Week of Activity** - use IntellectVault on 7 distinct calendar days; not required to be consecutive.
- **30 Days of Activity** - use IntellectVault on 30 distinct calendar days; not required to be consecutive.

### Craft

- **Builder** - at least one active Prompt exceeds 500 characters.
- **Fussy Builder** - at least 75% of active Prompts exceed 500 characters.

### Judgment

- **Skeptical** - revise a Decision's status or resolution for the first time.

## Persisted unlock semantics

Once an achievement is unlocked, the unlock timestamp and progress-at-unlock are persisted. Live progress can continue to be calculated from current data, but a later state change does not erase an already earned achievement.
