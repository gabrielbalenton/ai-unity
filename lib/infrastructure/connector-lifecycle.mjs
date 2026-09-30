/**
 * Offline connector lifecycle. A catalog entry never implies permission.
 * Live activation must separately authenticate the owner, verify OAuth grants,
 * encrypt tokens in a server-side vault, and run provider-specific capability
 * tests. Nothing in this module performs network calls or executes tools.
 */
const states=Object.freeze(["discovered","prepared","pending_authorization","authorized","verified","active","suspended","revoked"]);
const ident=x=>typeof x==="string"&&/^[A-Za-z0-9_.:-]{1,100}$/.test(x);
const validTime=x=>typeof x==="string"&&!Number.isNaN(Date.parse(x));
const requireValue=(condition,message)=>{if(!condition)throw Error(message)};
const history=(record,event)=>[...record.history,Object.freeze(event)];
export const CONNECTOR_STATES=states;
export function createConnectorDraft({id,ownerId,projectId,provider,createdAt}){
 requireValue([id,ownerId,projectId,provider].every(ident)&&validTime(createdAt),"Invalid connector identity");
 return Object.freeze({id,ownerId,projectId,provider,status:"discovered",revision:0,
  resourceIds:[],allowedActions:[],grantReference:null,verification:null,
  createdAt,updatedAt:createdAt,history:[]});
}
function check(record,context){
 requireValue(record&&states.includes(record.status)&&Number.isSafeInteger(record.revision),"Invalid connector");
 requireValue(context&&context.revision===record.revision,"Stale connector revision");
 requireValue(record.ownerId===context.ownerId&&record.projectId===context.projectId,
  "Connector owner or project scope mismatch");
 requireValue(ident(context.actorId)&&validTime(context.at),"Invalid transition context");
 requireValue(Date.parse(context.at)>=Date.parse(record.updatedAt),"Out-of-order transition");
}
function change(record,context,status,kind,patch={}){
 return Object.freeze({...record,...patch,status,revision:record.revision+1,
  updatedAt:new Date(context.at).toISOString(),
  history:history(record,{kind,status,at:new Date(context.at).toISOString(),actorId:context.actorId})});
}
export function prepareConnector(record,context,{resourceIds,allowedActions}){
 check(record,context);
 requireValue(record.status==="discovered","Connector not discoverable");
 requireValue(Array.isArray(resourceIds)&&resourceIds.length>0&&resourceIds.length<=100&&
  resourceIds.every(ident)&&new Set(resourceIds).size===resourceIds.length,"Invalid resource selection");
 const actions=["discover","read","propose","write","deploy","send"];
 requireValue(Array.isArray(allowedActions)&&allowedActions.length>0&&
  allowedActions.every(x=>actions.includes(x))&&new Set(allowedActions).size===allowedActions.length,
  "Invalid action selection");
 return change(record,context,"prepared","prepared",
  {resourceIds:[...resourceIds],allowedActions:[...allowedActions]});
}
export function requestAuthorization(record,context){
 check(record,context);
 requireValue(record.status==="prepared","Connector must be prepared");
 return change(record,context,"pending_authorization","authorization_requested");
}
export function recordAuthorization(record,context,{grantReference,approvedResourceIds,approvedActions}){
 check(record,context);
 requireValue(record.status==="pending_authorization","Authorization not requested");
 requireValue(ident(grantReference)&&!/(token|secret|password|bearer)/i.test(grantReference),
  "Use a vault reference, never credentials");
 requireValue(Array.isArray(approvedResourceIds)&&approvedResourceIds.length>0&&
  approvedResourceIds.every(id=>record.resourceIds.includes(id)),"Grant exceeds requested resources");
 requireValue(Array.isArray(approvedActions)&&approvedActions.length>0&&
  approvedActions.every(a=>record.allowedActions.includes(a)),"Grant exceeds requested capabilities");
 requireValue(new Set(approvedResourceIds).size===approvedResourceIds.length&&
  new Set(approvedActions).size===approvedActions.length,"Duplicated grant scope");
 return change(record,context,"authorized","authorization_recorded",{
  grantReference,resourceIds:[...approvedResourceIds],allowedActions:[...approvedActions],
  verification:null
 });
}
export function recordVerification(record,context,{verifierId,evidenceReference,passed}){
 check(record,context);
 requireValue(record.status==="authorized","Connector is not authorized");
 requireValue(ident(verifierId)&&verifierId!==context.actorId&&ident(evidenceReference)&&
  typeof passed==="boolean","Independent verification required");
 if(!passed)return change(record,context,"suspended","verification_failed",{verification:null});
 return change(record,context,"verified","independently_verified",{
  verification:Object.freeze({verifierId,evidenceReference,at:new Date(context.at).toISOString()})
 });
}
export function activateConnector(record,context,{ownerApproved}){
 check(record,context);
 requireValue(record.status==="verified"&&record.verification&&ownerApproved===true,
  "Only verified, owner-approved connectors may activate");
 return change(record,context,"active","activated");
}
export function suspendConnector(record,context){
 check(record,context);
 requireValue(["authorized","verified","active"].includes(record.status),"Connector cannot suspend");
 return change(record,context,"suspended","suspended",{verification:null});
}
export function revokeConnector(record,context){
 check(record,context);
 requireValue(record.status!=="revoked","Already revoked");
 return change(record,context,"revoked","revoked",{
  grantReference:null,allowedActions:[],resourceIds:[],verification:null
 });
}
export function canDispatchConnector(record,{ownerId,projectId,resourceId,action,emergencyStop=false}){
 return record?.status==="active"&&record.ownerId===ownerId&&record.projectId===projectId&&
  emergencyStop!==true&&record.resourceIds.includes(resourceId)&&
  record.allowedActions.includes(action)&&record.verification!==null;
}
