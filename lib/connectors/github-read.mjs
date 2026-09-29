import {evaluateExecution} from "../runtime/policy.mjs";

/**
 * Authenticated GitHub read adapter core. NEVER import into a browser component.
 * Caller must independently verify user identity and supply a short-lived,
 * authorized installation access token from a server-side vault.
 * No token persistence, token generation, installation OAuth, or public routes here.
 */
const repository=/^[A-Za-z0-9_.-]{1,39}\/[A-Za-z0-9_.-]{1,100}$/;
const filePath=/^[A-Za-z0-9_.\-/]{1,400}$/;
const safeRef=/^[A-Za-z0-9_.\-/]{1,180}$/;
function validate({projectId,connectorId,repo,policy,connections,token}) {
 if(typeof token!=="string" || token.length<12)
  throw new Error("Server-side installation token required");
 if(typeof repo!=="string" || !repository.test(repo) || repo.includes(".."))
  throw new Error("Invalid repository identifier");
 const decision=evaluateExecution({projectId,connectorId,resourceId:repo,action:"read"},policy,connections);
 if(!decision.allowed)throw new Error("Authorized project repository read denied: "+decision.reason);
}
async function requestGitHub(url,{token,transport}){
 if(typeof transport!=="function")throw new Error("Server-side transport missing");
 const response=await transport(url,{
  method:"GET",
  headers:{
   "Authorization":"Bearer "+token,
   "Accept":"application/vnd.github+json",
   "X-GitHub-Api-Version":"2022-11-28"
  },
  redirect:"error",
  signal:AbortSignal.timeout(10000)
 });
 if(response.status===401)throw new Error("GitHub authorization failed");
 if(response.status===403)throw new Error("GitHub refused the read or rate limit was reached");
 if(response.status===404)throw new Error("Authorized repository or file not found");
 if(!response.ok)throw new Error("GitHub read unavailable: HTTP "+response.status);
 const payload=await response.text();
 if(payload.length>1_500_000)throw new Error("GitHub response exceeds safety limit");
 let data;
 try{data=JSON.parse(payload)}catch{throw new Error("Invalid GitHub response")}
 return data;
}
export async function readGitHubRepository({projectId,connectorId,repo,policy,connections,token,transport}){
 validate({projectId,connectorId,repo,policy,connections,token});
 const data=await requestGitHub("https://api.github.com/repos/"+repo,{token,transport});
 if(!data || data.full_name?.toLowerCase()!==repo.toLowerCase())throw new Error("GitHub repository identity mismatch");
 return {fullName:data.full_name,defaultBranch:data.default_branch ?? null,
  private:data.private===true,htmlUrl:data.html_url ?? null};
}
export async function readGitHubFile({projectId,connectorId,repo,path,ref,policy,connections,token,transport}){
 validate({projectId,connectorId,repo,policy,connections,token});
 if(typeof path!=="string" || !filePath.test(path) || path.includes("..") || path.startsWith("/") || path.endsWith("/"))
  throw new Error("Invalid repository file path");
 if(typeof ref!=="string" || !safeRef.test(ref) || ref.includes(".."))
  throw new Error("Explicit validated branch or commit reference required");
 const url="https://api.github.com/repos/"+repo+"/contents/"+
  path.split("/").map(encodeURIComponent).join("/")+"?ref="+encodeURIComponent(ref);
 const data=await requestGitHub(url,{token,transport});
 if(!data || Array.isArray(data) || data.type!=="file" || typeof data.sha!=="string" || !data.sha ||
    typeof data.content!=="string" || data.encoding!=="base64" ||
    !Number.isInteger(data.size) || data.size<0 || (typeof data.path==="string" && data.path!==path))
  throw new Error("GitHub did not return a supported file");
 if(data.size>512000 || data.content.length>720000)
  throw new Error("GitHub file exceeds safe read limit");
 return {repo,path,ref,sha:data.sha,base64Content:data.content,size:data.size,
  source:"github-api",verifiedLiveRead:true};
}
