# CI/CD

## 1. Purpose

EurekaVault uses GitHub Actions as the release gate for both runtime tiers before the incremental 3-tier migration continues. A commit must pass automated frontend and backend validation before either production host is asked to deploy it.

The intended release chain is:

```text
Developer push / pull request
        |
        v
GitHub Actions: EurekaVault CI
        |
        +-- Frontend lint
        +-- Frontend Vitest suite
        +-- Frontend production build
        +-- Netlify Function syntax validation
        +-- Spring Boot unit tests
        +-- Spring Boot integration tests
        +-- Maven verify/package lifecycle
        +-- Docker image build
        +-- Dockerized Spring Boot health smoke test
        +-- Dockerized actuator exposure check
        |
        v
CI success on a push to main only
        |
        v
GitHub Actions: EurekaVault Production Deployment
        |
        +-- Netlify build hook -> frontend + Netlify Functions
        |
        +-- Render deploy hook -> exact tested Git commit -> Docker -> JVM -> Spring Boot
```

Pull requests run CI but never receive production secrets and never trigger production deployment.

## 2. CI workflow

`.github/workflows/ci.yml` runs on pull requests to `main`, pushes to `main`, and manual dispatch.

### Frontend gate

The frontend job uses Node 22.12.0 and performs:

1. dependency installation;
2. ESLint across the TypeScript/React codebase;
3. all Vitest tests;
4. TypeScript compilation plus Vite production bundling through `npm run build`;
5. Node syntax checks for every `netlify/functions/*.mjs` serverless function.

The repository currently has no npm lock file. CI therefore uses `npm install`, not `npm ci`. Adding and maintaining a lock file is a future reproducibility improvement; the workflow must switch to `npm ci` once a committed lock file exists.

### Backend gate

The backend job uses Temurin Java 21, Maven dependency caching, and:

```text
mvn --batch-mode --no-transfer-progress -f backend/pom.xml clean verify
```

The Maven lifecycle includes normal unit tests and Failsafe integration tests. The Enforcer plugin requires Java 21 or newer.

### Container gate

A separate job builds the same Dockerfile used by Render:

```text
backend/Dockerfile
```

It then starts the image on an isolated CI port and verifies:

- `/actuator/health` returns a successful response containing `"status":"UP"`;
- `/actuator/env` returns HTTP 404, confirming that the environment actuator endpoint is not exposed;
- the container can start from the packaged JAR rather than only from Maven's development runner.

This catches a class of failures that a Maven test alone cannot catch, including a broken multi-stage Docker build, incorrect JAR copy path, bad entrypoint, or a container-only startup failure.

## 3. Production deployment workflow

`.github/workflows/deploy-production.yml` is triggered by completion of `EurekaVault CI`, but it deploys only when all of these are true:

- the CI conclusion is `success`;
- the CI event was a `push`;
- the tested branch is `main`.

This means a successful pull-request run is not sufficient to deploy production.

### Frontend deployment

GitHub Actions calls a Netlify build hook stored as the repository secret:

```text
NETLIFY_BUILD_HOOK_URL
```

The hook URL is a secret because possession of it allows a caller to trigger a production build. It must never be committed to the repository or printed into logs.

For the CI gate to be meaningful, Netlify's normal Git-push auto-deployment must be disabled after the build hook is configured. Otherwise Netlify could begin deployment immediately on a push before GitHub Actions finishes testing.

### Backend deployment

GitHub Actions calls the Render service's deploy hook stored as:

```text
RENDER_DEPLOY_HOOK_URL
```

The workflow appends the CI run's exact tested commit SHA as Render's `ref` value. This prevents a race where a newer untested `main` commit could be deployed by a hook intended for an earlier CI run.

For the CI gate to be meaningful, the live Render service's dashboard Auto-Deploy setting must be set to **Off**. The repository's `render.yaml` now also records `autoDeployTrigger: off` for future Blueprint-managed/recreated services.

## 4. Required GitHub repository secrets

Production CD requires exactly these hook secrets at this stage:

```text
NETLIFY_BUILD_HOOK_URL
RENDER_DEPLOY_HOOK_URL
```

No Firebase credential, Gemini credential, Render API key, or Netlify personal access token is required by these workflows.

The deployment workflow intentionally uses narrowly scoped deploy hooks instead of broad account API credentials.

## 5. Deployment hosts and responsibility boundaries

### Netlify

Netlify continues to host:

- the Vite/React production frontend;
- the three existing Netlify Functions used for Gemini operations during the migration period.

Netlify remains a current production boundary until those AI operations are explicitly migrated to Spring Boot.

### Render

Render hosts only the Spring Boot backend service at the current migration stage.

Current public backend URL:

```text
https://eurekavault-backend.onrender.com
```

Current health URL:

```text
https://eurekavault-backend.onrender.com/actuator/health
```

Render executes the backend through this chain:

```text
Render Web Service
  -> Docker image built from backend/Dockerfile
  -> Eclipse Temurin Java 21 JRE
  -> packaged Spring Boot JAR
  -> embedded Tomcat
  -> HTTP service
```

## 6. UptimeRobot is not CI/CD

UptimeRobot is a separate third-party monitor. Its current role is to request the Render health endpoint every 5 minutes during the free-tier migration/testing phase.

It does not:

- compile code;
- run tests;
- deploy code;
- host the backend;
- replace Render health checks;
- prove that application business behavior is correct.

It is an external availability/wake-up monitor only.

## 7. Local pre-push parity

Frontend:

```bash
npm run lint
npm run test
npm run build
```

Backend:

```bash
cd backend
mvn clean verify
```

Container parity, when Docker is installed locally:

```bash
docker build -t eurekavault-backend-local backend
docker run --rm -p 8080:8080 eurekavault-backend-local
```

Then verify `/actuator/health` in a second terminal.

## 8. Failure behavior

A failed CI job prevents the production deployment workflow from running. A failed deployment-hook request fails the corresponding GitHub Actions deployment job.

The hook APIs are asynchronous: a successful hook request proves that the hosting platform accepted the deployment request, not that the new revision has already finished becoming healthy. Render independently applies its configured `/actuator/health` health check. UptimeRobot continues external monitoring after deployment.

Native host auto-deployment must remain disabled when GitHub Actions owns the release gate; enabling both paths creates a race and defeats the test-before-deploy guarantee.

## 9. Branch protection recommendation

The workflow gates deployment even without branch protection. For stronger repository governance, `main` should also require the CI checks before merge and restrict direct pushes once the team workflow needs that enforcement.

This is a GitHub repository setting rather than a source-controlled application file, so it must be configured separately.
