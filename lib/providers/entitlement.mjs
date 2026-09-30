/**
 * Server-side proof envelope for one explicitly approved model request.
 * This is a cryptographic contract, NOT a credit lookup. The signer must be a
 * trusted backend that independently verifies provider spend is disabled,
 * actual entitlement, user/project grants and ledger reservation.
 */
import {createHmac,timingSafeEqual} from "node:crypto";
const safeId=x=>typeof x==="string"&&/^[a-zA-Z0-9_.:/-]{3,180}$/.test(x);
const fields=["requestId","actorId","projectId","connectorId","provider","modelId",
 "verifiedAt","expiresAt","estimatedPaidUsd","billingDisabled","entitlementVerified"];
export function validateEntitlementRecord(record,nowMs){
 if(!record||!fields.every(field=>Object.hasOwn(record,field))||
   ![record.requestId,record.actorId,record.projectId,record.connectorId,
     record.provider,record.modelId].every(safeId)||
   !["openrouter","huggingface"].includes(record.provider)||
   !Number.isInteger(nowMs)||!Number.isInteger(record.verifiedAt)||
   !Number.isInteger(record.expiresAt)||record.verifiedAt>nowMs+1000||
   record.expiresAt<=nowMs||record.expiresAt-record.verifiedAt>300000||
   record.estimatedPaidUsd!==0||record.billingDisabled!==true||
   record.entitlementVerified!==true)
   throw Error("Missing or stale verified zero-spend entitlement");
 return Object.fromEntries(fields.map(field=>[field,record[field]]));
}
function canonical(record){return JSON.stringify(fields.map(field=>record[field]));}
export function signEntitlementRecord(record,secret,nowMs=Date.now()){
 if(typeof secret!=="string"||secret.length<32)throw Error("Entitlement signer is not configured");
 const safe=validateEntitlementRecord(record,nowMs);
 const mac=createHmac("sha256",secret).update(canonical(safe)).digest("hex");
 return {record:safe,signature:mac};
}
export function verifyEntitlementRecord(envelope,{secret,nowMs=Date.now(),request}={}){
 if(!envelope||typeof secret!=="string"||secret.length<32||
   typeof envelope.signature!=="string"||!/^[a-f0-9]{64}$/.test(envelope.signature)||
   !request)return false;
 let record;
 try{record=validateEntitlementRecord(envelope.record,nowMs)}
 catch{return false}
 for(const field of ["requestId","actorId","projectId","connectorId","provider","modelId"]){
  if(record[field]!==request[field])return false;
 }
 const expected=createHmac("sha256",secret).update(canonical(record)).digest();
 return timingSafeEqual(Buffer.from(envelope.signature,"hex"),expected);
}
