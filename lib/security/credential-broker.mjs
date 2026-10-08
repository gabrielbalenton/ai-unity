const ID=/^[a-z0-9][a-z0-9._:-]{2,119}$/;
const SECRET_REF=/^secret:[a-z0-9][a-z0-9._:/-]{2,199}$/;
const PURPOSE=/^[a-z][a-z0-9:_-]{2,79}$/;
const nonempty=value=>typeof value==="string"&&value.trim().length>0;

/**
 * A credential grant is authorization metadata only. It never contains the
 * secret value. The grant binds one vault reference to one project, provider,
 * connection and declared purpose for a short period.
 */
export function createCredentialGrant({
 id,projectId,provider,connectionId,secretRef,purpose,
 issuedAt=new Date().toISOString(),expiresAt
}){
 if(![id,projectId,provider,connectionId].every(value=>ID.test(value??""))||
    !SECRET_REF.test(secretRef??"")||!PURPOSE.test(purpose??""))
  throw new Error("Invalid credential grant");
 const issued=Date.parse(issuedAt);
 const resolvedExpiry=expiresAt??new Date(issued+5*60*1000).toISOString();
 const expiry=Date.parse(resolvedExpiry);
 if(!Number.isFinite(issued)||!Number.isFinite(expiry)||expiry<=issued||expiry-issued>15*60*1000)
  throw new Error("Invalid credential grant lifetime");
 return Object.freeze({id,projectId,provider,connectionId,secretRef,purpose,issuedAt,expiresAt:resolvedExpiry});
}

export function validateCredentialGrant(grant,{
 projectId,provider,connectionId,purpose,at=new Date().toISOString()
}){
 if(!grant||![projectId,provider,connectionId].every(value=>ID.test(value??""))||!PURPOSE.test(purpose??""))
  throw new Error("Invalid credential access request");
 if(grant.projectId!==projectId||grant.provider!==provider||grant.connectionId!==connectionId||grant.purpose!==purpose)
  throw new Error("Credential grant scope mismatch");
 const now=Date.parse(at);
 const issued=Date.parse(grant.issuedAt);
 const expiry=Date.parse(grant.expiresAt);
 if(!Number.isFinite(now)||now<issued||now>=expiry)throw new Error("Credential grant expired or not active");
 return Object.freeze({allowed:true,secretRef:grant.secretRef,grantId:grant.id});
}

/**
 * Adapter contract only. Real Infisical/Vault support is injected server-side
 * later. Nothing in this module performs network access or reads environment
 * variables. The caller cannot enable an adapter merely by naming one.
 */
export function makeInertCredentialVault(){
 return Object.freeze({
  kind:"vault",
  configured:false,
  async useSecret(){throw new Error("Credential vault is not configured");}
 });
}

/**
 * Resolves a secret only inside a server-side callback. The raw value is never
 * returned by the broker. The vault adapter is responsible for retrieval and
 * may implement its own short-lived identity/token exchange.
 *
 * A vault adapter must expose useSecret(secretRef, callback) and invoke callback
 * with the secret in memory. The callback result is inspected so a provider
 * adapter cannot accidentally echo the exact secret back into ordinary data.
 */
export async function withCredential({grant,request,vault},operation){
 if(!vault||vault.configured!==true||typeof vault.useSecret!=="function")
  throw new Error("Credential vault is not configured");
 if(typeof operation!=="function")throw new Error("Credential operation is required");
 const access=validateCredentialGrant(grant,request);
 return vault.useSecret(access.secretRef,async secret=>{
  if(!nonempty(secret))throw new Error("Vault returned an invalid credential");
  const result=await operation(secret);
  const serialized=JSON.stringify(result??null);
  if(serialized.includes(secret))throw new Error("Credential leakage blocked");
  return result;
 });
}
