export class BodyReadError extends Error {
 readonly code:string;
 constructor(code:string);
}
export function readBoundedBytes(request:Request,options:{maxBytes:number}):Promise<Uint8Array>;
export function readBoundedJson(request:Request,options:{maxBytes:number}):Promise<unknown>;
