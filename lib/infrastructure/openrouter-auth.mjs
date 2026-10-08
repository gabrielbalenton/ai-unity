const AUTH_URL="https://openrouter.ai/auth";
const EXCHANGE_URL="https://openrouter.ai/api/v1/auth/keys";
const SAFE_CODE=/^[A-Za-z0-9._~:-]{8,512}$/;
const SAFE_STATE=/^[A-Za-z0-9_-]{20,256}$/;
const SAFE_CHALLENGE=/^[A-Za-z0-9_-]{43,128}$/;
const SAFE_VERIFIER=/^[A-Za-z0-9_-]{43,128}$/;

function validatedCallback(value){
 const url=new URL(value);
 const local=["localhost","127.0.0.1"].includes(url.hostname);
 if(url.protocol!=="https:"&&!local)throw new Error("OpenRouter callback must use HTTPS");
 if(url.username||url.password||url.hash)throw new Error("Invalid OpenRouter callback URL");
 return url.toString();
}

export function buildOpenRouterAuthorizationUrl({callbackUrl,challenge,state}){
 const callback=validatedCallback(callbackUrl);
 if(!SAFE_CHALLENGE.test(challenge??"")||!SAFE_STATE.test(state??""))
  throw new Error("Invalid OpenRouter PKCE start");
 const callbackWithState=new URL(callback);
 callbackWithState.searchParams.set("state",state);
 const url=new URL(AUTH_URL);
 url.searchParams.set("callback_url",callbackWithState.toString());
 url.searchParams.set("code_challenge",challenge);
 url.searchParams.set("code_challenge_method","S256");
 return url.toString();
}

/**
 * Server-only exchange helper. The returned key is intentionally short-lived in
 * caller memory and must be handed directly to the vault writer. It must never
 * be serialized to a browser response, log, trace, project record or error.
 */
export async function exchangeOpenRouterAuthorizationCode({code,verifier,fetchImpl=globalThis.fetch}){
 if(!SAFE_CODE.test(code??"")||!SAFE_VERIFIER.test(verifier??"")||typeof fetchImpl!=="function")
  throw new Error("Invalid OpenRouter authorization return");
 const response=await fetchImpl(EXCHANGE_URL,{
  method:"POST",
  headers:{"Content-Type":"application/json","Accept":"application/json"},
  body:JSON.stringify({code,code_verifier:verifier,code_challenge_method:"S256"}),
  cache:"no-store",
  redirect:"error"
 });
 if(!response?.ok)throw new Error("OpenRouter authorization exchange failed");
 let data;
 try{data=await response.json()}catch{throw new Error("OpenRouter returned an invalid authorization response")}
 if(typeof data?.key!=="string"||data.key.length<20)throw new Error("OpenRouter authorization response missing key");
 return Object.freeze({key:data.key,userId:typeof data.user_id==="string"?data.user_id:null});
}

export const OPENROUTER_AUTH_ENDPOINTS=Object.freeze({authorization:AUTH_URL,exchange:EXCHANGE_URL});
