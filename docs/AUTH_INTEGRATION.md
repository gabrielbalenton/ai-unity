# Optional authenticated backend (initial isolated test database created)

On October 2, 2026, the owner created a dedicated UNITY Supabase project in an organization separate from HAVOC. The tested initial `0001_core.sql` schema was applied as hosted migration `20261002072801_unity_core_owner_scoped_initial`. The four initially empty tables have RLS enabled, anonymous table reads are denied, and a first Supabase security advisory scan reported no lints. This does **not** verify real Supabase user login, cross-user access, backup/restore, browser routes, or readiness for personal data. The existing local workspace continues to function without environment variables.

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
1. **Completed:** provision an isolated UNITY test project, with the initial owner-scoped schema applied and metadata permissions inspected.
2. **Pending:** only after further review, apply any additional required proposals; never execute the runtime or memory approval SQL blindly. Independently re-run actual Supabase security and auth isolation tests before activation.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` through private environment settings. These values are browser-publishable; no server-only secret is needed for current read/draft operations.
4. Set `UNITY_APP_ORIGIN` to the exact HTTPS application origin. Local development may use `http://localhost:3000`.
5. Use Supabase dashboard to create the initial authorized user; account self-registration has not been enabled in the UI.
6. Confirm server session refresh, sign-out, two separate test-user sessions, memory draft creation, missing-session denial, cross-project ownership denial and origin rejection.
7. Keep browser-local notes **separate** until an explicit migration tool with approval semantics has been tested. Local approval flags may not be trusted as backend approvals.
8. Never turn on write-capable GitHub, agent or model execution merely because authentication succeeds.

## Current limitations
- The initial dedicated test database now exists, but the API routes are **not yet connected or live-tested**; runtime schema, transactional approval and private deployment are still pending.
- The browser-local workspace is **not yet synced** to the authenticated backend.
- Owner-only policies support the personal phase; team permission models need later schema and security review.
- Authentication and data API quotas, security headers, CSRF defense-in-depth and permission revocation need live review before launch.
- No payments, live AI calls or hosted tasks are activated by this module.
