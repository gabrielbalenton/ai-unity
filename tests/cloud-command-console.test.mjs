import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const consoleSource=read("components/CloudCommandConsole.tsx");
const workspaceSource=read("components/CloudWorkspace.tsx");

test("cloud command console composes exact project resolution and routing preflight",()=>{
 assert.match(consoleSource,/\/api\/private\/routing\/resolve-command/);
 assert.match(consoleSource,/Switch to FPX/);
 assert.match(consoleSource,/provider,action/);
 assert.match(consoleSource,/READY/);
 assert.match(consoleSource,/APPROVAL REQUIRED/);
 assert.match(consoleSource,/DENIED/);
});

test("command console remains planning-only and never presents an execute action",()=>{
 assert.match(consoleSource,/This screen never executes the action/);
 assert.match(consoleSource,/No external action was executed/);
 assert.match(consoleSource,/executionEnabled: false/);
 assert.doesNotMatch(consoleSource,/Execute now|Run action|Deploy now|Apply change/);
});

test("cloud workspace mounts the command console and switches to the resolved owned project",()=>{
 assert.match(workspaceSource,/import CloudCommandConsole/);
 assert.match(workspaceSource,/<CloudCommandConsole/);
 assert.match(workspaceSource,/setProjectId\(project\.id\)/);
 assert.match(workspaceSource,/nothing was executed/);
});
