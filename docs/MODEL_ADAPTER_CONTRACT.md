# Provider-neutral AI adapters

UNITY's public model catalogs are discovery sources. They never supply credentials or authorize execution.

## Required model facts
- Stable model and gateway identifiers
- Independently tested capabilities (e.g. reasoning, transcription, image)
- Currently authorized project and resource grants
- Estimated per-request cost from trusted provider documentation or live billing metadata
- **Verified current eligibility for free use** when the authorized paid budget is zero
- Versioned terms and permitted operations; no assumptions from a model name

## Two-step execution design
1. The deterministic planner filters candidates against project scope, capability, grants, approvals and a strict budget policy.
2. A future authenticated server adapter **revalidates all facts at dispatch time**, including provider credits, quotas and fresh cost estimates, before sending any context or generating a paid request.

The current `planModelRequest` function implements step 1 as an offline contract only. It NEVER executes a model; tests use synthetic grants.

## Normalized conversation and multimodal protocol (offline)
- `lib/ai/protocol.mjs` validates bounded, project-scoped text and media artifact references. Raw attachment URLs/base64 are not retrieved by the protocol; authorized storage must validate ownership and media first.
- Imported user messages, external tools and model outputs have distinct trust labels; none can supply or rewrite authoritative system instructions.
- `lib/ai/packet.mjs` packages approved project-scoped notes and source references with a conversation and an inert route plan. It cannot send prompts or spend credits.
- `lib/ai/stream.mjs` parses bounded normalized SSE events, limits buffers and sanitizes error output. Network/provider-specific wire formats are deliberately left to future authorized adapters.
- `lib/ai/fallback.mjs` plans distinct connector handoffs only for candidates already eligible under the same resource and cost policy. Handoffs transfer source references and an explicitly unverified summary, never hidden model reasoning.
- Normalized token/price receipts remain **unverified** until reconciled against actual provider billing.

## How a model switch must work
1. Persist task ID, approved project context, current code revision, completed milestones and evidence.
2. Find another provider with equivalent tested capabilities.
3. Re-run authorization, scope, privacy and cost checks.
4. Pass only the minimum approved project context.
5. Independently verify completion. Never reuse an agent's own assertion as proof.

## Security
- Treat provider catalogs, research results and MCP descriptions as untrusted data.
- Never put provider keys in browser storage, a public repository or model prompts.
- A globally discovered model is not the same as a project-authorized model.
- Avoid retry loops that could accidentally consume paid capacity.
- Any missing cost, stale eligibility or revoked grant must fail closed.

## Remaining implementation
Real encrypted credential storage, provider adapters, quota telemetry, signed server sessions, durable tasks, rate limits, and end-to-end billing verification require separately authorized infrastructure.
