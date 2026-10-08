const nonempty = value => typeof value === "string" && value.trim().length > 0;

export function createSecretRef({id, provider, projectId, environment = "development", version = 1}) {
  if (![id, provider, projectId, environment].every(nonempty)) throw new Error("Invalid secret reference");
  if (!Number.isInteger(version) || version < 1) throw new Error("Invalid secret version");
  return Object.freeze({id, provider, projectId, environment, version});
}

export function assertNoPlaintextSecrets(value, path = "root") {
  const forbidden = /(token|password|secret|private.?key|api.?key|access.?key)$/i;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoPlaintextSecrets(entry, `${path}[${index}]`));
    return true;
  }
  if (!value || typeof value !== "object") return true;
  for (const [key, child] of Object.entries(value)) {
    if (forbidden.test(key) && typeof child === "string" && child.trim()) {
      throw new Error(`Plaintext secret rejected at ${path}.${key}`);
    }
    assertNoPlaintextSecrets(child, `${path}.${key}`);
  }
  return true;
}

export function canResolveSecretRef(secretRef, {projectId, environment, allowedProviders = []}) {
  if (!secretRef || !nonempty(projectId) || !nonempty(environment) || !Array.isArray(allowedProviders)) return false;
  return secretRef.projectId === projectId &&
    secretRef.environment === environment &&
    allowedProviders.includes(secretRef.provider);
}
