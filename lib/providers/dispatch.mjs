/**
 * Safe server dispatch seam. No HTTP route imports this module yet. Live use
 * requires separate verified auth, a trusted entitlement signer, explicit
 * connector grants, provider-side billing controls and durable reservations.
 */
import {createHash} from "node:crypto";
import {evaluateExecution} from "../runtime/policy.mjs";
import {verifyEntitlementRecord} from "./entitlement.mjs";
import {prepareChatHttp,executeTransport} from "./chat-transport.mjs";
export async function dispatchVerifiedChat({
 enabled=false,request,entitlement,signingSecret,policy,connections,
 reserveRequestId,loadServerCredential,recordOutcome,fetcher,nowMs=Date.now()
}={}){
 if(enabled!==true)throw Error("Provider dispatcher is disabled");
 if(!request||typeof request!=="object"||
   typeof reserveRequestId!=="function"||
   typeof loadServerCredential!=="function"||
   typeof recordOutcome!=="function")
  throw Error("Required server dispatch dependencies are not configured");
 if(!verifyEntitlementRecord(entitlement,{secret:signingSecret,nowMs,request}))
  throw Error("Missing authorized model entitlement");
 const check=evaluateExecution({
  projectId:request.projectId,connectorId:request.connectorId,
  resourceId:request.modelId,action:"read",type:"model_inference",
  estimatedPaidUsd:0,freeEligibilityVerified:true
 },policy,connections);
 if(!check.allowed)throw Error("Project or cost policy denied this request");
 // The caller MUST implement this as an atomic unique DB reservation. Duplicate
 // requests never get a second provider call; this code does not auto retry.
 const reserved=await reserveRequestId({
  requestId:request.requestId,projectId:request.projectId,actorId:request.actorId,
  connectorId:request.connectorId,provider:request.provider,modelId:request.modelId
 });
 if(reserved!==true)throw Error("Request already dispatched or reservation unavailable");
 let stage="reservation";
 try{
  const key=await loadServerCredential({
   projectId:request.projectId,actorId:request.actorId,
   connectorId:request.connectorId,provider:request.provider
  });
  stage="transport";
  const prepared=prepareChatHttp({
   provider:request.provider,model:request.modelId,messages:request.messages,
   maxTokens:request.maxTokens,apiKey:key
  });
  const result=await executeTransport(prepared,{fetcher});
  stage="recording";
  const hash=createHash("sha256").update(result.text).digest("hex");
  const logged=await recordOutcome({
   requestId:request.requestId,projectId:request.projectId,
   connectorId:request.connectorId,provider:request.provider,modelId:request.modelId,
   outcome:"received_unverified",responseHash:hash,usage:result.usage
  });
  if(logged!==true)throw Error("Unable to persist provider outcome");
  return {requestId:request.requestId,projectId:request.projectId,...result};
 }catch{
  // Surface no provider error text, tokens or request bodies.
  try{
   await recordOutcome({requestId:request.requestId,projectId:request.projectId,
    connectorId:request.connectorId,provider:request.provider,modelId:request.modelId,
    outcome:"failed_or_unconfirmed",stage});
  }catch{/* Retain the preexisting durable reservation for operator recovery. */}
  throw Error("Provider request failed or was not durably recorded; do not automatically retry");
 }
}
