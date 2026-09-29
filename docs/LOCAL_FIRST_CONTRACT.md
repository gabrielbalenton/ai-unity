# Local-first development agreement

UNITY remains in GitHub until the owner decides to provision and deploy external infrastructure.

## Delivery policy
- GitHub source changes through isolated branches and CI-verified pull requests.
- No automatic Vercel deployments, live Supabase schema writes, paid provider accounts or secret acquisition.
- All public connectors are discovery-only by default.
- Never commit keys, tokens, client data, private brain dumps or third-party confidential documents.
- Built components are not equivalent to enabled integrations: APIs require explicit credentials, correct permissions and end-to-end tests.
- No hidden tasks or assumed asynchronous continuation beyond actual configured GitHub workflows.

## Runtime boundaries

### Capability registry
Discovers inert descriptions of compatible models and tools. Never authorizes operations.

### Project memory
Only approved memories from an explicitly selected project enter agent context. A human note is not independently verified evidence. External source references must be associated with the same project.

### Execution policy
Fail-closed preflight requires an authorized project, connector, resource, approved write action and verified budget eligibility. All live integrations must independently verify identity, ownership, current permissions, provider billing and source integrity.

### Task state
A deterministic task contract tracks draft, queued, running, awaiting approval, failed, completed and cancelled states. Completion requires evidence references and approval checkpoints cannot be bypassed through state transitions. Future durable backend must enforce atomic revisions and authenticated actors.

## Milestones pending external services
- Authenticated backend and persistent, versioned central memory.
- Secure storage of third-party authorizations and actual account connections.
- Verified model inference, voice service and integration tests.
- Controlled deployment, user acceptance testing and a three-month real-use evaluation.
