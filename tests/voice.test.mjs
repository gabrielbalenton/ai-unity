import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const speech=readFileSync(new URL("../components/VoiceDictation.tsx",import.meta.url),"utf8");
const page=readFileSync(new URL("../app/page.tsx",import.meta.url),"utf8");
test("voice activation is tied to user click, not mount",()=>{
 const effect=speech.slice(speech.indexOf("useEffect("),speech.indexOf("function toggle()"));
 assert.doesNotMatch(effect,/\.start\(/);
 assert.match(speech,/onClick=\{toggle\}/);
});
test("recording is off by default and optional",()=>{
 assert.match(speech,/useState\(false\)/);
 assert.match(speech,/disabled=\{!available\}/);
 assert.match(speech,/browser's speech provider/);
});
test("recognized voice updates only the brain-dump editor",()=>{
 assert.match(page,/onTranscript=\{text=>setMemoryBody/);
});
