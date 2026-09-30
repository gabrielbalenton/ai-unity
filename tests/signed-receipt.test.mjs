import test from "node:test";
import assert from "node:assert/strict";
import {signSyncReceipt,verifySyncReceiptEnvelope} from "../lib/activity/signed-receipt.mjs";
const key="offline-test-secret-receipt-key-never-commit-real-secrets";
const base={
 connectorId:"notion-1",projectId:"project-1",
 coveredLocalDate:"2026-09-29",status:"success",
 completedAt:"2026-09-30T00:02:00.000Z",method:"full_poll"
};
const signed=()=>signSyncReceipt(base,{
 keyId:"connector-key-v1",nonce:"receipt-1",
 signedAt:"2026-09-30T00:03:00.000Z",secret:key
});
const verify=(envelope,overrides={})=>verifySyncReceiptEnvelope(envelope,{
 secret:key,expectedProjectId:"project-1",expectedConnectorId:"notion-1",
 now:Date.parse("2026-09-30T00:04:00.000Z"),
 reserveNonce:()=>true,...overrides
});
test("authenticates a canonical project-scoped signed receipt",()=>{
 const result=verify(signed());
 assert.equal(result.verified,true);
 assert.deepEqual(result.receipt,base);
 assert.equal("signature" in result.receipt,false);
});
test("tampering with any material field invalidates the signature",()=>{
 const s=signed();
 for(const delta of [
  {status:"failed"},{method:"verified_backfill"},
  {coveredLocalDate:"2026-09-28"},{completedAt:"2026-09-30T00:03:00.000Z"},
  {nonce:"replacement"},{keyId:"rotated"}
 ])assert.equal(verify({...s,...delta}).verified,false);
});
test("wrong project, connector or key fail closed",()=>{
 const s=signed();
 assert.match(verify(s,{expectedProjectId:"other"}).reason,/scope/);
 assert.match(verify(s,{expectedConnectorId:"other"}).reason,/scope/);
 assert.match(verify(s,{secret:"different-test-secret-that-is-also-32-bytes"}).reason,/signature/);
});
test("expired signatures, future timestamps and premature signing fail",()=>{
 const s=signed();
 assert.match(verify(s,{now:Date.parse("2026-09-30T01:10:00.000Z")}).reason,/Stale/);
 assert.match(verify(s,{now:Date.parse("2026-09-29T23:00:00.000Z")}).reason,/future/);
 assert.throws(()=>signSyncReceipt(base,{keyId:"test",nonce:"id",signedAt:"2026-09-30T00:00:00.000Z",secret:key}),/Invalid/);
});
test("invalid authentication cannot burn a valid nonce; duplicate nonce fails",()=>{
 let calls=0;
 const reserveNonce=()=>{calls++;return calls===1};
 const s=signed();
 assert.equal(verify({...s,signature:"0".repeat(64)},{reserveNonce}).verified,false);
 assert.equal(calls,0);
 assert.equal(verify(s,{reserveNonce}).verified,true);
 assert.equal(verify(s,{reserveNonce}).verified,false);
 assert.equal(calls,2);
});
test("unavailable nonce reservation never silently authenticates a receipt",()=>{
 assert.equal(verify(signed(),{reserveNonce:()=>{throw Error("DB offline")}}).verified,false);
 assert.equal(verify(signed(),{reserveNonce:undefined}).verified,false);
});
test("server-only contract never initiates network calls or persists keys",async()=>{
 const {readFileSync}=await import("node:fs");
 const src=readFileSync(new URL("../lib/activity/signed-receipt.mjs",import.meta.url),"utf8");
 assert.doesNotMatch(src,/\bfetch\(|localStorage|writeFile|process\.env/);
});
