# Deployment

## 1. Current deployment topology

EurekaVault currently spans two application hosting platforms plus Firebase and an external uptime monitor:

```text
GitHub repository
   |
   +-- GitHub Actions CI/CD gate
   |      |
   |      +-- Netlify deploy hook
   |      |      -> React/Vite frontend
   |      |      -> existing Netlify Gemini Functions
   |      |
   |      +-- Render deploy hook
   |             -> Docker
   |             -> Java 21 JVM
   |             -> Spring Boot
   |
Browser
   +-- Netlify-hosted frontend
   +-- Firebase Authentication
   +-- Firebase Realtime Database (current direct data path)
   +-- Netlify Functions (current AI path)
   +-- Spring Boot backend (migration foundation only)

UptimeRobot
   -> GET Render /actuator/health every 5 minutes
```

No user-data CRUD, Firebase authentication verification, or Gemini traffic has been migrated to Spring Boot yet.

## 2. Frontend / Netlify

The frontend remains a Vite + React + TypeScript application. `netlify.toml` defines:

- build command: `npm run build`;
- publish directory: `dist`;
- Node version: `22.12.0`;
- SPA fallback to `/index.html`.

The existing three Netlify Functions remain deployed during incremental migration:

```text
netlify/functions/prompt-retrieval.mjs
netlify/functions/prompt-repurpose.mjs
netlify/functions/prompt-mix.mjs
```

They continue to protect Gemini credentials until that responsibility is explicitly migrated.

## 3. Spring Boot / Render

The backend lives under the monorepo directory:

```text
backend/
```

Render was configured as a Web Service with:

```text
Name:           eurekavault-backend
Branch:         main
Runtime:        Docker
Root Directory: backend
Instance:       Free
Health path:    /actuator/health
```

Current public URL:

```text
https://eurekavault-backend.onrender.com
```

The externally deployed endpoint was manually verified on 2026-08-19 and returned `status=UP`.

## 4. Why Docker is used for Java on Render

Render does not provide Java/JVM as one of its native language runtimes. The backend therefore runs through Docker.

`backend/Dockerfile` is a multi-stage image:

```text
Stage 1: Maven + Eclipse Temurin Java 21
    -> resolve dependencies
    -> compile/test/package Spring Boot JAR

Stage 2: Eclipse Temurin Java 21 JRE
    -> copy packaged JAR
    -> java -jar /app/app.jar
```

The deployment chain is therefore explicitly:

```text
Render Web Service
   -> Docker container
      -> JVM / Java 21 runtime
         -> Spring Boot JAR
            -> embedded Tomcat
               -> HTTP API
```

The local development machine used Java 25 successfully to run the project, while the project compilation target and production container remain Java 21. Maven 3.9.16 was installed locally and `mvn spring-boot:run` successfully started the service on port 8080.

## 5. Port behavior

`application.yml` uses:

```text
${PORT:8080}
```

Therefore:

- local default: `8080`;
- Render: the platform-supplied `PORT` value is honored automatically.

## 6. Health checking

Spring Boot Actuator exposes only:

```text
/actuator/health
```

Health details are not configured for public disclosure.

The endpoint has three separate uses:

1. local developer verification;
2. Render service health checking;
3. UptimeRobot external monitoring/wake-up requests.

These are distinct consumers of the same narrow infrastructure endpoint.

## 7. UptimeRobot

UptimeRobot is not part of Render and does not host EurekaVault. It is a third-party external monitor configured to request:

```text
https://eurekavault-backend.onrender.com/actuator/health
```

at the free-plan 5-minute interval.

Its purpose during this migration/testing phase is:

- external uptime observation;
- periodic inbound traffic to reduce Render Free idle spin-down behavior;
- email notification when monitor status changes.

The initial UP/DOWN emails seen during setup were UptimeRobot test notifications, not five-minute email spam.

UptimeRobot does not provide production-grade availability guarantees and does not replace application observability.

## 8. GitHub Actions release gate

The repository now contains:

```text
.github/workflows/ci.yml
.github/workflows/deploy-production.yml
```

CI runs on pull requests and pushes to `main`. Production deployment occurs only after a successful CI run caused by a push to `main`.

Detailed behavior is documented in `docs/CI-CD.md`.

## 9. Required deployment secrets

GitHub Actions production deployment uses narrow deploy-hook secrets:

```text
NETLIFY_BUILD_HOOK_URL
RENDER_DEPLOY_HOOK_URL
```

These values must be stored under GitHub repository Actions secrets and never committed.

## 10. Native auto-deploy must be disabled

After deploy hooks are configured, disable native Git-push auto-deploy in both hosting platforms. Otherwise a host could deploy before CI completes.

### Render

Set the live `eurekavault-backend` service's Auto-Deploy setting to **Off**. The repository `render.yaml` also records:

```text
autoDeployTrigger: off
```

### Netlify

Keep Netlify builds **active** so the build hook can work. The repository instead sets `ignore = "exit 0"` in `netlify.toml`. For ordinary Git-triggered builds, exit code 0 tells Netlify to stop the build. Netlify build-hook-triggered builds bypass the `ignore` command, so GitHub Actions can still deploy after CI succeeds. Do **not** use Netlify's global **Stopped builds** setting for this design, because stopped builds also disable build hooks.

This creates one authoritative release path:

```text
push -> GitHub Actions tests -> success -> deploy hooks -> hosts
```

## 11. Important Render configuration-source detail

The currently running Render service was created manually through **New Web Service**, not by creating a Render Blueprint from `render.yaml`.

Therefore `render.yaml` documents the desired/recreatable service configuration, but editing it does not automatically reconfigure the already-created live service unless that service is later brought under Blueprint management. Settings such as Auto-Deploy must currently be changed in the Render Dashboard as well.

This distinction matters because treating the YAML as live infrastructure-as-code when it is not attached to a Blueprint would create false confidence.

## 12. Current Firebase and AI environment variables

The existing frontend/Netlify deployment still uses the current Firebase client variables and server-side Gemini variables documented in `.env.example` and the prior deployment configuration.

`GEMINI_API_KEY` remains server-side. It must never be exposed through a browser-bundled `VITE_` variable.

No Firebase Admin service-account secret has been added to Render yet because backend authentication/data migration has not started.

## 13. Reliability boundary

Render Free plus a five-minute external monitor is appropriate for migration, development and low-cost validation, not a production SLA. The design must not silently redefine availability expectations simply because periodic pings reduce idle behavior.
