import strategies from "../../config/connection-auth-strategies.json" with {type:"json"};

const SAFE_SERVICE=/^[a-z][a-z0-9_-]{1,79}$/;
const SAFE_PROJECT=/^[a-z0-9][a-z0-9._:-]{2,119}$/;
const knownKinds=new Set(["github_app_installation","oauth2_authorization_code","oauth_pkce","vault_credential"]);

function getStrategy(service){
 if(!SAFE_SERVICE.test(service??""))throw new Error("Invalid connection service");
 const strategy=strategies.strategies.find(item=>item.service===service);
 if(!strategy||!knownKinds.has(strategy.kind))throw new Error("Unsupported connection authorization strategy");
 return strategy;
}

/**
 * Produces an inert connection plan only. No redirect, token exchange or secret
 * write happens here. The UI can safely decide whether to show a Connect button
 * or a guided key setup without pretending the provider is already connected.
 */
export function planConnectionAuthorization({service,projectId}){
 if(!SAFE_PROJECT.test(projectId??""))throw new Error("Invalid project identity");
 const strategy=getStrategy(service);
 return Object.freeze({
  service:strategy.service,
  projectId,
  kind:strategy.kind,
  interactive:strategy.interactive===true,
  secretDestination:strategy.secretDestination,
  status:strategy.status,
  executable:false
 });
}

export function canOfferOneClick(service){
 return getStrategy(service).interactive===true;
}

export function listConnectionStrategies(){
 return strategies.strategies.map(item=>Object.freeze({
  service:item.service,
  kind:item.kind,
  interactive:item.interactive===true,
  status:item.status
 }));
}
