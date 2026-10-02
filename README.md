# UNITY

Personal alpha: a provider-independent AI workspace, built in public during the initial experiment.

## Current scope
- Project-separated browser workspace, local project chat, manual task planning board, and draft/approved brain dumps. Local chat stores your own messages only; it does not produce AI responses.
- Link multiple public GitHub repository metadata records per project (read-only, no GitHub login).
- Tested, **unactivated** server-side GitHub read adapter for project-scoped repository metadata and file content; credentials and authorization must be configured later.
- Offline GitHub App signing, HMAC verification, limited installation transport and dormant durable webhook ingestion; see `docs/GITHUB_APP_INTEGRATION.md`.
- Read-only OpenRouter and sampled Hugging Face model discovery, with **no inference requests or paid APIs**.
- Tested offline provider-neutral multimodal conversation, scoped approved context, bounded streaming frames and eligible-provider fallback; still no live AI responses.
- Read-only official MCP registry search. Discovering a tool does NOT install, authorize, or execute it.
- Offline OpenAPI 3.0/3.1 JSON connector designer: inspect API operations without networking, authentication or execution.
- Optional **push-to-talk brain dump** in supported browsers. Browser speech providers may process audio.
- Deterministic runtime foundation: project-scoped permission and $0 cost preflight, inert connector manifests, evidence-aware task context, revisioned tasks, bounded offline worker leases/retries and provider-neutral model planning. These are tested contracts, **not live integrations**.
- Optional Supabase SSR Auth, owner-scoped project/draft-memory routes, unactivated transactional memory approval and a separate cloud workspace UI; **not activated or live-verified**. See `docs/AUTH_INTEGRATION.md`.
- Offline versioned memory approval, conflict detection and revocation rules (not yet persisted or authenticated); see `docs/MEMORY_VERSIONING.md`.
- Authentication-sensitive JSON routes and dormant GitHub webhook intake now enforce actual streamed byte limits, not just client-supplied Content-Length.
- Architecture and a dedicated UNITY test database with the initial four owner-scoped tables created; the app, real authentication, AI execution and external accounts are **not yet connected**.

See `docs/LOCAL_FIRST_CONTRACT.md` for the GitHub-first development and deployment boundary.

**Not production-ready.** Browser local storage is not encrypted. Do not enter API keys, passwords, or confidential client information. Public source code is intentional; never commit secrets.

## Start
Node.js 22.x is the release-candidate runtime.

```sh
npm install
npm run dev
npm test
npm run typecheck
```

Open http://localhost:3000.

## Backup and restore
The local alpha offers validated JSON import/export. Imports deliberately reset every memory approval to draft: importing a file must not let untrusted JSON become authoritative instructions. Back up your browser data before importing.

## Universal activity and daily briefings

GitHub is only one integration. The product is designed to consolidate authorized project management, Google/Microsoft workspaces, email, calendars, meetings, marketing, CRM, finance, ecommerce, development and permission-scoped local desktop data. The current integration category explorer and project-scoped daily briefing normalizer are **offline foundations**; no live cross-app feed has been connected. See `docs/UNIVERSAL_HUB.md` and `config/integration-categories.json`.

## Approved interface and full system blueprint

The owner-approved **Quiet Convergence** interface uses the original UNITY convergence mark, semantic Light/Dark/System appearance (System default), a calm project-centered Home and progressive disclosure. Primary navigation is Home, Projects, Conversations, Knowledge and Settings. Briefing, Tasks, Cloud, Models, Tools, Integrations and Readiness remain fully reachable under More and ⌘K rather than dominating the landing page.

- [Approved handoff integration](docs/APPROVED_UI_HANDOFF.md)
- [Visual language and UI acceptance](docs/DESIGN_SYSTEM.md)
- [Room model and embedded brain](docs/ROOM_MODEL.md)
- [Fourteen-system endgame architecture](docs/ENDGAME_ARCHITECTURE.md)
- [Machine-readable capability/status registry](config/system-manifest.json)
- [Vercel preview runbook](docs/VERCEL_PREVIEW_RUNBOOK.md)
- [GitHub-first deployment acceptance checklist](docs/DEPLOYMENT_CHECKLIST.md)

No mock operational health, connected-account claims or fabricated API consumption is displayed. Existing advanced tools remain reachable.

## Evidence-based release console
The **Readiness** navigation tab shows ten independently verifiable pre-Vercel critical gates alongside personal-trial and future commercialization requirements. Its public status is deliberately locked until separate authenticated, reviewed evidence exists. Source changes cannot self-certify deployment.

## Disposable database contract verification
Dedicated manual and milestone-only PostgreSQL 17 tests now execute the core and proposed database SQL against two **synthetic** identities. They exercise owner-scoped access, approval, revision/audit writes and worker safety without touching a real Supabase database. See [database testing instructions](docs/DATABASE_CONTRACT_TESTING.md). This does not verify live Supabase Auth, secrets, billing or deployed integration.

## GitHub-first completion checklist
See [Deployment and infrastructure checklist](docs/DEPLOYMENT_CHECKLIST.md) for verified offline code versus integration work still required. `npm run readiness` reports the current repository infrastructure gates without exposing environment variable values. No connection to Vercel or a new database will be made until explicitly authorized.

## Principles
One approved source of truth per project; evidence over model claims; no production changes or spending without approval; portable providers and memory.

Start with `AGENTS.md` and `docs/FEATURE_MATRIX.md` to understand the current verified scope. Architectural decisions are recorded in `docs/DECISIONS.md`. See `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` and `supabase/migrations/0001_core.sql`. The initial owner-scoped migration has been applied to the dedicated UNITY test database. More advanced schema proposals and live backend authorization still require independent review and verification.
