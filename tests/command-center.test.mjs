import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const page=read("app/page.tsx");
const home=read("components/HomeWorkspace.tsx");
const theme=read("app/appearance.css");
const manifest=JSON.parse(read("config/system-manifest.json"));

test("primary navigation is calm while every advanced workspace remains reachable",()=>{
 for(const primary of ["Home","Projects","Conversations","Knowledge","Settings"])
  assert.match(page,new RegExp('label:"'+primary+'"'));
 for(const advanced of ["Briefing","Tasks","Cloud","Models","Tools","Connections","Readiness"])
  assert.match(page,new RegExp('tab:"'+advanced+'"'));
 assert.match(page,/MoreHorizontal/);
 assert.match(page,/advancedNav/);
 assert.match(page,/allNav.filter/);
});
test("Home uses only actual local workspace data and no fabricated telemetry",()=>{
 for(const expression of ["workspace.projects","workspace.tasks","workspace.memories"])
  assert.ok(home.includes(expression));
 assert.match(home,/No live sources|external actions are still locked|External execution|Nothing is assumed connected/i);
 assert.doesNotMatch(home,/Math\.random\(|uptime|\b99\.\d+%|fake/i);
});
test("approved brand and terrain files are present",()=>{
 for(const file of [
  "public/unity-brand/unity-symbol.svg","public/unity-brand/unity-symbol-dark.svg",
  "public/unity-brand/unity-wordmark.svg","public/unity-brand/unity-wordmark-dark.svg",
  "public/unity-brand/terrain-light.svg","public/unity-brand/terrain-dark.svg"
 ])assert.equal(existsSync(new URL("../"+file,import.meta.url)),true,file);
 assert.match(page,/unity-wordmark\.svg/);
});
test("keyboard command and mobile navigation retain all working destinations",()=>{
 assert.match(page,/event\.key==="Escape"/);
 assert.match(page,/metaKey\|\|event\.ctrlKey/);
 assert.match(page,/aria-label="Mobile primary navigation"/);
 assert.match(page,/aria-label="Primary navigation"/);
});
test("all fourteen planned systems remain in the architecture source of truth",()=>{
 assert.equal(manifest.modules.length,14);
 assert.equal(manifest.deploymentAuthorized,false);
 assert.equal(manifest.paidApiBudgetDefaultUsd,0);
});
test("semantic theme covers accessibility and mobile behavior",()=>{
 assert.match(theme,/:focus-visible/);
 assert.match(theme,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(theme,/\.mobile-bottom-nav/);
 assert.match(theme,/--u-canvas:#F7F6F2/);
 assert.match(theme,/--u-canvas:#141C24/);
});
