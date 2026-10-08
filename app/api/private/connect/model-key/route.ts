import {NextResponse} from "next/server";
import {z} from "zod";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {getVerifiedUser} from "@/lib/supabase/server";
import {createSupabaseAdmin,isSupabaseAdminConfigured} from "@/lib/supabase/admin";
import {checkWriteOrigin} from "@/lib/security/origin.mjs";
import {readBoundedJson} from "@/lib/security/bounded-body.mjs";
import {requireInfisicalBootstrap,isInfisicalConfigured} from "@/lib/security/infisical-config";
import {createInfisicalLocation,createInfisicalLocationRegistry,createInfisicalVault} from "@/lib/security/infisical-vault.mjs";

export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
const provider=z.enum(["gemini","groq","mistral","huggingface","cerebras"]);
const schema=z.object({
 projectId:z.string().uuid(),
 provider,
 credential:z.string().min(10).max(8000).refine(value=>!/[\u0000\r\n]/.test(value),"Invalid credential")
}).strict();
const META={
 gemini:{label:"Google AI Studio / Gemini",secretName:"GEMINI_API_KEY"},
 groq:{label:"Groq",secretName:"GROQ_API_KEY"},
 mistral:{label:"Mistral",secretName:"MISTRAL_API_KEY"},
 huggingface:{label:"Hugging Face",secretName:"HUGGINGFACE_TOKEN"},
 cerebras:{label:"Cerebras",secretName:"CEREBRAS_API_KEY"}
} as const;

function projectSecretPath(base:string,projectId:string){
 const suffix=projectId.toLowerCase();
 if(!/^[a-f0-9-]{36}$/.test(suffix))throw new Error("Invalid project secret path");
 return `${base.replace(/\/$/,"")}/${suffix}`;
}

export async function POST(request:Request){
 if(!isSupabaseConfigured()||!isSupabaseAdminConfigured()||!isInfisicalConfigured())
  return NextResponse.json({error:"Secure provider setup is not configured"},{status:503,headers});
 const originCheck=checkWriteOrigin(request.headers.get("origin"),process.env.UNITY_APP_ORIGIN);
 if(!originCheck.allowed)return NextResponse.json({error:"Untrusted request origin"},{status:403,headers});
 let payload:unknown;
 try{payload=await readBoundedJson(request,{maxBytes:10000})}
 catch{return NextResponse.json({error:"Invalid request body"},{status:400,headers})}
 const parsed=schema.safeParse(payload);
 if(!parsed.success)return NextResponse.json({error:"Invalid provider connection request"},{status:400,headers});
 try{
  const {user}=await getVerifiedUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401,headers});
  const admin=createSupabaseAdmin();
  const {data:project,error:projectError}=await admin.from("projects").select("id").eq("id",parsed.data.projectId).eq("owner_id",user.id).maybeSingle();
  if(projectError)return NextResponse.json({error:"Project service unavailable"},{status:503,headers});
  if(!project)return NextResponse.json({error:"Project not found"},{status:404,headers});

  const meta=META[parsed.data.provider];
  const bootstrap=requireInfisicalBootstrap();
  const secretRef=`secret:${parsed.data.provider}/${parsed.data.projectId}/main`;
  const locations=createInfisicalLocationRegistry([createInfisicalLocation({
   secretRef,
   secretName:meta.secretName,
   projectId:bootstrap.projectId,
   environment:bootstrap.environment,
   secretPath:projectSecretPath(bootstrap.secretPath,parsed.data.projectId)
  })]);
  const vault=createInfisicalVault({
   locations,
   getBootstrapCredentials:async()=>({clientId:bootstrap.clientId,clientSecret:bootstrap.clientSecret})
  });
  await vault.putSecret(secretRef,parsed.data.credential.trim());

  const connectionKey=`${parsed.data.provider}:${parsed.data.projectId}`;
  const {data:connection,error:connectionError}=await admin.from("account_connections").upsert({
   owner_id:user.id,
   connection_key:connectionKey,
   provider:parsed.data.provider,
   account_label:meta.label,
   sign_in_method:"provider_account",
   auth_method:"api_key_ref",
   credential_reference:secretRef,
   status:"ready",
   updated_at:new Date().toISOString()
  },{onConflict:"owner_id,connection_key"}).select("id").single();
  if(connectionError||!connection?.id)return NextResponse.json({error:"Provider connection could not be recorded"},{status:503,headers});

  const resourceId=`${parsed.data.provider}:models`;
  const {error:bindingError}=await admin.from("project_account_bindings").upsert({
   project_id:parsed.data.projectId,
   account_connection_id:connection.id,
   resource_id:resourceId,
   permission_mode:"read",
   updated_at:new Date().toISOString()
  },{onConflict:"project_id,account_connection_id,resource_id"});
  if(bindingError)return NextResponse.json({error:"Provider project binding could not be recorded"},{status:503,headers});

  return NextResponse.json({connection:{provider:parsed.data.provider,accountLabel:meta.label,status:"ready",resourceId},secretStored:true},{headers});
 }catch{return NextResponse.json({error:"Secure provider setup failed"},{status:503,headers})}
}
