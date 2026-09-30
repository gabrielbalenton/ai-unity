/**
 * Assemble an inert provider-agnostic task packet from an approved, scoped
 * memory retrieval and a normalized conversation. Actual model dispatch must
 * separately authorize the actor, connector, resource, budget and artifact IDs.
 */
import {buildTaskContext} from "../runtime/context.mjs";
import {normalizeConversationEnvelope} from "./protocol.mjs";
import {planModelRequest} from "../runtime/model-router.mjs";
export function planConversation({projectId,taskId,requestedCapability,messages,
 memories=[],sourceRecords=[],models=[],connections=[],policy}){
 const conversation=normalizeConversationEnvelope({projectId,taskId,
  requestedCapability,messages});
 const context=buildTaskContext({projectId,taskId,memories,sourceRecords});
 const routing=planModelRequest({projectId,taskId,capability:requestedCapability,
  models,connections,policy});
 return Object.freeze({
  projectId,taskId,conversation,context,
  route:routing.chosen?{id:routing.chosen.id,connectorId:routing.chosen.connectorId}:null,
  rejectionReasons:routing.rejected,executionEnabled:false,
  notice:"Plan only. No prompt, knowledge or artifact was sent to an AI provider."
 });
}
