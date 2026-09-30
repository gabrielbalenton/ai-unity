export type VerifiedDelivery={
 deliveryId:string;eventName:string;action:string;
 installationId:number;repositoryIds:number[];payloadHash:string;status:"unapplied";
};
export function prepareAndRecordWebhook(args:{
 rawBody:Buffer;eventName:string|null;deliveryId:string|null;signature:string|null;
 secret:string|undefined;recordDelivery?:(record:VerifiedDelivery)=>Promise<"inserted"|"duplicate">;
}):Promise<{status:number;code:string}>;
