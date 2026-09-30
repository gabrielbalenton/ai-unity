# UNITY interface design system — Command Center v1

## Positioning
Professional AI operating system. This interface must look and behave like actual workspace software rather than a science-fiction prop. The deliberately restrained visual identity supports the owner's request for a distinctive, premium interface without theatrical module names.

## Foundation
- **Background:** ink-black / graphite, not solid pitch-black everywhere. Surface depth comes from subtle borders and tonal steps.
- **Primary accent:** jade and sea-glass green. Green is reserved for active controls, verified local features and restrained spatial accents.
- **Warning:** muted amber for unverified discovery and developer warnings.
- **Typography:** Manrope for structure/headlines, DM Sans for long-form UI. Network fonts have robust system fallbacks.
- **Motion:** subtle hover transitions. Honor reduced-motion browser preferences.
- **Graphics:** CSS-built concentric knowledge/network mark. No stock dashboard screenshots; no heavy image asset downloads.
- **Density:** roomy mission-control landing page, denser functional workspaces for actual data.

## Navigation
- Desktop: persistent grouped sidebar with Command / Workspace / Network sections, environment policy and account footer.
- Mobile: explicit accessible navigation toggle and dismissible scrim.
- Keyboard: Command/Ctrl+K opens actual workspace navigation. Escape closes the command overlay and mobile navigation.
- Dashboard tiles open corresponding **implemented** destinations rather than inert decorative controls.
- Existing Projects, Chat, Memory, Tasks, Models, Tools, Integrations and optional Cloud screens remain available.

## Dashboard contract
- Local project, approved note and linked public repository totals must derive from validated browser workspace data.
- External execution is shown as locked, not as a successful connection.
- Public model discovery and MCP directory listings are labeled as discovery, never authenticated integrations.
- Cloud backend explicitly remains unverified until a dedicated backend exists.
- Quick actions use actual existing UI functions: navigation and JSON backup export.
- Avoid synthetic running task percentages, mocked uptime and false API cost telemetry.
- The illustrated architecture is clearly marked as a design preview.

## Before a release
1. Test at 1440px desktop, 1024px small desktop/tablet and 375px mobile.
2. Verify keyboard navigation, visible focus, reduced motion, and screen-reader labels.
3. Run empty and populated local workspace states; verify responsive line wrapping and long text overflow.
4. Confirm workspace data, backup/restore behavior, optional cloud operations, discovery and project isolation remain unchanged.
5. Perform an actual browser visual inspection after the GitHub-only build is green. CI compilation alone does not prove visual polish.

## Intended future UI
- Unified streaming conversation surface with per-message provider/evidence chips and human approval events.
- Live agent-workflow topology with verified task stages.
- Real integrations marketplace with authorization previews.
- Knowledge browser with source citations and conflict review.
- Cost/usage dashboards populated only by authoritative provider receipts.
- Multimodal studio and full voice interaction after adapters actually exist.
