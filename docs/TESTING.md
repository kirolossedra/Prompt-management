# Testing and Validation

## 1. Test philosophy

Testing is now a deployment gate, not merely a local recommendation. The repository deliberately validates three different representations of the product before production deployment:

1. frontend source and deterministic business logic;
2. Spring Boot source/configuration and HTTP behavior;
3. the actual backend Docker artifact that Render runs.

This keeps the test surface proportional to what is implemented. The migration foundation does not yet contain application CRUD/authentication controllers, so the backend suite tests infrastructure behavior rather than pretending to have business-domain coverage that does not yet exist.

## 2. Frontend automated tests

Vitest remains the frontend test runner.

Existing logic coverage includes AI request/result handling, prompt indexing, feedback learning, achievements, attachments, diff behavior, relationships, search/deletion utilities and shared helpers.

The CI/CD hardening adds component-level tests for:

- `Button`: semantics, click behavior, loading disablement and styling contract;
- `EmptyState`: content and optional action rendering;
- `LoadingScreen`: accessible live-status behavior and caller-supplied status text.

These are intentionally stable UI primitives rather than brittle pixel/layout snapshots.

Frontend CI also runs:

```text
npm run lint
npm run test
npm run build
```

and syntax-validates every Netlify Function with Node.

## 3. Backend automated tests

### Unit/application-context tests

`EurekaVaultApiApplicationTests` verifies that the Spring application context can load.

`BackendConfigurationTests` verifies the current infrastructure contract:

- application name is `eurekavault-backend`;
- only `health` is configured for Actuator web exposure;
- graceful shutdown remains enabled.

### Integration tests

`BackendHealthIT` runs under Spring Boot and MockMvc and verifies:

- `/actuator/health` returns HTTP 200 and `status=UP`;
- `/actuator/env` is not exposed and returns HTTP 404;
- `/` does not accidentally expose an application API before one is intentionally introduced.

The Maven Failsafe plugin executes `*IT` tests during the `integration-test` and `verify` lifecycle phases.

## 4. Docker/runtime validation

GitHub Actions builds `backend/Dockerfile`, starts the resulting image and checks the live container over HTTP.

This is separate from Spring's in-process integration tests. It validates the deployment artifact and catches errors in:

- the Maven builder image/stage;
- JAR packaging;
- multi-stage COPY paths;
- the Java runtime image;
- the Docker entrypoint;
- port binding;
- application startup inside a container;
- Actuator exposure in the packaged runtime.

## 5. CI matrix

| Gate | Frontend | Backend | Deployment artifact |
|---|---|---|---|
| Lint/static checks | ESLint | Maven compilation/Enforcer | Dockerfile build |
| Unit tests | Vitest logic + UI primitives | Spring context/config tests | — |
| Integration tests | Production Vite build + function syntax | MockMvc Actuator integration | Running-container HTTP checks |
| Production eligibility | Required | Required | Required |

All three CI jobs must succeed before the production deployment workflow is eligible to run for `main`.

## 6. Current limitations

No browser end-to-end suite, Firebase Emulator integration suite, or live Gemini integration suite is currently present. That is intentional at this stage: those tests should be added when the relevant boundaries are migrated or when a stable end-to-end test environment is defined.

The current frontend repository also has no committed npm lock file. CI uses `npm install`. A lock file should be introduced before dependency reproducibility is treated as guaranteed.

The backend currently has no database/auth/business endpoints, so there is nothing legitimate to test yet for backend CRUD, Firebase Admin access, authorization, data ownership, or Gemini integration. Those tests must arrive together with each migrated capability rather than after it.

## 7. Required rule for migration work

Every incremental migration slice must add tests at the same time as the implementation. A capability is not considered ready to replace its existing Firebase/Netlify path unless its backend behavior, authorization boundary and failure behavior are covered by automated tests appropriate to that slice.


## 8. Prompt Blocks focused test surface

Prompt Blocks adds pure-logic tests around the areas where a visual workflow can otherwise become ambiguous or unsafe.

`src/prompt-blocks/graph.test.ts` covers:

- deterministic topological order;
- content-vs-constraint port compatibility;
- cycle prevention;
- required Fill Context inputs;
- deterministic/unique constraint priorities.

`src/prompt-blocks/runtime.test.ts` covers:

- intermediate output propagation;
- downstream blocking after an upstream AI failure;
- Extract Style producing a constraint-typed runtime value.

`src/ai/promptBlocks.test.ts` covers client response normalization and rejects invalid/empty AI output. Existing utility tests now cover saved-pipeline Prompt references as delete blockers.

The Netlify Prompt Blocks endpoint should also be included in the existing `node --check netlify/functions/*.mjs` CI syntax gate. No live Gemini integration test is introduced because that would make CI depend on a billable/external model call and nondeterministic model output.
