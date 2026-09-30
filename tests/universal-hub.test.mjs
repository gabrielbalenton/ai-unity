import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=file=>readFileSync(new URL("../"+file,import.meta.url),"utf8");
const catalog=JSON.parse(read("config/integration-categories.json"));
const home=read("app/page.tsx");
const ui=read("components/UniversalHub.tsx");
test("the universal hub covers more than development platforms",()=>{
 assert.equal(catalog.status,"planned");
 const categories=catalog.categories.map(g=>g.category);
 for(const category of ["Project management","Email and calendar","Marketing","CRM","Phone and interviews","Local computer"]){
  assert.ok(categories.includes(category));
 }
 assert.ok(catalog.categories.find(g=>g.category==="Project management").providers.includes("Notion"));
});
test("planned integrations have clear permission boundaries and never pretend to be installed",()=>{
 assert.match(catalog.notice,/does not imply connection/);
 assert.match(ui,/not installed integrations/);
 assert.match(ui,/permission before UNITY/);
 assert.doesNotMatch(ui,/connectOAuth\(/);
});
test("Daily Briefing cannot fabricate synchronization or activity",()=>{
 assert.match(ui,/No live sources are connected/);
 assert.match(ui,/Verified updates/);
 assert.match(ui,/fabricate yesterday/);
 assert.match(ui,/not proof of a successful connector sync|actual synchronization receipts/);
});
test("Daily Briefing is a real navigable workspace, distinct from GitHub repository exploration",()=>{
 assert.match(home,/tab:"Briefing"/);
 assert.match(home,/tab==="Briefing"&&<DailyBriefPanel/);
 assert.match(home,/tab==="Connections"&&<><IntegrationCatalog/);
});
