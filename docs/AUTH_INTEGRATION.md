# Optional authenticated backend (code scaffold only)

UNITY remains GitHub-first. No Supabase project has been created or modified for this module. The existing local workspace continues to function without environment variables.

## Prepared
- Separate browser and cookie-backed server clients using a publishable key only.
- Next.js **16** `proxy.ts` for cookie refresh on selected auth/private routes; it is not an authorization substitute.
- Every private API independently verifies a user through `supabase.auth.getUser()`.
- Owner-scoped, no-store list/create routes for projects and memory **drafts**.
- Exact configured-origin check on JSON writes.
- Sign-in UI with explicit disabled state until a dedicated backend exists.
- No approval endpoint until transactionally enforced versioned audit is tested.
- No service-role/secret key in client code.

Current Supabase documentation: https://supabase.com/docs/guides/auth/server-side/creating-a-client and https://supabase.com/docs/guides/auth/server-side/nextjs . The repository targets Next.js 16, so the `proxy.ts` convention is required. Verify cookie refresh, no-store response handling and independent route authorization in a dedicated test environment before activating cloud Auth.

## To activate in a separate UNITY test project, after owner authorization
1. Provision a **dedicated** project, never a client or HAVOC database.
2. Review and apply only validated migrations. Do not execute the runtime schema proposal blindly: run local migration tests and Supabase security advisors first.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` through private environment settings. These values are browser-publishable; no server-only secret is needed for current read/draft operations.
4. Set `UNITY_APP_ORIGIN` to the exact HTTPS application origin. Local development may use `http://localhost:3000`.
5. Use Supabase dashboard to create the initial authorized user; account self-registration has not been enabled in the UI.
6. Confirm server session refresh, sign-out, two separate test-user sessions, memory draft creation, missing-session denial, cross-project ownership denial and origin rejection.
7. Keep browser-local notes **separate** until an explicit migration tool with approval semantics has been tested. Local approval flags may not be trusted as backend approvals.
8. Never turn on write-capable GitHub, agent or model execution merely because authentication succeeds.

## Current limitations
- The database is unprovisioned; the API routes compile but are not live-tested.
- The browser-local workspace is **not yet synced** to the authenticated backend.
- Owner-only policies support the personal phase; team permission models need later schema and security review.
- Authentication and data API quotas, security headers, CSRF defense-in-depth and permission revocation need live review before launch.
- No payments, live AI calls or hosted tasks are activated by this module.
