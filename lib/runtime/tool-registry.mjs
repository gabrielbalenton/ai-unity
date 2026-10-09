const NONEMPTY = value => typeof value === "string" && value.trim().length > 0;
const VALID_ACTIONS = new Set(["discover", "read", "propose", "write", "deploy", "send"]);
const PROTECTED_ACTIONS = new Set(["write", "deploy", "send"]);

/**
 * UNITY-owned tool registry inspired by MCP/tool frameworks.
 * Tool definitions are inert metadata. They cannot execute themselves.
 */
export function registerToolDefinition({id, provider, name, action, capability, description = ""}) {
  if (![id, provider, name, capability].every(NONEMPTY)) throw new Error("Invalid tool definition");
  if (!VALID_ACTIONS.has(action)) throw new Error("Invalid tool action");
  if (typeof description !== "string" || description.length > 500) throw new Error("Invalid tool description");
  return Object.freeze({
    id: id.trim(),
    provider: provider.trim(),
    name: name.trim(),
    action,
    capability: capability.trim(),
    description: description.trim(),
    protected: PROTECTED_ACTIONS.has(action),
    executable: false
  });
}

export function createToolInventory(definitions = []) {
  if (!Array.isArray(definitions) || definitions.length > 1000) throw new Error("Invalid tool inventory");
  const seen = new Set();
  return Object.freeze(definitions.map(registerToolDefinition).filter(tool => {
    if (seen.has(tool.id)) return false;
    seen.add(tool.id);
    return true;
  }));
}

/**
 * Produces an inert plan only after project connection routing is resolved.
 * Final live execution still requires connector lifecycle checks and UNITY policy.
 */
export function planToolUse({projectId, toolId, resourceId, inventory, resolvedBundle, effectiveActions}) {
  if (![projectId, toolId, resourceId].every(NONEMPTY)) throw new Error("Invalid tool planning request");
  if (!Array.isArray(inventory)) throw new Error("Invalid tool inventory");
  if (!resolvedBundle || resolvedBundle.projectId !== projectId) throw new Error("Project scope mismatch");

  const tool = inventory.find(item => item.id === toolId);
  if (!tool) throw new Error("Unknown tool");
  const connector = resolvedBundle.connectors?.[tool.provider];
  if (!connector) throw new Error("Provider is not connected for this project");
  if (connector.projectId !== projectId) throw new Error("Cross-project connector blocked");
  if (!Array.isArray(connector.resourceIds) || !connector.resourceIds.includes(resourceId))
    throw new Error("Resource is outside connector scope");

  const allowed = effectiveActions?.[tool.provider];
  if (!Array.isArray(allowed) || !allowed.includes(tool.action))
    throw new Error("Tool action exceeds project mode or connector grant");

  return Object.freeze({
    projectId,
    connectorId: connector.id,
    provider: tool.provider,
    toolId: tool.id,
    resourceId,
    action: tool.action,
    capability: tool.capability,
    approvalRequired: tool.protected,
    executionEnabled: false,
    notice: tool.protected
      ? "Inert plan only. Exact human approval and live adapter authorization are required before execution."
      : "Inert plan only. Live adapter authorization is still required before execution."
  });
}
