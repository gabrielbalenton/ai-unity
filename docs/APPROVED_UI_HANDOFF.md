# Approved UNITY UI/UX handoff (September 30, 2026)

The owner has supplied the design package `UNITY_UI_UX_Handoff_v1(1).zip` as the approved visual direction. The original ZIP is a conversation attachment and must not be committed wholesale to this public repository, because it includes large preview/reference imagery and superseded sample implementations.

## Primary visual contract

- Original quiet-convergence symbol and UNITY wordmark from the handoff. Do not recreate a ChatGPT-like knot, AI orb or centered chatbot clone.
- Distinctly premium but approachable, warm minimalism, generous spacing, soft typography and a restrained technology feel.
- Semantic **Light, Dark and System** appearances, with System default, OS theme following and accessible contrast.
- Calm default navigation: Home, Projects, Conversations, Knowledge and Settings. Hide highly technical views beneath contextual More/Advanced access while keeping working features available.
- Do not show false task progress, active AI inference, fabricated synchronization, invented cost metrics, or connections that have not been authorized.
- Existing data, project isolation, approval safeguards and working local/cloud distinction must survive the UI redesign.

## Source package mapping

The owner's package includes:
- `design/tokens.json` and `implementation/unity-theme.css`
- `assets/brand/` original brand SVGs and `assets/hero/` terrain graphics
- `docs/PRODUCT_UI_SPEC.md`, `docs/CURRENT_REPO_INTEGRATION.md`, `docs/INFORMATION_ARCHITECTURE.md` and accessibility/interaction specifications
- `checklists/IMPLEMENTATION.md` and `checklists/ACCEPTANCE.md`
- `preview/index.html` and conceptual visual references.

The repository's `public/unity-brand/` files are sourced from that owner-approved package. Before replacing current application styles, migrate semantic tokens throughout existing components and check all appearances, breakpoints and controls.

## Delivery safeguards

Work on one isolated branch, preserve the full fourteen-system architecture and integration roadmap, and run one milestone-based verification before merging. Keep Vercel disconnected; no new external service, credentials or paid requests are authorized by visual design acceptance. Actual browser screenshots and regression tests are necessary before declaring the redesign visually verified.
