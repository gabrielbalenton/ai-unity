import {NextResponse} from "next/server";
import {z} from "zod";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {getVerifiedUser} from "@/lib/supabase/server";
import {createSupabaseAdmin,isSupabaseAdminConfigured} from "@/lib/supabase/admin";
import {requireInfisicalBootstrap,isInfisicalConfigured} from "@/lib/security/infisical-config";
import {createInfisicalLocation,createInfisicalLocationRegistry,createInfisicalVault} from "@/lib/security/infisical-vault.mjs";
import {listSupabaseProjects} from "@/lib/infrastructure/supabase-management-auth.mjs";
import {checkWriteOrigin} from "@/lib/security/origin.mjs";
import {readBoundedJson} from "@/lib/security/bounded-body.mjs";

export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
const schema=z.object({projectId:z.string().uuid(),supabaseProjectRef:z.string().regex(/^[a-z0-9]{8,40}$/)}).strict();
function secretPath(base:string,projectId:string){return `${base.replace(/\/$/,"")}/${projectId.toLowerCase()}`}

export async function POST(request:Request){
 if(!isSupabaseConfigured()||!isSupabaseAdminConfigured()||!isInfisicalConfigured())
  return NextResponse.json({error:"Secure Supabase connection backend is not configured"},{status:503,headers});
 const originCheck=checkWriteOrigin(request.headers.get("origin"),process.env.UNITY_APP_ORIGIN);
 if(!originCheck.allowed)return NextResponse.json({error:"Untrusted request origin"},{status:403,headers});
 let payload:unknown;
 try{payload=await readBoundedJson(request,{maxBytes:1200})}catch{return NextResponse.json({error:"Invalid request body"},{status:400,headers})}
 const parsed=schema.safeParse(payload);
 if(!parsed.success)return NextResponse.json({error:"Invalid project selection"},{status:400,headers});
 try{
  const {user}=await getVerifiedUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401,headers});
  const admin=createSupabaseAdmin();
  const {data:project,error:projectError}=await admin.from("projects").select("id").eq("id",parsed.data.projectId).eq("owner_id",user.id).maybeSingle();
  if(projectError)return NextResponse.json({error:"Project service unavailable"},{status:503,headers});
  if(!project)return NextResponse.json({error:"Project not found"},{status:404,headers});

  const {data:account,error:accountError}=await admin.from("account_connections")
   .select("id,credential_reference,status")
   .eq("owner_id",user.id).eq("provider","supabase").eq("connection_key",`supabase:${parsed.data.projectId}`).maybeSingle();
  if(accountError)return NextResponse.json({error:"Connection storage unavailable"},{status:503,headers});
  if(!account||account.status!=="ready")return NextResponse.json({error:"Connect Supabase first"},{status:409,headers});
  const expectedRef=`secret:supabase/${parsed.data.projectId}/oauth`;
  if(account.credential_reference!==expectedRef)return NextResponse.json({error:"Supabase connection needs to be reconnected"},{status:409,headers});

  const bootstrap=requireInfisicalBootstrap();
  const registry=createInfisicalLocationRegistry([createInfisicalLocation({
   secretRef:expectedRef,secretName:"SUPABASE_OAUTH_BUNDLE",projectId:bootstrap.projectId,
   environment:bootstrap.environment,secretPath:secretPath(bootstrap.secretPath,parsed.data.projectId)
  })]);
  const vault=createInfisicalVault({locations:registry,getBootstrapCredentials:async()=>({clientId:bootstrap.clientId,clientSecret:bootstrap.clientSecret})});
  const allowedProjects=await vault.useSecret(expectedRef,async raw=>{
   let bundle;
   try{bundle=JSON.parse(raw)}catch{throw new Error("Stored Supabase authorization is invalid")}
   if(!bundle||bundle.version!==1||typeof bundle.accessToken!=="string")throw new Error("Stored Supabase authorization is invalid");
   if(typeof bundle.expiresAt==="string"&&Date.parse(bundle.expiresAt)<=Date.now())throw new Error("Supabase authorization expired");
   return listSupabaseProjects({accessToken:bundle.accessToken});
  });
  const chosen=allowedProjects.find(item=>item.ref===parsed.data.supabaseProjectRef);
  if(!chosen)return NextResponse.json({error:"That Supabase project is not authorized for this account"},{status:403,headers});

  const {data:bindings,error:bindingReadError}=await admin.from("project_account_bindings")
   .select("id,resource_id").eq("project_id",parsed.data.projectId).eq("account_connection_id",account.id).limit(20);
  if(bindingReadError)return NextResponse.json({error:"Connection storage unavailable"},{status:503,headers});
  const existing=(bindings??[]).find(item=>item.resource_id==="supabase:account"||item.resource_id.startsWith("supabase:project:"));
  const resourceId=`supabase:project:${chosen.ref}`;
  let writeError;
  if(existing){
   ({error:writeError}=await admin.from("project_account_bindings").update({resource_id:resourceId,permission_mode:"read",updated_at:new Date().toISOString()}).eq("id",existing.id));
  }else{
   ({error:writeError}=await admin.from("project_account_bindings").insert({project_id:parsed.data.projectId,account_connection_id:account.id,resource_id:resourceId,permission_mode:"read"}));
  }
  if(writeError)return NextResponse.json({error:"Supabase project binding could not be saved"},{status:503,headers});
  return NextResponse.json({selected:{ref:chosen.ref,name:chosen.name,status:chosen.status},permissionMode:"read"},{headers});
 }catch(error){
  const expired=error instanceof Error&&/expired/.test(error.message);
  return NextResponse.json({error:expired?"Supabase authorization expired. Reconnect Supabase.":"Supabase project selection failed"},{status:expired?409:503,headers});
 }
}
