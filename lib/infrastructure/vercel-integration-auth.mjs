const API="https://api.vercel.com";
const TOKEN_URL=`${API}/v2/oauth/access_token`;
const SLUG=/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;
const STATE=/^[A-Za-z0-9_-]{20,256}$/;
const CODE=/^[A-Za-z0-9._~-]{6,1000}$/;
const CLIENT=/^[A-Za-z0-9_-]{6,200}$/;
const TEAM=/^team_[A-Za-z0-9_-]{4,200}$/;
const PROJECT=/^[A-Za-z0-9_-]{4,200}$/;

function safeRedirect(value){
 const url=new URL(value);
 const local=["localhost","127.0.0.1"].includes(url.hostname);
 if(url.protocol!=="https:"&&!local)throw new Error("Vercel redirect must use HTTPS");
 if(url.username||url.password||url.hash)throw new Error("Invalid Vercel redirect");
 return url.toString();
}

export function buildVercelInstallationUrl({slug,state}){
 if(!SLUG.test(slug??"")||!STATE.test(state??""))throw new Error("Invalid Vercel installation start");
 const url=new URL(`https://vercel.com/integrations/${slug}/new`);
 url.searchParams.set("state",state);
 return url.toString();
}

export function safeVercelNextUrl(value){
 if(typeof value!=="string"||value.length>3000)return null;
 try{const url=new URL(value);return url.protocol==="https:"&&url.hostname==="vercel.com"&&!url.username&&!url.password&&!url.hash?url.toString():null}catch{return null}
}

export async function exchangeVercelCode({clientId,clientSecret,code,redirectUri,fetchImpl=globalThis.fetch}){
 if(!CLIENT.test(clientId??"")||typeof clientSecret!=="string"||clientSecret.length<12||!CODE.test(code??"")||typeof fetchImpl!=="function")throw new Error("Invalid Vercel authorization return");
 const body=new URLSearchParams({client_id:clientId,client_secret:clientSecret,code,redirect_uri:safeRedirect(redirectUri)});
 const response=await fetchImpl(TOKEN_URL,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded",Accept:"application/json"},body,cache:"no-store",redirect:"error"});
 if(!response?.ok)throw new Error("Vercel authorization exchange failed");
 let data;try{data=await response.json()}catch{throw new Error("Vercel returned an invalid authorization response")}
 if(typeof data?.access_token!=="string"||data.access_token.length<12)throw new Error("Vercel authorization response missing token");
 const teamId=typeof data.team_id==="string"&&TEAM.test(data.team_id)?data.team_id:null;
 return Object.freeze({accessToken:data.access_token,teamId,userId:typeof data.user_id==="string"?data.user_id.slice(0,200):null,tokenType:typeof data.token_type==="string"?data.token_type:"Bearer"});
}

export async function listVercelProjects({accessToken,teamId=null,fetchImpl=globalThis.fetch}){
 if(typeof accessToken!=="string"||accessToken.length<12||typeof fetchImpl!=="function")throw new Error("Invalid Vercel access token");
 if(teamId!==null&&!TEAM.test(teamId))throw new Error("Invalid Vercel team scope");
 const results=[];let until=null;let pages=0;
 do{
  const url=new URL(`${API}/v9/projects`);url.searchParams.set("limit","100");if(teamId)url.searchParams.set("teamId",teamId);if(until!==null)url.searchParams.set("until",String(until));
  const response=await fetchImpl(url.toString(),{method:"GET",headers:{Authorization:`Bearer ${accessToken}`,Accept:"application/json"},cache:"no-store",redirect:"error"});
  if(!response?.ok)throw new Error("Vercel projects could not be retrieved");
  let data;try{data=await response.json()}catch{throw new Error("Vercel returned an invalid projects response")}
  if(!Array.isArray(data?.projects))throw new Error("Vercel returned an invalid projects response");
  for(const item of data.projects){
   if(!item||typeof item.id!=="string"||!PROJECT.test(item.id)||typeof item.name!=="string"||item.name.length<1||item.name.length>200)continue;
   results.push({id:item.id,name:item.name,framework:typeof item.framework==="string"?item.framework.slice(0,80):null,updatedAt:Number.isFinite(item.updatedAt)?item.updatedAt:null});
   if(results.length>=500)return results;
  }
  const next=data?.pagination?.next;until=Number.isFinite(next)?next:null;pages++;
 }while(until!==null&&pages<5);
 return results;
}

export const VERCEL_INTEGRATION_ENDPOINTS=Object.freeze({token:TOKEN_URL,projects:`${API}/v9/projects`});
