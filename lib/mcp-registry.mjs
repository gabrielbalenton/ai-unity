/** Untrusted public discovery metadata. No server activation or automatic tool execution. */
export function normalizeRegistryPage(data) {
 if (!data || typeof data !== "object" || !Array.isArray(data.servers))
  throw new Error("Invalid registry response");
 const servers=data.servers.map(entry=>{
  const record=entry?.server || entry;
  if (!record || typeof record.name!=="string" || !record.name.trim())return null;
  const name=record.name.slice(0,180);
  const description=typeof record.description==="string"?record.description.slice(0,600):"";
  const version=typeof record.version==="string"?record.version.slice(0,80):"Unknown";
  const status=typeof entry?._meta?.["io.modelcontextprotocol.registry/official"]?.status==="string"
   ? entry._meta["io.modelcontextprotocol.registry/official"].status : "unverified";
  if (status==="deleted") return null;
  return {name,description,version,status,connectable:false};
 }).filter(Boolean);
 const nextCursor=typeof data.metadata?.nextCursor==="string" ? data.metadata.nextCursor.slice(0,500) : null;
 return {servers,nextCursor};
}
