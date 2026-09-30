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

## Server-only receipt authentication foundation

The offline `lib/activity/signed-receipt.mjs` contract adds HMAC-SHA-256 authentication to the previously defined per-project synchronization receipts. It signs a canonical, domain-separated record containing the connector, project, covered calendar day, sync result, completion timestamp, method, key ID, single-use nonce and signing timestamp. Verification checks the exact project/connector scope, signature in constant time, bounded freshness and caller-supplied nonce reservation.

**Non-negotiable activation distinction:** the verification function takes a synchronous nonce reservation callback for deterministic tests. A real multi-worker service must perform **atomic nonce reservation and receipt persistence inside a trusted transaction**. In-memory sets and unverified browser receipts are not replay protection. Connector signing keys remain server-only, independently managed, rotated/revoked and never supplied to models or browser bundles. This module does not connect services, operate a scheduler, store private customer data, or claim a live synchronization has taken place.

No event should enter a trusted complete Daily Briefing unless it is supported by independently authenticated and durably persisted source receipts. Failed/revoked sources must be surfaced as missing coverage rather than reported as zero activity.
