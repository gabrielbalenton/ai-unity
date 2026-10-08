import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {getVerifiedUser} from "@/lib/supabase/server";
import {createSupabaseAdmin,isSupabaseAdminConfigured} from "@/lib/supabase/admin";
import {requireInfisicalBootstrap,isInfisicalConfigured} from "@/lib/security/infisical-config";
import {createInfisicalLocation,createInfisicalLocationRegistry,createInfisicalVault} from "@/lib/security/infisical-vault.mjs";
import {openConnectionAuthSession,CONNECTION_AUTH_COOKIE} from "@/lib/security/connection-auth-cookie.mjs";
import {verifyConnectionAuthSession} from "@/lib/security/connection-auth-session.mjs";
import {requireVercelIntegrationConfig,isVercelIntegrationConfigured} from "@/lib/infrastructure/vercel-integration-config";
import {exchangeVercelCode,safeVercelNextUrl} from "@/lib/infrastructure/vercel-integration-auth.mjs";
export const dynamic="force-dynamic";
function unityReturn(status:"connected"|"error"){const u=new URL("/",process.env.UNITY_APP_ORIGIN||"http://localhost:3000");u.searchParams.set("connection","vercel");u.searchParams.set("status",status);return u}
function path(base:string,suffix:string){return `${base.replace(/\/$/,"")}/${suffix}`}
export async function GET(request:Request){
 const url=new URL(request.url);const next=safeVercelNextUrl(url.searchParams.get("next"));
 const finish=(status:"connected"|"error")=>{const r=NextResponse.redirect(status==="connected"&&next?next:unityReturn(status),303);r.cookies.delete(CONNECTION_AUTH_COOKIE.name);return r};
 if(!isSupabaseConfigured()||!isSupabaseAdminConfigured()||!isInfisicalConfigured()||!isVercelIntegrationConfigured())return finish("error");
 try{
  const code=url.searchParams.get("code"),state=url.searchParams.get("state"),configurationId=url.searchParams.get("configurationId"),teamIdFromRedirect=url.searchParams.get("teamId");
  if(!code||!state||!configurationId||configurationId.length>200)return finish("error");
  const sealed=(await cookies()).get(CONNECTION_AUTH_COOKIE.name)?.value,sessionSecret=process.env.UNITY_CONNECTION_SESSION_SECRET;if(!sealed||!sessionSecret)return finish("error");
  const session=openConnectionAuthSession(sealed,sessionSecret);const verified=verifyConnectionAuthSession(session,{service:"vercel",projectId:String(session.projectId||""),state});
  const {user}=await getVerifiedUser();if(!user)return finish("error");const admin=createSupabaseAdmin();
  const {data:project,error}=await admin.from("projects").select("id").eq("id",verified.projectId).eq("owner_id",user.id).maybeSingle();if(error||!project)return finish("error");
  const cfg=requireVercelIntegrationConfig(),bootstrap=requireInfisicalBootstrap();const appSecretRef=cfg.clientSecretRef,tokenRef=`secret:vercel/${verified.projectId}/oauth`;
  const registry=createInfisicalLocationRegistry([
   createInfisicalLocation({secretRef:appSecretRef,secretName:cfg.clientSecretName,projectId:bootstrap.projectId,environment:bootstrap.environment,secretPath:path(bootstrap.secretPath,"system/vercel")}),
   createInfisicalLocation({secretRef:tokenRef,secretName:"VERCEL_OAUTH_BUNDLE",projectId:bootstrap.projectId,environment:bootstrap.environment,secretPath:path(bootstrap.secretPath,verified.projectId.toLowerCase())})
  ]);
  const vault=createInfisicalVault({locations:registry,getBootstrapCredentials:async()=>({clientId:bootstrap.clientId,clientSecret:bootstrap.clientSecret})});
  const exchanged=await vault.useSecret(appSecretRef,(clientSecret:string)=>exchangeVercelCode({clientId:cfg.clientId,clientSecret,code,redirectUri:cfg.redirectUri}));
  if(teamIdFromRedirect&&exchanged.teamId&&teamIdFromRedirect!==exchanged.teamId)return finish("error");
  await vault.putSecret(tokenRef,JSON.stringify({version:1,accessToken:exchanged.accessToken,teamId:exchanged.teamId,configurationId,userId:exchanged.userId}));
  const scopeId=exchanged.teamId||`personal:${exchanged.userId||configurationId}`;
  const {data:connection,error:connectionError}=await admin.from("account_connections").upsert({owner_id:user.id,connection_key:`vercel:${verified.projectId}`,provider:"vercel",account_label:exchanged.teamId?"Vercel team":"Vercel personal",sign_in_method:"github",auth_method:"oauth_ref",credential_reference:tokenRef,external_account_id:scopeId,status:"ready",updated_at:new Date().toISOString()},{onConflict:"owner_id,connection_key"}).select("id").single();
  if(connectionError||!connection?.id)return finish("error");
  const {error:bindingError}=await admin.from("project_account_bindings").upsert({project_id:verified.projectId,account_connection_id:connection.id,resource_id:"vercel:account",permission_mode:"read",updated_at:new Date().toISOString()},{onConflict:"project_id,account_connection_id,resource_id"});if(bindingError)return finish("error");
  return finish("connected");
 }catch{return finish("error")}
}
