# UNITY

Personal alpha: a provider-independent AI workspace, built in public during the initial experiment.

## Current scope
- Project-separated browser workspace, local project chat, and draft/approved brain dumps. Local chat stores your own messages only; it does not produce AI responses.
- Link multiple public GitHub repository metadata records per project (read-only, no GitHub login).
- Read-only OpenRouter and sampled Hugging Face model discovery, with **no inference requests or paid APIs**.
- Read-only official MCP registry search. Discovering a tool does NOT install, authorize, or execute it.
- Optional **push-to-talk brain dump** in supported browsers. Browser speech providers may process audio.
- Deterministic runtime foundation: project-scoped permission and $0 cost preflight, inert connector manifests, evidence-aware task context, and task state transitions. These are tested contracts, **not live integrations**.
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

## Principles
One approved source of truth per project; evidence over model claims; no production changes or spending without approval; portable providers and memory.

See `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` and `supabase/migrations/0001_core.sql`. The migration is a design artifact until backend authentication and server authorization are implemented.
