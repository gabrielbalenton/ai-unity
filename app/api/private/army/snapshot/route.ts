import {NextResponse} from "next/server";
import roster from "@/config/unity-army-roster.json";
import {buildArmySnapshot} from "@/lib/army/control-plane.mjs";
import {getVerifiedUser} from "@/lib/supabase/server";
import {isSupabaseConfigured} from "@/lib/supabase/config";

export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};

export async function GET(){
 if(!isSupabaseConfigured())return NextResponse.json({error:"Army runtime backend not configured"},{status:503,headers});
 try{
  const {user}=await getVerifiedUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401,headers});
  const snapshot=buildArmySnapshot(roster,[]);
  return NextResponse.json({snapshot,source:"configured-roster",liveStateConnected:false},{headers});
 }catch{
  return NextResponse.json({error:"Army snapshot unavailable"},{status:503,headers});
 }
}
