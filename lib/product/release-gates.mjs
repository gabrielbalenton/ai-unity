/**
 * Public checklist validation. Source files provide planned requirements,
 * never trusted evidence of an actual external integration or release.
 */
const levels=new Set(["P0","P1","P2"]);
export function validateReleaseGates(config){
 if(!config||config.schemaVersion!==1||config.product!=="UNITY"||
  config.deploymentAuthorized!==false||!Array.isArray(config.gates)||
  config.gates.length<10||config.gates.length>60)throw Error("Invalid release gate registry");
 const seen=new Set();
 for(const gate of config.gates){
  if(!gate||typeof gate.id!=="string"||!/^[a-z][a-z0-9-]{2,80}$/.test(gate.id)||
   seen.has(gate.id)||!levels.has(gate.level)||gate.status!=="needs_evidence"||
   !Array.isArray(gate.evidence)||gate.evidence.length!==0||
   typeof gate.name!=="string"||gate.name.length<5||
   typeof gate.description!=="string"||gate.description.length<20||
   typeof gate.verification!=="string"||gate.verification.length<10)
   throw Error("Invalid or unverified source release gate");
  seen.add(gate.id);
 }
 const p0=config.gates.filter(g=>g.level==="P0");
 if(p0.length<10||!p0.some(g=>g.id==="owner-approval"))
  throw Error("Required critical release gates are missing");
 return {
  total:config.gates.length,p0:p0.length,p1:config.gates.filter(g=>g.level==="P1").length,
  p2:config.gates.filter(g=>g.level==="P2").length,
  evidenceVerified:0,releaseAuthorized:false,
  notice:"Public source is a checklist, not authenticated evidence. Live validation and owner approval remain mandatory."
 };
}
