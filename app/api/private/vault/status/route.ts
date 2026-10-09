import {NextResponse} from "next/server";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {getVerifiedUser} from "@/lib/supabase/server";
import {getInfisicalStatus} from "@/lib/security/infisical-config";

export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};

export async function GET(){
 if(!isSupabaseConfigured())return NextResponse.json({error:"Backend not configured"},{status:503,headers});
 try{
  const {user}=await getVerifiedUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401,headers});
  return NextResponse.json({vault:getInfisicalStatus()},{headers});
 }catch{
  return NextResponse.json({error:"Vault status unavailable"},{status:503,headers});
 }
}
