/**
 * Validated, deliberately non-executing GitHub webhook intake.
 *
 * No webhook may create a UNITY project grant or trigger an agent here.
 * For supported installation events, acknowledge ONLY after the supplied
 * durable store accepts or detects an identical replay of the delivery.
 */
import {createHash} from "node:crypto";
import {verifyWebhookSignature,normalizeInstallationEvent} from "./app.mjs";
const allowedEvents=new Set(["installation","installation_repositories"]);
const deliveryPattern=/^[a-zA-Z0-9-]{8,100}$/;
export async function prepareAndRecordWebhook({rawBody,eventName,deliveryId,signature,secret,recordDelivery}){
 if(!Buffer.isBuffer(rawBody)||rawBody.byteLength===0||rawBody.byteLength>1_000_000)
  return {status:413,code:"INVALID_BODY"};
 if(typeof secret!=="string"||secret.length<16||!verifyWebhookSignature({rawBody,header:signature,secret}))
  return {status:401,code:"INVALID_SIGNATURE"};
 if(!deliveryPattern.test(deliveryId||"")||typeof eventName!=="string")
  return {status:400,code:"INVALID_HEADERS"};
 if(eventName==="ping")return {status:204,code:"PING_ACK"};
 if(!allowedEvents.has(eventName))return {status:204,code:"EVENT_NOT_HANDLED"};
 let payload;
 try{payload=JSON.parse(rawBody.toString("utf8"))}
 catch{return {status:400,code:"INVALID_JSON"}}
 let parsed;
 try{parsed=normalizeInstallationEvent({eventName,deliveryId,payload})}
 catch{return {status:400,code:"INVALID_EVENT"}}
 if(typeof recordDelivery!=="function")
  return {status:503,code:"DURABLE_DELIVERY_STORE_UNAVAILABLE"};
 const immutable={
  deliveryId:parsed.deliveryId,eventName:parsed.eventName,action:parsed.action,
  installationId:parsed.installationId,repositoryIds:parsed.repositoryIds,
  payloadHash:createHash("sha256").update(rawBody).digest("hex"),status:"unapplied"
 };
 try{
  const result=await recordDelivery(immutable);
  if(result==="inserted"||result==="duplicate")return {status:202,code:result==="inserted"?"STORED":"DUPLICATE"};
  return {status:503,code:"DURABLE_DELIVERY_STORE_UNAVAILABLE"};
 }catch{return {status:503,code:"DURABLE_DELIVERY_STORE_UNAVAILABLE"}}
}
