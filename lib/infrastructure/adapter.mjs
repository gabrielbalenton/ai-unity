/**
 * Contracts for adapters. Neither a public registry record nor an adapter name
 * grants permission. Runtime authorization must be checked at dispatch.
 */
import { evaluateExecution } from "../runtime/policy.mjs";
export function describeAdapter(input) {
 if(!input||typeof input!=="object"||typeof input.id!=="string"||
    !/^[a-z0-9_.:-]{3,100}$/.test(input.id)||
    !["model","mcp","rest","graphql","github","storage"].includes(input.kind)||
    !Array.isArray(input.capabilities)||input.capabilities.length>50||
    !input.capabilities.every(c=>typeof c==="string" && /^[a-z][a-z0-9:_-]{1,59}$/.test(c)))
  throw new Error("Invalid adapter descriptor");
 return Object.freeze({id:input.id,kind:input.kind,
  capabilities:[...new Set(input.capabilities)],status:"unconfigured",canExecute:false});
}
export function planAdapterAction({request,policy,connections,adapter}) {
 if(!adapter||adapter.canExecute!==true) {
  return Object.freeze({allowed:false,reason:"Adapter execution has not been independently enabled"});
 }
 return evaluateExecution(request,policy,connections);
}
export function makeInertAdapter(descriptor) {
 const info=describeAdapter(descriptor);
 return Object.freeze({
  descriptor:info,
  async execute() { throw new Error("No external adapter is configured"); }
 });
}
