# Prompt Mixer

## Implementation

- Initial feature: 2026-08-08, `40fc00e` (`Prompt Mixer Feature`).
- Generic/pasted source support: 2026-08-08, `6923740` (`Prompt Mixer generic instead of forcing existing ones`).

## Purpose

Prompt Mixer synthesizes multiple Prompt inputs into one coherent standalone Prompt.

## Source windows

The interface starts with at least two source windows and allows more to be added. Each window can operate in one of two modes:

- **Load from vault** - choose an existing active IntellectVault Prompt.
- **Paste / type** - provide arbitrary Prompt text that does not need to exist in IntellectVault.

A custom source may also have an optional label.

## Optional direction

The owner can provide a mixing objective/prioritization instruction. Leaving it blank requests a faithful general synthesis.

## Mixing contract

The interface states that the synthesis should:

- use every non-empty source;
- preserve distinct requirements and detail;
- consolidate genuine duplication;
- resolve conflicts into one coherent standalone Prompt.

## AI payload boundary

Vault sources include relevant Prompt metadata/content. The UI explicitly says the Mixer does not send Prompt relationships, versions, attachments, Mindsets, Preferences, activity or achievements.

## Output

Gemini returns editable:

- title
- description
- purpose
- complete Prompt content

## Post-generation actions

- Discard preview.
- Copy content.
- Save as a brand-new Prompt with Version 1.
- Save as the next version of an existing active Prompt.

The existing-Prompt path checks whether the generated result is identical before creating another version.

## Source safety

Generation itself does not modify source Prompts or pasted source text.
