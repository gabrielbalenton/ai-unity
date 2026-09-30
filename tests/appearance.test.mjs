import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const control=read("components/AppearanceControl.tsx");
const init=read("public/theme-init.js");
const sheet=read("app/appearance.css");
const layout=read("app/layout.tsx");
const page=read("app/page.tsx");

test("Light, Dark and System are wired with System default",()=>{
 for(const mode of ["light","dark","system"])
  assert.match(control,new RegExp('<option value="'+mode+'">'));
 assert.match(control,/useState<Appearance>\("system"\)/);
 assert.match(control,/dataset\.unityTheme/);
 assert.match(control,/dataset\.resolvedTheme/);
});
test("System follows OS changes and manual preference remains local-only",()=>{
 assert.match(control,/window\.matchMedia/);
 assert.match(control,/addEventListener\?\.\("change",apply\)/);
 assert.match(control,/localStorage\.setItem/);
 assert.match(init,/localStorage\.getItem/);
 assert.doesNotMatch(control,/fetch\(/);
});
test("same-origin initialization runs before hydration and semantic CSS loads last",()=>{
 assert.match(layout,/theme-init\.js/);
 assert.match(layout,/beforeInteractive/);
 assert.match(layout,/globals\.css/);
 assert.match(layout,/appearance\.css/);
});
test("approved warm-light and calm-dark design tokens are used",()=>{
 for(const token of ["#F7F6F2","#273742","#467A82","#141C24","#EEF2F0","#A8CFD1"])
  assert.ok(sheet.includes(token),"Missing approved token "+token);
 assert.match(sheet,/--u-font-heading/);
 assert.match(sheet,/--u-font-body/);
});
test("appearance uses approved assets rather than inline third-party-style mark",()=>{
 assert.match(page,/unity-wordmark\.svg/);
 assert.match(page,/unity-wordmark-dark\.svg/);
 assert.doesNotMatch(page,/unity-monogram/);
 assert.doesNotMatch(page,/brand-glyph"><Sparkles/);
});
