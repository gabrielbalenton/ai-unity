"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {createBrowserSupabase} from "@/lib/supabase/browser";

type Project={id:string;name:string;description:string;created_at:string};
type Memory={id:string;project_id:string;title:string;body:string;status:string;updated_at:string;evidence_ref:string|null};
type Connection={provider:string;accountLabel:string;status:string;resourceId:string;permissionMode:string;updatedAt:string};
type SupabaseProject={ref:string;name:string;organizationId:string|null;status:string|null};
type GitHubInstallation={id:number;accountLogin:string;accountType:string;repositorySelection:string};
type GitHubRepo={id:number;fullName:string;private:boolean;defaultBranch:string|null};
type ApiError={error?:string};

const configured=isSupabaseConfigured();

export default function CloudWorkspace(){
 const [authenticated,setAuthenticated]=useState<boolean|null>(null);
 const [projects,setProjects]=useState<Project[]>([]);
 const [projectId,setProjectId]=useState("");
 const [memories,setMemories]=useState<Memory[]>([]);
 const [connections,setConnections]=useState<Connection[]>([]);
 const [supabaseProjects,setSupabaseProjects]=useState<SupabaseProject[]>([]);
 const [supabaseProjectRef,setSupabaseProjectRef]=useState("");
 const [githubInstallations,setGithubInstallations]=useState<GitHubInstallation[]>([]);
 const [githubInstallationId,setGithubInstallationId]=useState("");
 const [githubRepos,setGithubRepos]=useState<GitHubRepo[]>([]);
 const [githubRepoId,setGithubRepoId]=useState("");
 const [projectName,setProjectName]=useState("");
 const [memoryTitle,setMemoryTitle]=useState("");
 const [memoryBody,setMemoryBody]=useState("");
 const [status,setStatus]=useState("");
 const [busy,setBusy]=useState(false);

 const openRouter=useMemo(()=>connections.find(item=>item.provider==="openrouter"&&item.status==="ready"),[connections]);
 const supabaseConnection=useMemo(()=>connections.find(item=>item.provider==="supabase"&&item.status==="ready"),[connections]);
 const selectedSupabaseBinding=useMemo(()=>connections.find(item=>item.provider==="supabase"&&item.resourceId.startsWith("supabase:project:")),[connections]);
 const githubConnection=useMemo(()=>connections.find(item=>item.provider==="github"&&item.status==="ready"),[connections]);
 const selectedGithubBinding=useMemo(()=>connections.find(item=>item.provider==="github"&&item.resourceId.startsWith("github:repo:")),[connections]);

 const refreshProjects=useCallback(async()=>{
  const res=await fetch("/api/private/projects",{credentials:"same-origin",cache:"no-store"});
  if(res.status===401){setAuthenticated(false);setProjects([]);return}
  const data:ApiError&{projects?:Project[]}=await res.json();
  if(!res.ok)throw Error(data.error||"Cloud projects are unavailable");
  setProjects(data.projects||[]);setAuthenticated(true);
 },[]);
 const refreshMemories=useCallback(async(id:string)=>{
  if(!id){setMemories([]);return}
  const res=await fetch("/api/private/memories?projectId="+encodeURIComponent(id),{credentials:"same-origin",cache:"no-store"});
  const data:ApiError&{memories?:Memory[]}=await res.json();
  if(!res.ok)throw Error(data.error||"Cloud memories are unavailable");
  setMemories(data.memories||[]);
 },[]);
 const refreshConnections=useCallback(async(id:string)=>{
  if(!id){setConnections([]);return}
  const res=await fetch("/api/private/connections/project?projectId="+encodeURIComponent(id),{credentials:"same-origin",cache:"no-store"});
  const data:ApiError&{connections?:Connection[]}=await res.json();
  if(!res.ok){setConnections([]);return}
  setConnections(data.connections||[]);
 },[]);
 const refreshSupabaseProjects=useCallback(async(id:string)=>{
  const res=await fetch("/api/private/connect/supabase/projects?projectId="+encodeURIComponent(id),{credentials:"same-origin",cache:"no-store"});
  const data:ApiError&{projects?:SupabaseProject[]}=await res.json();
  if(!res.ok){setSupabaseProjects([]);throw Error(data.error||"Supabase projects are unavailable")}
  setSupabaseProjects(data.projects||[]);
 },[]);
 const refreshGitHubInstallations=useCallback(async(id:string)=>{
  const res=await fetch("/api/private/connect/github/installations?projectId="+encodeURIComponent(id),{credentials:"same-origin",cache:"no-store"});
  const data:ApiError&{installations?:GitHubInstallation[]}=await res.json();
  if(!res.ok){setGithubInstallations([]);throw Error(data.error||"GitHub installations are unavailable")}
  setGithubInstallations(data.installations||[]);
 },[]);

 useEffect(()=>{
  if(!configured)return;
  let active=true;
  fetch("/api/private/session",{credentials:"same-origin",cache:"no-store"})
   .then(async res=>({ok:res.ok,data:await res.json()}))
   .then(({ok})=>{if(!active)return;setAuthenticated(ok);if(ok)void refreshProjects().catch(()=>setStatus("Cloud workspace temporarily unavailable."));})
   .catch(()=>{if(active){setAuthenticated(false);setStatus("Backend session could not be verified.")}});
  return()=>{active=false};
 },[refreshProjects]);

 useEffect(()=>{
  if(typeof window==="undefined")return;
  const params=new URLSearchParams(window.location.search);
  const provider=params.get("connection"),result=params.get("status");
  if(["openrouter","supabase","github"].includes(provider||"")&&(result==="connected"||result==="error")){
   const name=provider==="openrouter"?"OpenRouter":provider==="supabase"?"Supabase":"GitHub";
   setStatus(result==="connected"?`${name} connected successfully.`:`${name} connection failed.`);
   params.delete("connection");params.delete("status");
   window.history.replaceState({},"",window.location.pathname+(params.toString()?`?${params.toString()}`:"")+window.location.hash);
  }
 },[]);

 useEffect(()=>{
  setSupabaseProjects([]);setSupabaseProjectRef("");
  setGithubInstallations([]);setGithubInstallationId("");setGithubRepos([]);setGithubRepoId("");
  if(authenticated&&projectId){
   void refreshMemories(projectId).catch(()=>setStatus("Cloud memories could not be loaded."));
   void refreshConnections(projectId);
  }else{setMemories([]);setConnections([])}
 },[authenticated,projectId,refreshMemories,refreshConnections]);
 useEffect(()=>{if(projectId&&supabaseConnection)void refreshSupabaseProjects(projectId).catch(error=>setStatus(error instanceof Error?error.message:"Supabase projects are unavailable"));},[projectId,supabaseConnection,refreshSupabaseProjects]);
 useEffect(()=>{if(projectId&&githubConnection)void refreshGitHubInstallations(projectId).catch(error=>setStatus(error instanceof Error?error.message:"GitHub installations are unavailable"));},[projectId,githubConnection,refreshGitHubInstallations]);

 async function submitProject(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(!authenticated||busy)return;setBusy(true);setStatus("");
  try{
   const res=await fetch("/api/private/projects",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:projectName.trim(),description:""})});
   const data:ApiError&{project?:Project}=await res.json();if(!res.ok||!data.project)throw Error(data.error||"Could not create cloud project");
   setProjectName("");await refreshProjects();setProjectId(data.project.id);setStatus("Cloud project created on the dedicated backend.");
  }catch(error){setStatus(error instanceof Error?error.message:"Cloud project failed")}finally{setBusy(false)}
 }

 async function startProvider(provider:"openrouter"|"supabase"|"github"){
  if(!authenticated||!projectId||busy)return;setBusy(true);setStatus("");
  try{
   const res=await fetch(`/api/private/connect/${provider}/start`,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({projectId})});
   const data:ApiError&{authorizationUrl?:string}=await res.json();if(!res.ok||!data.authorizationUrl)throw Error(data.error||`${provider} connection could not be started`);
   const target=new URL(data.authorizationUrl);
   const allowed=provider==="openrouter"?target.origin==="https://openrouter.ai":provider==="supabase"?target.origin==="https://api.supabase.com":target.origin==="https://github.com";
   if(!allowed)throw Error(`Unexpected ${provider} authorization destination`);
   window.location.assign(target.toString());
  }catch(error){setStatus(error instanceof Error?error.message:`${provider} connection failed`);setBusy(false)}
 }

 async function selectSupabaseProject(){
  if(!projectId||!supabaseProjectRef||busy)return;setBusy(true);setStatus("");
  try{
   const res=await fetch("/api/private/connect/supabase/select-project",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({projectId,supabaseProjectRef})});
   const data:ApiError&{selected?:{name:string}}=await res.json();if(!res.ok||!data.selected)throw Error(data.error||"Supabase project could not be selected");
   await refreshConnections(projectId);setStatus(`Supabase project ${data.selected.name} connected read-only.`);
  }catch(error){setStatus(error instanceof Error?error.message:"Supabase project selection failed")}finally{setBusy(false)}
 }

 async function loadGithubRepos(value:string){
  setGithubInstallationId(value);setGithubRepoId("");setGithubRepos([]);if(!value||!projectId)return;
  try{
   const res=await fetch(`/api/private/connect/github/repositories?projectId=${encodeURIComponent(projectId)}&installationId=${encodeURIComponent(value)}`,{credentials:"same-origin",cache:"no-store"});
   const data:ApiError&{repositories?:GitHubRepo[]}=await res.json();if(!res.ok)throw Error(data.error||"GitHub repositories are unavailable");setGithubRepos(data.repositories||[]);
  }catch(error){setStatus(error instanceof Error?error.message:"GitHub repositories are unavailable")}
 }

 async function selectGithubRepo(){
  if(!projectId||!githubInstallationId||!githubRepoId||busy)return;setBusy(true);setStatus("");
  try{
   const res=await fetch("/api/private/connect/github/select-repository",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({projectId,installationId:Number(githubInstallationId),repositoryId:Number(githubRepoId)})});
   const data:ApiError&{selected?:{fullName:string}}=await res.json();if(!res.ok||!data.selected)throw Error(data.error||"GitHub repository could not be selected");
   await refreshConnections(projectId);setStatus(`GitHub repository ${data.selected.fullName} connected read-only.`);
  }catch(error){setStatus(error instanceof Error?error.message:"GitHub repository selection failed")}finally{setBusy(false)}
 }

 async function submitMemory(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(!projectId||busy)return;setBusy(true);setStatus("");
  try{
   const res=await fetch("/api/private/memories",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({projectId,title:memoryTitle.trim(),body:memoryBody.trim()})});
   const data:ApiError=await res.json();if(!res.ok)throw Error(data.error||"Could not create memory draft");
   setMemoryTitle("");setMemoryBody("");await refreshMemories(projectId);setStatus("Saved as a cloud draft. Approval is a separate, audited operation.");
  }catch(error){setStatus(error instanceof Error?error.message:"Memory draft failed")}finally{setBusy(false)}
 }

 async function approve(memory:Memory){
  if(busy||memory.project_id!==projectId)return;
  if(!window.confirm("Approve this exact cloud memory revision? It will become authoritative for this project."))return;
  setBusy(true);setStatus("");
  try{
   const res=await fetch("/api/private/memories/approve",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({projectId,memoryId:memory.id,expectedUpdatedAt:memory.updated_at})});
   const data:ApiError=await res.json();if(!res.ok)throw Error(data.error||"Memory could not be approved");
   await refreshMemories(projectId);setStatus("Approval recorded. Remember: approved notes are not independently verified external facts.");
  }catch(error){setStatus(error instanceof Error?error.message:"Approval failed")}finally{setBusy(false)}
 }

 async function signOut(){
  setBusy(true);setStatus("");
  try{const supabase=createBrowserSupabase();const {error}=await supabase.auth.signOut();if(error)throw Error("Sign-out could not be confirmed");setAuthenticated(false);setProjects([]);setMemories([]);setConnections([]);setProjectId("");}
  catch{setStatus("Sign-out failed. Try again.")}finally{setBusy(false)}
 }

 if(!configured)return <section className="panel">
  <h2>Cloud workspace</h2>
  <p className="muted">Not connected. This area will become available only after you authorize and configure a dedicated UNITY backend. Your existing local projects stay here in your browser.</p>
  <div className="warning">No authentication, database or client information is connected.</div>
 </section>;
 if(authenticated===null)return <section className="panel"><h2>Cloud workspace</h2><p role="status">Checking your session...</p></section>;
 if(!authenticated)return <section className="panel"><h2>Cloud workspace</h2><p>Sign in through the separately configured UNITY account to access cloud projects.</p><a href="/auth/login">Open account sign-in</a>{status&&<p role="status">{status}</p>}</section>;

 return <div className="columns">
  <section className="panel">
   <div className="entry-head"><h2>Cloud projects</h2><button disabled={busy} onClick={()=>void signOut()}>Sign out</button></div>
   <p className="muted">Server-backed projects, separate from your unsynced browser workspace.</p>
   <form onSubmit={submitProject}><label>New project<input required minLength={2} maxLength={100} value={projectName} onChange={event=>setProjectName(event.target.value)}/></label><button disabled={busy||projectName.trim().length<2} className="primary">Create cloud project</button></form>
   <label>Selected project<select value={projectId} onChange={event=>setProjectId(event.target.value)}><option value="">Select a cloud project</option>{projects.map(project=><option key={project.id} value={project.id}>{project.name}</option>)}</select></label>

   <div className="controls"><button type="button" className="primary" disabled={busy||!projectId||Boolean(openRouter)} onClick={()=>void startProvider("openrouter")}>{openRouter?"OpenRouter connected":"Connect OpenRouter"}</button><small>{openRouter?"Key stored securely":"One-click authorization; key never appears in the browser."}</small></div>
   <div className="controls"><button type="button" className="primary" disabled={busy||!projectId||Boolean(supabaseConnection)} onClick={()=>void startProvider("supabase")}>{supabaseConnection?"Supabase authorized":"Connect Supabase"}</button><small>{selectedSupabaseBinding?`Bound read-only to ${selectedSupabaseBinding.resourceId.replace("supabase:project:","")}`:"Authorize, then choose the exact Supabase project."}</small></div>
   {supabaseConnection&&!selectedSupabaseBinding&&<div className="controls"><label>Supabase project<select value={supabaseProjectRef} onChange={event=>setSupabaseProjectRef(event.target.value)}><option value="">Select project</option>{supabaseProjects.map(project=><option key={project.ref} value={project.ref}>{project.name} ({project.ref})</option>)}</select></label><button disabled={busy||!supabaseProjectRef} onClick={()=>void selectSupabaseProject()}>Use this Supabase project</button></div>}

   <div className="controls"><button type="button" className="primary" disabled={busy||!projectId||Boolean(githubConnection)} onClick={()=>void startProvider("github")}>{githubConnection?"GitHub authorized":"Connect GitHub"}</button><small>{selectedGithubBinding?`Bound read-only to ${selectedGithubBinding.resourceId.replace("github:repo:","")}`:"Install and authorize the UNITY GitHub App, then choose the exact repository."}</small></div>
   {githubConnection&&!selectedGithubBinding&&<div className="controls"><label>GitHub account/install<select value={githubInstallationId} onChange={event=>void loadGithubRepos(event.target.value)}><option value="">Select GitHub account</option>{githubInstallations.map(installation=><option key={installation.id} value={installation.id}>{installation.accountLogin} ({installation.accountType})</option>)}</select></label>{githubInstallationId&&<label>Repository<select value={githubRepoId} onChange={event=>setGithubRepoId(event.target.value)}><option value="">Select repository</option>{githubRepos.map(repo=><option key={repo.id} value={repo.id}>{repo.fullName}{repo.private?" · private":""}</option>)}</select></label>}<button disabled={busy||!githubRepoId} onClick={()=>void selectGithubRepo()}>Use this GitHub repository</button></div>}

   {connections.length>0&&<div className="model-list" aria-label="Connected services">{connections.map(item=><article className="entry" key={`${item.provider}:${item.resourceId}`}><div className="entry-head"><strong>{item.accountLabel}</strong><span className="pill">{item.status}</span></div><small>{item.provider} · {item.resourceId} · {item.permissionMode} access</small></article>)}</div>}
   {status&&<p role="status" className="notice">{status}</p>}
  </section>

  <section className="panel">
   <h2>Authoritative memory drafts</h2>
   {!projectId?<p>Select a cloud project.</p>:<><form onSubmit={submitMemory}><label>Title<input maxLength={140} minLength={2} value={memoryTitle} onChange={event=>setMemoryTitle(event.target.value)} required/></label><label>Memory draft<textarea maxLength={20000} minLength={2} value={memoryBody} onChange={event=>setMemoryBody(event.target.value)} required/></label><button disabled={busy||!memoryTitle.trim()||!memoryBody.trim()} className="primary">Save cloud draft</button></form>{memories.length===0?<p className="muted">No cloud memories for this project.</p>:memories.map(memory=><article className="entry" key={memory.id}><div className="entry-head"><strong>{memory.title}</strong><span className={memory.status==="approved"?"pill approved":"pill"}>{memory.status}</span></div><p className="prewrap">{memory.body}</p><small>Last modified: {new Date(memory.updated_at).toLocaleString()}</small><br/>{memory.status==="draft"&&<button disabled={busy} onClick={()=>void approve(memory)}>Review and approve</button>}</article>)}</>}
  </section>
 </div>;
}
