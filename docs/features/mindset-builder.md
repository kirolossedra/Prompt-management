# Mindset Construction

## Implementation evidence

The feature is verified present in commit `417b29d` on 2026-08-07 (`Adding copy, versioning`). Because that commit bundles several capabilities, the safe historical wording is **present by 2026-08-07** rather than claiming the commit message was specifically about the Mindset Builder.

## Purpose

Mindset Construction lets the owner create a persona/methodology Mindset by selecting existing Prompts from anywhere in the vault.

## Workflow

1. Search active Prompts. Search considers Prompt words/history through shared search logic.
2. Select one or more source Prompts.
3. Construct a draft.
4. The application deterministically concatenates source methodology, purpose, description and Prompt instructions.
5. Edit the generated text manually.
6. Save as a normal global Mindset.

## No-AI guarantee

The feature explicitly states that no AI model is used. The construction step is deterministic text assembly.

## Provenance

A constructed Mindset can store:

- `sourcePromptIds`
- `constructionMethod: prompt-selection`

This preserves which Prompts were used to construct the Mindset.

## Distinction from AI features

Mindset Construction should not be grouped with Repurposer/Mixer/Finder merely because it creates derived text. Its transformation is local and deterministic, whereas the three AI tools call Gemini through Netlify Functions.
