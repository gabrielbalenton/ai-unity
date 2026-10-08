# GitHub App connection and activation plan

UNITY uses a GitHub App for project-scoped GitHub access. The integration is intentionally read-only until a later, separately approved write milestone.

## One-click connection contract

The Connect GitHub flow is designed around GitHub's documented **Request user authorization (OAuth) during installation** option. When the UNITY GitHub App is registered, that option must be enabled. The app installation URL may carry UNITY's short-lived `state` value; after installation GitHub starts the web application authorization flow and returns the user to the configured callback URL with an authorization `code`.

This is deliberately different from GitHub's optional setup URL. If Request user authorization during installation is enabled, GitHub uses the callback URL rather than a setup URL for this flow. UNITY must never trust a setup URL `installation_id` by itself.

The user access token is stored only in Infisical. UNITY uses it server-side to list the GitHub App installations associated with the signed-in user. The user then chooses an installation and exact repository. Before saving the binding, UNITY re-fetches the installations and repositories from GitHub so a repository ID typed or modified in the browser cannot authorize itself.

References:
- https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app
- https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/about-the-setup-url
- https://docs.github.com/en/apps/sharing-github-apps/sharing-your-github-app

## Existing server-side safeguards
- RS256 GitHub App JWT creation for later installation-token operations.
- Raw-body HMAC SHA-256 verification for GitHub webhooks.
- Inert installation event normalization; webhook events do not authorize projects.
- Installation token requests restricted to explicit repository IDs and minimal requested permissions.
- Read-only repository discovery with bounded provider responses.
- OAuth and provider tokens never return to the browser or AI model.
- Every connection is bound to an authenticated UNITY owner and exact UNITY project.
- Selected repositories start with `read` permission only.

## Activation prerequisites
1. Provision the dedicated UNITY backend and verify project isolation.
2. Register a UNITY-specific GitHub App with minimal read-only permissions.
3. Enable **Request user authorization (OAuth) during installation** and configure the exact UNITY callback URL.
4. Store the GitHub App client secret, private key and webhook secret only in approved server-side secret storage. The client secret used by the Connect flow belongs in Infisical, never source or browser storage.
5. Complete a real install/authorize test and confirm only installations belonging to the authorized GitHub user appear.
6. Confirm a chosen repository is revalidated against GitHub before the project binding is saved.
7. Confirm cross-project, revoked-installation, expired-token, 403 and 429 cases fail closed.
8. Keep write/merge/workflow permissions disabled until a separate write milestone is reviewed and approved.

## Webhook ingestion
The GitHub webhook route at `/api/webhooks/github` remains off unless explicitly configured and enabled. It verifies the SHA-256 signature over the raw request bytes, bounds payload size, handles only allowlisted installation events, and uses a server-only durable store for delivery deduplication. No webhook event creates a connector grant or authorizes an agent.

Production use still requires real-account testing, secret rotation, replay testing and explicit owner approval.
