import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const cloud=readFileSync(new URL("../components/CloudWorkspace.tsx",import.meta.url),"utf8");
const plane=readFileSync(new URL("../components/ProjectControlPlane.tsx",import.meta.url),"utf8");
const vercel=readFileSync(new URL("../components/VercelConnectPanel.tsx",import.meta.url),"utf8");

test("cloud workspace renders one selected-project control plane",()=>{
 assert.match(cloud,/ProjectControlPlane/);
 assert.match(cloud,/summary=\{controlPlane\}/);
 assert.match(cloud,/VercelConnectPanel projectId=\{projectId\}/);
});

test("control plane names exact infrastructure and keeps production approval separate",()=>{
 for(const provider of ["GitHub","Vercel","Supabase"])assert.match(plane,new RegExp(provider));
 assert.match(plane,/most restrictive bound provider mode/);
 assert.match(plane,/Production actions are never implied/);
 assert.match(plane,/separate UNITY approval gate/);
});

test("embedded Vercel connection uses the selected cloud project instead of another selector",()=>{
 assert.match(vercel,/projectId:controlledProjectId/);
 assert.match(vercel,/embedded/);
 assert.match(vercel,/onChanged/);
});
