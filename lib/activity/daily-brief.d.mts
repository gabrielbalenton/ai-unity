export type Activity={
 id:string;connectorId:string;projectId:string;
 type:"task"|"document"|"message"|"calendar_event"|"meeting"|"campaign"|"crm"|"deployment"|"file"|"call"|"finance"|"manual_note";
 title:string;observedAt:string;actionRequired:boolean;sourceUrl:string|null;
};
export function normalizeActivity(record:Activity):Activity;
export function buildDailyBrief(input:{
 events:Activity[];authorizedConnectorIds:string[];projectIds:string[];
 now:number;timezone?:string;expectedConnectorIds?:string[];
}):{
 date:string;timezone:string;totalEvents:number;actionRequiredCount:number;
 byType:Record<string,number>;events:Activity[];
 connectorCoverage:{expectedCount:number;observedCount:number;unobservedConnectorIds:string[];notice:string};
 notice:string;
};
