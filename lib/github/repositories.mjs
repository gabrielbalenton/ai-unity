/**
 * An installation token MUST have been minted for explicitly approved repository
 * IDs. This function only returns safe repository metadata, not arbitrary file data.
 * Caller must bind the installation to an authenticated UNITY project.
 */
export async function listInstallationRepositories({token,allowedRepoIds,fetcher=fetch}) {
 if(typeof token!=="string"||token.length<12 || !Array.isArray(allowedRepoIds)||
   allowedRepoIds.length===0 || allowedRepoIds.length>100 ||
   !allowedRepoIds.every(x=>Number.isSafeInteger(x)&&x>0))throw Error("Invalid repository access scope");
 const allowed=new Set(allowedRepoIds);
 const selected=[];
 // Bounded pagination. A single operation cannot enumerate an unbounded account.
 for(let page=1;page<=5;page++){
  const url="https://api.github.com/installation/repositories?per_page=100&page="+page;
  let response;
  try{
   response=await fetcher(url,{method:"GET",redirect:"error",signal:AbortSignal.timeout(8000),
    headers:{Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28",Authorization:"Bearer "+token}});
  }catch{throw Error("GitHub repository metadata is temporarily unavailable")}
  if(!response?.ok)throw Error("GitHub repository metadata request failed");
  const body=await response.json();
  if(!Array.isArray(body.repositories)||body.repositories.length>100)
   throw Error("GitHub repository metadata response invalid");
  for(const repo of body.repositories){
   if(!repo||!allowed.has(repo.id))continue;
   // Avoid echoing untrusted GitHub strings into later execution plans.
   if(typeof repo.full_name!=="string"||
     !/^[A-Za-z0-9_.-]{1,39}\/[A-Za-z0-9_.-]{1,100}$/.test(repo.full_name))continue;
   selected.push({id:repo.id,fullName:repo.full_name,private:repo.private===true,
    defaultBranch:typeof repo.default_branch==="string"?repo.default_branch.slice(0,200):null});
  }
  if(body.repositories.length<100)break;
 }
 return selected;
}
