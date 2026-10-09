const ID = /^[a-z0-9][a-z0-9._:-]{2,119}$/;
const PROVIDER = /^[a-z0-9][a-z0-9._-]{1,79}$/;
const SECRET_REF = /^secret:[a-z0-9][a-z0-9._:/-]{2,199}$/;
const VALID_STATUS = new Set(["unconfigured", "ready", "suspended", "revoked"]);
const VALID_AUTH = new Set(["api_key_ref", "oauth_ref", "github_app_ref", "pat_ref", "none"]);
const VALID_SIGN_IN = new Set(["google", "github", "email", "other", "unknown"]);
const nonempty = value => typeof value === "string" && value.trim().length > 0;

/**
 * Human-recognizable account metadata only. This answers questions such as
 * "which Vercel account is this?" without storing passwords, OAuth tokens or
 * provider credentials. signInMethod is descriptive metadata, not authorization.
 */
export function createAccountConnection({
  id,
  provider,
  accountLabel,
  signInMethod = "unknown",
  authMethod = "none",
  secretRef = null,
  status = "unconfigured",
  externalAccountId = null,
  notes = null
}) {
  if (!ID.test(id ?? "") || !PROVIDER.test(provider ?? "") || !nonempty(accountLabel)) {
    throw new Error("Invalid account connection identity");
  }
  if (!VALID_SIGN_IN.has(signInMethod)) throw new Error("Invalid sign-in method");
  if (!VALID_AUTH.has(authMethod)) throw new Error("Invalid authorization method");
  if (!VALID_STATUS.has(status)) throw new Error("Invalid account connection status");
  if (secretRef !== null && !SECRET_REF.test(secretRef)) throw new Error("Invalid secret reference");
  if (authMethod !== "none" && secretRef === null) throw new Error("Authorized account requires a secret reference");
  if (authMethod === "none" && secretRef !== null) throw new Error("Unconfigured account cannot carry a secret reference");
  if (externalAccountId !== null && (!nonempty(externalAccountId) || externalAccountId.length > 160)) {
    throw new Error("Invalid external account id");
  }
  if (notes !== null && (typeof notes !== "string" || notes.length > 300)) throw new Error("Invalid account notes");

  return Object.freeze({
    id,
    provider,
    accountLabel: accountLabel.trim(),
    signInMethod,
    authMethod,
    secretRef,
    status,
    externalAccountId: externalAccountId?.trim() ?? null,
    notes: notes?.trim() || null
  });
}

export function createAccountConnectionRegistry(records = []) {
  if (!Array.isArray(records) || records.length > 500) throw new Error("Invalid account connection registry");
  const ids = new Set();
  const output = [];
  for (const input of records) {
    const record = createAccountConnection(input);
    if (ids.has(record.id)) throw new Error(`Duplicate account connection: ${record.id}`);
    ids.add(record.id);
    output.push(record);
  }
  return Object.freeze(output);
}

/**
 * Resolves one exact account identity. It never silently substitutes another
 * account from the same provider, which prevents FPX/Pebble/etc. from being
 * routed through the wrong Vercel, GitHub or Supabase account.
 */
export function resolveAccountConnection(registry, {connectionId, provider}) {
  if (!Array.isArray(registry) || !ID.test(connectionId ?? "") || !PROVIDER.test(provider ?? "")) {
    throw new Error("Invalid account resolution request");
  }
  const record = registry.find(item => item?.id === connectionId);
  if (!record) throw new Error("Account connection not found");
  if (record.provider !== provider) throw new Error("Account provider mismatch");
  if (["revoked", "suspended"].includes(record.status)) throw new Error("Account connection unavailable");
  return record;
}

/**
 * Safe display data for an account-picker UI. Secret references and external
 * account identifiers are deliberately omitted from client-facing summaries.
 */
export function summarizeAccountConnections(registry = []) {
  if (!Array.isArray(registry)) throw new Error("Invalid account connection registry");
  return Object.freeze(registry.map(record => Object.freeze({
    id: record.id,
    provider: record.provider,
    accountLabel: record.accountLabel,
    signInMethod: record.signInMethod,
    status: record.status,
    configured: record.authMethod !== "none" && record.status === "ready"
  })));
}
