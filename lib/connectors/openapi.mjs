/**
 * Safely DESCRIBES OpenAPI JSON in memory. Never dereferences $ref, fetches a
 * server, stores credentials, registers tools or dispatches HTTP operations.
 * External specifications are untrusted documents, NOT executable instructions.
 */
const METHODS=["get","post","put","patch","delete","head","options","trace"];
const isObject=x=>x!==null && typeof x==="object" && !Array.isArray(x);
const bounded=(x,max)=>typeof x==="string"&&x.length<=max;
function classify(method){
 if(method==="get"||method==="head"||method==="options") return "potentially-read-only";
 if(method==="trace") return "sensitive";
 if(method==="delete") return "destructive";
 return "modifying";
}
function safeServer(raw){
 if(!isObject(raw)||!bounded(raw.url,1000))return null;
 try {
  // Never resolve relative URLs or follow documents to arbitrary locations.
  const url=new URL(raw.url);
  if(url.protocol!=="https:"||url.username||url.password||url.hash) return null;
  return url.origin+url.pathname;
 } catch {return null}
}
export function inspectOpenApiDocument(input){
 if(!isObject(input)||!bounded(input.openapi,30)||!/^3\.(0|1)\./.test(input.openapi))
  throw new Error("Only OpenAPI 3.0/3.1 JSON documents are supported.");
 if(!isObject(input.info)||!bounded(input.info.title,150)||!input.info.title.trim())
  throw new Error("OpenAPI title is required.");
 if(!isObject(input.paths))throw new Error("OpenAPI paths object is required.");
 const rawPaths=Object.entries(input.paths);
 if(rawPaths.length>300)throw new Error("OpenAPI exceeds the 300-path preview limit.");
 const operations=[];
 let referenceCount=0;
 for(const [path,raw] of rawPaths){
  if(!path.startsWith("/")||path.length>300)throw new Error("Invalid OpenAPI path.");
  if(!isObject(raw))throw new Error("Referenced or invalid path item not supported.");
  if("$ref" in raw){referenceCount++;continue}
  for(const method of METHODS){
   const op=raw[method];
   if(op===undefined)continue;
   if(!isObject(op))continue;
   if(operations.length>=700)throw new Error("OpenAPI exceeds the 700-operation preview limit.");
   const identifier=bounded(op.operationId,120)&&op.operationId.trim()
    ?op.operationId.trim():method.toUpperCase()+" "+path;
   const desc=bounded(op.summary,250)?op.summary:"";
   const security=op.security===undefined?input.security:op.security;
   const securityStatus=Array.isArray(security)?
    (security.length===0?"none-declared":"declared-review-required"):"unknown-review-required";
   operations.push({id:identifier,method:method.toUpperCase(),path,
    summary:desc,category:classify(method),security:securityStatus,
    executable:false,authorized:false});
  }
 }
 const servers=(Array.isArray(input.servers)?input.servers:[])
  .slice(0,20).map(safeServer).filter(Boolean);
 return {
  title:input.info.title.trim(),
  specVersion:input.openapi,servers,operations,referenceCount,
  notice:"Local description only. Servers, documentation, security schemes and HTTP method semantics require verification. No service was connected."
 };
}
export function inspectOpenApiJson(text){
 if(typeof text!=="string"||text.length>400000)throw new Error("OpenAPI JSON preview limit is 400 KB.");
 let parsed;
 try{parsed=JSON.parse(text)}catch{throw new Error("OpenAPI content is not valid JSON.");}
 return inspectOpenApiDocument(parsed);
}
