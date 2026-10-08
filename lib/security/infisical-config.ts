const SAFE_ENV=/^[a-z0-9][a-z0-9_-]{0,39}$/;
const SAFE_PATH=/^\/(?:[A-Za-z0-9._-]+\/?)*$/;

/**
 * Presence check only. A true result means the server has all bootstrap fields,
 * not that Infisical authentication or secret access has succeeded.
 */
export function isInfisicalConfigured(): boolean {
 const clientId=process.env.INFISICAL_CLIENT_ID;
 const clientSecret=process.env.INFISICAL_CLIENT_SECRET;
 const projectId=process.env.INFISICAL_PROJECT_ID;
 const environment=process.env.INFISICAL_ENVIRONMENT||"prod";
 const secretPath=process.env.INFISICAL_SECRET_PATH||"/unity";
 return Boolean(
  typeof clientId==="string"&&clientId.length>=8&&
  typeof clientSecret==="string"&&clientSecret.length>=16&&
  typeof projectId==="string"&&projectId.length>=3&&projectId.length<=160&&
  SAFE_ENV.test(environment)&&SAFE_PATH.test(secretPath)
 );
}

export function getInfisicalStatus(){
 return Object.freeze({
  provider:"infisical",
  configured:isInfisicalConfigured(),
  mode:"machine_identity",
  secretValuesExposed:false
 });
}

export function requireInfisicalBootstrap(){
 if(!isInfisicalConfigured())throw new Error("Infisical machine identity is not configured");
 return Object.freeze({
  clientId:process.env.INFISICAL_CLIENT_ID!,
  clientSecret:process.env.INFISICAL_CLIENT_SECRET!,
  projectId:process.env.INFISICAL_PROJECT_ID!,
  environment:process.env.INFISICAL_ENVIRONMENT||"prod",
  secretPath:process.env.INFISICAL_SECRET_PATH||"/unity"
 });
}
