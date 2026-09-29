# UNITY

Personal alpha: a provider-independent AI workspace, built in public during the initial experiment.

## Current scope
- Project-separated browser workspace and draft/approved brain dumps.
- Read-only public model discovery, with **no inference requests or paid APIs**.
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

## Principles
One approved source of truth per project; evidence over model claims; no production changes or spending without approval; portable providers and memory.

See `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` and `supabase/migrations/0001_core.sql`. The migration is a design artifact until backend authentication and server authorization are implemented.
