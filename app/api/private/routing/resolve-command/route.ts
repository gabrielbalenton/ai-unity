import {NextResponse} from "next/server";
import {z} from "zod";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {getVerifiedUser} from "@/lib/supabase/server";
import {createSupabaseAdmin,isSupabaseAdminConfigured} from "@/lib/supabase/admin";
import {checkWriteOrigin} from "@/lib/security/origin.mjs";
import {readBoundedJson} from "@/lib/security/bounded-body.mjs";
import {resolveProjectCommand} from "@/lib/infrastructure/project-command-resolver.mjs";
import {buildProjectControlPlane} from "@/lib/infrastructure/project-connections.mjs";
import {planProjectRouting} from "@/lib/infrastructure/project-routing-preflight.mjs";

export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
const provider=z.enum(["github","vercel","supabase"]);
const action=z.enum(["discover","read","propose","write","deploy","send"]);
const schema=z.object({command:z.string().min(3).max(180),provider:provider.optional(),action:action.optional()}).strict().superRefine((value,ctx)=>{
 if(Boolean(value.provider)!==Boolean(value.action))ctx.addIssue({code:z.ZodIssueCode.custom,message:"Provider and action must be supplied together"});
});
type ProjectRow={id:string;name:string};
type BindingRow={resource_id:string;permission_mode:string;account_connection_id:string};
type AccountRow={id:string;provider:string;account_label:string;status:string;updated_at:string};

export async function POST(request:Request){
 if(!isSupabaseConfigured()||!isSupabaseAdminConfigured())return NextResponse.json({error:"Routing backend is not configured"},{status:503,headers});
 const originCheck=checkWriteOrigin(request.headers.get("origin"),process.env.UNITY_APP_ORIGIN);
 if(!originCheck.allowed)return NextResponse.json({error:"Untrusted request origin"},{status:403,headers});
 let payload:unknown;
 try{payload=await readBoundedJson(request,{maxBytes:1100})}
 catch{return NextResponse.json({error:"Invalid request body"},{status:400,headers})}
 const parsed=schema.safeParse(payload);
 if(!parsed.success)return NextResponse.json({error:"Invalid project routing command"},{status:400,headers});
 try{
  const {user}=await getVerifiedUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401,headers});
  const admin=createSupabaseAdmin();
  const projectResult=await admin.from("projects").select("id,name").eq("owner_id",user.id).limit(100);
  if(projectResult.error)return NextResponse.json({error:"Project query failed"},{status:503,headers});
  const owned=(projectResult.data??[]) as unknown as ProjectRow[];
  const resolution=resolveProjectCommand(parsed.data.command,owned);
  if(resolution.status==="invalid_command")return NextResponse.json({error:"Use an explicit project command such as ‘Switch to FPX’."},{status:400,headers});
  if(resolution.status==="not_found")return NextResponse.json({error:"No owned UNITY project matches that exact project name."},{status:404,headers});
  if(resolution.status==="ambiguous")return NextResponse.json({error:"More than one owned UNITY project matches that name. Select the project manually."},{status:409,headers});
  const project=resolution.project;

  const bindingResult=await admin.from("project_account_bindings").select("resource_id,permission_mode,account_connection_id").eq("project_id",project.id).limit(100);
  if(bindingResult.error)return NextResponse.json({error:"Routing bindings unavailable"},{status:503,headers});
  const bindingRows=(bindingResult.data??[]) as unknown as BindingRow[];
  const accountIds=[...new Set(bindingRows.map(item=>item.account_connection_id).filter(Boolean))];
  let accounts:AccountRow[]=[];
  if(accountIds.length>0){
   const accountResult=await admin.from("account_connections").select("id,provider,account_label,status,updated_at").eq("owner_id",user.id).in("id",accountIds).limit(100);
   if(accountResult.error)return NextResponse.json({error:"Routing accounts unavailable"},{status:503,headers});
   accounts=(accountResult.data??[]) as unknown as AccountRow[];
  }
  const byId=new Map(accounts.map(item=>[item.id,item]));
  const safeConnections=[] as {provider:string;accountLabel:string;status:string;resourceId:string;permissionMode:string;updatedAt:string}[];
  const routingBindings=[] as {provider:string;accountConnectionId:string;accountStatus:string;resourceId:string;permissionMode:string}[];
  for(const binding of bindingRows){
   const account=byId.get(binding.account_connection_id);if(!account)continue;
   safeConnections.push({provider:account.provider,accountLabel:account.account_label,status:account.status,resourceId:binding.resource_id,permissionMode:binding.permission_mode,updatedAt:account.updated_at});
   routingBindings.push({provider:account.provider,accountConnectionId:account.id,accountStatus:account.status,resourceId:binding.resource_id,permissionMode:binding.permission_mode});
  }
  const controlPlane=buildProjectControlPlane({projectId:project.id,projectName:project.name,connections:safeConnections});
  const plan=parsed.data.provider&&parsed.data.action?planProjectRouting({projectId:project.id,provider:parsed.data.provider,action:parsed.data.action,bindings:routingBindings}):null;
  return NextResponse.json({intent:"project_context",project,controlPlane,plan},{headers});
 }catch{return NextResponse.json({error:"Project routing command unavailable"},{status:503,headers})}
}
