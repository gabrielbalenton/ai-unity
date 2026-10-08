import {NextResponse} from "next/server";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {getVerifiedUser} from "@/lib/supabase/server";
import {createSupabaseAdmin,isSupabaseAdminConfigured} from "@/lib/supabase/admin";
import {buildProjectControlPlane} from "@/lib/infrastructure/project-connections.mjs";

export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type SafeConnection={provider:string;accountLabel:string;status:string;resourceId:string;permissionMode:string;updatedAt:string};

export async function GET(request:Request){
 if(!isSupabaseConfigured()||!isSupabaseAdminConfigured())return NextResponse.json({error:"Connection backend is not configured"},{status:503,headers});
 const url=new URL(request.url),projectId=url.searchParams.get("projectId")||"";
 if(!UUID.test(projectId))return NextResponse.json({error:"Invalid project"},{status:400,headers});
 try{
  const {user}=await getVerifiedUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401,headers});
  const admin=createSupabaseAdmin();
  const {data:project,error:projectError}=await admin.from("projects").select("id,name,description").eq("id",projectId).eq("owner_id",user.id).maybeSingle();
  if(projectError)return NextResponse.json({error:"Project service unavailable"},{status:503,headers});
  if(!project)return NextResponse.json({error:"Project not found"},{status:404,headers});

  const {data:bindings,error:bindingError}=await admin.from("project_account_bindings").select("resource_id,permission_mode,account_connection_id").eq("project_id",projectId).limit(100);
  if(bindingError)return NextResponse.json({error:"Connection storage is not ready"},{status:503,headers});
  const connectionIds=[...new Set((bindings??[]).map(item=>item.account_connection_id).filter(Boolean))];
  let accounts:any[]=[];
  if(connectionIds.length>0){
   const result=await admin.from("account_connections").select("id,provider,account_label,status,updated_at").eq("owner_id",user.id).in("id",connectionIds).limit(100);
   if(result.error)return NextResponse.json({error:"Connection storage is not ready"},{status:503,headers});
   accounts=result.data??[];
  }
  const byId=new Map(accounts.map(item=>[item.id,item]));
  const safe:SafeConnection[]=(bindings??[]).flatMap((binding):SafeConnection[]=>{
   const account=byId.get(binding.account_connection_id);if(!account)return [];
   return [{provider:account.provider,accountLabel:account.account_label,status:account.status,resourceId:binding.resource_id,permissionMode:binding.permission_mode,updatedAt:account.updated_at}];
  });
  const controlPlane=buildProjectControlPlane({projectId:project.id,projectName:project.name,connections:safe});
  return NextResponse.json({project:{id:project.id,name:project.name,description:project.description||""},connections:safe,controlPlane},{headers});
 }catch{return NextResponse.json({error:"Connection status unavailable"},{status:503,headers});}
}