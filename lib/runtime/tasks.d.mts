export type LocalTaskState="draft"|"queued"|"running"|"awaiting_approval"|"failed"|"completed"|"cancelled";
export type LocalTask={id:string;projectId:string;title:string;requiredCapability:string;state:LocalTaskState;revision:number;evidence:string[];history:Array<{from:LocalTaskState;to:LocalTaskState;actor:string;reason:string;evidence:string[];approvalId:string|null}>};
export function createTask(input:{id:string;projectId:string;title:string;requiredCapability:string}):LocalTask;
export function transitionTask(task:LocalTask,input:{state:LocalTaskState;actor:string;reason:string;evidence?:string[];expectedRevision:number;approvalId?:string|null}):LocalTask;
