# Testing and Validation

## 1. Tooling

The project uses Vitest for automated unit tests.

Package scripts:

```text
npm run test       -> vitest run
npm run test:watch -> vitest
npm run lint       -> eslint .
npm run build      -> tsc -b && vite build
```

## 2. Current test files found in the repository

### AI

- `src/ai/mix.test.ts`
- `src/ai/promptIndex.test.ts`
- `src/ai/repurpose.test.ts`
- `src/ai/retrieval.test.ts`

### Core libraries

- `src/lib/achievements.test.ts`
- `src/lib/attachments.test.ts`
- `src/lib/diff.test.ts`
- `src/lib/relationships.test.ts`
- `src/lib/utils.test.ts`

## 3. Tested concerns

The current test surface covers important pure logic used by the product, including:

- Prompt Mixer request/source preparation;
- Repurposer request/source handling;
- Finder retrieval helpers;
- Prompt index construction;
- Finder learning-example filtering, recency and query bounds;
- attachment limits and validation;
- line diff behavior;
- relationship validation/layout behavior;
- achievement progress/evaluation;
- shared utility behavior.

## 4. Feedback-learning regression coverage

The 2026-08-18 Finder feedback commit extended `promptIndex.test.ts` to verify that learning-example generation:

- prefers recent confirmed choices;
- filters feedback whose target Prompt no longer exists;
- uses the current Prompt title rather than trusting only a historical title snapshot;
- bounds historical query length.

This is important because the feedback loop affects future AI retrieval requests and must not blindly replay stale data.

## 5. Build validation scope

`npm run build` validates:

- TypeScript project compilation;
- Vite production bundle generation.

It does not validate external service configuration.

## 6. Gaps visible from repository inspection

No dedicated browser end-to-end suite (for example Playwright/Cypress) was identified in the current repository tree. No Firebase emulator integration-test suite or live Netlify/Gemini integration suite was identified either.

Therefore the current automated coverage is strongest around deterministic TypeScript logic and request preparation, while full browser/service integration still depends on manual or deployment-level verification.

## 7. Recommended validation matrix for future changes

For any change to existing functionality:

1. run targeted unit tests for the modified module;
2. run the full Vitest suite;
3. run ESLint;
4. run the production build;
5. manually verify the affected UI route;
6. for Firebase changes, verify owner-only access rules;
7. for AI changes, verify authenticated function calls, invalid-session rejection, quota/network failure behavior and structured-output handling;
8. for versioning changes, verify no historical state is silently destroyed;
9. for attachments/relationships, verify lifecycle cleanup and Global Version snapshot inclusion.
