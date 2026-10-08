import {NextResponse} from "next/server";
import {getVerifiedUser} from "@/lib/supabase/server";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {isSupabaseAdminConfigured} from "@/lib/supabase/admin";
import {isInfisicalConfigured} from "@/lib/security/infisical-config";
import {isGitHubIntegrationConfigured} from "@/lib/infrastructure/github-integration-config";
import {isSupabaseIntegrationConfigured} from "@/lib/infrastructure/supabase-integration-config";
import {isVercelIntegrationConfigured} from "@/lib/infrastructure/vercel-integration-config";

export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
const required=Object.freeze({
 infisical:["INFISICAL_CLIENT_ID","INFISICAL_CLIENT_SECRET","INFISICAL_PROJECT_ID"],
 github:["GITHUB_APP_SLUG","GITHUB_APP_CLIENT_ID","vault:GITHUB_APP_CLIENT_SECRET"],
 supabase:["SUPABASE_INTEGRATION_CLIENT_ID","SUPABASE_INTEGRATION_CLIENT_SECRET"],
 vercel:["VERCEL_INTEGRATION_SLUG","VERCEL_INTEGRATION_CLIENT_ID","vault:VERCEL_INTEGRATION_CLIENT_SECRET"]
});

export async function GET(){
 if(!isSupabaseConfigured())return NextResponse.json({error:"Backend not configured"},{status:503,headers});
 try{
  const {user}=await getVerifiedUser();
  if(!user)return NextResponse.json({error:"Authentication required"},{status:401,headers});
  const services={
   backend:{configured:isSupabaseConfigured()&&isSupabaseAdminConfigured(),required:["NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","UNITY_SUPABASE_BACKEND_SECRET"]},
   infisical:{configured:isInfisicalConfigured(),required:required.infisical},
   github:{configured:isGitHubIntegrationConfigured(),required:required.github},
   supabase:{configured:isSupabaseIntegrationConfigured(),required:required.supabase},
   vercel:{configured:isVercelIntegrationConfigured(),required:required.vercel}
  };
  return NextResponse.json({allConfigured:Object.values(services).every(item=>item.configured),services,secretValuesExposed:false},{headers});
 }catch{return NextResponse.json({error:"Setup readiness unavailable"},{status:503,headers})}
}
