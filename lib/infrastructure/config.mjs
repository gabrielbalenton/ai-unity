/**
 * Startup configuration is intentionally read-only. No env flag may authorize an
 * external mutation, grant a model credit, or turn local simulation into production.
 */
const enabled = (env, key) => env[key] === "true";
const nonempty = value => typeof value === "string" && value.trim().length > 0;
export function inspectConfiguration(env = {}) {
 const hasAuth = nonempty(env.NEXT_PUBLIC_SUPABASE_URL) &&
   /^https:\/\/[a-z0-9.-]+\.supabase\.co\/?$/i.test(env.NEXT_PUBLIC_SUPABASE_URL) &&
   nonempty(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
 const hasGitHubApp = nonempty(env.GITHUB_APP_ID) && nonempty(env.GITHUB_APP_PRIVATE_KEY) &&
   nonempty(env.GITHUB_WEBHOOK_SECRET);
 const providerConfigured = nonempty(env.OPENROUTER_API_KEY);
 const workersConfigured = nonempty(env.UNITY_WORKER_SIGNING_SECRET);
 const production = env.NODE_ENV === "production";
 return Object.freeze({
  mode:production?"production":"development",
  browserWorkspace:true,
  publicCatalog:true,
  backendAuthConfigurationPresent:hasAuth,
  githubAppConfigurationPresent:hasGitHubApp,
  providerConfigurationPresent:providerConfigured,
  workerConfigurationPresent:workersConfigured,
  externalExecutionRequested:enabled(env,"UNITY_ENABLE_EXTERNAL_EXECUTION"),
  // This is a source-code feature gate, NOT an environment-variable switch.
  externalExecutionEnabled:false,
  deploymentReady:false,
  notes:[
   "Configuration presence does not verify permissions, billing, secret validity, user isolation or end-to-end functionality.",
   "No external execution adapter is activated by environment variables alone."
  ]
 });
}
export function assertNoClientSecretExposure(env={}) {
 for (const key of Object.keys(env)) {
  if (/^NEXT_PUBLIC_/.test(key) && /(SECRET|PRIVATE|TOKEN|SERVICE_ROLE|API_KEY)/i.test(key) &&
      key !== "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
   throw new Error("Potential sensitive credential exposed through NEXT_PUBLIC_");
 }
 return true;
}
