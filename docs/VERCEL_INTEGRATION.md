# Vercel external integration connection

UNITY uses Vercel's documented external integration installation flow for one-click account/team authorization.

## Flow
1. UNITY creates a short-lived project-scoped `state` value.
2. The browser opens `https://vercel.com/integrations/<slug>/new` with that state.
3. Vercel performs the account/team installation and redirects to UNITY's registered Redirect URL with a one-time `code`, `configurationId`, optional `teamId`, `next`, and `state`.
4. UNITY verifies the signed-in owner, project and exact state before exchanging the code at `POST https://api.vercel.com/v2/oauth/access_token`.
5. The access token is written directly to Infisical. The normal database stores only a vault reference and safe Vercel scope metadata.
6. UNITY lists projects from `GET https://api.vercel.com/v9/projects` in the installed personal/team scope. Pagination is bounded to 500 projects.
7. The user chooses the exact Vercel project. UNITY re-fetches Vercel's project list server-side before saving `vercel:project:<id>` as a read-only binding.

The browser never receives the Vercel token. This milestone does not grant deploy, environment-variable, domain, or write access.

## Registration prerequisites
- Create a UNITY-specific Vercel Integration and choose the smallest required API scopes, starting with read access.
- Set URL slug and client ID in server environment configuration.
- Store the integration client secret only in Infisical at the approved server path.
- Register the exact UNITY callback: `/api/private/connect/vercel/callback` under the production UNITY origin.
- Keep the integration's project/deployment write permissions disabled until a separately reviewed production-action milestone.

Official references reviewed October 8, 2026:
- https://vercel.com/docs/integrations/create-integration/submit-integration
- https://vercel.com/docs/integrations/create-integration/vercel-api-integrations
- https://vercel.com/docs/rest-api
