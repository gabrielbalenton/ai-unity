import test from "node:test";
import assert from "node:assert/strict";
import {normalizeActivity,buildDailyBrief} from "../lib/activity/daily-brief.mjs";
const event=(overrides={})=>({
 id:"event-1",connectorId:"notion-1",projectId:"project-1",type:"task",
 title:"Project decision required",observedAt:"2026-09-29T13:00:00+08:00",
 actionRequired:true,sourceUrl:"https://example.org/authorized/task",...overrides
});
const args={now:Date.parse("2026-09-30T08:00:00+08:00"),timezone:"Asia/Manila",
 authorizedConnectorIds:["notion-1","gmail-2"],projectIds:["project-1"],expectedConnectorIds:["notion-1","gmail-2"]};
test("deduplicates source events for a daily briefing",()=>{
 const result=buildDailyBrief({...args,events:[event(),event()]});
 assert.equal(result.totalEvents,1);
 assert.equal(result.actionRequiredCount,1);
 assert.deepEqual(result.byType,{task:1});
});
test("cross-project and unauthorized connector events never appear",()=>{
 const result=buildDailyBrief({...args,events:[
  event(),event({id:"private",projectId:"other",title:"Confidential source"}),
  event({id:"unauthorized",connectorId:"unapproved-1"})
 ]});
 assert.equal(result.totalEvents,1);
 assert.equal(JSON.stringify(result).includes("Confidential source"),false);
 assert.equal(JSON.stringify(result).includes("unauthorized"),false);
});
test("timezone identifies yesterday using real calendar dates",()=>{
 const result=buildDailyBrief({...args,events:[event()]});
 assert.equal(result.date,"2026-09-29");
 assert.equal(result.events[0].observedAt,"2026-09-29T05:00:00.000Z");
});
test("briefing never pretends that silent connectors synchronized",()=>{
 const result=buildDailyBrief({...args,events:[event()]});
 assert.equal(result.connectorCoverage.observedCount,1);
 assert.deepEqual(result.connectorCoverage.unobservedConnectorIds,["gmail-2"]);
 assert.match(result.connectorCoverage.notice,/not proof/);
});
test("never invents actions or AI interpretations",()=>{
 const result=buildDailyBrief({...args,events:[event()]});
 assert.equal(result.events[0].actionRequired,true);
 assert.match(result.notice,/No AI-generated conclusions/);
});
test("invalid source claims and unsafe URLs are rejected",()=>{
 assert.throws(()=>normalizeActivity(event({type:"unknown"})),/Invalid/);
 assert.throws(()=>normalizeActivity(event({sourceUrl:"file:///etc/passwd"})),/Invalid/);
 assert.throws(()=>normalizeActivity(event({title:""})),/Invalid/);
});
test("one connector may report records from multiple project scopes independently",()=>{
 const res=buildDailyBrief({...args,projectIds:["project-1","project-2"],events:[
  event(),event({id:"event-1",projectId:"project-2",title:"Another project",actionRequired:false})
 ]});
 assert.equal(res.totalEvents,2);
 assert.equal(res.actionRequiredCount,1);
});
test("does not accidentally include today or events older than yesterday",()=>{
 const res=buildDailyBrief({...args,events:[
  event({id:"old",observedAt:"2026-09-28T12:00:00+08:00"}),
  event({id:"today",observedAt:"2026-09-30T00:01:00+08:00"})]});
 assert.equal(res.totalEvents,0);
});
