const ALLOWED_PROVIDERS=new Set(["openrouter","gemini","groq","mistral","huggingface","cerebras"]);

const nonempty=value=>typeof value==="string"&&value.trim().length>0;

/** @typedef {{id:string,displayName:string,priority:number,zeroPaidOnly?:boolean}} ProviderDefinition */
/** @typedef {{provider:string,status:string,resourceId:string}} ProviderConnection */

/**
 * Build a secret-free, execution-disabled provider fallback plan from already
 * owner-scoped project connection metadata. A provider being connected does
 * NOT prove any specific model is currently free; live entitlement and quota
 * checks remain mandatory before inference.
 * @param {{providerDefinitions?:ProviderDefinition[],connections?:ProviderConnection[]}} input
 */
export function buildProjectProviderPlan({providerDefinitions=[],connections=[]}){
 if(!Array.isArray(providerDefinitions)||!Array.isArray(connections))throw new Error("Invalid project provider plan input");
 const seen=new Set();
 const providers=[];
 for(const definition of providerDefinitions){
  if(!definition||!ALLOWED_PROVIDERS.has(definition.id)||seen.has(definition.id))continue;
  if(!nonempty(definition.displayName)||!Number.isInteger(definition.priority)||definition.priority<0)continue;
  seen.add(definition.id);
  const expectedResource=`${definition.id}:models`;
  const matches=connections.filter(item=>item?.provider===definition.id&&item?.resourceId===expectedResource&&item?.status==="ready");
  const connected=matches.length===1;
  providers.push(Object.freeze({
   providerId:definition.id,
   displayName:definition.displayName,
   priority:definition.priority,
   connected,
   ambiguous:matches.length>1,
   resourceId:connected?expectedResource:null,
   zeroPaidOnly:definition.zeroPaidOnly!==false,
   freeEligibility:"verify_live"
  }));
 }
 providers.sort((a,b)=>a.priority-b.priority||a.providerId.localeCompare(b.providerId));
 const fallbackOrder=providers.filter(item=>item.connected&&!item.ambiguous).map(item=>item.providerId);
 return Object.freeze({
  providers:Object.freeze(providers),
  fallbackOrder:Object.freeze(fallbackOrder),
  liveFreeEligibilityRequired:true,
  automaticPaidFallback:false,
  executionEnabled:false,
  notice:fallbackOrder.length
   ?"Connected provider order only. Verify current model availability, free eligibility and quota before every inference."
   :"No AI provider is connected for this project yet."
 });
}
