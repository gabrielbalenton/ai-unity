export type JobState="queued"|"leased"|"awaiting_verification"|"verified"|"retry_wait"|"dead"|"cancelled";
export type JobEvent={kind:string;at:number;workerId?:string;verifierId?:string;actorId?:string;attempt?:number;claimCount?:number};
export type ExecutionJob={
 id:string;projectId:string;taskId:string;capability:string;idempotencyKey:string;
 createdAt:number;state:JobState;revision:number;attempts:number;maxAttempts:number;
 workerId:string|null;leaseUntil:number|null;runAfter:number;evidenceRefs:string[];
 verificationResult:null|{passed:boolean;verifierId:string;evidenceRefs:string[];verifiedAt:number};
 history:JobEvent[];
};
export const JOB_STATES:ReadonlyArray<JobState>;
export function createQueuedJob(input:{id:string;projectId:string;taskId:string;capability:string;idempotencyKey:string;createdAt:number;maxAttempts?:number}):ExecutionJob;
export function enqueueUnique(existing:ExecutionJob[],input:Parameters<typeof createQueuedJob>[0]):{job:ExecutionJob;created:boolean};
export function claimJob(job:ExecutionJob,input:{projectId:string;workerId:string;revision:number;now:number;leaseMs?:number;emergencyStop?:boolean}):ExecutionJob;
export function heartbeatJob(job:ExecutionJob,input:{projectId:string;workerId:string;revision:number;now:number;leaseMs?:number;emergencyStop?:boolean}):ExecutionJob;
export function submitJobEvidence(job:ExecutionJob,input:{projectId:string;workerId:string;revision:number;now:number;evidenceRefs:string[]}):ExecutionJob;
export function verifyJob(job:ExecutionJob,input:{projectId:string;verifierId:string;revision:number;now:number;passed:boolean;evidenceRefs:string[]}):ExecutionJob;
export function failJob(job:ExecutionJob,input:{projectId:string;workerId:string;revision:number;now:number;retryable:boolean;emergencyStop?:boolean}):ExecutionJob;
export function recoverExpiredJob(job:ExecutionJob,input:{projectId:string;revision:number;now:number;emergencyStop?:boolean}):ExecutionJob;
export function cancelJob(job:ExecutionJob,input:{projectId:string;revision:number;now:number;actorId:string}):ExecutionJob;
