import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("cloud UI is disabled before dedicated backend configuration",()=>{
 const ui=read("components/CloudWorkspace.tsx");
 assert.match(ui,/if\(!configured\)return/);
 assert.match(ui,/isSupabaseConfigured/);
 assert.match(ui,/No authentication, database or client information is connected/);
});
test("cloud memory approval is separate from a user-created draft and uses expected revision",()=>{
 const ui=read("components/CloudWorkspace.tsx");
 assert.match(ui,/api\/private\/memories\/approve/);
 assert.match(ui,/expectedUpdatedAt:memory\.updated_at/);
 assert.match(ui,/window\.confirm/);
 assert.match(ui,/Save cloud draft/);
});
test("local browser memory is not automatically uploaded to cloud workspace",()=>{
 const ui=read("components/CloudWorkspace.tsx");
 assert.doesNotMatch(ui,/import\\s+[^;]*(?:loadWorkspace|exportWorkspace)/);
 assert.doesNotMatch(ui,/(?:window\\.)?localStorage\\.(?:getItem|setItem)/);
 assert.match(ui,/separate from your unsynced browser workspace/);
});
test("cloud reads request authenticated no-store server responses",()=>{
 const ui=read("components/CloudWorkspace.tsx");
 assert.match(ui,/credentials:"same-origin",cache:"no-store"/);
 assert.match(ui,/api\/private\/session/);
 assert.match(ui,/api\/private\/projects/);
});
