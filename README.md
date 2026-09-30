# UNITY

Personal alpha: a provider-independent AI workspace, built in public during the initial experiment.

## Current scope
- Project-separated browser workspace, local project chat, manual task planning board, and draft/approved brain dumps. Local chat stores your own messages only; it does not produce AI responses.
- Link multiple public GitHub repository metadata records per project (read-only, no GitHub login).
- Tested, **unactivated** server-side GitHub read adapter for project-scoped repository metadata and file content; credentials and authorization must be configured later.
- Offline GitHub App signing, HMAC verification, limited installation transport and dormant durable webhook ingestion; see `docs/GITHUB_APP_INTEGRATION.md`.
- Read-only OpenRouter and sampled Hugging Face model discovery, with **no inference requests or paid APIs**.
- Read-only official MCP registry search. Discovering a tool does NOT install, authorize, or execute it.
- Offline OpenAPI 3.0/3.1 JSON connector designer: inspect API operations without networking, authentication or execution.
- Optional **push-to-talk brain dump** in supported browsers. Browser speech providers may process audio.
- Deterministic runtime foundation: project-scoped permission and $0 cost preflight, inert connector manifests, evidence-aware task context, revisioned tasks and provider-neutral model planning. These are tested contracts, **not live integrations**.
- Optional Supabase SSR Auth, owner-scoped project/draft-memory routes, unactivated transactional memory approval and a separate cloud workspace UI; **not activated or live-verified**. See `docs/AUTH_INTEGRATION.md`.
- Offline versioned memory approval, conflict detection and revocation rules (not yet persisted or authenticated); see `docs/MEMORY_VERSIONING.md`.
- Architecture and a planned Supabase schema; no real account connections yet.

See `docs/LOCAL_FIRST_CONTRACT.md` for the GitHub-first development and deployment boundary.

**Not production-ready.** Browser local storage is not encrypted. Do not enter API keys, passwords, or confidential client information. Public source code is intentional; never commit secrets.

## Start
Node.js 20.9+ required.

```sh
npm install
npm run dev
npm test
npm run typecheck
```

Open http://localhost:3000.

## Backup and restore
The local alpha offers validated JSON import/export. Imports deliberately reset every memory approval to draft: importing a file must not let untrusted JSON become authoritative instructions. Back up your browser data before importing.

## UNITY Command Center and full system blueprint

The interface now uses a premium, responsive command-center shell and a shared fourteen-system feature manifest. Its interactive overview opens the existing local tools and gives honest roadmap details for systems that are not operational. The dark graphite/jade visual system uses no external image assets or required third-party font downloads.

- [Visual language and UI acceptance](docs/DESIGN_SYSTEM.md)
- [Fourteen-system endgame architecture](docs/ENDGAME_ARCHITECTURE.md)
- [Machine-readable capability/status registry](config/system-manifest.json)
- [GitHub-first deployment acceptance checklist](docs/DEPLOYMENT_CHECKLIST.md)

No mock operational health or fabricated API consumption is displayed. All existing project tools remain navigable.

## GitHub-first completion checklist
See [Deployment and infrastructure checklist](docs/DEPLOYMENT_CHECKLIST.md) for verified offline code versus integration work still required. `npm run readiness` reports the current repository infrastructure gates without exposing environment variable values. No connection to Vercel or a new database will be made until explicitly authorized.

## Principles
One approved source of truth per project; evidence over model claims; no production changes or spending without approval; portable providers and memory.

Start with `AGENTS.md` and `docs/FEATURE_MATRIX.md` to understand the current verified scope. Architectural decisions are recorded in `docs/DECISIONS.md`. See `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` and `supabase/migrations/0001_core.sql`. The migration is a design artifact until backend authentication and server authorization are implemented.
