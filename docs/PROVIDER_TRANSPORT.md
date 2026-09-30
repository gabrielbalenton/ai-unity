# UNITY provider gateway — fixed transports and trusted execution boundaries

**Current code status:** offline dual-provider request transport and dispatch contract. NOT activated, NOT connected to real accounts, and NOT a guarantee of free inference.

## Supported prepared transports

1. OpenRouter: `https://openrouter.ai/api/v1/chat/completions` with a project-authorized server-only bearer token.
2. Hugging Face Inference Providers: `https://router.huggingface.co/v1/chat/completions` with a separate server-only token.

Both use a bounded, normalized non-streaming chat request and return a normalized result. Input roles and lengths are validated, arbitrary endpoints are rejected, provider responses have a size limit, and failure output is sanitized. Neither low-level transport is imported by an active HTTP API route.

Official provider documentation:
- https://openrouter.ai/docs/quickstart
- https://huggingface.co/docs/inference-providers/index
- https://huggingface.co/docs/inference-providers/pricing

## Do not mistake free credits for unrestricted free requests

Model catalogs describe discovered products, not the owner's actual available balance. A nominal price of zero, promotional credits or a free model name is NOT independent entitlement verification. Hugging Face free credits are finite and paid usage can become possible after credits have been consumed. OpenRouter's available models and limits depend on the account, current model and published billing rules.

UNITY's paid-API default remains **$0**. The authenticated backend must fail closed unless it can independently verify a provider-specific method to prevent paid billing, fresh account entitlement and sufficient hard limits. If a provider cannot guarantee this for the intended account and operation, the request remains blocked until an explicit owner-approved change.

## Server-owned dispatch sequence

1. Independently authenticate the acting user; resolve the selected project from the server.
2. Verify the provider connection, allowed model, permitted role and project/account scope.
3. Independently check current pricing and **actual** billing/entitlement rules, with paid billing disabled under the default policy.
4. Atomically reserve a unique request ID and its budget allowance in a durable data store. Every retry must consult the reservation before any network request.
5. Issue a cryptographically signed, scope-specific, five-minute entitlement from a protected server key. The frontend, retrieved prompt or LLM cannot issue this proof.
6. Revalidate policy, proof signature and target at dispatch. Fetch the specific provider credential from the private vault.
7. Call the fixed provider endpoint, without arbitrary endpoint overrides or provider error-body logging.
8. Record a sanitized outcome and actual provider receipt once retrieved. Provider-generated content remains **unverified** until separately evaluated.
9. If outcome persistence fails after the request, preserve the reservation, surface uncertainty and **do not automatically retry**. A human or recovery worker reconciles the provider receipt first.

The present `dispatchVerifiedChat` code implements steps 5–8 as a reusable interface with injected trusted dependencies. Those dependencies are mocked in unit tests. It does not implement steps 1–4 or a real vault, signed-in account, paid-billing controls, verified credentials or real inference.

## Mandatory integration tests before activation

- A logged-out actor, wrong project, revoked grant, wrong model or invalid signature causes **zero** provider network requests.
- An entitlement with a nonzero possible paid charge, unverifiable eligibility, disabled spend controls or expired signature fails closed.
- Duplicate idempotency keys cannot trigger duplicate provider calls even after worker restart.
- Provider 401/429/5xx, malformed response, overlarge output, timeout and connection failures never leak credentials.
- Provider-side billing records confirm zero paid charges for every permitted free test request.
- The knowledge retrieval layer supplies only authorized context and never shares one project's notes with another.
- Agent completion is verified independently of a provider's own result text.

## Explicit non-goals for this milestone

No automatic model execution, no model streaming, no multimedia generation, no public inference endpoint, no service provisioning and no Vercel deployment. These are separate implementation and live-validation milestones tracked by the full deployment checklist.
