const REQUIRED_PROVIDER_KEYS = Object.freeze(["github", "vercel", "supabase"]);
const VALID_MODE = new Set(["audit", "development", "production"]);
const VALID_PERMISSION = new Set(["read", "propose", "write", "deploy", "send"]);
const NONEMPTY = value => typeof value === "string" && value.trim().length > 0;
const MODE_RANK = Object.freeze({audit:0,development:1,production:2});
const EXACT_RESOURCE_PREFIX = Object.freeze({github:"github:repo:",vercel:"vercel:project:",supabase:"supabase:project:"});

/**
 * A project connection bundle maps one UNITY project to the connector identities
 * that belong to that project. It never contains credentials. Connector ids point
 * to separately authorized connector records / vault grants.
 */
export function createProjectConnectionBundle({projectId, connections = {}, mode = "audit"}) {
  if (!NONEMPTY(projectId)) throw new Error("Invalid project id");
  if (!VALID_MODE.has(mode)) throw new Error("Invalid project connection mode");
  if (!connections || typeof connections !== "object" || Array.isArray(connections))
    throw new Error("Connections must be an object");

  const normalized = {};
  for (const key of REQUIRED_PROVIDER_KEYS) {
    const value = connections[key];
    if (value == null) continue;
    if (!NONEMPTY(value)) throw new Error(`Invalid ${key} connector id`);
    normalized[key] = value.trim();
  }

  if (Object.keys(normalized).length === 0) throw new Error("Project bundle must include at least one connector");
  return Object.freeze({projectId: projectId.trim(), mode, connections: Object.freeze(normalized)});
}

/**
 * Resolve a bundle only from connector records that are scoped to the same project.
 * This does not authorize execution; it only prevents cross-project/account routing.
 */
export function resolveProjectConnections(bundle, connectorRecords = []) {
  if (!bundle || !NONEMPTY(bundle.projectId) || !VALID_MODE.has(bundle.mode))
    throw new Error("Invalid project connection bundle");
  if (!Array.isArray(connectorRecords)) throw new Error("Connector records must be an array");

  const resolved = {};
  for (const [provider, connectorId] of Object.entries(bundle.connections ?? {})) {
    const record = connectorRecords.find(item => item?.id === connectorId);
    if (!record) throw new Error(`Connector not found: ${provider}`);
    if (record.projectId !== bundle.projectId)
      throw new Error(`Cross-project connector blocked: ${provider}`);
    if (record.provider !== provider)
      throw new Error(`Provider mismatch for connector: ${provider}`);
    if (["revoked", "suspended"].includes(record.status))
      throw new Error(`Unavailable connector: ${provider}`);
    resolved[provider] = record;
  }

  return Object.freeze({projectId: bundle.projectId, mode: bundle.mode, connectors: Object.freeze(resolved)});
}

export function allowedActionsForMode(mode) {
  if (!VALID_MODE.has(mode)) throw new Error("Invalid project connection mode");
  if (mode === "audit") return Object.freeze(["discover", "read"]);
  if (mode === "development") return Object.freeze(["discover", "read", "propose", "write"]);
  return Object.freeze(["discover", "read", "propose", "write", "deploy", "send"]);
}

/**
 * Intersects the mode ceiling with each connector's actual granted actions.
 * Production mode still does not bypass UNITY policy approval requirements.
 */
export function effectiveConnectorActions(resolvedBundle) {
  if (!resolvedBundle || !VALID_MODE.has(resolvedBundle.mode)) throw new Error("Invalid resolved bundle");
  const ceiling = allowedActionsForMode(resolvedBundle.mode);
  const output = {};
  for (const [provider, record] of Object.entries(resolvedBundle.connectors ?? {})) {
    const granted = Array.isArray(record.allowedActions) ? record.allowedActions : [];
    output[provider] = Object.freeze(ceiling.filter(action => granted.includes(action)));
  }
  return Object.freeze(output);
}

export function permissionModeToControlMode(permissionMode){
  if(!VALID_PERMISSION.has(permissionMode))throw new Error("Invalid project permission mode");
  if(permissionMode==="read")return "audit";
  if(permissionMode==="propose"||permissionMode==="write")return "development";
  return "production";
}

/**
 * Produces safe account/resource routing metadata for one project. The project-wide
 * effective mode is deliberately the most restrictive mode among exact bindings.
 */
export function buildProjectControlPlane({projectId,projectName,connections=[]}){
  if(!NONEMPTY(projectId)||!NONEMPTY(projectName)||!Array.isArray(connections))throw new Error("Invalid project control plane input");
  const providers={};
  for(const provider of REQUIRED_PROVIDER_KEYS){
    const candidates=connections.filter(item=>item?.provider===provider);
    const exact=candidates.find(item=>NONEMPTY(item.resourceId)&&item.resourceId.startsWith(EXACT_RESOURCE_PREFIX[provider]));
    const selected=exact??candidates[0]??null;
    if(!selected){providers[provider]=Object.freeze({provider,state:"not_connected",accountLabel:null,status:null,resourceId:null,permissionMode:null,controlMode:"audit",routingReady:false});continue;}
    const available=selected.status==="ready";
    const permission=VALID_PERMISSION.has(selected.permissionMode)?selected.permissionMode:"read";
    const controlMode=permissionModeToControlMode(permission);
    const routingReady=Boolean(available&&exact);
    providers[provider]=Object.freeze({provider,state:!available?"unavailable":routingReady?"bound":"authorized",accountLabel:NONEMPTY(selected.accountLabel)?selected.accountLabel:null,status:NONEMPTY(selected.status)?selected.status:null,resourceId:NONEMPTY(selected.resourceId)?selected.resourceId:null,permissionMode:permission,controlMode,routingReady});
  }
  const bound=Object.values(providers).filter(item=>item.routingReady);
  const effectiveMode=bound.length===0?"audit":bound.map(item=>item.controlMode).reduce((lowest,current)=>MODE_RANK[current]<MODE_RANK[lowest]?current:lowest,"production");
  return Object.freeze({projectId:projectId.trim(),projectName:projectName.trim(),effectiveMode,productionRequiresApproval:true,providers:Object.freeze(providers)});
}
