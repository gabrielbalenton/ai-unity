"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {createBrowserSupabase} from "@/lib/supabase/browser";

type Project={id:string;name:string;description:string;created_at:string};
type Memory={id:string;project_id:string;title:string;body:string;status:string;updated_at:string;evidence_ref:string|null};
type Connection={provider:string;accountLabel:string;status:string;resourceId:string;permissionMode:string;updatedAt:string};
type SupabaseProject={ref:string;name:string;organizationId:string|null;status:string|null};
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
 const [projectName,setProjectName]=useState("");
 const [memoryTitle,setMemoryTitle]=useState("");
 const [memoryBody,setMemoryBody]=useState("");
 const [status,setStatus]=useState("");
 const [busy,setBusy]=useState(false);
 const openRouter=useMemo(()=>connections.find(item=>item.provider==="openrouter"&&item.status==="ready"),[connections]);
 const supabaseConnection=useMemo(()=>connections.find(item=>item.provider==="supabase"&&item.status==="ready"),[connections]);
 const selectedSupabaseBinding=useMemo(()=>connections.find(item=>item.provider==="supabase"&&item.resourceId.startsWith("supabase:project:")),[connections]);

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
  if(!id){setSupabaseProjects([]);return}
  const res=await fetch("/api/private/connect/supabase/projects?projectId="+encodeURIComponent(id),{credentials:"same-origin",cache:"no-store"});
  const data:ApiError&{projects?:SupabaseProject[]}=await res.json();
  if(!res.ok){setSupabaseProjects([]);throw Error(data.error||"Supabase projects are unavailable")}
  setSupabaseProjects(data.projects||[]);
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
  const provider=params.get("connection");
  const result=params.get("status");
  if((provider==="openrouter"||provider==="supabase")&&(result==="connected"||result==="error")){
   setStatus(result==="connected"?`${provider==="openrouter"?"OpenRouter":"Supabase"} connected successfully.`:`${provider==="openrouter"?"OpenRouter":"Supabase"} connection failed.`);
   params.delete("connection");params.delete("status");
   const query=params.toString();
   window.history.replaceState({},"",window.location.pathname+(query?`?${query}`:"")+window.location.hash);
  }
 },[]);

 useEffect(()=>{
  setSupabaseProjects([]);setSupabaseProjectRef("");
  if(authenticated&&projectId){
   void refreshMemories(projectId).catch(()=>setStatus("Cloud memories could not be loaded."));
   void refreshConnections(projectId);
  }else{setMemories([]);setConnections([])}
 },[authenticated,projectId,refreshMemories,refreshConnections]);

 useEffect(()=>{
  if(!projectId||!supabaseConnection)return;
  void refreshSupabaseProjects(projectId).catch(error=>setStatus(error instanceof Error?error.message:"Supabase projects are unavailable"));
 },[projectId,supabaseConnection,refreshSupabaseProjects]);

 async function submitProject(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!configured||!authenticated||busy)return;
  setBusy(true);setStatus("");
  try{
   const res=await fetch("/api/private/projects",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:projectName.trim(),description:""})});
   const data:ApiError&{project?:Project}=await res.json();
   if(!res.ok||!data.project)throw Error(data.error||"Could not create cloud project");
   setProjectName("");await refreshProjects();setProjectId(data.project.id);setStatus("Cloud project created on the dedicated backend.");
  }catch(error){setStatus(error instanceof Error?error.message:"Cloud project failed")}
  finally{setBusy(false)}
 }

 async function startProvider(provider:"openrouter"|"supabase"){
  if(!configured||!authenticated||!projectId||busy)return;
  setBusy(true);setStatus("");
  try{
   const res=await fetch(`/api/private/connect/${provider}/start`,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({projectId})});
   const data:ApiError&{authorizationUrl?:string}=await res.json();
   if(!res.ok||!data.authorizationUrl)throw Error(data.error||`${provider} connection could not be started`);
   const target=new URL(data.authorizationUrl);
   const allowed=provider==="openrouter"?target.origin==="https://openrouter.ai":target.origin==="https://api.supabase.com";
   if(!allowed)throw Error(`Unexpected ${provider} authorization destination`);
   window.location.assign(target.toString());
  }catch(error){setStatus(error instanceof Error?error.message:`${provider} connection failed`);setBusy(false)}
 }

 async function selectSupabaseProject(){
  if(!projectId||!supabaseProjectRef||busy)return;
  setBusy(true);setStatus("");
  try{
   const res=await fetch("/api/private/connect/supabase/select-project",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({projectId,supabaseProjectRef})});
   const data:ApiError&{selected?:{ref:string;name:string;status:string|null}}=await res.json();
   if(!res.ok||!data.selected)throw Error(data.error||"Supabase project could not be selected");
   await refreshConnections(projectId);
   setStatus(`Supabase project ${data.selected.name} connected read-only.`);
  }catch(error){setStatus(error instanceof Error?error.message:"Supabase project selection failed")}
  finally{setBusy(false)}
 }

 async function submitMemory(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!configured||!authenticated||!projectId||busy)return;
  setBusy(true);setStatus("");
  try{
   const res=await fetch("/api/private/memories",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({projectId,title:memoryTitle.trim(),body:memoryBody.trim()})});
   const data:ApiError=await res.json();
   if(!res.ok)throw Error(data.error||"Could not create memory draft");
   setMemoryTitle("");setMemoryBody("");await refreshMemories(projectId);setStatus("Saved as a cloud draft. Approval is a separate, audited operation.");
  }catch(error){setStatus(error instanceof Error?error.message:"Memory draft failed")}
  finally{setBusy(false)}
 }

 async function approve(memory:Memory){
  if(!configured||!authenticated||busy||memory.project_id!==projectId)return;
  if(!window.confirm("Approve this exact cloud memory revision? It will become authoritative for this project."))return;
  setBusy(true);setStatus("");
  try{
   const res=await fetch("/api/private/memories/approve",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({projectId,memoryId:memory.id,expectedUpdatedAt:memory.updated_at})});
   const data:ApiError=await res.json();
   if(!res.ok)throw Error(data.error||"Memory could not be approved");
   await refreshMemories(projectId);setStatus("Approval recorded. Approved notes are still not independently verified external facts.");
  }catch(error){setStatus(error instanceof Error?error.message:"Approval failed")}
  finally{setBusy(false)}
 }

 async function signOut(){
  setBusy(true);setStatus("");
  try{
   const supabase=createBrowserSupabase();
   const {error}=await supabase.auth.signOut();
   if(error)throw Error("Sign-out could not be confirmed");
   setAuthenticated(false);setProjects([]);setMemories([]);setConnections([]);setSupabaseProjects([]);setProjectId("");
  }catch{setStatus("Sign-out failed. Try again.")}
  finally{setBusy(false)}
 }

 if(!configured)return <section className="panel"><h2>Cloud workspace</h2><p className="muted">Not connected. This area becomes available after you configure the dedicated UNITY backend. Your existing local projects stay in your browser.</p><div className="warning">No authentication, database or client information is connected.</div></section>;
 if(authenticated===null)return <section className="panel"><h2>Cloud workspace</h2><p role="status">Checking your session...</p></section>;
 if(!authenticated)return <section className="panel"><h2>Cloud workspace</h2><p>Sign in through the separately configured UNITY account to access cloud projects.</p><a href="/auth/login">Open account sign-in</a>{status&&<p role="status">{status}</p>}</section>;

 return <div className="columns">
  <section className="panel">
   <div className="entry-head"><h2>Cloud projects</h2><button disabled={busy} onClick={()=>void signOut()}>Sign out</button></div>
   <p className="muted">Server-backed projects, separate from your unsynced browser workspace.</p>
   <form onSubmit={submitProject}><label>New project<input required minLength={2} maxLength={100} value={projectName} onChange={e=>setProjectName(e.target.value)}/></label><button disabled={busy||projectName.trim().length<2} className="primary">Create cloud project</button></form>
   <label>Selected project<select value={projectId} onChange={e=>setProjectId(e.target.value)}><option value="">Select a cloud project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>

   <div className="controls">
    <button type="button" className="primary" disabled={busy||!projectId||Boolean(openRouter)} onClick={()=>void startProvider("openrouter")}>{openRouter?"OpenRouter connected":busy?"Please wait...":"Connect OpenRouter"}</button>
    <small>{openRouter?`${openRouter.accountLabel} · ${openRouter.permissionMode} access · key stored securely`:"Authorize OpenRouter for this exact cloud project. No API key is shown in the browser."}</small>
   </div>

   <div className="controls">
    <button type="button" className="primary" disabled={busy||!projectId||Boolean(supabaseConnection)} onClick={()=>void startProvider("supabase")}>{supabaseConnection?"Supabase authorized":busy?"Please wait...":"Connect Supabase"}</button>
    <small>{selectedSupabaseBinding?`Bound read-only to ${selectedSupabaseBinding.resourceId.replace("supabase:project:","")}`:supabaseConnection?"Choose the exact Supabase project below before UNITY uses it.":"Authorize your Supabase account, then choose the exact project for this UNITY project."}</small>
   </div>

   {supabaseConnection&&!selectedSupabaseBinding&&<div className="controls">
    <label>Supabase project<select value={supabaseProjectRef} onChange={e=>setSupabaseProjectRef(e.target.value)} disabled={busy}><option value="">Select an authorized Supabase project</option>{supabaseProjects.map(p=><option key={p.ref} value={p.ref}>{p.name} ({p.ref})</option>)}</select></label>
    <button type="button" disabled={busy||!supabaseProjectRef} onClick={()=>void selectSupabaseProject()}>Use this Supabase project</button>
    {supabaseProjects.length===0&&<small>No projects loaded yet. Reconnect Supabase if authorization has expired.</small>}
   </div>}

   {connections.length>0&&<div className="model-list" aria-label="Connected services">{connections.map(item=><article className="entry" key={`${item.provider}:${item.resourceId}`}><div className="entry-head"><strong>{item.accountLabel}</strong><span className="pill">{item.status}</span></div><small>{item.provider} · {item.resourceId} · {item.permissionMode} access</small></article>)}</div>}
   {status&&<p role="status" className="notice">{status}</p>}
  </section>

  <section className="panel">
   <h2>Authoritative memory drafts</h2>
   {!projectId?<p>Select a cloud project.</p>:<>
    <form onSubmit={submitMemory}><label>Title<input maxLength={140} minLength={2} value={memoryTitle} onChange={e=>setMemoryTitle(e.target.value)} required/></label><label>Memory draft<textarea maxLength={20000} minLength={2} value={memoryBody} onChange={e=>setMemoryBody(e.target.value)} required/></label><button disabled={busy||!memoryTitle.trim()||!memoryBody.trim()} className="primary">Save cloud draft</button></form>
    {memories.length===0?<p className="muted">No cloud memories for this project.</p>:memories.map(m=><article className="entry" key={m.id}><div className="entry-head"><strong>{m.title}</strong><span className={m.status==="approved"?"pill approved":"pill"}>{m.status}</span></div><p className="prewrap">{m.body}</p><small>Last modified: {new Date(m.updated_at).toLocaleString()}</small><br/>{m.status==="draft"&&<button disabled={busy} onClick={()=>void approve(m)}>Review and approve</button>}</article>)}
   </>}
  </section>
 </div>;
}
