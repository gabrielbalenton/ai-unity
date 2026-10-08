import "server-only";
import {createClient} from "@supabase/supabase-js";

const SUPABASE_URL=/^https:\/\/[a-z0-9.-]+\.supabase\.co\/?$/i;

export function isSupabaseAdminConfigured(): boolean {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const secret=process.env.UNITY_SUPABASE_BACKEND_SECRET;
 return Boolean(typeof url==="string"&&SUPABASE_URL.test(url)&&typeof secret==="string"&&secret.length>=20);
}

export function createSupabaseAdmin(){
 if(!isSupabaseAdminConfigured())throw new Error("UNITY trusted backend is not configured");
 return createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.UNITY_SUPABASE_BACKEND_SECRET!,
  {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}
 );
}
