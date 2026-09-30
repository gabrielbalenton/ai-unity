import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const control=read("components/AppearanceControl.tsx");
const init=read("public/theme-init.js");
const sheet=read("app/appearance.css");
const layout=read("app/layout.tsx");
const page=read("app/page.tsx");
test("Light, Dark and System all have genuinely wired controls",()=>{
 for(const mode of ["light","dark","system"])
  assert.match(control,new RegExp('<option value="'+mode+'">'));
 assert.match(control,/onChange=\{event=>change\(event\.target\.value\)\}/);
 assert.match(control,/aria-label="Appearance"/);
});
test("System follows OS changes and a manual preference persists only in the browser",()=>{
 assert.match(control,/window\.matchMedia/);
 assert.match(control,/addEventListener\?\.\("change",apply\)/);
 assert.match(control,/localStorage\.setItem/);
 assert.match(init,/localStorage\.getItem/);
 assert.match(init,/dataset\.resolvedTheme/);
 assert.doesNotMatch(control,/fetch\(/);
});
test("same-origin theme initialization runs before React hydration",()=>{
 assert.match(layout,/theme-init\.js/);
 assert.match(layout,/beforeInteractive/);
 assert.match(layout,/appearance\.css/);
});
test("light overrides cover dashboard, navigational sidebar and all major workspace surfaces",()=>{
 for(const selector of [".sidebar",".header",".panel",".module-tile",
  ".stat-item",".rail-panel",".readiness-gates",".workspace-intro"]){
  assert.ok(sheet.includes(selector),"Missing light skin: "+selector);
 }
 assert.match(sheet,/:root\[data-resolved-theme="light"\]/);
});
test("UNITY uses a custom geometric U mark rather than a third-party logo",()=>{
 assert.match(page,/unity-monogram/);
 assert.match(page,/<path d="M9\.5 9/);
 assert.doesNotMatch(page,/brand-glyph"><Sparkles/);
});
