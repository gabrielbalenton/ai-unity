import {createHash,randomBytes,timingSafeEqual} from "node:crypto";

const SERVICE=/^[a-z][a-z0-9_-]{1,79}$/;
const PROJECT=/^[a-z0-9][a-z0-9._:-]{2,119}$/;
const b64url=buffer=>buffer.toString("base64url");

function digest(value){return createHash("sha256").update(value).digest()}

export function createConnectionAuthSession({service,projectId,now=Date.now(),ttlMs=10*60*1000}){
 if(!SERVICE.test(service??"")||!PROJECT.test(projectId??""))throw new Error("Invalid connection authorization scope");
 if(!Number.isInteger(ttlMs)||ttlMs<60_000||ttlMs>15*60*1000)throw new Error("Invalid connection authorization lifetime");
 const state=b64url(randomBytes(32));
 const verifier=b64url(randomBytes(48));
 const challenge=b64url(digest(verifier));
 const expiresAt=new Date(now+ttlMs).toISOString();
 return Object.freeze({service,projectId,state,verifier,challenge,challengeMethod:"S256",expiresAt});
}

export function verifyConnectionAuthSession(session,{service,projectId,state,now=Date.now()}){
 if(!session||!SERVICE.test(service??"")||!PROJECT.test(projectId??"")||typeof state!=="string")
  throw new Error("Invalid connection authorization return");
 if(session.service!==service||session.projectId!==projectId)throw new Error("Connection authorization scope mismatch");
 const expected=Buffer.from(session.state);
 const actual=Buffer.from(state);
 if(expected.length!==actual.length||!timingSafeEqual(expected,actual))throw new Error("Connection authorization state mismatch");
 const expiry=Date.parse(session.expiresAt);
 if(!Number.isFinite(expiry)||now>=expiry)throw new Error("Connection authorization expired");
 return Object.freeze({
  verified:true,
  service,
  projectId,
  verifier:session.verifier,
  challengeMethod:session.challengeMethod
 });
}

export function publicConnectionAuthStart(session){
 if(!session)throw new Error("Missing connection authorization session");
 return Object.freeze({
  service:session.service,
  projectId:session.projectId,
  state:session.state,
  challenge:session.challenge,
  challengeMethod:session.challengeMethod,
  expiresAt:session.expiresAt
 });
}
