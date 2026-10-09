const PROVIDER_ID = /^[a-z0-9][a-z0-9._-]{1,79}$/;
const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{1,159}$/;
const SECRET_REF = /^secret:[a-z0-9][a-z0-9._:/-]{2,199}$/;
const VALID_STATUS = new Set(["unconfigured", "ready", "rate_limited", "disabled", "exhausted"]);

const nonempty = value => typeof value === "string" && value.trim().length > 0;

/**
 * Stores provider configuration metadata only. No API key is stored here.
 * Free eligibility is never inferred from a provider/model name; it must come
 * from a separately verified entitlement/quota record at runtime.
 */
export function createProviderRecord({
  id,
  displayName,
  secretRef = null,
  status = "unconfigured",
  capabilities = ["chat"],
  priority = 100,
  zeroPaidOnly = true,
  models = []
}) {
  if (!PROVIDER_ID.test(id ?? "") || !nonempty(displayName)) throw new Error("Invalid provider identity");
  if (!VALID_STATUS.has(status)) throw new Error("Invalid provider status");
  if (secretRef !== null && !SECRET_REF.test(secretRef)) throw new Error("Invalid provider secret reference");
  if (!Array.isArray(capabilities) || capabilities.length === 0 || capabilities.length > 30 ||
      !capabilities.every(item => typeof item === "string" && /^[a-z][a-z0-9:_-]{1,59}$/.test(item))) {
    throw new Error("Invalid provider capabilities");
  }
  if (!Number.isInteger(priority) || priority < 0 || priority > 10000) throw new Error("Invalid provider priority");
  if (!Array.isArray(models) || models.length > 500) throw new Error("Invalid provider models");

  const normalizedModels = models.map(model => {
    if (!model || !MODEL_ID.test(model.id ?? "") || !Array.isArray(model.capabilities) ||
        model.capabilities.length === 0 || !model.capabilities.every(cap => typeof cap === "string")) {
      throw new Error("Invalid provider model");
    }
    return Object.freeze({
      id: model.id,
      capabilities: Object.freeze([...new Set(model.capabilities)]),
      freeEligibilityVerified: model.freeEligibilityVerified === true,
      estimatedPaidUsd: typeof model.estimatedPaidUsd === "number" && Number.isFinite(model.estimatedPaidUsd)
        ? model.estimatedPaidUsd
        : null
    });
  });

  return Object.freeze({
    id,
    displayName: displayName.trim(),
    secretRef,
    status,
    capabilities: Object.freeze([...new Set(capabilities)]),
    priority,
    zeroPaidOnly: zeroPaidOnly !== false,
    models: Object.freeze(normalizedModels)
  });
}

export function createProviderRegistry(records = []) {
  if (!Array.isArray(records) || records.length > 100) throw new Error("Invalid provider registry");
  const seen = new Set();
  const output = [];
  for (const input of records) {
    const record = createProviderRecord(input);
    if (seen.has(record.id)) throw new Error(`Duplicate provider: ${record.id}`);
    seen.add(record.id);
    output.push(record);
  }
  return Object.freeze(output);
}

/**
 * Produces an inert provider order for a requested capability. Providers that
 * are not configured, disabled, out of quota, or missing a secret reference
 * are excluded. This function does not contact providers and cannot execute.
 */
export function planProviderOrder({registry, capability = "chat"}) {
  if (!Array.isArray(registry) || !nonempty(capability)) throw new Error("Invalid provider plan request");
  const eligible = registry
    .filter(provider => provider && provider.status === "ready")
    .filter(provider => provider.capabilities.includes(capability))
    .filter(provider => nonempty(provider.secretRef))
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))
    .map(provider => Object.freeze({
      providerId: provider.id,
      displayName: provider.displayName,
      secretRef: provider.secretRef,
      zeroPaidOnly: provider.zeroPaidOnly
    }));

  return Object.freeze({
    capability,
    providers: Object.freeze(eligible),
    executionEnabled: false,
    notice: "Provider order only. Live quota, current free eligibility, model availability and server-side authorization must be verified before dispatch."
  });
}
