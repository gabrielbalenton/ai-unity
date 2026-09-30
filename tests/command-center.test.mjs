import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const page=read("app/page.tsx");
const dashboard=read("components/CommandCenter.tsx");
const css=read("app/globals.css");
const manifest=JSON.parse(read("config/system-manifest.json"));

test("new navigation preserves every previously implemented workspace",()=>{
 for(const destination of ["Overview","Projects","Cloud","Tasks","Chat","Memory","Models","Tools","Connections"]){
  assert.match(page,new RegExp('tab:"'+destination+'"'));
 }
 assert.match(page,/CommandCenter/);
 assert.match(page,/CloudWorkspace/);
 assert.match(page,/OpenApiDesigner/);
});
test("mission control uses actual workspace statistics instead of fabricated metrics",()=>{
 for(const expression of ["workspace.projects.length","approved.length","workspace.githubLinks.length"]){
  assert.ok(dashboard.includes(expression));
 }
 assert.match(dashboard,/External execution/);
 assert.match(dashboard,/LOCKED/);
 assert.match(dashboard,/No pending local tasks/);
 assert.doesNotMatch(dashboard,/Math\.random\(/);
});
test("command navigation and mobile menu can be closed by keyboard",()=>{
 assert.match(page,/event\.key==="Escape"/);
 assert.match(page,/setPaletteOpen\(false\)/);
 assert.match(page,/setMenuOpen\(false\)/);
 assert.match(page,/aria-label="Primary navigation"/);
});
test("dashboard labels unconnected services and inert architecture clearly",()=>{
 assert.match(dashboard,/NOT CONNECTED/);
 assert.equal(manifest.modules.length,14);
 assert.equal(manifest.modules.find(m=>m.id==="models").description.includes("No provider can execute until authorized"),true);
 assert.match(dashboard,/not activated/);
 assert.match(dashboard,/LOCAL READY/);
});
test("the CSS includes accessible keyboard focus, reduced motion and narrow-screen layouts",()=>{
 assert.match(css,/:focus-visible/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\(max-width:690px\)/);
 assert.match(css,/\.command-overlay/);
});
