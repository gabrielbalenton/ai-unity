/**
 * Server-only, offline authenticated receipt envelope for future connector
 * workers. An envelope is evidence only after signature, scope and replay
 * validation. This module opens no network connections and stores no secrets.
 * Live deployment must use a transactionally enforced nonce registry.
 */
import {createHmac,timingSafeEqual} from "node:crypto";
import {validateSyncReceipt} from "./daily-brief.mjs";

const token=v=>typeof v==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(v);
const canonicalDate=v=>typeof v==="string"&&Number.isFinite(Date.parse(v))&&
 new Date(v).toISOString()===v;
const secretValid=secret=>(typeof secret==="string"&&Buffer.byteLength(secret)>=32)||
 (Buffer.isBuffer(secret)&&secret.length>=32);
const canon=(receipt,meta)=>JSON.stringify({
 domain:"unity.connector-sync.v1",connectorId:receipt.connectorId,
 projectId:receipt.projectId,coveredLocalDate:receipt.coveredLocalDate,
 status:receipt.status,completedAt:receipt.completedAt,method:receipt.method,
 keyId:meta.keyId,nonce:meta.nonce,signedAt:meta.signedAt
});
/**
 * Signing is permitted only to trusted server-side connector workers with a
 * dedicated per-connector key; never expose secret to browser or AI prompts.
 */
export function signSyncReceipt(receipt,{keyId,nonce,signedAt,secret}){
 const safe=validateSyncReceipt(receipt);
 if(!token(keyId)||!token(nonce)||!canonicalDate(signedAt)||!secretValid(secret)||
 Date.parse(signedAt)<Date.parse(safe.completedAt))
  throw Error("Invalid signing parameters");
 const meta={keyId,nonce,signedAt};
 const signature=createHmac("sha256",secret).update(canon(safe,meta)).digest("hex");
 return Object.freeze({...safe,...meta,signature});
}
/**
 * Verification accepts a caller-supplied nonce reservation function. It MUST
 * be transactionally atomic when used with a real DB, scoped by tenant,
 * connector, keyId and nonce. Synchronous only; no silent async race.
 */
export function verifySyncReceiptEnvelope(envelope,{
 secret,expectedProjectId,expectedConnectorId,now,maxAgeMs=300_000,
 reserveNonce
}){
 const deny=reason=>Object.freeze({verified:false,reason,receipt:null});
 if(!envelope||!token(expectedProjectId)||!token(expectedConnectorId)||
 !secretValid(secret)||!Number.isSafeInteger(now)||now<0||
 !Number.isInteger(maxAgeMs)||maxAgeMs<1000||maxAgeMs>300_000||
 typeof reserveNonce!=="function")return deny("Invalid verification context");
 let receipt;
 try{receipt=validateSyncReceipt(envelope)}catch{return deny("Malformed receipt")}
 if(receipt.projectId!==expectedProjectId||receipt.connectorId!==expectedConnectorId)
  return deny("Connector/project scope mismatch");
 if(!token(envelope.keyId)||!token(envelope.nonce)||!canonicalDate(envelope.signedAt)||
 typeof envelope.signature!=="string"||!/^[a-f0-9]{64}$/.test(envelope.signature))
  return deny("Malformed signature envelope");
 const signedTime=Date.parse(envelope.signedAt);
 if(signedTime>Date.parse(new Date(now).toISOString())+30_000||
 signedTime<now-maxAgeMs||signedTime<Date.parse(receipt.completedAt))
  return deny("Stale or future-dated receipt");
 const expected=createHmac("sha256",secret).update(canon(receipt,envelope)).digest();
 const received=Buffer.from(envelope.signature,"hex");
 if(received.length!==expected.length||!timingSafeEqual(expected,received))
  return deny("Invalid receipt signature");
 // Successful authentication happens BEFORE nonce reservation; invalid
 // signatures cannot exhaust the legitimate worker's nonce namespace.
 let reserved;
 try{reserved=reserveNonce({
  projectId:receipt.projectId,connectorId:receipt.connectorId,
  keyId:envelope.keyId,nonce:envelope.nonce
 })}catch{return deny("Nonce reservation unavailable")}
 if(reserved!==true)return deny("Repeated or unreserved receipt nonce");
 return Object.freeze({verified:true,reason:"Authenticated receipt; upstream ingest must persist evidence",
  receipt:Object.freeze({...receipt})});
}
