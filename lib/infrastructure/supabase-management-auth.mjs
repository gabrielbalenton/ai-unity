const AUTHORIZE_URL="https://api.supabase.com/v1/oauth/authorize";
const TOKEN_URL="https://api.supabase.com/v1/oauth/token";
const PROJECTS_URL="https://api.supabase.com/v1/projects";
const SAFE_CLIENT=/^[A-Za-z0-9._:-]{3,200}$/;
const SAFE_CODE=/^[A-Za-z0-9._~:/+-]{6,1000}$/;
const SAFE_STATE=/^[A-Za-z0-9_-]{20,256}$/;
const SAFE_PKCE=/^[A-Za-z0-9_-]{43,128}$/;

function secureRedirect(value){
 const url=new URL(value);
 const local=["localhost","127.0.0.1"].includes(url.hostname);
 if(url.protocol!=="https:"&&!local)throw new Error("Supabase OAuth redirect must use HTTPS");
 if(url.username||url.password||url.hash)throw new Error("Invalid Supabase OAuth redirect");
 return url.toString();
}

export function buildSupabaseAuthorizationUrl({clientId,redirectUri,state,challenge,organizationSlug}){
 if(!SAFE_CLIENT.test(clientId??"")||!SAFE_STATE.test(state??"")||!SAFE_PKCE.test(challenge??""))
  throw new Error("Invalid Supabase OAuth start");
 const url=new URL(AUTHORIZE_URL);
 url.searchParams.set("client_id",clientId);
 url.searchParams.set("redirect_uri",secureRedirect(redirectUri));
 url.searchParams.set("response_type","code");
 url.searchParams.set("state",state);
 url.searchParams.set("code_challenge",challenge);
 url.searchParams.set("code_challenge_method","S256");
 if(organizationSlug){
  if(!/^[a-z0-9][a-z0-9_-]{1,99}$/i.test(organizationSlug))throw new Error("Invalid Supabase organization slug");
  url.searchParams.set("organization_slug",organizationSlug);
 }
 return url.toString();
}

export async function exchangeSupabaseAuthorizationCode({clientId,clientSecret,code,verifier,redirectUri,fetchImpl=globalThis.fetch}){
 if(!SAFE_CLIENT.test(clientId??"")||typeof clientSecret!=="string"||clientSecret.length<8||
    !SAFE_CODE.test(code??"")||!SAFE_PKCE.test(verifier??"")||typeof fetchImpl!=="function")
  throw new Error("Invalid Supabase OAuth return");
 const body=new URLSearchParams({
  grant_type:"authorization_code",
  client_id:clientId,
  client_secret:clientSecret,
  code,
  code_verifier:verifier,
  redirect_uri:secureRedirect(redirectUri)
 });
 const response=await fetchImpl(TOKEN_URL,{
  method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","Accept":"application/json"},
  body,cache:"no-store",redirect:"error"
 });
 if(!response?.ok)throw new Error("Supabase OAuth exchange failed");
 let data;
 try{data=await response.json()}catch{throw new Error("Supabase returned an invalid OAuth response")}
 if(typeof data?.access_token!=="string"||data.access_token.length<10||typeof data?.refresh_token!=="string"||data.refresh_token.length<10)
  throw new Error("Supabase OAuth response missing tokens");
 return Object.freeze({
  accessToken:data.access_token,
  refreshToken:data.refresh_token,
  expiresIn:Number.isFinite(data.expires_in)?data.expires_in:null,
  tokenType:typeof data.token_type==="string"?data.token_type:"Bearer"
 });
}

export async function listSupabaseProjects({accessToken,fetchImpl=globalThis.fetch}){
 if(typeof accessToken!=="string"||accessToken.length<10||typeof fetchImpl!=="function")throw new Error("Invalid Supabase access token");
 const response=await fetchImpl(PROJECTS_URL,{
  method:"GET",headers:{Authorization:`Bearer ${accessToken}`,Accept:"application/json"},cache:"no-store",redirect:"error"
 });
 if(!response?.ok)throw new Error("Supabase projects could not be retrieved");
 let data;
 try{data=await response.json()}catch{throw new Error("Supabase returned an invalid projects response")}
 if(!Array.isArray(data))throw new Error("Supabase returned an invalid projects response");
 return data.slice(0,500).flatMap(item=>{
  if(!item||typeof item.ref!=="string"||typeof item.name!=="string")return [];
  return [{ref:item.ref,name:item.name,organizationId:typeof item.organization_id==="string"?item.organization_id:null,status:typeof item.status==="string"?item.status:null}];
 });
}

export const SUPABASE_MANAGEMENT_ENDPOINTS=Object.freeze({authorize:AUTHORIZE_URL,token:TOKEN_URL,projects:PROJECTS_URL});
