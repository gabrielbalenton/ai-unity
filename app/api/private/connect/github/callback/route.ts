import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {getVerifiedUser} from "@/lib/supabase/server";
import {createSupabaseAdmin,isSupabaseAdminConfigured} from "@/lib/supabase/admin";
import {requireInfisicalBootstrap,isInfisicalConfigured} from "@/lib/security/infisical-config";
import {createInfisicalLocation,createInfisicalLocationRegistry,createInfisicalVault} from "@/lib/security/infisical-vault.mjs";
import {openConnectionAuthSession,CONNECTION_AUTH_COOKIE} from "@/lib/security/connection-auth-cookie.mjs";
import {verifyConnectionAuthSession} from "@/lib/security/connection-auth-session.mjs";
import {requireGitHubIntegrationConfig,isGitHubIntegrationConfigured} from "@/lib/infrastructure/github-integration-config";
import {exchangeGitHubUserCode} from "@/lib/infrastructure/github-install-auth.mjs";
export const dynamic="force-dynamic";
function finish(status:"connected"|"error"){const u=new URL("/",process.env.UNITY_APP_ORIGIN||"http://localhost:3000");u.searchParams.set("connection","github");u.searchParams.set("status",status);return u}
function path(base:string,suffix:string){return `${base.replace(/\/$/,"")}/${suffix}`}
export async function GET(request:Request){
 const fail=()=>{const r=NextResponse.redirect(finish("error"),303);r.cookies.delete(CONNECTION_AUTH_COOKIE.name);return r};
 if(!isSupabaseConfigured()||!isSupabaseAdminConfigured()||!isInfisicalConfigured()||!isGitHubIntegrationConfigured())return fail();
 try{
  const url=new URL(request.url),code=url.searchParams.get("code"),state=url.searchParams.get("state");if(!code||!state)return fail();
  const sealed=(await cookies()).get(CONNECTION_AUTH_COOKIE.name)?.value,sessionSecret=process.env.UNITY_CONNECTION_SESSION_SECRET;if(!sealed||!sessionSecret)return fail();
  const session=openConnectionAuthSession(sealed,sessionSecret);const verified=verifyConnectionAuthSession(session,{service:"github",projectId:String(session.projectId||""),state});
  const {user}=await getVerifiedUser();if(!user)return fail();const admin=createSupabaseAdmin();
  const {data:project,error}=await admin.from("projects").select("id").eq("id",verified.projectId).eq("owner_id",user.id).maybeSingle();if(error||!project)return fail();
  const cfg=requireGitHubIntegrationConfig(),bootstrap=requireInfisicalBootstrap();
  const appSecretRef=cfg.clientSecretRef,oauthRef=`secret:github/${verified.projectId}/oauth`;
  const registry=createInfisicalLocationRegistry([
   createInfisicalLocation({secretRef:appSecretRef,secretName:cfg.clientSecretName,projectId:bootstrap.projectId,environment:bootstrap.environment,secretPath:path(bootstrap.secretPath,"system/github")}),
   createInfisicalLocation({secretRef:oauthRef,secretName:"GITHUB_USER_OAUTH_BUNDLE",projectId:bootstrap.projectId,environment:bootstrap.environment,secretPath:path(bootstrap.secretPath,verified.projectId.toLowerCase())})
  ]);
  const vault=createInfisicalVault({locations:registry,getBootstrapCredentials:async()=>({clientId:bootstrap.clientId,clientSecret:bootstrap.clientSecret})});
  const exchanged=await vault.useSecret(appSecretRef,(clientSecret:string)=>exchangeGitHubUserCode({clientId:cfg.clientId,clientSecret,code}));
  const expiresAt=exchanged.expiresIn?new Date(Date.now()+exchanged.expiresIn*1000).toISOString():null;
  await vault.putSecret(oauthRef,JSON.stringify({version:1,accessToken:exchanged.accessToken,refreshToken:exchanged.refreshToken,expiresAt}));
  const {data:connection,error:connectionError}=await admin.from("account_connections").upsert({owner_id:user.id,connection_key:`github:${verified.projectId}`,provider:"github",account_label:"GitHub",sign_in_method:"github",auth_method:"oauth_ref",credential_reference:oauthRef,external_account_id:null,status:"ready",updated_at:new Date().toISOString()},{onConflict:"owner_id,connection_key"}).select("id").single();
  if(connectionError||!connection?.id)return fail();
  const {error:bindingError}=await admin.from("project_account_bindings").upsert({project_id:verified.projectId,account_connection_id:connection.id,resource_id:"github:account",permission_mode:"read",updated_at:new Date().toISOString()},{onConflict:"project_id,account_connection_id,resource_id"});if(bindingError)return fail();
  const r=NextResponse.redirect(finish("connected"),303);r.cookies.delete(CONNECTION_AUTH_COOKIE.name);return r;
 }catch{return fail()}
}
