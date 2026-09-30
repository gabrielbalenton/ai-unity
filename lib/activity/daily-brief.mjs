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
export function buildDailyBrief({events,authorizedConnectorIds,projectIds,now,timezone="Asia/Manila",
 expectedConnectorIds=[]}){
 if(!Array.isArray(events)||events.length>10000||
    !Array.isArray(authorizedConnectorIds)||!authorizedConnectorIds.every(id)||
    !Array.isArray(projectIds)||!projectIds.every(id)||
    !Array.isArray(expectedConnectorIds)||!expectedConnectorIds.every(id)||
    !Number.isFinite(now)||typeof timezone!=="string")throw Error("Invalid briefing context");
 const day=yesterdayInZone(now,timezone);
 const authorized=new Set(authorizedConnectorIds),projects=new Set(projectIds);
 const seen=new Set(),accepted=[],observedConnectors=new Set();
 for(const raw of events){
  const e=normalizeActivity(raw);
  if(!projects.has(e.projectId)||!authorized.has(e.connectorId))continue;
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
 const expected=[...new Set(expectedConnectorIds)].filter(x=>authorized.has(x));
 const unobserved=expected.filter(x=>!observedConnectors.has(x));
 return Object.freeze({
  date:day,timezone,totalEvents:accepted.length,
  actionRequiredCount:accepted.filter(e=>e.actionRequired).length,
  byType:categoriesSummary,events:accepted,
  connectorCoverage:{
   expectedCount:expected.length,observedCount:expected.length-unobserved.length,
   unobservedConnectorIds:unobserved,
   notice:"No matching events is not proof of a successful connector sync. Compare actual sync receipts before claiming full coverage."
  },
  notice:"Source-reported activity only. No AI-generated conclusions or live application access."
 });
}
