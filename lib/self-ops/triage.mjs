/**
 * Offline health-to-incident triage. Produces REVIEW-ONLY plans using verified
 * health-assessment output; it never writes incident records, runs tools, makes
 * network requests or deploys. A real service must authenticate collector
 * receipts, project identity and incident persistence before using a plan.
 */
const id=v=>typeof v==="string"&&/^[A-Za-z0-9_.:-]{1,100}$/.test(v);
const active=new Set([
 "observed","triaged","reproduced","repair_proposed",
 "verified_in_isolation","approval_pending"
]);
export function planHealthTriage({assessment,existingIncidents=[],projectId}){
 if(!assessment||assessment.projectId!==projectId||!id(projectId)||
    !Array.isArray(assessment.components)||assessment.components.length>1000||
    !Array.isArray(existingIncidents)||existingIncidents.length>1000)
  throw Error("Invalid triage scope");
 const known=new Map();
 for(const incident of existingIncidents){
  if(!incident||incident.projectId!==projectId)continue;
  if(!id(incident.id)||!id(incident.componentId)||
     !["observed","triaged","reproduced","repair_proposed",
       "verified_in_isolation","approval_pending","closed"].includes(incident.state))
   throw Error("Invalid scoped incident");
  if(active.has(incident.state)){
   const old=known.get(incident.componentId);
   if(old)throw Error("Duplicate active incident requires reconciliation");
   known.set(incident.componentId,incident.id);
  }
 }
 const seen=new Set(),plans=[];
 for(const component of assessment.components){
  if(!component||!id(component.componentId)||seen.has(component.componentId)||
     !["healthy","degraded","down","unknown"].includes(component.status))
   throw Error("Invalid component health state");
  seen.add(component.componentId);
  if(component.status==="healthy")continue;
  if(component.status==="unknown"){
   plans.push(Object.freeze({projectId,componentId:component.componentId,
    action:"verify_monitoring",incidentId:null,evidenceRef:null,
    reason:"Missing or stale monitoring is not proof of component failure",
    requiresReview:true}));
   continue;
  }
  // A failure plan needs a current, evidenced receipt. Do not manufacture
  // incidents from a screen label or AI-generated summary.
  if(component.reason!=="current_receipt"||!id(component.evidenceRef))
   throw Error("Current source evidence required before incident triage");
  const incidentId=known.get(component.componentId)??null;
  plans.push(Object.freeze({
   projectId,componentId:component.componentId,
   action:incidentId?"review_existing_incident":"propose_incident",
   incidentId,evidenceRef:component.evidenceRef,
   severityHint:component.status==="down"?"high":"medium",
   reason:incidentId?"A prior active incident exists; review before adding another":
    "Source-reported health problem requires reproduction before any repair",
   requiresReview:true
  }));
 }
 return Object.freeze({
  projectId,plans,
  notice:"Untrusted data must not trigger writes. Authenticate source receipts and approve incident creation independently. Similar symptoms do not authorize repeated repairs."
 });
}
