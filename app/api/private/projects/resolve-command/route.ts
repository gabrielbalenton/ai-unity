import {NextResponse} from "next/server";
import {z} from "zod";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {getVerifiedUser} from "@/lib/supabase/server";
import {checkWriteOrigin} from "@/lib/security/origin.mjs";
import {readBoundedJson} from "@/lib/security/bounded-body.mjs";
import {resolveProjectCommand} from "@/lib/infrastructure/project-command-resolver.mjs";

export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
const schema=z.object({command:z.string().min(3).max(180)}).strict();
type ProjectRow={id:string;name:string};

export async function POST(request:Request){
 if(!isSupabaseConfigured())return NextResponse.json({error:"Backend not configured"},{status:503,headers});
 const originCheck=checkWriteOrigin(request.headers.get("origin"),process.env.UNITY_APP_ORIGIN);
 if(!originCheck.allowed)return NextResponse.json({error:"Untrusted request origin"},{status:403,headers});
 let payload:unknown;
 try{payload=await readBoundedJson(request,{maxBytes:800})}
 catch{return NextResponse.json({error:"Invalid request body"},{status:400,headers})}
 const parsed=schema.safeParse(payload);
 if(!parsed.success)return NextResponse.json({error:"Invalid project command"},{status:400,headers});
 try{
  const {supabase,user}=await getVerifiedUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401,headers});
  const {data,error}=await supabase.from("projects").select("id,name").eq("owner_id",user.id).limit(100);
  if(error)return NextResponse.json({error:"Project query failed"},{status:503,headers});
  const owned=(data??[]) as unknown as ProjectRow[];
  const resolution=resolveProjectCommand(parsed.data.command,owned);
  if(resolution.status==="invalid_command")return NextResponse.json({error:"Use an explicit command such as ‘Switch to FPX’ or ‘Work on Pebble’."},{status:400,headers});
  if(resolution.status==="not_found")return NextResponse.json({error:"No owned UNITY project matches that exact project name."},{status:404,headers});
  if(resolution.status==="ambiguous")return NextResponse.json({error:"More than one owned UNITY project matches that name. Select the project manually."},{status:409,headers});
  return NextResponse.json({intent:"switch_project",project:resolution.project},{headers});
 }catch{return NextResponse.json({error:"Project resolver unavailable"},{status:503,headers})}
}
