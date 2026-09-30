# Connector activation contract (offline foundation)

UNITY is an extensible coordination hub, not an app impersonating every external provider. A catalog listing is **not** a connected account. The new deterministic lifecycle requires explicit steps:

1. **Discover:** identify a possible provider; there is no access.
2. **Prepare:** choose a project, approved resource IDs and allowed operations.
3. **Request authorization:** direct the actual account owner to a provider-supported consent flow.
4. **Record authorization:** store only an opaque server-side vault reference and a subset of approved resources/actions. Never include access tokens in the connector record or model context.
5. **Independent verification:** an identity distinct from the requesting actor records evidence that the provider integration works with the granted scope.
6. **Owner activation:** explicitly enable the previously verified connector.
7. **Suspend/revoke:** immediately block dispatch; revocation clears the local grant reference and is terminal for that record.

All transitions require the expected revision, owner and project scope and nondecreasing timestamps. Inert contracts are tested for least privilege, stale-state rejection, independent verification, emergency-stop checks and irreversibility of revocation.

**Activation security gap:** this module is a pure contract, not live authorization. A future authenticated backend must establish owner/actor identities from sessions, not user-supplied objects, implement transactional revision updates, prevent replay of approvals, protect server-side grant references and perform real provider verification. `canDispatchConnector` is a UI/orchestration-level preflight only: a live adapter must also call its trusted backend authorization and budget policy at execution time. Do not expose this standalone contract as an authenticated API.

**User experience:** a normal user should see approachable states such as Not connected, Choose what UNITY can access, Authorize, Checking connection, Ready, Paused and Disconnected. Raw state-machine labels, vault handles and verification internals stay in advanced/debug views.

**No live provider, tokens, account, secrets or money** are involved in this milestone.
