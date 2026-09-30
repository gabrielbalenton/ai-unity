import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const code=readFileSync(new URL("../components/ChatPanel.tsx",import.meta.url),"utf8");
test("conversation studio preserves separate project context and actual local message storage",()=>{
 assert.match(code,/workspace\.messages\.filter\(m=>m\.projectId===projectId\)/);
 assert.match(code,/previewProjectContext\(workspace,projectId\)/);
 assert.match(code,/addUserMessage\(workspace/);
});
test("does not claim an assistant or provider replied",()=>{
 assert.match(code,/AI EXECUTION DISABLED/);
 assert.match(code,/LOCAL NOTE · NOT SENT TO AI/);
 assert.doesNotMatch(code,/role:"assistant"/);
});
test("keyboard composer and draft suggestions perform actual local state changes",()=>{
 assert.match(code,/event\.ctrlKey\|\|event\.metaKey/);
 assert.match(code,/requestSubmit\(\)/);
 assert.match(code,/setDraft\(item\.value\)/);
});
test("privacy and approval trust distinctions remain visible",()=>{
 assert.match(code,/Browser storage is unencrypted/);
 assert.match(code,/approved notes from this project/);
});
