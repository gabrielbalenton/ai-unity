const SAFE_SLUG=/^[a-z0-9][a-z0-9-]{1,98}[a-z0-9]$/;
const SAFE_CLIENT=/^(?:Iv1\.)?[A-Za-z0-9_-]{8,160}$/;

export function isGitHubIntegrationConfigured():boolean{
 const slug=process.env.GITHUB_APP_SLUG;
 const clientId=process.env.GITHUB_APP_CLIENT_ID;
 return Boolean(typeof slug==="string"&&SAFE_SLUG.test(slug)&&typeof clientId==="string"&&SAFE_CLIENT.test(clientId));
}

export function requireGitHubIntegrationConfig(){
 if(!isGitHubIntegrationConfigured())throw new Error("GitHub App connection is not configured");
 return Object.freeze({
  appSlug:process.env.GITHUB_APP_SLUG!,
  clientId:process.env.GITHUB_APP_CLIENT_ID!,
  clientSecretRef:"secret:github/app/client-secret",
  clientSecretName:"GITHUB_APP_CLIENT_SECRET"
 });
}
