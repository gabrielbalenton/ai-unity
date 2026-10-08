import {NextResponse} from "next/server";
import {z} from "zod";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {getVerifiedUser} from "@/lib/supabase/server";
import {createSupabaseAdmin,isSupabaseAdminConfigured} from "@/lib/supabase/admin";
import {checkWriteOrigin} from "@/lib/security/origin.mjs";
import {readBoundedJson} from "@/lib/security/bounded-body.mjs";
import {planProjectRouting} from "@/lib/infrastructure/project-routing-preflight.mjs";

export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
const schema=z.object({
 projectId:z.string().uuid(),
 provider:z.enum(["github","vercel","supabase"]),
 action:z.enum(["discover","read","propose","write","deploy","send"])
}).strict();
type BindingRow={resource_id:string;permission_mode:string;account_connection_id:string};
type AccountRow={id:string;provider:string;status:string};

export async function POST(request:Request){
 if(!isSupabaseConfigured()||!isSupabaseAdminConfigured())return NextResponse.json({error:"Routing backend is not configured"},{status:503,headers});
 const originCheck=checkWriteOrigin(request.headers.get("origin"),process.env.UNITY_APP_ORIGIN);
 if(!originCheck.allowed)return NextResponse.json({error:"Untrusted request origin"},{status:403,headers});
 let payload:unknown;
 try{payload=await readBoundedJson(request,{maxBytes:900})}
 catch{return NextResponse.json({error:"Invalid request body"},{status:400,headers})}
 const parsed=schema.safeParse(payload);
 if(!parsed.success)return NextResponse.json({error:"Invalid routing request"},{status:400,headers});
 try{
  const {user}=await getVerifiedUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401,headers});
  const admin=createSupabaseAdmin();
  const {data:project,error:projectError}=await admin.from("projects").select("id").eq("id",parsed.data.projectId).eq("owner_id",user.id).maybeSingle();
  if(projectError)return NextResponse.json({error:"Project service unavailable"},{status:503,headers});
  if(!project)return NextResponse.json({error:"Project not found"},{status:404,headers});

  const {data:bindingData,error:bindingError}=await admin.from("project_account_bindings")
   .select("resource_id,permission_mode,account_connection_id").eq("project_id",parsed.data.projectId).limit(100);
  if(bindingError)return NextResponse.json({error:"Routing bindings unavailable"},{status:503,headers});
  const bindingRows=(bindingData??[]) as unknown as BindingRow[];
  const accountIds=[...new Set(bindingRows.map(item=>item.account_connection_id).filter(Boolean))];
  let accounts:AccountRow[]=[];
  if(accountIds.length>0){
   const result=await admin.from("account_connections").select("id,provider,status")
    .eq("owner_id",user.id).in("id",accountIds).limit(100);
   if(result.error)return NextResponse.json({error:"Routing accounts unavailable"},{status:503,headers});
   accounts=(result.data??[]) as unknown as AccountRow[];
  }
  const byId=new Map(accounts.map(item=>[item.id,item]));
  const bindings=bindingRows.flatMap(binding=>{
   const account=byId.get(binding.account_connection_id);
   if(!account)return [];
   return [{provider:account.provider,accountConnectionId:account.id,accountStatus:account.status,resourceId:binding.resource_id,permissionMode:binding.permission_mode}];
  });
  const plan=planProjectRouting({projectId:parsed.data.projectId,provider:parsed.data.provider,action:parsed.data.action,bindings});
  return NextResponse.json({plan},{headers});
 }catch{return NextResponse.json({error:"Routing preflight unavailable"},{status:503,headers})}
}
