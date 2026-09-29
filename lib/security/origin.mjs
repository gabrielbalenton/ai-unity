/**
 * CSRF origin preflight for cookie-authenticated JSON writes.
 * Caller must also enforce authenticated identity, RLS and request validation.
 */
export function checkWriteOrigin(requestOrigin, configuredOrigin) {
 if(typeof requestOrigin!=="string"||typeof configuredOrigin!=="string")
  return {allowed:false,reason:"Missing origin configuration or request origin"};
 let submitted,allowed;
 try{
  submitted=new URL(requestOrigin);allowed=new URL(configuredOrigin);
 }catch{return {allowed:false,reason:"Malformed origin"}}
 if(!["https:","http:"].includes(submitted.protocol) ||
    !["https:","http:"].includes(allowed.protocol)||
    (allowed.protocol==="http:" && !["localhost","127.0.0.1"].includes(allowed.hostname)) ||
    submitted.origin!==allowed.origin)
  return {allowed:false,reason:"Origin is not authorized"};
 return {allowed:true,reason:"Same authorized origin"};
}
