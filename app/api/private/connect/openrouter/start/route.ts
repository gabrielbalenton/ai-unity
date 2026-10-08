import {NextResponse} from "next/server";
import {z} from "zod";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {getVerifiedUser} from "@/lib/supabase/server";
import {createSupabaseAdmin,isSupabaseAdminConfigured} from "@/lib/supabase/admin";
import {isInfisicalConfigured} from "@/lib/security/infisical-config";
import {checkWriteOrigin} from "@/lib/security/origin.mjs";
import {readBoundedJson} from "@/lib/security/bounded-body.mjs";
import {createConnectionAuthSession} from "@/lib/security/connection-auth-session.mjs";
import {sealConnectionAuthSession,CONNECTION_AUTH_COOKIE} from "@/lib/security/connection-auth-cookie.mjs";
import {buildOpenRouterAuthorizationUrl} from "@/lib/infrastructure/openrouter-auth.mjs";

export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
const schema=z.object({projectId:z.string().uuid()}).strict();

function callbackUrl(){
 const origin=process.env.UNITY_APP_ORIGIN;
 if(!origin)throw new Error("UNITY app origin is not configured");
 const url=new URL("/api/private/connect/openrouter/callback",origin);
 if(url.protocol!=="https:"&&!['localhost','127.0.0.1'].includes(url.hostname))throw new Error("Invalid UNITY app origin");
 return url.toString();
}

export async function POST(request:Request){
 if(!isSupabaseConfigured()||!isSupabaseAdminConfigured()||!isInfisicalConfigured())
  return NextResponse.json({error:"Secure connection backend is not configured"},{status:503,headers});
 const originCheck=checkWriteOrigin(request.headers.get("origin"),process.env.UNITY_APP_ORIGIN);
 if(!originCheck.allowed)return NextResponse.json({error:"Untrusted request origin"},{status:403,headers});
 let payload:unknown;
 try{payload=await readBoundedJson(request,{maxBytes:1000})}
 catch{return NextResponse.json({error:"Invalid request body"},{status:400,headers})}
 const parsed=schema.safeParse(payload);
 if(!parsed.success)return NextResponse.json({error:"Invalid project"},{status:400,headers});
 try{
  const {user}=await getVerifiedUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401,headers});
  const admin=createSupabaseAdmin();
  const {data:project,error:projectError}=await admin.from("projects").select("id").eq("id",parsed.data.projectId).eq("owner_id",user.id).maybeSingle();
  if(projectError)return NextResponse.json({error:"Project service unavailable"},{status:503,headers});
  if(!project)return NextResponse.json({error:"Project not found"},{status:404,headers});
  const {error:connectionTableError}=await admin.from("account_connections").select("id").limit(1);
  if(connectionTableError)return NextResponse.json({error:"Connection storage is not ready"},{status:503,headers});
  const sessionSecret=process.env.UNITY_CONNECTION_SESSION_SECRET;
  if(!sessionSecret)return NextResponse.json({error:"Connection session security is not configured"},{status:503,headers});
  const session=createConnectionAuthSession({service:"openrouter",projectId:parsed.data.projectId});
  const authorizationUrl=buildOpenRouterAuthorizationUrl({callbackUrl:callbackUrl(),challenge:session.challenge,state:session.state});
  const response=NextResponse.json({authorizationUrl,expiresAt:session.expiresAt},{headers});
  response.cookies.set(CONNECTION_AUTH_COOKIE.name,sealConnectionAuthSession(session,sessionSecret),{
   httpOnly:CONNECTION_AUTH_COOKIE.httpOnly,
   secure:CONNECTION_AUTH_COOKIE.secure,
   sameSite:CONNECTION_AUTH_COOKIE.sameSite,
   path:CONNECTION_AUTH_COOKIE.path,
   maxAge:CONNECTION_AUTH_COOKIE.maxAge
  });
  return response;
 }catch{
  return NextResponse.json({error:"OpenRouter connection could not be started"},{status:503,headers});
 }
}
