import test from "node:test";
import assert from "node:assert/strict";
import {checkWriteOrigin} from "../lib/security/origin.mjs";
test("only an exact configured HTTPS origin authorizes cookie-backed writes",()=>{
 assert.equal(checkWriteOrigin("https://unity.example","https://unity.example").allowed,true);
 assert.equal(checkWriteOrigin("https://attacker.example","https://unity.example").allowed,false);
 assert.equal(checkWriteOrigin("https://unity.example.evil.test","https://unity.example").allowed,false);
});
test("missing or malformed origins fail closed",()=>{
 assert.equal(checkWriteOrigin(null,"https://unity.example").allowed,false);
 assert.equal(checkWriteOrigin("garbage","https://unity.example").allowed,false);
 assert.equal(checkWriteOrigin("https://unity.example",undefined).allowed,false);
});
test("insecure origins are restricted to explicit local development",()=>{
 assert.equal(checkWriteOrigin("http://localhost:3000","http://localhost:3000").allowed,true);
 assert.equal(checkWriteOrigin("http://unity.example","http://unity.example").allowed,false);
});
