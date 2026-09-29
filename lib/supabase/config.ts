/** Public config presence only; presence never proves authorization or deployment readiness. */
export function isSupabaseConfigured(): boolean {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 return Boolean(url && /^https:\/\/[a-z0-9.-]+\.supabase\.co\/?$/i.test(url) &&
    typeof key==="string" && key.length>5);
}
export function requireSupabaseConfig(): {url:string;key:string} {
 if(!isSupabaseConfigured())throw new Error("UNITY backend is not configured");
 return {url:process.env.NEXT_PUBLIC_SUPABASE_URL!,key:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!};
}
