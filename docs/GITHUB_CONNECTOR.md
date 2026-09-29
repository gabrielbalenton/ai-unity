# GitHub connector: authenticated read implementation

The current public repository explorer links only public metadata. The new server-side adapter establishes a separately testable read boundary for a future **GitHub App installation**.

## Capabilities
- Read metadata for an explicitly permitted owner/repository.
- Read one explicitly permitted repository file at an explicit branch/commit reference.
- Fixed GitHub API hostname and GET-only requests.
- Project-specific connector and repository scope enforced by offline preflight.
- Bounded file size and sanitized error messages.
- Token supplied by the caller; never persisted, printed, returned or used in a browser.

## Not currently activated
- GitHub App creation, OAuth/install callback, token minting and credential storage.
- Real, server-validated user sessions or installation ownership proof.
- True server-side enforcement and audit logging.
- Write access, branch creation or pull requests performed by UNITY.
- GitHub Enterprise custom hosts.

## Live connection acceptance criteria
1. Create a dedicated GitHub App and grant only necessary read permissions.
2. User authorizes specific installations and repository selections.
3. A trusted server verifies identity, project ownership and installation/repository scope on every request.
4. Mint short-lived tokens server-side and store source credentials in an approved vault.
5. Revalidate permission at dispatch, call this adapter with authenticated arguments and record the action.
6. Test token revocation, access removal, mismatched projects, rate limits and response-size limits using a disposable repository.

Never substitute the assistant's current connected GitHub permissions for permissions granted to the future UNITY application.
