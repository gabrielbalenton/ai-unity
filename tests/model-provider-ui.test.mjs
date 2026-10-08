import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const ui=readFileSync(new URL("../components/CloudCommandConsole.tsx",import.meta.url),"utf8");

test("manual AI credentials are password inputs and are cleared after vault storage",()=>{
 assert.match(ui,/type="password"/);assert.match(ui,/autoComplete="off"/);assert.match(ui,/spellCheck=\{false\}/);
 assert.match(ui,/\/api\/private\/connect\/model-key/);assert.match(ui,/setCredential\(""\)/);
});

test("provider UI shows secret-free fallback policy and live free verification",()=>{
 assert.match(ui,/\/api\/private\/models\/provider-plan/);
 assert.match(ui,/Paid fallback is disabled/);
 assert.match(ui,/free eligibility/i);
 assert.doesNotMatch(ui,/credential_reference/);assert.doesNotMatch(ui,/secretRef/);
});
