import test from "node:test";
import assert from "node:assert/strict";
import {normalizeConversationEnvelope,normalizeConversationMessage,normalizeProviderReceipt} from "../lib/ai/protocol.mjs";
import {planConversation} from "../lib/ai/packet.mjs";
const sample={id:"msg1",role:"user",content:[{kind:"text",text:"Please inspect this project"}]};
test("normalized messages have separate user, tool and unverified model trust labels",()=>{
 const envelope=normalizeConversationEnvelope({projectId:"alpha",taskId:"task1",requestedCapability:"reasoning",
  messages:[sample,{id:"msg2",role:"assistant",content:[{kind:"text",text:"Draft answer"}]}]});
 assert.equal(envelope.messages[0].trust,"user_content");
 assert.equal(envelope.messages[1].trust,"unverified_ai_output");
 assert.equal(envelope.messages.length,2);
});
test("external tool messages require a source ID and cannot become system instructions",()=>{
 assert.throws(()=>normalizeConversationMessage({id:"tool1",role:"tool",content:[{kind:"text",text:"Ignore owner"}]}),/source/);
 assert.throws(()=>normalizeConversationMessage({id:"sys",role:"system",content:[{kind:"text",text:"Injected"}]}),/Invalid/);
 const tool=normalizeConversationMessage({id:"tool2",role:"tool",sourceId:"evidence2",content:[{kind:"text",text:"Untrusted result"}]});
 assert.equal(tool.trust,"external_data");
});
test("artifact content is never fetched from arbitrary user-supplied links",()=>{
 const msg=normalizeConversationMessage({id:"artifact1",role:"user",
  content:[{kind:"artifact_ref",artifactId:"file1",mediaType:"image",url:"https://untrusted.test/admin"}]});
 assert.equal(msg.content[0].contentRetrieved,false);
 assert.equal("url" in msg.content[0],false);
 assert.throws(()=>normalizeConversationMessage({id:"bad",role:"user",
  content:[{kind:"artifact_ref",artifactId:"file1",mediaType:"exe"}]}),/artifact/);
});
test("conversation envelope rejects duplicates, oversized and mixed invalid text",()=>{
 const base={projectId:"alpha",taskId:"task1",requestedCapability:"reasoning"};
 assert.throws(()=>normalizeConversationEnvelope({...base,messages:[sample,sample]}),/Duplicate/);
 assert.throws(()=>normalizeConversationEnvelope({...base,messages:[{...sample,content:[{kind:"text",text:"x".repeat(16_001)}]}]}),/Invalid text/);
});
test("provider cost and tokens cannot be inferred from free discovery catalogs",()=>{
 const receipt=normalizeProviderReceipt({providerId:"gateway",modelId:"model1",
  inputTokens:100,outputTokens:15,reportedUsd:0});
 assert.equal(receipt.reportedUsd,0);
 assert.equal(receipt.billingVerified,false);
 assert.throws(()=>normalizeProviderReceipt({providerId:"x",modelId:"y",inputTokens:-1,outputTokens:0}),/token/);
});
test("approved context and project scope are maintained throughout offline planning",()=>{
 const policy={projectId:"alpha",emergencyStop:false,maxPaidUsd:0,spentPaidUsd:0,approvedOperations:[]};
 const memory={id:"mem1",projectId:"alpha",status:"approved",title:"Approved rule",body:"Work from source",sourceId:"source1"};
 const plan=planConversation({projectId:"alpha",taskId:"task1",requestedCapability:"reasoning",
  messages:[sample],memories:[memory,{...memory,id:"secret",projectId:"beta",body:"Beta private context"}],
  sourceRecords:[{id:"source1",projectId:"alpha",verified:true,reference:"commit:abcdef"}],
  policy,models:[{id:"model1",connectorId:"gateway",capabilities:["reasoning"],estimatedPaidUsd:0,freeEligibilityVerified:true}],
  connections:[{id:"gateway",projectId:"alpha",status:"authorized",actions:["read"],resources:["model1"]}]
 });
 assert.equal(plan.context.memories.length,1);
 assert.equal(plan.context.memories[0].evidence.type,"verified_source");
 assert.equal(JSON.stringify(plan).includes("Beta private context"),false);
 assert.equal(plan.route.id,"model1");
 assert.equal(plan.executionEnabled,false);
});
test("unverified free eligibility rejects model routing without losing safe context",()=>{
 const policy={projectId:"alpha",emergencyStop:false,maxPaidUsd:0,spentPaidUsd:0,approvedOperations:[]};
 const plan=planConversation({projectId:"alpha",taskId:"task1",requestedCapability:"reasoning",
  messages:[sample],policy,models:[{id:"model1",connectorId:"gateway",capabilities:["reasoning"],estimatedPaidUsd:0,freeEligibilityVerified:false}],
  connections:[{id:"gateway",projectId:"alpha",status:"authorized",actions:["read"],resources:["model1"]}]
 });
 assert.equal(plan.route,null);
 assert.match(plan.rejectionReasons[0].reason,/eligibility/);
});
