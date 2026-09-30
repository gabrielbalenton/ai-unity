# UNITY universal activity hub

UNITY must organize work by project and account, not by repository. Planned domains include project management, business documents, email, calendars, meetings, CRM, marketing, ecommerce, finance, development, communication and permission-scoped local files.

Each connection requires its own supported API, explicit authorization, project mapping, revocation, read and write capability review, source provenance and independent integration testing. Discovery does not create access. No external account is connected by this document.

The daily briefing must combine authorized cross-application events, deduplicate them, preserve original source links, clearly identify incomplete connector coverage, and distinguish observed events from AI-generated interpretations. Meeting or phone responses on behalf of a user must disclose automation, follow consent requirements and use explicit response boundaries.

A native desktop companion is required for local computer indexing. The web application alone cannot search arbitrary local files. Access starts with user-selected folders and read-only indexing; any changes, deletion or relocation must be previewed and approved.

See the full endgame architecture and release-readiness checklist for activation prerequisites.

## Honest daily-briefing coverage (offline contract)

A webhook notification or a single observed activity item means only that **one event** was seen. It does not prove that UNITY finished checking all changes from that account.

The offline aggregator now accepts separate, project-scoped completion receipts from trusted connector workers. A receipt identifies the connector, project, user's covered calendar day, success/failure, completion time and full-poll or verified-backfill method. Every expected project/source pair must have its own successful receipt after its full local day ends; future-dated, premature, failed or out-of-scope receipts cannot establish full coverage. The most recent receipt for a pair governs the result. A quiet but successfully verified source may correctly have zero activity.

**Security boundary:** receipt validation here is not authentication. A future live ingestion service must authenticate the worker, verify the connector's authorized account/resource scope, bind the receipt to the correct tenant/project and record signed or otherwise tamper-resistant audit evidence. Never take a browser-supplied receipt as proof. The current Daily Briefing screen truthfully displays zero authorized live sources.

Before the UI claims a complete daily report, require integration tests proving successful backfills, paging, cursor persistence, source timezones, missed-webhook reconciliation, revocation, retry and expired-authorization behavior. No live connector or scheduling is activated by this offline contract.
