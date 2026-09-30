/**
 * Server-only GitHub App transport primitives. This module does not install
 * applications, persist installation tokens or authorize project access.
 * NEVER import into client components or log returned credentials.
 */
import {createSign,createHmac,timingSafeEqual} from "node:crypto";
const encoder=value=>Buffer.from(JSON.stringify(value)).toString("base64url");
const positiveId=value=>typeof value==="number"&&Number.isSafeInteger(value)&&value>0;
export function makeAppJwt({appId,privateKey,nowSeconds=Math.floor(Date.now()/1000)}) {
 if (!(typeof appId==="string"&&/^[0-9]{1,20}$/.test(appId)) &&
     !(typeof appId==="number"&&positiveId(appId))) throw Error("Invalid GitHub App ID");
 if(typeof privateKey!=="string"||!privateKey.includes("PRIVATE KEY")||
   !Number.isInteger(nowSeconds)||nowSeconds<=0)throw Error("Invalid signing configuration");
 const header=encoder({alg:"RS256",typ:"JWT"});
 const body=encoder({iat:nowSeconds-60,exp:nowSeconds+540,iss:String(appId)});
 const input=header+"."+body;
 const signer=createSign("RSA-SHA256");signer.update(input);signer.end();
 let signature;
 try{signature=signer.sign(privateKey).toString("base64url")}
 catch{throw Error("Invalid private key; unable to create app JWT")}
 return input+"."+signature;
}
export function verifyWebhookSignature({rawBody,header,secret}) {
 if((typeof rawBody!=="string"&&!Buffer.isBuffer(rawBody))||
   (typeof rawBody==="string"&&Buffer.byteLength(rawBody)>1000000)||
   (Buffer.isBuffer(rawBody)&&rawBody.byteLength>1000000)||
   typeof secret!=="string"||secret.length<16||
   typeof header!=="string"||!/^sha256=[a-f0-9]{64}$/.test(header)) return false;
 const digest=createHmac("sha256",secret).update(rawBody).digest();
 const received=Buffer.from(header.slice(7),"hex");
 return received.length===digest.length&&timingSafeEqual(received,digest);
}
export function normalizeInstallationEvent({eventName,deliveryId,payload}) {
 if(typeof eventName!=="string"||!["installation","installation_repositories"].includes(eventName)||
   typeof deliveryId!=="string"||!/^[a-zA-Z0-9-]{8,100}$/.test(deliveryId)||
   !payload||typeof payload!=="object"||!["created","deleted","suspend","unsuspend","added","removed"].includes(payload.action)||
   !positiveId(payload.installation?.id))throw Error("Unsupported installation event");
 const repoIds=new Set();
 for(const arr of [payload.repositories,payload.repositories_added,payload.repositories_removed]){
  if(arr!==undefined&&!Array.isArray(arr))throw Error("Invalid repository list");
  if(arr?.length>1000)throw Error("Oversized repository list");
  for(const repo of arr||[]){
   if(!positiveId(repo?.id))throw Error("Invalid repository ID");
   repoIds.add(repo.id);
  }
 }
 return Object.freeze({eventName,deliveryId,action:payload.action,
  installationId:payload.installation.id,repositoryIds:[...repoIds],
  status:"unapplied",notice:"Verified event still requires delivery deduplication and installation ownership checks before changing stored grants."});
}
export async function requestInstallationToken({appJwt,installationId,repoIds,fetcher=fetch}) {
 if(typeof appJwt!=="string"||appJwt.split(".").length!==3||
   !positiveId(installationId)||!Array.isArray(repoIds)||repoIds.length<1||
   repoIds.length>100||!repoIds.every(positiveId)||new Set(repoIds).size!==repoIds.length)
  throw Error("Invalid installation token request");
 const response=await fetcher("https://api.github.com/app/installations/"+installationId+"/access_tokens",{
  method:"POST",redirect:"error",signal:AbortSignal.timeout(8000),
  headers:{Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28",Authorization:"Bearer "+appJwt,
   "Content-Type":"application/json"},
  body:JSON.stringify({repository_ids:repoIds,permissions:{contents:"read",metadata:"read"}})
 });
 if(!response?.ok)throw Error("GitHub token request failed");
 const body=await response.json();
 if(typeof body.token!=="string"||body.token.length<12||
   typeof body.expires_at!=="string"||!Number.isFinite(Date.parse(body.expires_at)))throw Error("Invalid GitHub token response");
 return {token:body.token,expiresAt:body.expires_at};
}
