import {evaluateExecution,ACTIONS} from "../runtime/policy.mjs";

const PROVIDERS=Object.freeze(["github","vercel","supabase"]);
const PREFIX=Object.freeze({github:"github:repo:",vercel:"vercel:project:",supabase:"supabase:project:"});
const PROVIDER_ACTIONS=Object.freeze({
 github:Object.freeze(["discover","read","propose","write"]),
 vercel:Object.freeze(["discover","read","propose","deploy"]),
 supabase:Object.freeze(["discover","read","propose","write"])
});
const PERMISSION_ACTIONS=Object.freeze({
 read:Object.freeze(["discover","read"]),
 propose:Object.freeze(["discover","read","propose"]),
 write:Object.freeze(["discover","read","propose","write"]),
 deploy:Object.freeze(["discover","read","propose","write","deploy"]),
 send:Object.freeze(["discover","read","propose","write","deploy","send"])
});
const PROTECTED=new Set(["write","deploy","send"]);
const nonempty=value=>typeof value==="string"&&value.trim().length>0;
const deny=(reason,details={})=>Object.freeze({allowed:false,status:"denied",reason,executionEnabled:false,requiresApproval:false,...details});

/**
 * @typedef {{provider:string,accountConnectionId:string,accountStatus:string,resourceId:string,permissionMode:string}} RoutingBinding
 */

/**
 * Build an inert routing plan from already owner-scoped project/account bindings.
 * This never opens a vault, calls a provider, or executes a tool. Protected actions
 * deliberately have no browser-supplied approval and therefore stop at approval_required.
 * @param {{projectId:string,provider:string,action:string,bindings?:RoutingBinding[]}} input
 */
export function planProjectRouting({projectId,provider,action,bindings=[]}){
 const details={projectId,provider,action};
 if(!nonempty(projectId)||!PROVIDERS.includes(provider)||!ACTIONS.includes(action)||!Array.isArray(bindings))
  return deny("Invalid routing target",details);
 const prefix=PREFIX[provider];
 const candidates=bindings.filter(item=>item?.provider===provider&&item?.resourceId?.startsWith(prefix));
 if(candidates.length===0)return deny("No exact project resource binding exists for this provider",details);
 if(candidates.length!==1)return deny("Multiple exact project resource bindings exist; routing is ambiguous",details);
 const binding=candidates[0];
 if(!nonempty(binding.accountConnectionId)||binding.accountStatus!=="ready")
  return deny("Bound provider account is not ready",details);
 const permissionActions=PERMISSION_ACTIONS[binding.permissionMode];
 if(!permissionActions)return deny("Invalid project permission mode",details);
 const providerActions=PROVIDER_ACTIONS[provider];
 const actions=permissionActions.filter(item=>providerActions.includes(item));
 const connector={id:binding.accountConnectionId,projectId,status:"authorized",actions,resources:[binding.resourceId]};
 const request={projectId,connectorId:binding.accountConnectionId,resourceId:binding.resourceId,action};
 const policy={projectId,emergencyStop:false,approvedOperations:[],maxPaidUsd:0,spentPaidUsd:0};
 const result=evaluateExecution(request,policy,[connector]);
 const safe={projectId,provider,connectorId:binding.accountConnectionId,resourceId:binding.resourceId,action,permissionMode:binding.permissionMode,executionEnabled:false};
 if(result.allowed)return Object.freeze({allowed:true,status:"ready",reason:result.reason,requiresApproval:false,...safe});
 if(PROTECTED.has(action)&&result.reason==="Exact project, connector, resource and action approval required")
  return Object.freeze({allowed:false,status:"approval_required",reason:result.reason,requiresApproval:true,...safe});
 return Object.freeze({allowed:false,status:"denied",reason:result.reason,requiresApproval:false,...safe});
}
