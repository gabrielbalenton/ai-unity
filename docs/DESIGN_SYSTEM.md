# UNITY design system — Quiet Convergence v1

The September 30, 2026 owner handoff is the visual authority for the personal alpha. The experience should feel composed, warm, precise and quietly capable: premium workspace software, not a chatbot clone or science-fiction control room.

## Brand

- Original three-facet UNITY convergence symbol and wordmark live in `public/unity-brand/`.
- Light and dark variants are supplied explicitly. Do not recreate a third-party AI knot, glowing brain or generic orb.
- Terrain artwork is a subtle editorial background for Home, not an operational visualization.
- The public repository does not include bundled font files.

## Appearance

System is the default. Light and Dark are explicit per-browser overrides.

| Semantic token | Light | Dark |
|---|---|---|
| Canvas | #F7F6F2 | #141C24 |
| Navigation | #F0F2F1 | #18232C |
| Surface | #FFFFFF | #202B35 |
| Raised surface | #FBFCFB | #283743 |
| Text | #273742 | #EEF2F0 |
| Muted | #566771 | #AFBFC5 |
| Border | #DAE1E1 | #394B55 |
| Accent | #467A82 | #A8CFD1 |
| Accent tint | #E5EFF0 | #314850 |
| Focus | #386E80 | #BDDFE4 |
| Warm accent | #E6C6B1 | #E2BEA9 |

Typography uses Manrope / DM Sans when already available locally, then Apple/system fallbacks. No external font request is required.

## Navigation

Primary destinations:
1. Home
2. Projects
3. Conversations
4. Knowledge
5. Settings

Advanced destinations are progressively disclosed under **More** and remain searchable with ⌘/Ctrl+K:
- Daily Briefing
- Tasks
- Cloud Workspace
- AI Models
- Tool Registry
- Integrations
- Release Readiness

Mobile uses four primary destinations plus More. No hover-only action may be required.

## Home contract

Home answers: Where am I? What can I do? What needs my attention?

- Editorial welcome and subtle terrain image.
- Intent field routes to existing workspaces only; it does not simulate AI replies.
- Up to four actual local projects.
- Actual pending local tasks only.
- Clear connection ownership note.
- One quiet local-alpha status line.
- No fourteen-system architecture wall, fake uptime, invented costs, fake teammates or connected-provider claims.

## Working surfaces

Existing Projects, Conversations, Knowledge, Tasks, discovery pages, Integrations, Cloud and Readiness behavior must survive the design migration. Advanced technical detail may be visually calmer but cannot be silently removed.

## Interaction

- Controls and touch targets are at least 44 CSS px where practical.
- Visible 3px semantic focus ring.
- Escape closes mobile/command overlays.
- ⌘/Ctrl+K opens navigation.
- Motion remains 130–220ms and respects `prefers-reduced-motion`.
- System theme follows OS changes live; manual Light/Dark persists locally.
- Significant future writes/sends/deployments require explicit review, target and consequence before approval.

## Truth and status

Use precise status language:
- Local
- Discovery only
- Requires connection
- Waiting for authorization
- Planned
- Unavailable

A green build does not mean an external service is connected. Empty state is preferred to fake operational data.

## Browser acceptance

Before the first Vercel preview is accepted:
- 1440px desktop, 768px tablet and 375px mobile.
- Light, Dark and System.
- Keyboard-only navigation and Escape behavior.
- Browser zoom up to 200% without inaccessible controls.
- Project creation, local persistence, Knowledge, backup/restore and More destinations.
- No console errors or hydration errors.
- Screenshots captured from the exact reviewed commit.

See `docs/APPROVED_UI_HANDOFF.md` and `docs/VERCEL_PREVIEW_RUNBOOK.md`.
