import {NextResponse} from "next/server";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {getVerifiedUser} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export async function GET(){
 const headers={"Cache-Control":"private, no-store"};
 if(!isSupabaseConfigured())return NextResponse.json({authenticated:false,configured:false},{status:503,headers});
 try{
  const {user}=await getVerifiedUser();
  if(!user)return NextResponse.json({authenticated:false,configured:true},{status:401,headers});
  return NextResponse.json({authenticated:true,configured:true,userId:user.id,email:user.email??null},{headers});
 }catch{
  return NextResponse.json({error:"Auth service unavailable"},{status:503,headers});
 }
}
