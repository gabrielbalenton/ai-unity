import test from "node:test";
import assert from "node:assert/strict";
import {createHmac,generateKeyPairSync,createVerify} from "node:crypto";
import {makeAppJwt,verifyWebhookSignature,normalizeInstallationEvent,requestInstallationToken} from "../lib/github/app.mjs";
test("JWT uses RS256 and expires within GitHub's 10-minute maximum",()=>{
 const {publicKey,privateKey}=generateKeyPairSync("rsa",{modulusLength:2048,
  publicKeyEncoding:{format:"pem",type:"spki"},privateKeyEncoding:{format:"pem",type:"pkcs8"}});
 const jwt=makeAppJwt({appId:12345,privateKey,nowSeconds:1700000000});
 const [header,payload,signature]=jwt.split(".");
 assert.equal(JSON.parse(Buffer.from(header,"base64url").toString()).alg,"RS256");
 const claims=JSON.parse(Buffer.from(payload,"base64url").toString());
 assert.equal(claims.iat,1699999940);assert.equal(claims.exp,1700000540);
 const verifier=createVerify("RSA-SHA256");verifier.update(header+"."+payload);verifier.end();
 assert.equal(verifier.verify(publicKey,Buffer.from(signature,"base64url")),true);
});
test("webhook HMAC verification compares exact raw bytes, rejects malformed hashes",()=>{
 const secret="test-only-not-a-real-secret";
 const raw=Buffer.from('{"action":"created"}');
 const header="sha256="+createHmac("sha256",secret).update(raw).digest("hex");
 assert.equal(verifyWebhookSignature({rawBody:raw,header,secret}),true);
 assert.equal(verifyWebhookSignature({rawBody:Buffer.from('{"action":"deleted"}'),header,secret}),false);
 assert.equal(verifyWebhookSignature({rawBody:raw,header:"sha1=aabb",secret}),false);
 assert.equal(verifyWebhookSignature({rawBody:raw,header,secret:"short"}),false);
});
test("installation events are inert until delivery IDs and grants are checked",()=>{
 const evt=normalizeInstallationEvent({eventName:"installation",deliveryId:"test-delivery-123",
  payload:{action:"created",installation:{id:82},repositories:[{id:11},{id:12}]}});
 assert.deepEqual(evt.repositoryIds,[11,12]);assert.equal(evt.status,"unapplied");
 assert.throws(()=>normalizeInstallationEvent({eventName:"push",deliveryId:"test-delivery-123",payload:{action:"created",installation:{id:82}}}),/Unsupported/);
});
test("installation tokens are requested only for explicit repository IDs and read permissions",async()=>{
 let endpoint,options;
 const fake=async (url,opts)=>{endpoint=url;options=opts;return {ok:true,json:async()=>({token:"test-token-123456789",expires_at:"2030-01-01T00:00:00Z"})}};
 const result=await requestInstallationToken({appJwt:"test.jwt.signature",installationId:82,repoIds:[11,12],fetcher:fake});
 assert.equal(result.expiresAt,"2030-01-01T00:00:00Z");
 assert.equal(endpoint,"https://api.github.com/app/installations/82/access_tokens");
 assert.deepEqual(JSON.parse(options.body),{repository_ids:[11,12],permissions:{contents:"read",metadata:"read"}});
 assert.equal(options.redirect,"error");
});
test("unsafe token requests fail before contacting GitHub",async()=>{
 let count=0;const fake=async()=>{count++;throw Error("Unexpected network")};
 await assert.rejects(requestInstallationToken({appJwt:"test.jwt.signature",installationId:82,repoIds:[],fetcher:fake}),/Invalid/);
 await assert.rejects(requestInstallationToken({appJwt:"test.jwt.signature",installationId:82,repoIds:[11,11],fetcher:fake}),/Invalid/);
 assert.equal(count,0);
});
test("upstream failures do not return sensitive provider errors",async()=>{
 await assert.rejects(requestInstallationToken({appJwt:"test.jwt.signature",installationId:82,repoIds:[11],
  fetcher:async()=>({ok:false,status:403,text:async()=>"real credential logged"})}),/GitHub token request failed/);
});
