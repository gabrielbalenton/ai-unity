const SAFE_SLUG=/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;
const SAFE_CLIENT=/^[A-Za-z0-9_-]{6,200}$/;

function callbackFromOrigin(origin:string|undefined){
 if(!origin)return null;
 try{
  const url=new URL(origin);
  const local=["localhost","127.0.0.1"].includes(url.hostname);
  if(url.protocol!=="https:"&&!local)return null;
  if(url.username||url.password||url.hash)return null;
  return new URL("/api/private/connect/vercel/callback",url).toString();
 }catch{return null}
}

export function isVercelIntegrationConfigured():boolean{
 return Boolean(
  typeof process.env.VERCEL_INTEGRATION_SLUG==="string"&&SAFE_SLUG.test(process.env.VERCEL_INTEGRATION_SLUG)&&
  typeof process.env.VERCEL_INTEGRATION_CLIENT_ID==="string"&&SAFE_CLIENT.test(process.env.VERCEL_INTEGRATION_CLIENT_ID)&&
  callbackFromOrigin(process.env.UNITY_APP_ORIGIN)
 );
}

export function requireVercelIntegrationConfig(){
 if(!isVercelIntegrationConfigured())throw new Error("Vercel integration is not configured");
 return Object.freeze({
  slug:process.env.VERCEL_INTEGRATION_SLUG!,
  clientId:process.env.VERCEL_INTEGRATION_CLIENT_ID!,
  redirectUri:callbackFromOrigin(process.env.UNITY_APP_ORIGIN)!,
  clientSecretRef:"secret:vercel/integration/client-secret",
  clientSecretName:"VERCEL_INTEGRATION_CLIENT_SECRET"
 });
}
