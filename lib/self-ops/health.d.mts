export type HealthStatus="healthy"|"degraded"|"down";
export type HealthReceipt={
 projectId:string;componentId:string;collectorId:string;
 evidenceRef:string;status:HealthStatus;checkedAt:number;
};
export type ComponentHealth={
 componentId:string;
 status:HealthStatus|"unknown";
 reason:"missing_receipt"|"stale_receipt"|"current_receipt";
 checkedAt?:number;evidenceRef?:string;collectorId?:string;
};
export function validateHealthReceipt(record:HealthReceipt):Readonly<HealthReceipt>;
/** Input receipts MUST be authenticated and scoped by the live ingestion service. */
export function assessProjectHealth(input:{
 projectId:string;expectedComponents:string[];
 receipts:HealthReceipt[];now:number;maxAgeMs?:number;
}):{
 projectId:string;checkedAt:number;
 overall:"healthy"|"degraded"|"down"|"incomplete"|"unconfigured";
 counts:{healthy:number;degraded:number;down:number;unknown:number};
 components:ComponentHealth[];complete:boolean;
 proposedNextSteps:Array<{
  componentId:string;
  action:"no_action"|"inspect_component"|"investigate_incident"|"verify_monitoring";
  requiresReview:true;evidenceRef:string|null;
 }>;
 notice:string;
};
