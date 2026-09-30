import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const pkg=JSON.parse(read("package.json"));
const vercel=JSON.parse(read("vercel.json"));
const next=read("next.config.mjs");
const env=read(".env.example");
const readiness=read("scripts/readiness.mjs");
const manifest=JSON.parse(read("config/system-manifest.json"));

test("Vercel config builds Next.js without embedding deployment credentials",()=>{
 assert.equal(vercel.framework,"nextjs");
 assert.equal(vercel.buildCommand,"npm run build");
 assert.match(vercel.installCommand,/npm install/);
 assert.doesNotMatch(JSON.stringify(vercel),/VERCEL_TOKEN|SUPABASE|OPENROUTER|PRIVATE_KEY/);
});
test("release uses an explicit Node engine and exact direct dependency versions",()=>{
 assert.equal(pkg.engines.node,"22.x");
 for(const version of [...Object.values(pkg.dependencies),...Object.values(pkg.devDependencies)]){
  assert.doesNotMatch(version,/^[\^~*><]/);
 }
 assert.match(pkg.scripts["verify:release"],/npm run readiness/);
 assert.match(pkg.scripts["verify:release"],/npm run build/);
});
test("security headers are applied by Next without blocking same-origin microphone use",()=>{
 for(const header of ["X-Content-Type-Options","X-Frame-Options","Referrer-Policy","Permissions-Policy","Cross-Origin-Opener-Policy"])
  assert.ok(next.includes(header),header);
 assert.match(next,/microphone=\(self\)/);
 assert.match(next,/poweredByHeader:false/);
});
test("environment template contains names only and execution defaults off",()=>{
 assert.match(env,/UNITY_ENABLE_EXTERNAL_EXECUTION=false/);
 assert.match(env,/UNITY_ENABLE_GITHUB_WEBHOOK_INGESTION=false/);
 assert.doesNotMatch(env,/sb_secret_[A-Za-z0-9_-]+|gh[pousr]_[A-Za-z0-9]+|sk-[A-Za-z0-9_-]{20,}/);
});
test("readiness distinguishes code-ready preview from production activation",()=>{
 assert.match(readiness,/previewCodeReady/);
 assert.match(readiness,/productionActivationReady:false/);
 assert.match(readiness,/deploymentReady:false/);
 assert.equal(manifest.deploymentAuthorized,false);
});
test("approved owner handoff documentation and assets are present",()=>{
 for(const path of ["docs/APPROVED_UI_HANDOFF.md","public/unity-brand/unity-symbol.svg","public/unity-brand/terrain-dark.svg","app/icon.svg","vercel.json"])
  assert.equal(existsSync(new URL("../"+path,import.meta.url)),true,path);
});
