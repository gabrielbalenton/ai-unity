# GitHub App connection: offline transport and activation plan

The current release implements **server-only cryptographic transport code**, not a live GitHub installation, OAuth login or an operating connection.

## What exists
- RS256 GitHub App JWT creation, using GitHub's documented short expiry and backdated issue time.
- Raw-body HMAC SHA-256 verification for eventual GitHub webhooks.
- Inert installation event normalization: events are NOT applied to any account or grant.
- Token request restricted to explicit repository IDs and requested read-only contents/metadata permissions.
- Read-only repository metadata retrieval filters returned records by explicit permitted IDs and uses bounded pagination.
- Mocked unit tests run entirely offline; there are no real GitHub tokens in the repository.

References: https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-json-web-token-jwt-for-a-github-app and https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation .

## Activation prerequisites (later, with owner approval)
1. Provision a dedicated UNITY backend, enable server-verified authentication and validate project isolation.
2. Register a UNITY-specific GitHub App with minimal read-only permission, and configure exactly approved callback/webhook addresses.
3. Keep GitHub App private keys and webhook secrets server-side in approved secrets storage, never in GitHub source, public environment values or client storage.
4. Bind every installation, account, authorized repository ID and permission to one authenticated UNITY project.
5. Validate raw webhook signatures **before parsing**; persist delivery IDs in a durable deduplication table, with replay rejection and revocation.
6. Obtain installation tokens on demand for only currently authorized repositories. Never return installation tokens to browser clients or AI models.
7. After a live call, verify GitHub installation repo access against stored project grants and cross-project denial.
8. Deploy read-only API routes and independently test failure cases: missing grants, revoked installs, 403/429 responses and secret rotation.

No installation events mutate storage until all these conditions are satisfied. Requests to third-party systems are prohibited by default. Public repository lookup remains a separate, unauthenticated preview.
