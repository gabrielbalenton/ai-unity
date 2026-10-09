import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {getVerifiedUser} from "@/lib/supabase/server";
import {createSupabaseAdmin,isSupabaseAdminConfigured} from "@/lib/supabase/admin";
import {requireInfisicalBootstrap,isInfisicalConfigured} from "@/lib/security/infisical-config";
import {createInfisicalLocation,createInfisicalLocationRegistry,createInfisicalVault} from "@/lib/security/infisical-vault.mjs";
import {openConnectionAuthSession,CONNECTION_AUTH_COOKIE} from "@/lib/security/connection-auth-cookie.mjs";
import {verifyConnectionAuthSession} from "@/lib/security/connection-auth-session.mjs";
import {exchangeOpenRouterAuthorizationCode} from "@/lib/infrastructure/openrouter-auth.mjs";

export const dynamic="force-dynamic";

function safeReturn(status:"connected"|"error"){
 const origin=process.env.UNITY_APP_ORIGIN;
 const url=new URL("/",origin||"http://localhost:3000");
 url.searchParams.set("connection","openrouter");
 url.searchParams.set("status",status);
 return url;
}

function projectSecretPath(base:string,projectId:string){
 const suffix=projectId.toLowerCase();
 if(!/^[a-f0-9-]{36}$/.test(suffix))throw new Error("Invalid project secret path");
 return `${base.replace(/\/$/,"")}/${suffix}`;
}

export async function GET(request:Request){
 const fail=()=>{
  const response=NextResponse.redirect(safeReturn("error"),303);
  response.cookies.delete(CONNECTION_AUTH_COOKIE.name);
  return response;
 };
 if(!isSupabaseConfigured()||!isSupabaseAdminConfigured()||!isInfisicalConfigured())return fail();
 try{
  const requestUrl=new URL(request.url);
  const code=requestUrl.searchParams.get("code");
  const state=requestUrl.searchParams.get("state");
  if(!code||!state)return fail();
  const cookieStore=await cookies();
  const sealed=cookieStore.get(CONNECTION_AUTH_COOKIE.name)?.value;
  const sessionSecret=process.env.UNITY_CONNECTION_SESSION_SECRET;
  if(!sealed||!sessionSecret)return fail();
  const session=openConnectionAuthSession(sealed,sessionSecret);
  const verified=verifyConnectionAuthSession(session,{
   service:"openrouter",
   projectId:String(session.projectId||""),
   state
  });
  const {user}=await getVerifiedUser();
  if(!user)return fail();
  const admin=createSupabaseAdmin();
  const {data:project,error:projectError}=await admin.from("projects").select("id").eq("id",verified.projectId).eq("owner_id",user.id).maybeSingle();
  if(projectError||!project)return fail();

  const exchanged=await exchangeOpenRouterAuthorizationCode({code,verifier:verified.verifier});
  const bootstrap=requireInfisicalBootstrap();
  const secretRef=`secret:openrouter/${verified.projectId}/main`;
  const locations=createInfisicalLocationRegistry([createInfisicalLocation({
   secretRef,
   secretName:"OPENROUTER_API_KEY",
   projectId:bootstrap.projectId,
   environment:bootstrap.environment,
   secretPath:projectSecretPath(bootstrap.secretPath,verified.projectId)
  })]);
  const vault=createInfisicalVault({
   locations,
   getBootstrapCredentials:async()=>({clientId:bootstrap.clientId,clientSecret:bootstrap.clientSecret})
  });
  await vault.putSecret(secretRef,exchanged.key);

  const connectionKey=`openrouter:${verified.projectId}`;
  const {data:connection,error:connectionError}=await admin.from("account_connections").upsert({
   owner_id:user.id,
   connection_key:connectionKey,
   provider:"openrouter",
   account_label:"OpenRouter",
   sign_in_method:"unknown",
   auth_method:"api_key_ref",
   credential_reference:secretRef,
   external_account_id:exchanged.userId,
   status:"ready",
   updated_at:new Date().toISOString()
  },{onConflict:"owner_id,connection_key"}).select("id").single();
  if(connectionError||!connection?.id)return fail();

  const {error:bindingError}=await admin.from("project_account_bindings").upsert({
   project_id:verified.projectId,
   account_connection_id:connection.id,
   resource_id:"openrouter:models",
   permission_mode:"read",
   updated_at:new Date().toISOString()
  },{onConflict:"project_id,account_connection_id,resource_id"});
  if(bindingError)return fail();

  const response=NextResponse.redirect(safeReturn("connected"),303);
  response.cookies.delete(CONNECTION_AUTH_COOKIE.name);
  return response;
 }catch{
  return fail();
 }
}
