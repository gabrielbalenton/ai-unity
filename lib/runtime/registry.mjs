/**
 * Capability discovery is separate from connection authorization.
 * Never execute a manifest, endpoint URL or MCP tool returned by an external catalog.
 */
const kinds = new Set(["model-gateway","mcp","rest","graphql","webhook","repository","database"]);
const idPattern = /^[a-z0-9][a-z0-9._:-]{1,119}$/;
export function validateConnectorManifest(manifest) {
 if (!manifest || typeof manifest !== "object" || Array.isArray(manifest))
  throw new Error("Invalid connector manifest");
 const {id,kind,displayName,capabilities} = manifest;
 if (typeof id !== "string" || !idPattern.test(id) || !kinds.has(kind) ||
     typeof displayName !== "string" || displayName.trim().length < 2 || displayName.length > 100 ||
     !Array.isArray(capabilities) || capabilities.length > 100 ||
     !capabilities.every(c=>typeof c === "string" && /^[a-z][a-z0-9:_-]{1,59}$/.test(c)))
  throw new Error("Invalid connector fields");
 return Object.freeze({id,kind,displayName,capabilities:[...new Set(capabilities)],
  status:"discovered", authorized:false, executable:false});
}
export function summarizeRegistry(manifests) {
 if (!Array.isArray(manifests) || manifests.length > 5000)
  throw new Error("Invalid discovery inventory");
 const seen = new Set();
 return manifests.map(validateConnectorManifest).filter(m=>{
  if (seen.has(m.id)) return false;
  seen.add(m.id); return true;
 });
}
