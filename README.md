# UNITY

Personal alpha: a provider-independent AI workspace, built in public during the initial experiment.

## Current scope
- Project-separated browser workspace and draft/approved brain dumps.
- Link multiple public GitHub repository metadata records per project (read-only, no GitHub login).
- Read-only OpenRouter and sampled Hugging Face model discovery, with **no inference requests or paid APIs**.
- Read-only official MCP registry search. Discovering a tool does NOT install, authorize, or execute it.
- Architecture and a planned Supabase schema; no real account connections yet.

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
