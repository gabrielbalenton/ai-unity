import {NextResponse} from "next/server";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {getVerifiedUser} from "@/lib/supabase/server";
import {createSupabaseAdmin,isSupabaseAdminConfigured} from "@/lib/supabase/admin";
import {requireInfisicalBootstrap,isInfisicalConfigured} from "@/lib/security/infisical-config";
import {createInfisicalLocation,createInfisicalLocationRegistry,createInfisicalVault} from "@/lib/security/infisical-vault.mjs";
import {listSupabaseProjects} from "@/lib/infrastructure/supabase-management-auth.mjs";

export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function secretPath(base:string,projectId:string){return `${base.replace(/\/$/,"")}/${projectId.toLowerCase()}`}

export async function GET(request:Request){
 if(!isSupabaseConfigured()||!isSupabaseAdminConfigured()||!isInfisicalConfigured())
  return NextResponse.json({error:"Secure Supabase connection backend is not configured"},{status:503,headers});
 const url=new URL(request.url);
 const projectId=url.searchParams.get("projectId")||"";
 if(!UUID.test(projectId))return NextResponse.json({error:"Invalid project"},{status:400,headers});
 try{
  const {user}=await getVerifiedUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401,headers});
  const admin=createSupabaseAdmin();
  const {data:project,error:projectError}=await admin.from("projects").select("id").eq("id",projectId).eq("owner_id",user.id).maybeSingle();
  if(projectError)return NextResponse.json({error:"Project service unavailable"},{status:503,headers});
  if(!project)return NextResponse.json({error:"Project not found"},{status:404,headers});

  const {data:account,error:accountError}=await admin.from("account_connections")
   .select("id,credential_reference,status")
   .eq("owner_id",user.id).eq("provider","supabase").eq("connection_key",`supabase:${projectId}`).maybeSingle();
  if(accountError)return NextResponse.json({error:"Connection storage unavailable"},{status:503,headers});
  if(!account||account.status!=="ready")return NextResponse.json({error:"Connect Supabase first"},{status:409,headers});
  const expectedRef=`secret:supabase/${projectId}/oauth`;
  if(account.credential_reference!==expectedRef)return NextResponse.json({error:"Supabase connection needs to be reconnected"},{status:409,headers});

  const bootstrap=requireInfisicalBootstrap();
  const registry=createInfisicalLocationRegistry([createInfisicalLocation({
   secretRef:expectedRef,secretName:"SUPABASE_OAUTH_BUNDLE",projectId:bootstrap.projectId,
   environment:bootstrap.environment,secretPath:secretPath(bootstrap.secretPath,projectId)
  })]);
  const vault=createInfisicalVault({locations:registry,getBootstrapCredentials:async()=>({clientId:bootstrap.clientId,clientSecret:bootstrap.clientSecret})});
  const projects=await vault.useSecret(expectedRef,async (raw:string)=>{
   let bundle:unknown;
   try{bundle=JSON.parse(raw)}catch{throw new Error("Stored Supabase authorization is invalid")}
   if(!bundle||typeof bundle!=="object"||!("version" in bundle)||!("accessToken" in bundle))throw new Error("Stored Supabase authorization is invalid");
   const typed=bundle as {version?:unknown;accessToken?:unknown;expiresAt?:unknown};
   if(typed.version!==1||typeof typed.accessToken!=="string")throw new Error("Stored Supabase authorization is invalid");
   if(typeof typed.expiresAt==="string"&&Date.parse(typed.expiresAt)<=Date.now())throw new Error("Supabase authorization expired");
   return listSupabaseProjects({accessToken:typed.accessToken});
  });
  return NextResponse.json({projects},{headers});
 }catch(error){
  const expired=error instanceof Error&&/expired/.test(error.message);
  return NextResponse.json({error:expired?"Supabase authorization expired. Reconnect Supabase.":"Supabase projects are unavailable"},{status:expired?409:503,headers});
 }
}
