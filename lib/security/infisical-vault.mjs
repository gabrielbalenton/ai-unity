const CLOUD_HOST="https://app.infisical.com";
const SECRET_REF=/^secret:[a-z0-9][a-z0-9._:/-]{2,199}$/;
const SAFE_NAME=/^[A-Z][A-Z0-9_]{1,119}$/;
const SAFE_ENV=/^[a-z0-9][a-z0-9_-]{0,39}$/;
const SAFE_PATH=/^\/(?:[A-Za-z0-9._-]+\/?)*$/;
const nonempty=value=>typeof value==="string"&&value.trim().length>0;

function safeJson(response){
 return response.json().catch(()=>{throw new Error("Infisical returned an invalid response")});
}

/**
 * Maps UNITY's abstract secret references to Infisical locations. These records
 * are metadata only; they never contain a secret value.
 */
export function createInfisicalLocation({secretRef,secretName,projectId,environment="prod",secretPath="/unity"}){
 if(!SECRET_REF.test(secretRef??"")||!SAFE_NAME.test(secretName??"")||!nonempty(projectId)||projectId.length>160||
    !SAFE_ENV.test(environment??"")||!SAFE_PATH.test(secretPath??""))
  throw new Error("Invalid Infisical secret location");
 return Object.freeze({secretRef,secretName,projectId,environment,secretPath});
}

export function createInfisicalLocationRegistry(locations=[]){
 if(!Array.isArray(locations)||locations.length>500)throw new Error("Invalid Infisical location registry");
 const refs=new Set();
 const output=new Map();
 for(const input of locations){
  const item=createInfisicalLocation(input);
  if(refs.has(item.secretRef))throw new Error("Duplicate Infisical secret reference");
  refs.add(item.secretRef);output.set(item.secretRef,item);
 }
 return output;
}

/**
 * Universal Auth implementation for Infisical Cloud. Bootstrap credentials are
 * supplied at runtime by getBootstrapCredentials and are never accepted through
 * a browser API or persisted by this adapter.
 */
export function createInfisicalVault({
 host=CLOUD_HOST,
 locations,
 getBootstrapCredentials,
 fetchImpl=globalThis.fetch
}){
 if(host!==CLOUD_HOST)throw new Error("Only the reviewed Infisical Cloud host is enabled");
 if(!(locations instanceof Map)||typeof getBootstrapCredentials!=="function"||typeof fetchImpl!=="function")
  throw new Error("Invalid Infisical vault configuration");

 async function login(){
  const bootstrap=await getBootstrapCredentials();
  if(!bootstrap||!nonempty(bootstrap.clientId)||!nonempty(bootstrap.clientSecret))
   throw new Error("Infisical machine identity is not configured");
  const body=new URLSearchParams({clientId:bootstrap.clientId,clientSecret:bootstrap.clientSecret});
  const response=await fetchImpl(`${host}/api/v1/auth/universal-auth/login`,{
   method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body,
   cache:"no-store",redirect:"error"
  });
  if(!response?.ok)throw new Error("Infisical authentication failed");
  const data=await safeJson(response);
  if(!nonempty(data?.accessToken))throw new Error("Infisical authentication response missing token");
  return data.accessToken;
 }

 function requireLocation(secretRef){
  if(!SECRET_REF.test(secretRef??""))throw new Error("Invalid Infisical secret request");
  const location=locations.get(secretRef);
  if(!location)throw new Error("Unknown Infisical secret reference");
  return location;
 }

 async function writeSecret(accessToken,location,secretValue,method){
  const response=await fetchImpl(`${host}/api/v4/secrets/${encodeURIComponent(location.secretName)}`,{
   method,
   headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json","Accept":"application/json"},
   body:JSON.stringify({
    projectId:location.projectId,
    environment:location.environment,
    secretValue,
    secretPath:location.secretPath,
    type:"shared",
    skipMultilineEncoding:false
   }),
   cache:"no-store",
   redirect:"error"
  });
  return response;
 }

 return Object.freeze({
  kind:"infisical",
  configured:true,
  async useSecret(secretRef,callback){
   if(typeof callback!=="function")throw new Error("Invalid Infisical secret request");
   const location=requireLocation(secretRef);
   const accessToken=await login();
   const url=new URL(`${host}/api/v4/secrets/${encodeURIComponent(location.secretName)}`);
   url.searchParams.set("projectId",location.projectId);
   url.searchParams.set("environment",location.environment);
   url.searchParams.set("secretPath",location.secretPath);
   const response=await fetchImpl(url.toString(),{
    method:"GET",headers:{Authorization:`Bearer ${accessToken}`},cache:"no-store",redirect:"error"
   });
   if(!response?.ok)throw new Error("Infisical secret retrieval failed");
   const data=await safeJson(response);
   const secret=data?.secret?.secretValue;
   if(!nonempty(secret))throw new Error("Infisical secret value unavailable");
   try{return await callback(secret)}finally{
    // JavaScript strings cannot be zeroed in-place. Keep the value scoped to this
    // callback and never store it on the adapter, registry, response, or logs.
   }
  },
  async putSecret(secretRef,secretValue){
   if(!nonempty(secretValue))throw new Error("Invalid Infisical secret value");
   const location=requireLocation(secretRef);
   const accessToken=await login();
   let response=await writeSecret(accessToken,location,secretValue,"POST");
   if(response?.status===409||response?.status===422){
    response=await writeSecret(accessToken,location,secretValue,"PATCH");
   }
   if(!response?.ok)throw new Error("Infisical secret write failed");
   // Deliberately do not parse or return the provider response because it may
   // contain the secret value. Only non-sensitive metadata leaves this method.
   return Object.freeze({stored:true,secretRef});
  }
 });
}
