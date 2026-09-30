import {NextResponse} from "next/server";
import {z} from "zod";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {getVerifiedUser} from "@/lib/supabase/server";
import {checkWriteOrigin} from "@/lib/security/origin.mjs";
import {readBoundedJson} from "@/lib/security/bounded-body.mjs";

export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
const schema=z.object({
 projectId:z.string().uuid(),
 memoryId:z.string().uuid(),
 expectedUpdatedAt:z.string().datetime({offset:true})
}).strict();

export async function POST(request:Request){
 if(!isSupabaseConfigured())
  return NextResponse.json({error:"Dedicated backend is not configured"},{status:503,headers});
 if(!checkWriteOrigin(request.headers.get("origin"),process.env.UNITY_APP_ORIGIN).allowed)
  return NextResponse.json({error:"Untrusted request origin"},{status:403,headers});

 let body:unknown;
 try {
  body=await readBoundedJson(request,{maxBytes:4000});
 }catch{return NextResponse.json({error:"Invalid request body"},{status:400,headers});}
 const valid=schema.safeParse(body);
 if(!valid.success)
  return NextResponse.json({error:"Invalid approval request"},{status:400,headers});

 try {
  const {supabase,user}=await getVerifiedUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401,headers});
  // Defense-in-depth: do not rely on the API handler as the final permission
  // boundary. The database RPC repeats all ownership and revision checks.
  const {data:project,error:projectError}=await supabase.from("projects")
    .select("id").eq("id",valid.data.projectId).eq("owner_id",user.id).maybeSingle();
  if(projectError)return NextResponse.json({error:"Project authorization unavailable"},{status:503,headers});
  if(!project)return NextResponse.json({error:"Project not found"},{status:404,headers});
  const {data:note,error:noteError}=await supabase.from("memory_entries")
    .select("id,status,updated_at").eq("project_id",valid.data.projectId)
    .eq("id",valid.data.memoryId).maybeSingle();
  if(noteError)return NextResponse.json({error:"Memory authorization unavailable"},{status:503,headers});
  if(!note)return NextResponse.json({error:"Memory not found"},{status:404,headers});
  if(note.status!=="draft"||note.updated_at!==valid.data.expectedUpdatedAt)
    return NextResponse.json({error:"Draft changed; refresh before approving"},{status:409,headers});
  const {data,error}=await supabase.rpc("approve_memory_entry",{
   p_memory_id:valid.data.memoryId,p_expected_updated_at:valid.data.expectedUpdatedAt
  });
  if(error){
   // Function missing means our backend has not been migrated. Other failures
   // may include an optimistic-concurrency conflict; no raw DB detail is returned.
   const unavailable=["42883","PGRST202"].includes(error.code);
   return NextResponse.json(
    {error:unavailable?"Approval backend is not installed":"Approval rejected; refresh and retry"},
    {status:unavailable?503:409,headers});
  }
  return NextResponse.json({approval:data},{status:200,headers});
 }catch{return NextResponse.json({error:"Approval service unavailable"},{status:503,headers});}
}
