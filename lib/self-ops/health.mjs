/**
 * UNITY offline operations health assessment.
 * This layer consumes only minimal, source-authenticated receipts supplied by
 * a future trusted collector. It performs NO monitoring, network access,
 * repair, deployment or credential operations. Never submit raw logs here.
 */
const id=value=>typeof value==="string"&&/^[A-Za-z0-9_.:-]{1,100}$/.test(value);
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const statuses=new Set(["healthy","degraded","down"]);
const decision=Object.freeze({
 healthy:"no_action",
 degraded:"inspect_component",
 down:"investigate_incident",
 unknown:"verify_monitoring"
});
export function validateHealthReceipt(receipt){
 if(!receipt||typeof receipt!=="object"||!id(receipt.projectId)||
    !id(receipt.componentId)||!id(receipt.collectorId)||!id(receipt.evidenceRef)||
    !statuses.has(receipt.status)||!integer(receipt.checkedAt))
   throw Error("Invalid health receipt");
 return Object.freeze({
  projectId:receipt.projectId,componentId:receipt.componentId,
  collectorId:receipt.collectorId,evidenceRef:receipt.evidenceRef,
  status:receipt.status,checkedAt:receipt.checkedAt
 });
}
/**
 * expectedComponents are explicit monitored component IDs.
 * A missing/stale reading means UNKNOWN, never healthy. Collisions or
 * contradictions at the same timestamp fail closed.
 *
 * Caller must authenticate receipt provenance and ensure allowed project and
 * collector scope BEFORE calling this pure function.
 */
export function assessProjectHealth({
 projectId,expectedComponents,receipts,now,maxAgeMs=300_000
}){
 if(!id(projectId)||!Array.isArray(expectedComponents)||
    expectedComponents.length>1000||!expectedComponents.every(id)||
    new Set(expectedComponents).size!==expectedComponents.length||
    !Array.isArray(receipts)||receipts.length>10_000||
    !integer(now)||!integer(maxAgeMs)||maxAgeMs<1000||maxAgeMs>86_400_000)
  throw Error("Invalid health assessment context");
 const expected=new Set(expectedComponents);
 const latest=new Map();
 for(const raw of receipts){
  // Foreign project/unknown component records never enter this scope.
  // Malformed records belonging to the scoped project are rejected rather
  // than silently disappearing as evidence of successful monitoring.
  if(!raw||raw.projectId!==projectId||!expected.has(raw.componentId))continue;
  const receipt=validateHealthReceipt(raw);
  if(receipt.checkedAt>now)continue;
  const prior=latest.get(receipt.componentId);
  if(prior&&prior.checkedAt===receipt.checkedAt&&
     (prior.status!==receipt.status||prior.evidenceRef!==receipt.evidenceRef||
       prior.collectorId!==receipt.collectorId))
   throw Error("Conflicting health receipts at identical timestamp");
  if(!prior||prior.checkedAt<receipt.checkedAt)
   latest.set(receipt.componentId,receipt);
 }
 const components=expectedComponents.map(componentId=>{
  const receipt=latest.get(componentId);
  const fresh=!!receipt&&now-receipt.checkedAt<=maxAgeMs;
  const status=fresh?receipt.status:"unknown";
  return Object.freeze({
   componentId,status,
   reason:!receipt?"missing_receipt":!fresh?"stale_receipt":"current_receipt",
   ...(fresh?{checkedAt:receipt.checkedAt,evidenceRef:receipt.evidenceRef,
     collectorId:receipt.collectorId}:{})
  });
 });
 const counts={healthy:0,degraded:0,down:0,unknown:0};
 for(const component of components)counts[component.status]++;
 const overall=counts.down>0?"down":counts.unknown>0?"incomplete":
  counts.degraded>0?"degraded":components.length?"healthy":"unconfigured";
 return Object.freeze({
  projectId,checkedAt:now,overall,
  counts:Object.freeze(counts),components,
  complete:components.length>0&&counts.unknown===0,
  proposedNextSteps:components.filter(c=>c.status!=="healthy").map(c=>Object.freeze({
   componentId:c.componentId,action:decision[c.status],
   requiresReview:true,
   evidenceRef:c.evidenceRef??null
  })),
  notice:"Only verified, timely source receipts support health claims. Next steps are suggestions; no repair or deployment is authorized."
 });
}
