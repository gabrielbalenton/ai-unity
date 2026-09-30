export type TriagePlan={
 projectId:string;componentId:string;
 action:"verify_monitoring"|"review_existing_incident"|"propose_incident";
 incidentId:string|null;evidenceRef:string|null;severityHint?:"high"|"medium";
 reason:string;requiresReview:true;
};
/** Pure planning; authenticate all source receipts before passing input. */
export function planHealthTriage(input:{
 assessment:{
  projectId:string;
  components:Array<{
   componentId:string;status:"healthy"|"degraded"|"down"|"unknown";
   reason:"missing_receipt"|"stale_receipt"|"current_receipt";
   evidenceRef?:string;
  }>;
 };
 existingIncidents?:Array<{
  id:string;projectId:string;componentId:string;
  state:"observed"|"triaged"|"reproduced"|"repair_proposed"|
   "verified_in_isolation"|"approval_pending"|"closed";
 }>;
 projectId:string;
}):{projectId:string;plans:TriagePlan[];notice:string};
