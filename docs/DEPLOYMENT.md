# Deployment

## 1. Frontend build

The project is a Vite + React + TypeScript application.

Primary commands:

```bash
npm install
npm run dev
npm run lint
npm run test
npm run build
```

`npm run build` runs TypeScript project compilation followed by `vite build`.

## 2. Runtime requirement

`package.json` requires Node `>=22.12.0`. `netlify.toml` pins the Netlify build environment to Node `22.12.0`.

## 3. Netlify configuration

Current `netlify.toml` behavior:

- build command: `npm run build`
- publish directory: `dist`
- Node version: `22.12.0`
- SPA redirect: all unmatched paths -> `/index.html` with HTTP 200

The SPA redirect is required for browser-routed URLs such as `/prompts/:promptId` and `/ai/find-prompt` to load correctly on direct navigation.

## 4. Firebase services

The browser application uses:

- Firebase Authentication
- Firebase Realtime Database

The IntellectVault root is `intellectVault/users/{{uid}}` and must be protected with the supplied owner-only rule.

## 5. Client Firebase environment variables

Optional variables for deploying against a different Firebase project:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_DATABASE_URL
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

The repository currently includes a fallback Firebase configuration in `src/lib/firebase.ts`.

## 6. AI server-side variables

Configure these in Netlify's server-side environment settings:

```text
GEMINI_API_KEY
GEMINI_MODEL
GEMINI_REPURPOSE_MODEL
GEMINI_MIXER_MODEL
FIREBASE_WEB_API_KEY
```

`GEMINI_API_KEY` is required for AI features. Model variables are optional overrides. `FIREBASE_WEB_API_KEY` is used by the functions' server-side Firebase token verification and has a code fallback in the current implementation.

Do not expose `GEMINI_API_KEY` as `VITE_GEMINI_API_KEY` or any other browser-bundled variable.

## 7. Netlify Functions

The deployed project requires the three AI function files under `netlify/functions/`:

```text
prompt-retrieval.mjs
prompt-repurpose.mjs
prompt-mix.mjs
```

These form the backend boundary for Gemini access even though the product otherwise has no conventional backend service.

## 8. Local development and AI

`vite dev` serves the frontend, but AI routes ultimately need the Netlify Function endpoints. Local AI testing therefore requires a development setup that can execute/proxy the Netlify functions and provide the server-side environment variables, or an equivalent deployed function endpoint.

## 9. Production validation

Before packaging/deploying a change, run:

```bash
npm run lint
npm run test
npm run build
```

A build success validates TypeScript compilation and Vite bundling but does not by itself validate live Firebase rules, Gemini quota, Netlify environment variables or end-to-end authentication against production services.

## 10. Current backend boundary

Netlify Functions should be regarded as a narrowly scoped server-side adapter for Gemini, not as a full application backend. If a conventional backend is introduced later, AI secret management and Gemini calls should move there to avoid maintaining two backend boundaries for the same concern.
