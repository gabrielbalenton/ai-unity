# UNITY Vercel preview runbook

This runbook is for the **first hosted preview**, not production activation. The owner asked to finish and review the application in GitHub first, then connect Vercel and configure external services afterward.

## Preview objective

Deploy the exact reviewed GitHub commit so the owner can inspect responsive UI and existing offline/local functionality in a real browser. The first preview must work with **no secrets** and must not silently activate external execution.

Expected working areas without credentials:
- Approved Light / Dark / System interface and brand.
- Local projects, local conversations, task planning, draft/approved local notes and JSON backup/restore.
- Public model catalog discovery and public MCP registry discovery when those upstream public services are available.
- Universal integrations roadmap, Daily Briefing empty state and release-readiness console.
- Public repository metadata explorer, subject to unauthenticated GitHub rate limits.
- Health endpoint.

Expected deliberately disconnected areas:
- Supabase Auth / Cloud Workspace.
- Private GitHub App installation.
- Live model inference.
- Paid APIs.
- Agent/worker execution.
- GitHub webhook ingestion.
- Email/calendar/CRM/PM/meeting accounts.
- Native desktop file index and telephony.

## First Vercel project settings

- Framework: Next.js.
- Node.js: 22.x (also declared in package.json).
- Install: `npm install --no-audit --no-fund`.
- Build: `npm run build`.
- Root directory: repository root.
- Do not add a production domain yet.
- Keep deployment protection enabled if available for the personal preview.

No environment variables are required for the disconnected visual/local preview.

Optional explicit safe flags:
```
UNITY_ENABLE_EXTERNAL_EXECUTION=false
UNITY_ENABLE_GITHUB_WEBHOOK_INGESTION=false
```

Do **not** add provider API keys, GitHub App secrets or backend credentials until their individual activation checklist is being tested.

## Preview validation

1. Deploy a Vercel Preview from the exact release-candidate commit.
2. Confirm `/api/health` returns a non-secret healthy development response.
3. Verify System, Light and Dark at 1440px, 768px and 375px.
4. Test Home, Projects, Conversations, Knowledge, Settings and More navigation.
5. Create a disposable local project/note/task; reload and verify local persistence in the same browser.
6. Export and validate a JSON backup; never test with confidential client information.
7. Confirm Cloud Workspace says it is not connected.
8. Confirm model/tool discovery says discovery only and cannot execute.
9. Confirm Integrations says accounts require authorization.
10. Confirm Daily Briefing reports zero live feeds instead of fabricated updates.
11. Inspect browser console and Vercel runtime logs for errors.
12. Keep external execution disabled.

## Activation sequence after visual approval

Connect capabilities one domain at a time:
1. Dedicated UNITY Supabase test project + Auth/RLS.
2. Private GitHub App installation and scoped repository reads.
3. First verified zero-paid-cost AI provider, then second independent provider.
4. One business connector at a time (Google Workspace, PM, CRM, etc.) with sync receipts.
5. Durable workers and approval-gated external actions.
6. Optional desktop companion / telephony only after their platform-specific security reviews.

Do not treat the Vercel preview as evidence that any disconnected integration is working.

## Promotion rule

A preview may be promoted only after the owner has visually accepted it and the relevant activation gates have evidence. Production activation remains separate from the ability to host a safe disconnected preview.
