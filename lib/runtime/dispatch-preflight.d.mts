import type {ExecutionJob} from "./worker-queue.mjs";
export type DispatchRequest={
 projectId:string;connectorId:string;resourceId:string;action:"discover"|"read"|"propose"|"write"|"deploy"|"send";
 type?:string;approvalId?:string;estimatedPaidUsd?:number;freeEligibilityVerified?:boolean;
};
export type DispatchPolicy={
 projectId:string;emergencyStop:boolean;maxPaidUsd:number;spentPaidUsd:number;
 approvedOperations:Array<{id:string;projectId:string;connectorId:string;resourceId:string;action:string;status:string}>;
};
export type AuthorizedConnection={
 id:string;projectId:string;status:string;actions:string[];resources:string[];
};
export function planLeasedDispatch(input:{
 job:ExecutionJob;projectId:string;workerId:string;revision:number;now:number;
 request:DispatchRequest;policy:DispatchPolicy;connections:AuthorizedConnection[];
 emergencyStop?:boolean;
}):{allowed:boolean;reason:string;executionEnabled:false;
 jobId?:string;revision?:number;projectId?:string;
 request?:{connectorId:string;resourceId:string;action:string}};
