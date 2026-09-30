# UNITY architectural decision record

This file records the user's established constraints and the technical implementation defaults. It is not a substitute for live service configuration or legal ownership agreements.

## ADR-001: GitHub-first, no deployment
**Decision:** Keep development in the existing `gabrielbalenton/ai-unity` repository. Do not deploy to Vercel or provision a new database until the owner requests it. Use code and CI tests to validate offline modules.

## ADR-002: Public repository is intentional for now
**Decision:** The owner chose public visibility despite earlier confidentiality goals. Source may be public; secrets, internal strategy and confidential project information must not be committed. Do not assert that the public implementation is secret or exclusive.

## ADR-003: One permanent brain, replaceable models
**Decision:** Model-generated responses and summaries never become authoritative by default. Knowledge is project-scoped, human-approved and traceable. Provider integrations consume only authorized context.

## ADR-004: Explicit zero-paid-API baseline
**Decision:** An unknown estimated price or unverified free entitlement is insufficient. Block instead of guessing. Published zero text-token prices are not proof of an eligible, currently free request.

## ADR-005: Universal connection boundary
**Decision:** Discover compatible APIs, gateways and MCP tools broadly. Authorize each actual service independently; never scrape login-only services or evade provider quotas.

## ADR-006: Project ownership and action approvals
**Decision:** External write, deployment or communication approvals must bind exact project, connector, resource and action. Permissions are enforced at the server/connector, not by prompting an LLM.

## ADR-007: Progressive verified engineering
**Decision:** Each material change travels through tests, type checking, build checks and review before main. Maintain release notes and do not describe future features as already working.

## Open architecture questions (not assumed decisions)
- Real private database provisioning and hosting configuration.
- Final commercial brand, intellectual property strategy and public product differentiation.
- Provider account selection, exact quotas, credential ownership and paid infrastructure budget.
- Mobile operating-system permissions, supported smart speakers and audio providers.

## ADR-008: Approved Quiet Convergence interface
**Decision:** Use the owner-supplied September 30, 2026 UI/UX handoff as the visual authority. Home stays calm and project-centered; technical systems remain reachable through progressive disclosure. System is the default appearance with Light/Dark overrides. Original convergence assets replace the earlier geometric U / sci-fi dashboard direction.

## ADR-009: Vercel preview is not production activation
**Decision:** A zero-secret Vercel preview may be used for owner visual/functional review after repository verification. Connecting Auth, private accounts, model execution, webhooks, durable workers or client data remains a separate staged activation process. Production readiness cannot be inferred from successful hosting.
