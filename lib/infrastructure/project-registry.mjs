import { resolveAccountConnection } from "./account-connections.mjs";

const NONEMPTY = value => typeof value === "string" && value.trim().length > 0;
const PROVIDERS = Object.freeze(["github", "vercel", "supabase"]);

function validateResource(provider, value) {
  if (value == null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`Invalid ${provider} project resource`);
  if (!NONEMPTY(value.connectorId) || !NONEMPTY(value.resourceId))
    throw new Error(`Missing ${provider} connector or resource`);
  return Object.freeze({connectorId: value.connectorId.trim(), resourceId: value.resourceId.trim()});
}

/**
 * Persistent project identity contains resource references only. Credentials,
 * access tokens and vault secret values are never valid project-registry fields.
 */
export function createProjectProfile({id, name, resources = {}, productionUrl = null}) {
  if (!NONEMPTY(id) || !NONEMPTY(name) || name.trim().length > 120)
    throw new Error("Invalid project profile identity");
  if (!resources || typeof resources !== "object" || Array.isArray(resources))
    throw new Error("Invalid project resources");

  const forbidden = ["token", "secret", "password", "apiKey", "privateKey", "credential"];
  const serialized = JSON.stringify(resources).toLowerCase();
  if (forbidden.some(key => serialized.includes(key.toLowerCase())))
    throw new Error("Credentials do not belong in the project registry");

  const normalized = {};
  for (const provider of PROVIDERS) {
    const resource = validateResource(provider, resources[provider]);
    if (resource) normalized[provider] = resource;
  }
  if (Object.keys(normalized).length === 0) throw new Error("Project must reference at least one external resource");

  let url = null;
  if (productionUrl != null) {
    if (!NONEMPTY(productionUrl)) throw new Error("Invalid production URL");
    const parsed = new URL(productionUrl);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.hash)
      throw new Error("Production URL must be a clean HTTPS URL");
    url = parsed.toString();
  }

  return Object.freeze({
    id: id.trim(),
    name: name.trim(),
    resources: Object.freeze(normalized),
    productionUrl: url
  });
}

export function createProjectRegistry(profiles = []) {
  if (!Array.isArray(profiles) || profiles.length > 500) throw new Error("Invalid project registry");
  const output = new Map();
  for (const profile of profiles) {
    const normalized = createProjectProfile(profile);
    if (output.has(normalized.id)) throw new Error("Duplicate project id");
    output.set(normalized.id, normalized);
  }
  return output;
}

/**
 * Verifies that every GitHub/Vercel/Supabase connector referenced by a project
 * resolves to the exact matching account-provider record. This prevents a
 * project from silently falling back to another account of the same service.
 */
export function validateProjectAccountBindings(profile, accountRegistry) {
  if (!profile || !NONEMPTY(profile.id) || !profile.resources || !Array.isArray(accountRegistry))
    throw new Error("Invalid project account binding request");

  const bindings = {};
  for (const [provider, item] of Object.entries(profile.resources)) {
    if (!PROVIDERS.includes(provider) || !item || !NONEMPTY(item.connectorId))
      throw new Error("Invalid project account mapping");
    const account = resolveAccountConnection(accountRegistry, {
      connectionId: item.connectorId,
      provider
    });
    bindings[provider] = Object.freeze({
      connectionId: account.id,
      accountLabel: account.accountLabel,
      resourceId: item.resourceId
    });
  }
  return Object.freeze({projectId: profile.id, bindings: Object.freeze(bindings)});
}

/**
 * Converts a project profile into the connector bundle consumed by UNITY's
 * project routing layer. The resource map stays separate so tools can target
 * only the exact repository/deployment/database approved for that project.
 */
export function routeProjectProfile(profile, mode = "audit") {
  if (!profile || !NONEMPTY(profile.id) || !profile.resources) throw new Error("Invalid project profile");
  const connections = {};
  const resources = {};
  for (const [provider, item] of Object.entries(profile.resources)) {
    if (!PROVIDERS.includes(provider) || !item || !NONEMPTY(item.connectorId) || !NONEMPTY(item.resourceId))
      throw new Error("Invalid project resource mapping");
    connections[provider] = item.connectorId;
    resources[provider] = item.resourceId;
  }
  return Object.freeze({
    projectId: profile.id,
    mode,
    connections: Object.freeze(connections),
    resources: Object.freeze(resources)
  });
}

export function getProjectProfile(registry, projectId) {
  if (!(registry instanceof Map) || !NONEMPTY(projectId)) throw new Error("Invalid project lookup");
  const profile = registry.get(projectId);
  if (!profile) throw new Error("Unknown project");
  return profile;
}
