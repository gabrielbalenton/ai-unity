export type Activity={
 id:string;connectorId:string;projectId:string;
 type:"task"|"document"|"message"|"calendar_event"|"meeting"|"campaign"|"crm"|"deployment"|"file"|"call"|"finance"|"manual_note";
 title:string;observedAt:string;actionRequired:boolean;sourceUrl:string|null;
};
export type SyncSource={projectId:string;connectorId:string};
export type SyncReceipt=SyncSource&{
 coveredLocalDate:string;status:"success"|"failed";
 completedAt:string;method:"full_poll"|"verified_backfill";
};
export function normalizeActivity(record:Activity):Activity;
/** Validation only. Live ingestion must authenticate connector worker and project scope. */
export function validateSyncReceipt(record:SyncReceipt):Readonly<SyncReceipt>;
export function buildDailyBrief(input:{
 events:Activity[];authorizedConnectorIds:string[];projectIds:string[];
 now:number;timezone?:string;expectedConnectorIds?:string[];
 expectedSources?:SyncSource[];syncReceipts?:SyncReceipt[];
}):{
 date:string;timezone:string;totalEvents:number;actionRequiredCount:number;
 byType:Record<string,number>;events:Activity[];
 connectorCoverage:{
  expectedCount:number;observedCount:number;verifiedCount:number;
  missingSources:SyncSource[];unobservedConnectorIds:string[];
  complete:boolean;notice:string;
 };
 notice:string;
};
