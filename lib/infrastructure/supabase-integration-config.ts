import "server-only";

export function isSupabaseIntegrationConfigured(): boolean {
 const clientId=process.env.SUPABASE_INTEGRATION_CLIENT_ID;
 const clientSecret=process.env.SUPABASE_INTEGRATION_CLIENT_SECRET;
 return Boolean(typeof clientId==="string"&&clientId.length>=3&&typeof clientSecret==="string"&&clientSecret.length>=8);
}

export function requireSupabaseIntegrationConfig(){
 if(!isSupabaseIntegrationConfigured())throw new Error("Supabase integration OAuth app is not configured");
 return Object.freeze({
  clientId:process.env.SUPABASE_INTEGRATION_CLIENT_ID!,
  clientSecret:process.env.SUPABASE_INTEGRATION_CLIENT_SECRET!
 });
}
