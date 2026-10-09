import {NextResponse} from "next/server";
import {z} from "zod";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {getVerifiedUser} from "@/lib/supabase/server";
import {checkWriteOrigin} from "@/lib/security/origin.mjs";
import {readBoundedJson} from "@/lib/security/bounded-body.mjs";

export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};

const draftSchema=z.object({
 connectionKey:z.string().regex(/^[a-z0-9][a-z0-9._:-]{2,119}$/),
 provider:z.string().regex(/^[a-z0-9][a-z0-9._-]{1,79}$/),
 accountLabel:z.string().trim().min(2).max(120),
 signInMethod:z.enum(["google","github","email","other","unknown"]).default("unknown"),
 externalAccountId:z.string().trim().min(1).max(160).nullable().optional()
}).strict();

/**
 * Safe metadata only. credential_reference is intentionally excluded from the
 * browser response even though the backend table may contain it.
 */
export async function GET(){
 if(!isSupabaseConfigured())return NextResponse.json({error:"Backend not configured"},{status:503,headers});
 try{
  const {supabase,user}=await getVerifiedUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401,headers});
  const {data,error}=await supabase.from("account_connections")
   .select("connection_key,provider,account_label,sign_in_method,status,created_at,updated_at")
   .eq("owner_id",user.id).order("created_at",{ascending:false}).limit(200);
  if(error)return NextResponse.json({error:"Connections service not ready"},{status:503,headers});
  return NextResponse.json({connections:data??[]},{headers});
 }catch{
  return NextResponse.json({error:"Connections service unavailable"},{status:503,headers});
 }
}

/**
 * Browser-originated connection creation is deliberately non-persistent for
 * now. It validates harmless account identity metadata only, rejects any extra
 * fields (including keys/tokens), verifies the user and origin, then returns a
 * setup draft. Credential linking must later happen through a dedicated trusted
 * backend/vault transaction, never by inserting a browser-submitted secret.
 */
export async function POST(request:Request){
 if(!isSupabaseConfigured())return NextResponse.json({error:"Backend not configured"},{status:503,headers});
 const originCheck=checkWriteOrigin(request.headers.get("origin"),process.env.UNITY_APP_ORIGIN);
 if(!originCheck.allowed)return NextResponse.json({error:"Untrusted request origin"},{status:403,headers});
 let payload:unknown;
 try{payload=await readBoundedJson(request,{maxBytes:2500})}
 catch{return NextResponse.json({error:"Invalid request body"},{status:400,headers})}
 const result=draftSchema.safeParse(payload);
 if(!result.success)return NextResponse.json({error:"Invalid connection fields"},{status:400,headers});
 try{
  const {user}=await getVerifiedUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401,headers});
  return NextResponse.json({
   draft:{...result.data,status:"awaiting_secure_credential_link",persisted:false},
   notice:"Account metadata validated. Secure credential linking is not enabled yet."
  },{status:202,headers});
 }catch{
  return NextResponse.json({error:"Connections service unavailable"},{status:503,headers});
 }
}
