# UNITY — complete modular endgame architecture

**Status:** design authority for the personal-alpha build, not proof that all listed systems are operational. GitHub-first by owner decision. Deployment, third-party accounts and paid calls stay disabled until the applicable release gates pass.

**Machine-readable source of truth:** `config/system-manifest.json`. This document explains the boundaries behind its fourteen products/subsystems and the order in which their dependencies must be implemented. The interface reads the same manifest; changing the prose alone must never activate a capability.

## Product contract

One professional workspace manages project knowledge, conversations, compatible models, authorized accounts, tool capabilities, tasks, agents, creative outputs and measurable operational history. Every underlying service must remain replaceable; authorization and billing are enforced by software, not by a model's promise. The personal alpha is owned by the user, and the public repository must contain neither operational credentials nor confidential project data.

"Universal" describes the integration architecture, not unrestricted access. A discovered model or MCP server cannot be used until a compatible, supported, authorized and verified connection exists. The application may grow into a commercial multi-tenant product, but the private personal experiment is the only approved initial operating context.

## Dependency topology

```text
Unified interface and project identity
  ├── Knowledge core → versioned sources, signed decisions and retrieval
  ├── Security governance → grants, keys, budgets and audit
  ├── Model network → verified provider adapters and capability routing
  ├── Integration hub → scoped APIs, GitHub App and approved MCP servers
  ├── Task orchestration → durable checkpoints, leases and evidence
  │   ├── Agent runtime → coordinated specialist agents with bounded tools
  │   └── Automation engine → signed triggers, retries and approval gates
  ├── Cloud foundation → transactional state, isolated storage and retrieval
  ├── Tool registry → inert catalog, sandboxed activated extensions
  ├── Voice interface → opt-in microphone, interruptible audio services
  ├── Creative studio → specialized multimodal adapters and artifacts
  ├── Operations analytics → real receipts, traces, costs and test outcomes
  └── Developer platform → versioned SDK and reviewed extension lifecycle
```

## Global security boundaries

### Identity and ownership
- Identity is independently established by the backend. Never trust an LLM-provided actor identifier.
- The effective project is resolved from a signed session and checked at every storage or connector operation.
- Every credential has owner, provider, account, environment, project allowlist, permission level and expiry/revocation state.
- Distinguish account identity from acting person. Shared third-party logins are not proof of who performed an action.
- Personal mode can use one owner but its data model must be extensible to separate users and organizations. Never mix tenants by default.

### Information and memory
- A browser note, imported JSON, retrieved webpage and LLM-generated summary have distinct trust levels.
- Memory becomes an instruction only after explicit source-aware approval. Approval creates a versioned, auditable event.
- Source evidence is dated, linked and revalidated. If contradictory authoritative records exist, flag the conflict for review.
- Context packages must be assembled server-side after access checks, with relevant project boundaries and source provenance.
- Revoke/delete requests cascade through stored indexes and caches where supported; backup retention must be disclosed.
- Raw secrets and private third-party credentials never enter the model context or public browser storage.

### External execution
- Discovery is inert. Real execution additionally needs fresh connector grants, target resource scope and a validated actor.
- Write/send/deploy require one exact, time-limited, preferably single-use action approval recorded by the backend.
- Deny unknown paid request cost, unverified free eligibility and untrusted endpoints. Default authorized paid-API budget is $0.
- Rate limiting, provider quotas, service-specific terms and actual billing receipts belong to the executing service boundary.
- Every agent receives time, token, monetary, context and tool permissions. A task completion claim requires independent evidence.
- Emergency stop must be checked at dispatch and interrupt all active workers; a UI-only toggle is not sufficient.

## The fourteen subsystems

1. **Project workspace.** Authenticated projects, authorized owners, environment links, tasks, workspaces, conversations and connector boundaries. Initial preview is browser-only.
2. **Knowledge core.** Revisioned decisions, source registry, approved notes, protected embeddings and retriever. Current code supports local notes, offline contracts and a dormant transactional approval proposal.
3. **Model network.** A shared capability protocol and gateway routing across actually available providers. Catalog listing, runtime authorization and measured quality are separate states. Zero-paid-API entitlement must be proven for each request.
4. **Integration hub.** Per-account OAuth or provider credentials in a vault; exact operations and resource grants; adapters for GitHub, other APIs and registered MCP servers. Generated connectors need sandbox tests before approval.
5. **Task orchestration.** Versioned project tasks, ownership leases, dependency graphs, durable checkpoints, human review and evidence-backed completion. Current code has a local board and offline transition checks.
6. **Cloud foundation.** Dedicated transactional Postgres, Auth, safe file storage, signed integration callbacks, durable worker state, backups and restoration. Current connected UI is a dormant scaffold; no dedicated backend provisioned.
7. **Tool registry.** Discovery feeds, verified and revoked tool manifests, capability metadata, compatibility tests, sandbox grades and individual installation approvals. Current search is discovery-only.
8. **Voice interface.** Consented speech input, voice output, interruption and configurable desktop wake word where the OS permits it. Smart speakers remain device-specific. Current browser speech-to-text is optional and dependent on the browser provider.
9. **Agent runtime.** Temporary specialist teams with scoped context, bounded budgets and tool access. Independent verifier inspects original source evidence, tests and artifacts before changing task status.
10. **Automation engine.** Durable scheduled jobs, authorized webhooks, deadlines, retries, dead-letter queues, recovery policies and escalation. Each external action is subject to the same live policy as manual dispatch.
11. **Creative studio.** Approved generation adapters for images, audio, video, documents, presentations and specialized creative services. Each modality is a distinct capability with storage, attribution, cost and permission rules.
12. **Operations analytics.** Real billing receipts, reliable audit records, observed uptime, error rates, verified task success, project costs and capacity forecasts. Never present fake demo telemetry as measured production performance.
13. **Governance.** Role/attribute-based rules, source trust, encryption, credential custody, security scanning, red-team testing, incident response, data lifecycle and emergency stop. Human authority cannot be weakened by prompt content.
14. **Developer platform.** Publicly documentable, versioned SDK and stable integration APIs with permission manifests, schema testing, staged releases, capability discovery and export of independently owned project knowledge.

## Required service interfaces

These are the target boundaries. Names are descriptive; exact HTTP endpoints should not be treated as implemented until integration tests pass.

| Service | Inputs | Outputs | Required validation |
|---|---|---|---|
| Session service | Signed session | Actor, effective workspace | Live identity check, expiry and revocation |
| Project service | Actor + project reference | Owned project scope | Tenant RLS and environment controls |
| Knowledge service | Project + revision/source claims | Approved, source-labeled context | Signed approval, evidence and conflict checking |
| Model gateway | Authorized project task + capability | Provider-normalized message/artifact | Fresh cost/permission/quota preflight |
| Connector gateway | Scoped task + action + account | Normalized permitted tool result | Allowlisted network targets, credential vault, audit |
| Task engine | Versioned mission graph | Durable state and checkpoint | Idempotency, leases, retry and approved writes |
| Verification engine | Evidence references + acceptance tests | Verified or disputed completion | Independent original source and executable test check |
| Event service | Validated webhook/schedule | Deduplicated job dispatch | Signed payload, replay protection, owner binding |
| Artifact service | Approved generated file | Accessible, versioned artifact | Access control, malware/size limits, retention |
| Analytics | Signed operational event + provider receipt | Cost, reliability and usage | Evidence completeness and privacy-safe event data |

## Data and lifecycle rules

- Central PostgreSQL for core transactional data; row-level isolation in the database AND server permission checks.
- Separate blob store for large authorized media/document content; embeddings are derivatives and never override original documents.
- Separate protected backend credential store with rotation and least privilege; never persist live API tokens in public client state.
- Dedicated durable queue/worker compute for long-running agent work, independent of request/response web hosting.
- Idempotency keys for retries, transactional or compensating steps for important changes, versioned service contracts.
- Explicit project routing for every integration. Concurrent coding missions use isolated branches and test results before PRs.
- Portable exports include original owned data, provenance, version and revocation history without leaking unrelated projects.

## GitHub-first development and verification

The owner has explicitly prohibited deployment during source construction. Continue in small branch milestones, but batch changes to avoid duplicate Actions email. Quiet CI runs after a draft PR is marked ready, not on every push. Success in CI proves only what the check actually tested.

**Repository-verifiable gates:** module registry/schema validation, unit tests, strict typing, production compilation, mock integration failures, static security checks, source consistency and browser tests run against a local development server when available.

**Not verifiable without external infrastructure:** Auth session refresh in a deployed origin, actual cross-user RLS in a dedicated backend, private GitHub installation grants, real provider availability and billing, durable multi-worker recovery, OAuth redirects, voice streaming and device integration.

Vercel connection requires an explicit future user decision. It is not a substitute for the worker runtime, database, model accounts or independent secrets storage.

## Release definitions

- **Development foundation:** builds from source, stable route contracts, accurate feature labels, responsive UI, representative offline security and integration tests. No unverified live claims.
- **Private alpha readiness:** actual Auth and protected memory, two scoped provider adapters, working authorization/revocation, transactional task execution, verified $0 budget behavior and safe backups; all tested on dedicated non-production infrastructure.
- **Personal trial:** baseline and actual daily workflows measured over ninety days, with independent failure reports, money/usage accounting and rollback exercises.
- **Commercial readiness:** separately evaluated market demand, multi-tenant governance, support, accessibility, service level, data-processing requirements, business model and legal branding review.

The detailed per-module and Vercel-day checklist remains in `docs/DEPLOYMENT_CHECKLIST.md`. A successful offline build does **not** authorize deployment or imply that all fourteen systems exist in production.

## Universal operational scope and your morning briefing

**GitHub is only one connector.** UNITY projects are independent records that may aggregate authorized activity across project management (Notion, Asana, monday.com), document systems, Google Workspace and Microsoft 365, calendars and booking, meetings, messaging, email marketing, CRM, ecommerce, finance and development tools. Planned connector families are listed in `config/integration-categories.json`. Provider names express proposed compatibility, not permission or live API support.

Each installed connector binds one independently authorized service account and optionally narrower resources to one or more explicit projects. A provider event is normalized to a common source event: ID, connector, project, activity type, title, original observation time, source reference and a source-reported action flag. Raw messages, confidential meeting audio, CRM records and credential-bearing payloads are not copied into this lightweight event feed.

**Daily briefing:** a scheduled collection and normalization job will assemble events from every authorized connector, deduplicate webhook deliveries, respect each project's data boundaries and timezone, then report source-backed changes, overdue and pending decisions, communications and upcoming meetings. Connector synchronization receipts are essential: a quiet feed is not proof that a source was successfully checked. AI may *explain* and *suggest*, but material assertions retain citations to original items and any resulting actions require the relevant scopes and approvals.

**Local computer:** a separate signed macOS/Windows companion will index only explicitly approved folders, initially read-only. It should use OS permission controls, avoid uploading full file content without authorization, support revocation and preview every rename, move or deletion. A hosted Vercel app cannot directly scan arbitrary local disks.

**Calls and simple interviews:** a future telephony integration may screen incoming calls, ask scripted intake questions and record authorized answers. It must identify itself as an automated assistant, follow recording/consent requirements, respect do-not-call and privacy settings, hand off uncertain requests to a human, and avoid unapproved commitments. Availability depends on the supported call provider, plan and local law.

The implemented event normalizer and UI are currently offline and display **zero live feeds** until authenticated connectors are integrated and actually verified.
