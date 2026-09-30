/**
 * Offline cross-provider fallback planning. Never infer availability or free
 * credits from a public catalog. Every candidate must pass the same scoped
 * policy check before entering a plan, and live execution must recheck again.
 */
import {planModelRequest} from "../runtime/model-router.mjs";
const id=value=>typeof value==="string"&&/^[A-Za-z0-9_.:-]{1,120}$/.test(value);
export function planProviderFallbacks({projectId,taskId,capability,models,connections,policy,maxHops=3}){
 if(!Array.isArray(models)||!Array.isArray(connections)||
   !Number.isInteger(maxHops)||maxHops<1||maxHops>5)
  throw Error("Invalid fallback request");
 const remaining=[...models];
 const chosen=[],rejected=[];
 while(remaining.length&&chosen.length<maxHops){
  const result=planModelRequest({projectId,taskId,capability,models:remaining,connections,policy});
  rejected.push(...result.rejected);
  if(!result.chosen)break;
  const candidate=result.chosen;
  if(!chosen.some(c=>c.connectorId===candidate.connectorId)){
   chosen.push({modelId:candidate.id,connectorId:candidate.connectorId,
    estimatedPaidUsd:candidate.estimatedPaidUsd});
  }
  const idx=remaining.findIndex(m=>m&&m.id===candidate.id&&m.connectorId===candidate.connectorId);
  if(idx<0)break;
  remaining.splice(idx,1);
 }
 const seenRejections=new Set();
 const uniqueRejections=rejected.filter(item=>{
  const key=item.id+":"+item.reason;
  if(seenRejections.has(key))return false;
  seenRejections.add(key);return true;
 });
 return Object.freeze({projectId,taskId,capability,choices:chosen,rejected:uniqueRejections,
  executionEnabled:false,notice:"Fallback order is a planning result only. Actual provider availability and costs must be verified at dispatch."});
}
/**
 * A handoff shares an approved project reference and declared task progress,
 * never proprietary hidden chain-of-thought or cross-project conversation.
 * AI summaries are explicitly unverified until independent checks pass.
 */
export function createModelHandoff({projectId,taskId,fromModelId,toModelId,
 summary,evidenceRefs=[],completedStepIds=[]}){
 if(![projectId,taskId,fromModelId,toModelId].every(id)||
    fromModelId===toModelId||
    typeof summary!=="string"||summary.length<1||summary.length>4000||
    !Array.isArray(evidenceRefs)||evidenceRefs.length>30||!evidenceRefs.every(id)||
    !Array.isArray(completedStepIds)||completedStepIds.length>30||!completedStepIds.every(id))
  throw Error("Invalid cross-model handoff");
 return Object.freeze({projectId,taskId,fromModelId,toModelId,summary,
  evidenceRefs:[...new Set(evidenceRefs)],
  completedStepIds:[...new Set(completedStepIds)],
  summaryTrust:"unverified_ai_draft",
  requiresIndependentVerification:true});
}
