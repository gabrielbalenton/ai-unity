import {NextRequest,NextResponse} from "next/server";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {createServerSupabase} from "@/lib/supabase/server";
export async function POST(request:NextRequest){
 const response=NextResponse.redirect(new URL("/auth/login",request.url),302);
 response.headers.set("Cache-Control","private, no-store");
 if(!isSupabaseConfigured())return response;
 try{
  const supabase=await createServerSupabase();
  await supabase.auth.signOut();
 }catch{
  // Never expose authentication or cookie details in a public response.
 }
 return response;
}
