import {NextResponse} from "next/server";
import {z} from "zod";
import providerConfig from "@/config/model-providers.json";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {getVerifiedUser} from "@/lib/supabase/server";
import {createSupabaseAdmin,isSupabaseAdminConfigured} from "@/lib/supabase/admin";
import {buildProjectProviderPlan} from "@/lib/ai/project-provider-plan.mjs";

export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
const projectIdSchema=z.string().uuid();
type BindingRow={resource_id:string;account_connection_id:string};
type AccountRow={id:string;provider:string;status:string};

export async function GET(request:Request){
 if(!isSupabaseConfigured()||!isSupabaseAdminConfigured())return NextResponse.json({error:"Provider planning backend is not configured"},{status:503,headers});
 const projectId=projectIdSchema.safeParse(new URL(request.url).searchParams.get("projectId"));
 if(!projectId.success)return NextResponse.json({error:"Invalid project"},{status:400,headers});
 try{
  const {user}=await getVerifiedUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401,headers});
  const admin=createSupabaseAdmin();
  const {data:project,error:projectError}=await admin.from("projects").select("id").eq("id",projectId.data).eq("owner_id",user.id).maybeSingle();
  if(projectError)return NextResponse.json({error:"Project service unavailable"},{status:503,headers});
  if(!project)return NextResponse.json({error:"Project not found"},{status:404,headers});

  const bindingResult=await admin.from("project_account_bindings").select("resource_id,account_connection_id").eq("project_id",projectId.data).limit(100);
  if(bindingResult.error)return NextResponse.json({error:"Provider bindings unavailable"},{status:503,headers});
  const bindings=(bindingResult.data??[]) as unknown as BindingRow[];
  const accountIds=[...new Set(bindings.map(item=>item.account_connection_id).filter(Boolean))];
  let accounts:AccountRow[]=[];
  if(accountIds.length){
   const accountResult=await admin.from("account_connections").select("id,provider,status").eq("owner_id",user.id).in("id",accountIds).limit(100);
   if(accountResult.error)return NextResponse.json({error:"Provider connections unavailable"},{status:503,headers});
   accounts=(accountResult.data??[]) as unknown as AccountRow[];
  }
  const byId=new Map(accounts.map(item=>[item.id,item]));
  const connections=bindings.flatMap(binding=>{
   const account=byId.get(binding.account_connection_id);
   return account?[{provider:account.provider,status:account.status,resourceId:binding.resource_id}]:[];
  });
  const plan=buildProjectProviderPlan({providerDefinitions:providerConfig.providers,connections});
  return NextResponse.json({plan},{headers});
 }catch{return NextResponse.json({error:"Provider plan unavailable"},{status:503,headers})}
}
