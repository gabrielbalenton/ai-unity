/**
 * UNITY's universal briefing normalization is pure and offline.
 * Data supplied to it must already have passed real connector authorization.
 * It does not read external accounts, perform inference, or initiate actions.
 */
const categories=new Set(["task","document","message","calendar_event","meeting","campaign","crm","deployment","file","call","finance","manual_note"]);
const id=v=>typeof v==="string"&&/^[A-Za-z0-9_.:-]{1,140}$/.test(v);
const safeText=(v,max)=>typeof v==="string"&&v.trim().length>0&&v.length<=max;
const formatterCache=new Map();
function localDay(timestamp,timezone){
 let formatter=formatterCache.get(timezone);
 if(!formatter){
  formatter=new Intl.DateTimeFormat("en-US",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"});
  formatterCache.set(timezone,formatter);
 }
 const parts=Object.fromEntries(formatter.formatToParts(new Date(timestamp)).map(x=>[x.type,x.value]));
 return parts.year+"-"+parts.month+"-"+parts.day;
}
function yesterdayInZone(now,timezone){
 // Subtract one calendar day from the zone's date rather than simply 24 hours:
 // the calendar date can cross daylight-saving boundaries.
 const current=localDay(now,timezone).split("-").map(Number);
 const previous=new Date(Date.UTC(current[0],current[1]-1,current[2]-1));
 return previous.toISOString().slice(0,10);
}
export function normalizeActivity(record){
 if(!record||typeof record!=="object"||!id(record.id)||
    !id(record.connectorId)||!id(record.projectId)||
    !categories.has(record.type)||!safeText(record.title,200)||
    !Number.isFinite(Date.parse(record.observedAt))||
    typeof record.actionRequired!=="boolean"||
    (record.sourceUrl!==null && record.sourceUrl!==undefined &&
      !(typeof record.sourceUrl==="string"&&/^https:\/\//.test(record.sourceUrl)&&
        record.sourceUrl.length<=800)))throw Error("Invalid source activity");
 // Strict allowlist: never persist raw mail, meeting audio, tokens, full documents,
 // customer records or untrusted provider payloads as the event summary.
 return Object.freeze({
  id:record.id,connectorId:record.connectorId,projectId:record.projectId,
  type:record.type,title:record.title.trim(),
  observedAt:new Date(record.observedAt).toISOString(),
  actionRequired:record.actionRequired,sourceUrl:record.sourceUrl??null
 });
}
/**
 * Sync receipts are produced by a trusted connector worker after it completes
 * reading a project's entire calendar day. An individual event (or a webhook)
 * is never evidence of full synchronization.
 * This pure function does not authenticate those receipts: live ingestion must
 * verify worker identity, connector ownership and source credentials first.
 */
export function validateSyncReceipt(value){
 if(!value||typeof value!=="object"||
    !id(value.connectorId)||!id(value.projectId)||
    typeof value.coveredLocalDate!=="string"||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.coveredLocalDate)||
    !["success","failed"].includes(value.status)||
    typeof value.completedAt!=="string"||
    !Number.isFinite(Date.parse(value.completedAt))||
    !["full_poll","verified_backfill"].includes(value.method))
   throw Error("Invalid synchronization receipt");
 return Object.freeze({
  connectorId:value.connectorId,projectId:value.projectId,
  coveredLocalDate:value.coveredLocalDate,status:value.status,
  completedAt:new Date(value.completedAt).toISOString(),method:value.method
 });
}
export function buildDailyBrief({events,authorizedConnectorIds,projectIds,now,timezone="Asia/Manila",
 expectedConnectorIds=[],expectedSources=[],syncReceipts=[]}){
 if(!Array.isArray(events)||events.length>10000||
    !Array.isArray(authorizedConnectorIds)||!authorizedConnectorIds.every(id)||
    !Array.isArray(projectIds)||!projectIds.every(id)||
    !Array.isArray(expectedConnectorIds)||!expectedConnectorIds.every(id)||
    !Array.isArray(expectedSources)||expectedSources.length>1000||
    !Array.isArray(syncReceipts)||syncReceipts.length>2000||
    !Number.isFinite(now)||typeof timezone!=="string")throw Error("Invalid briefing context");
 const day=yesterdayInZone(now,timezone);
 const authorized=new Set(authorizedConnectorIds),projects=new Set(projectIds);
 const seen=new Set(),accepted=[],observedConnectors=new Set();
 for(const raw of events){
  // Reject out-of-scope records before parsing their content; unrelated
  // connectors/projects cannot break this user's briefing with bad payloads.
  if(!raw||!projects.has(raw.projectId)||!authorized.has(raw.connectorId))continue;
  const e=normalizeActivity(raw);
  // A source ID is unique within one project and connector. Repeated
  // webhook deliveries therefore cannot count the same event twice.
  const key=e.projectId+"|"+e.connectorId+"|"+e.id;
  if(seen.has(key))continue;
  seen.add(key);
  if(localDay(e.observedAt,timezone)!==day)continue;
  observedConnectors.add(e.connectorId);
  accepted.push(e);
 }
 accepted.sort((a,b)=>Number(b.actionRequired)-Number(a.actionRequired)||
  b.observedAt.localeCompare(a.observedAt)||a.id.localeCompare(b.id));
 const categoriesSummary={};
 for(const e of accepted)categoriesSummary[e.type]=(categoriesSummary[e.type]||0)+1;
 // Coverage is scoped to specific project/connector pairs. A single
 // authorized connector used in two projects may succeed for one and fail
 // for the other. An event is not a synchronization receipt.
 const requested=expectedSources.length?expectedSources:
   expectedConnectorIds.flatMap(connectorId=>[...projects].map(projectId=>({connectorId,projectId})));
 const expected=new Map();
 for(const source of requested){
  if(!source||!id(source.projectId)||!id(source.connectorId))
   throw Error("Invalid expected source");
  if(!projects.has(source.projectId)||!authorized.has(source.connectorId))continue;
  expected.set(source.projectId+"|"+source.connectorId,
   {projectId:source.projectId,connectorId:source.connectorId});
 }
 const receipts=new Map();
 for(const raw of syncReceipts){
  // In a live installation, only server-verified receipts may enter here.
  // Filter other projects and accounts before validating content.
  if(!raw||!projects.has(raw.projectId)||!authorized.has(raw.connectorId))continue;
  const receipt=validateSyncReceipt(raw);
  if(receipt.coveredLocalDate!==day)continue;
  const key=receipt.projectId+"|"+receipt.connectorId;
  if(!expected.has(key))continue;
  const previous=receipts.get(key);
  if(!previous||previous.completedAt<receipt.completedAt)receipts.set(key,receipt);
 }
 const missingSources=[...expected].filter(([key])=>receipts.get(key)?.status!=="success")
   .map(([,source])=>source);
 const verifiedCount=expected.size-missingSources.length;
 const unobserved=[...new Set(missingSources.map(x=>x.connectorId))];
 const observed=[...new Set([...expected.values()].filter(x=>observedConnectors.has(x.connectorId)).map(x=>x.connectorId))];
 return Object.freeze({
  date:day,timezone,totalEvents:accepted.length,
  actionRequiredCount:accepted.filter(e=>e.actionRequired).length,
  byType:categoriesSummary,events:accepted,
  connectorCoverage:{
   expectedCount:expected.size,observedCount:observed.length,
   verifiedCount,missingSources,unobservedConnectorIds:unobserved,
   complete:expected.size>0&&verifiedCount===expected.size,
   notice:"Event presence never proves sync. Coverage is confirmed only by successful, separately authenticated full-day synchronization receipts for each expected project/source pair."
  },
  notice:"Source-reported activity only. No AI-generated conclusions or live application access."
 });
}
