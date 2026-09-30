# UNITY complete infrastructure and launch-readiness checklist

Owner's development sequence: **GitHub first. No Vercel deployment or external account provisioning until owner requests it.** This checklist distinguishes code present from end-to-end verification. It covers the end-state product; not every entry is a prerequisite for the first private alpha.

**Status convention**
- `[x]`: implemented in GitHub and checked by the relevant automated offline tests or repository review; **not** evidence that a live third-party integration works.
- `[ ]`: pending implementation, live integration, security review or manual acceptance testing.
- **Gate P0**: must pass before connecting actual private project data or releasing the private hosted alpha.
- **Gate P1**: required for the end-state private personal trial and its 90-day evaluation.
- **Gate P2**: ambitious expansions that can follow a reliable personal core.

## 1. Ownership, repository and source control — P0

- [x] Dedicated `ai-unity` GitHub repository, isolated from other projects.
- [x] Root `AGENTS.md` specifying scope, no deployment and no unverified completion claims.
- [x] Architecture, feature status and recorded technical decisions.
- [x] Pull-request CI for unit tests, TypeScript and production build.
- [x] Public repository explicitly acknowledged in documentation.
- [ ] Review dependency versions and commit a reliable lockfile; then use `npm ci` in CI.
- [ ] Required PR checks and protected default branch configured and checked.
- [ ] Full security audit of public Git history, packages, permissions and dependencies.
- [ ] Intellectual property, licensing and commercialization terms decided before public product launch.

## 2. Web app and experience — P0/P1

- [x] Next.js app skeleton with project-oriented navigation.
- [x] Local project creation and project selection.
- [x] Project-scoped local conversation records (**not yet actual AI chat**).
- [x] Local manual task board with evidence-gated completion previews.
- [x] Browser-based draft and approved brain dumps.
- [x] Local validated JSON backup/import that requires memory reapproval.
- [x] Public model catalog and public MCP server directory, marked as discovery only.
- [x] Optional browser speech-to-text brain dump with manual microphone activation.
- [x] Minimal non-secret health endpoint.
- [ ] Unified production-grade chat with streaming, tools, attachments and history.
- [ ] Authenticated multi-device workspace and responsive accessibility testing.
- [ ] Error/loading/empty-state QA, keyboard usability and mobile browser testing.
- [ ] Dedicated native desktop and mobile experiences, only if justified by private use.

## 3. Identity, database and central knowledge — P0

- [x] Proposed owner-scoped database schema with initial RLS policies, not applied anywhere.
- [x] Expanded SQL design for conversations, tasks, revisions, approvals, usage and agents, **not applied**.
- [x] Offline approved-memory-only task context and project-scope tests.
- [ ] Create a **separate** non-production UNITY backend; never reuse another client's database.
- [x] Optional Supabase SSR Auth and owner-scoped API source code scaffolded (not connected or live-tested).
- [ ] Set up current supported Supabase Auth with real server-side token checks against a dedicated database.
- [ ] Implement real per-project persistent tables, transactional writes and signed audit history.
- [ ] Execute SQL migrations on a dedicated local/test database and run security advisors.
- [ ] Two-user and two-project tests for all table reads, writes, searches and imported data.
- [x] Offline versioned memory core with explicit approval, conflict checks and revocation tests (not authenticated or persistent).
- [ ] Human-approved versioned memory with original source provenance, conflict review and revocation, tested in a dedicated backend.
- [ ] Credential-safe object storage and searchable retrieval, respecting source-specific access.
- [ ] Secure encrypted exports, backup retention and a demonstrated restoration drill.
- [ ] Real data deletion, account deletion, data portability and retention options.

## 4. AI gateways, discovery and spending — P0/P1

- [x] Read-only OpenRouter metadata discovery and capped Hugging Face catalog sample.
- [x] Offline capability-aware model-selection contract.
- [x] Fail-closed policy for missing costs, unverified free eligibility and wrong project scope.
- [ ] Authorized live inference with one provider and clear model capability tests.
- [ ] Authorized second independent provider and verified compatible fallback.
- [ ] Per-provider price/credit/quota verification directly from permissible authoritative data.
- [ ] Strict default $0 paid-API guard verified against **actual provider billing records**.
- [ ] Usage receipts, reliable quota accounting, context-size and rate-limit recovery.
- [ ] Locally hosted model option, if adequate computing hardware exists.
- [ ] Image, audio, video, speech, 3D and specialist model adapters, individually validated.
- [ ] Model performance benchmarking and routing from actual task evaluations.

## 5. GitHub and universal integrations — P0/P1

- [x] Multiple public GitHub repository metadata links stored per local project.
- [x] Read-only official MCP discovery and offline inert connector validation.
- [x] Adapter interface defining project/resource grants; no live executor installed.
- [x] Offline GitHub App transport: JWT signing, raw webhook verification, scoped token request, allowlisted repo metadata retrieval and mocked tests (not connected).
- [ ] Private multi-account/organization GitHub App and installation authorization.
- [ ] Explicit repo selection, revoke/renew, read-only file inspection and safe pagination.
- [ ] Branch-isolated changes, independently verified tests and scoped PR operations.
- [ ] Vercel, Railway, storage, database, CRM, email and calendar adapters as authorized.
- [ ] Secure OAuth and API-key vault, rotation, revocation and least-privilege grants.
- [ ] Generic REST/GraphQL import with safe endpoint allowlists and SSRF protection.
- [ ] Independently authorized MCP servers, tool permissions and injection-resistant output handling.
- [ ] Signed inbound webhooks, idempotency, replay protection and audit receipts.
- [ ] Connector health, rate-limit detection, retries and version/compatibility checks.

## 6. Agents, workflows, approvals and verification — P0/P1

- [x] Offline revisioned task states, approval checkpoints and required completion evidence.
- [x] Offline mission specification with ordered dependencies and inert execution.
- [x] Policy requiring a specific project, connector, resource and action approval.
- [ ] Authenticated actor identities and reliable per-task ownership in the backend.
- [ ] Durable worker queue and recoverable workflow engine tested after interruptions.
- [ ] Independent verifier checks original sources, commits, test logs and claims.
- [ ] Concurrent agents use isolated branches and transactional task revisions.
- [ ] Approvals are authenticated, single-use, time-limited and logged at dispatch time.
- [ ] Emergency stop actually disables external dispatch across every worker.
- [ ] Retried jobs are idempotent; partial failure and rollback rehearsals pass.
- [ ] Workflow designer, triggered automations, agent negotiation and reusable skills.
- [ ] Sandbox execution for untrusted code with CPU, time, filesystem and network limits.

## 7. Voice, multimodal and device support — P1/P2

- [x] Browser opt-in speech-to-text (availability and privacy vary by browser).
- [ ] Two-way streaming voice, interruptions, explicit microphone indicators and privacy controls.
- [ ] Audio, documents, images and video upload processing with source permissions.
- [ ] Browser/screen/computer awareness only after user approval and platform support.
- [ ] Optional desktop wake-word assistant with explicit permission and safe offline behavior.
- [ ] Smart-speaker compatibility validated **per actual device model**; no assumed microphone access.
- [ ] Creative content generation adapters and media artifact storage.

## 8. Operational security and observability — P0/P1

- [x] Offline structured event contract excludes raw prompt or credential fields.
- [x] Source scanner and readiness report for repository development.
- [x] Non-secret health endpoint and intentionally disabled external execution by default.
- [ ] Comprehensive threat model, dependency lockfile, automated dependency audit and SAST.
- [ ] Trusted HTTPS origin, secure session cookies, CSRF strategy and security headers.
- [ ] Server-side request validation, rate limits, SSRF defenses and least privilege.
- [ ] Immutable/append-only audit sink, trace correlation, incident alerts and scrubbed logs.
- [ ] Provider-policy, privacy and data-processing review before sending real project context.
- [ ] Disaster-recovery backups tested with realistic failures.
- [ ] Penetration/security review and documented vulnerability response before commercialization.

## 9. GitHub CI and engineering quality — P0

- [x] Unit tests for workspace import, isolation, approval preflight and task transitions.
- [x] CI test, typecheck and Next.js production build.
- [x] Documentation of planned vs operational capabilities.
- [ ] CI secret-scan step and project readiness script verified passing on final candidate branch.
- [ ] Dependency pin/lockfile plus `npm ci` and tested upgrade process.
- [ ] Database migration dry run and RLS test suite in isolated local/test environment.
- [ ] Route-handler integration tests, two-user isolation tests and mocked provider failure tests.
- [ ] Browser E2E smoke tests on desktop and mobile layouts.
- [ ] UI accessibility, performance, error-boundary and multi-browser acceptance.
- [ ] Stable release tagging, change log and rollback procedure.

## 10. Vercel connection day — explicit owner go/no-go, P0

DO NOT PERFORM ANY OF THESE UNTIL OWNER AUTHORIZES THE HOSTED TEST.

- [ ] Every applicable P0 code and security gate reviewed.
- [ ] Owner selects and authorizes a separate UNITY test database and funding limits.
- [ ] Owner installs selected GitHub App and authorizes only specified repositories.
- [ ] Configure Vercel with a **dedicated** UNITY project and appropriate access restrictions.
- [ ] Configure non-production and production environments separately.
- [ ] Add environment settings through secure project settings; never commit secret values.
- [ ] Validate exact OAuth callback URLs, redirect allowlists and webhook signatures.
- [ ] Apply reviewed database migrations, enable RLS and run independent isolation tests.
- [ ] Run end-to-end test for private repo reads with correct permission denial behavior.
- [ ] Make one approved genuinely free AI request; verify provider usage and $0 paid-API billing.
- [ ] Validate memory save, approval, revision, search and cross-device access.
- [ ] Test denied actions, broken connectors, retries, logout and emergency stop.
- [ ] Test backups and restoration before loading any private client data.
- [ ] Record owner acceptance and keep the public launch disabled.

## 11. Personal three-month evaluation — P1

- [ ] Establish weekly baseline measurements for tasks and tools currently used.
- [ ] Run repeatable research, coding, project management and documentation scenarios.
- [ ] Log task completion, human rework, unsupported answers, downtime and model failures.
- [ ] Audit actual total infrastructure and provider costs weekly.
- [ ] Perform intentional network failures, provider quota exhaustion and cross-project isolation tests.
- [ ] Review weekly whether UNITY is consistently more useful than using separate tools.
- [ ] Assess external user demand separately; one user's success is not product-market fit.

## 12. Commercial endgame — P2

- [ ] Define licensed product identity after trademark and competitive review.
- [ ] Organization accounts, user roles, subscription plans and compliance requirements.
- [ ] Provider terms, marketplace licensing, service-level guarantees and support processes.
- [ ] Plugin/connector SDK with compatibility verification and controlled publication.
- [ ] Optional distributed agents, desktop/mobile clients, local models and hardware integration.
- [ ] External security review and a small authorized pilot before any broad commercial release.

## Final sign-off (leave blank until independently verified)

| Release gate | Current state | Proof required |
|---|---|---|
| Repository compiles and unit tests pass | Verify in GitHub Actions | Completed CI run on the exact release commit |
| Dedicated secure backend | NOT READY | Applied migrations, live authentication and cross-user RLS tests |
| Verified live AI and $0 budget | NOT READY | Provider receipts and real request/denial tests |
| Authorized private GitHub/MCP connectors | NOT READY | Scoped installations, revocation and tool execution tests |
| Durable tasks and emergency stop | NOT READY | Worker recovery, exact action approval and stop-drill evidence |
| End-to-end UX and backup | NOT READY | E2E report plus restoration drill |
| Vercel deployment | NOT STARTED BY REQUEST | Owner authorization after preceding gates |
| Three-month personal evaluation | NOT STARTED | Dated logs and objective acceptance outcomes |

**No single successful build can turn an unconnected integration into a verified capability.**
