import {NextResponse} from "next/server";
import {z} from "zod";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {getVerifiedUser} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
const schema=z.object({name:z.string().trim().min(2).max(100),
 description:z.string().max(500).default("")}).strict();
const headers={"Cache-Control":"private, no-store"};
export async function GET(){
 if(!isSupabaseConfigured())return NextResponse.json({error:"Backend not configured"},{status:503,headers});
 try {
  const {supabase,user}=await getVerifiedUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401,headers});
  const {data,error}=await supabase.from("projects").select("id,name,description,created_at")
   .eq("owner_id",user.id).order("created_at",{ascending:false}).limit(100);
  if(error)return NextResponse.json({error:"Project query failed"},{status:503,headers});
  return NextResponse.json({projects:data??[]},{headers});
 }catch{return NextResponse.json({error:"Projects service unavailable"},{status:503,headers})}
}
export async function POST(request:Request){
 if(!isSupabaseConfigured())return NextResponse.json({error:"Backend not configured"},{status:503,headers});
 let payload:unknown;
 try{if(Number(request.headers.get("content-length")||"0")>3000)throw Error("Large body");payload=await request.json()}
 catch{return NextResponse.json({error:"Invalid request body"},{status:400,headers})}
 const result=schema.safeParse(payload);
 if(!result.success)return NextResponse.json({error:"Invalid project fields"},{status:400,headers});
 try{
  const {supabase,user}=await getVerifiedUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401,headers});
  const {data,error}=await supabase.from("projects").insert({...result.data,owner_id:user.id})
   .select("id,name,description,created_at").single();
  if(error)return NextResponse.json({error:"Unable to create project"},{status:503,headers});
  return NextResponse.json({project:data},{status:201,headers});
 }catch{return NextResponse.json({error:"Projects service unavailable"},{status:503,headers})}
}
