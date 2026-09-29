import {NextResponse} from "next/server";
import {z} from "zod";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {getVerifiedUser} from "@/lib/supabase/server";
import {checkWriteOrigin} from "@/lib/security/origin.mjs";
export const dynamic="force-dynamic";
const newMemory=z.object({
 projectId:z.string().uuid(),title:z.string().trim().min(2).max(140),
 body:z.string().trim().min(2).max(20000),
 evidenceRef:z.string().max(400).optional()
}).strict();
const headers={"Cache-Control":"private, no-store"};
export async function GET(request:Request){
 if(!isSupabaseConfigured())return NextResponse.json({error:"Backend not configured"},{status:503,headers});
 const projectId=new URL(request.url).searchParams.get("projectId");
 if(!projectId||!z.string().uuid().safeParse(projectId).success)
  return NextResponse.json({error:"Valid project ID required"},{status:400,headers});
 try{
  const {supabase,user}=await getVerifiedUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401,headers});
  const {data:project,error:projectError}=await supabase.from("projects").select("id")
   .eq("id",projectId).eq("owner_id",user.id).maybeSingle();
  if(projectError)return NextResponse.json({error:"Ownership lookup failed"},{status:503,headers});
  if(!project)return NextResponse.json({error:"Project not found"},{status:404,headers});
  const {data,error}=await supabase.from("memory_entries")
   .select("id,project_id,title,body,status,evidence_ref,created_at,updated_at")
   .eq("project_id",projectId).order("updated_at",{ascending:false}).limit(100);
  if(error)return NextResponse.json({error:"Memory lookup failed"},{status:503,headers});
  return NextResponse.json({memories:data??[]},{headers});
 }catch{return NextResponse.json({error:"Memory service unavailable"},{status:503,headers})}
}
export async function POST(request:Request){
 if(!isSupabaseConfigured())return NextResponse.json({error:"Backend not configured"},{status:503,headers});
 const originCheck=checkWriteOrigin(request.headers.get("origin"),process.env.UNITY_APP_ORIGIN);
 if(!originCheck.allowed)return NextResponse.json({error:"Untrusted request origin"},{status:403,headers});
 let payload:unknown;
 try{if(Number(request.headers.get("content-length")||"0")>25000)throw Error("Large body");payload=await request.json()}
 catch{return NextResponse.json({error:"Invalid request body"},{status:400,headers})}
 const parsed=newMemory.safeParse(payload);
 if(!parsed.success)return NextResponse.json({error:"Invalid memory fields"},{status:400,headers});
 try{
  const {supabase,user}=await getVerifiedUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401,headers});
  const {data:project,error:projectError}=await supabase.from("projects").select("id")
   .eq("id",parsed.data.projectId).eq("owner_id",user.id).maybeSingle();
  if(projectError)return NextResponse.json({error:"Ownership lookup failed"},{status:503,headers});
  if(!project)return NextResponse.json({error:"Project not found"},{status:404,headers});
  const {data,error}=await supabase.from("memory_entries").insert({
   project_id:parsed.data.projectId,author_id:user.id,title:parsed.data.title,
   body:parsed.data.body,status:"draft",evidence_ref:parsed.data.evidenceRef??null
  }).select("id,project_id,title,status,created_at").single();
  if(error)return NextResponse.json({error:"Unable to create memory draft"},{status:503,headers});
  // Approving a memory is intentionally unavailable until versioned,
  // transactional server-side approval and audit are implemented and tested.
  return NextResponse.json({memory:data},{status:201,headers});
 }catch{return NextResponse.json({error:"Memory service unavailable"},{status:503,headers})}
}
