"use client";
import {useCallback,useEffect,useState} from "react";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {createBrowserSupabase} from "@/lib/supabase/browser";

type Project={id:string;name:string;description:string;created_at:string};
type Memory={id:string;project_id:string;title:string;body:string;status:string;updated_at:string;evidence_ref:string|null};
type ApiError={error?:string};
const configured=isSupabaseConfigured();

/**
 * Explicitly separate cloud workspace from localStorage. Local data must
 * never be promoted to authoritative server knowledge automatically.
 */
export default function CloudWorkspace(){
 const [authenticated,setAuthenticated]=useState<boolean|null>(null);
 const [projects,setProjects]=useState<Project[]>([]);
 const [projectId,setProjectId]=useState("");
 const [memories,setMemories]=useState<Memory[]>([]);
 const [projectName,setProjectName]=useState("");
 const [memoryTitle,setMemoryTitle]=useState("");
 const [memoryBody,setMemoryBody]=useState("");
 const [status,setStatus]=useState("");
 const [busy,setBusy]=useState(false);

 const refreshProjects=useCallback(async()=>{
  const res=await fetch("/api/private/projects",{credentials:"same-origin",cache:"no-store"});
  if(res.status===401){setAuthenticated(false);setProjects([]);return}
  const data:ApiError&{projects?:Project[]}=await res.json();
  if(!res.ok)throw Error(data.error||"Cloud projects are unavailable");
  setProjects(data.projects||[]);setAuthenticated(true);
 },[]);
 const refreshMemories=useCallback(async(id:string)=>{
  if(!id){setMemories([]);return}
  const res=await fetch("/api/private/memories?projectId="+encodeURIComponent(id),
   {credentials:"same-origin",cache:"no-store"});
  const data:ApiError&{memories?:Memory[]}=await res.json();
  if(!res.ok)throw Error(data.error||"Cloud memories are unavailable");
  setMemories(data.memories||[]);
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
 useEffect(()=>{if(authenticated&&projectId)void refreshMemories(projectId).catch(()=>setStatus("Cloud memories could not be loaded."));else setMemories([])},[authenticated,projectId,refreshMemories]);
 async function submitProject(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!configured||!authenticated||busy)return;
  setBusy(true);setStatus("");
  try{
   const res=await fetch("/api/private/projects",{
    method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name:projectName.trim(),description:""})
   });
   const data:ApiError&{project?:Project}=await res.json();
   if(!res.ok||!data.project)throw Error(data.error||"Could not create cloud project");
   setProjectName("");await refreshProjects();setProjectId(data.project.id);
   setStatus("Cloud project created on the dedicated backend.");
  }catch(error){setStatus(error instanceof Error?error.message:"Cloud project failed")}
  finally{setBusy(false)}
 }
 async function connectOpenRouter(){
  if(!configured||!authenticated||!projectId||busy)return;
  setBusy(true);setStatus("");
  try{
   const res=await fetch("/api/private/connect/openrouter/start",{
    method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({projectId})
   });
   const data:ApiError&{authorizationUrl?:string}=await res.json();
   if(!res.ok||!data.authorizationUrl)throw Error(data.error||"OpenRouter connection could not be started");
   const target=new URL(data.authorizationUrl);
   if(target.origin!=="https://openrouter.ai")throw Error("Unexpected OpenRouter authorization destination");
   window.location.assign(target.toString());
  }catch(error){
   setStatus(error instanceof Error?error.message:"OpenRouter connection failed");
   setBusy(false);
  }
 }
 async function submitMemory(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!configured||!authenticated||!projectId||busy)return;
  setBusy(true);setStatus("");
  try{
   const res=await fetch("/api/private/memories",{
    method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({projectId,title:memoryTitle.trim(),body:memoryBody.trim()})
   });
   const data:ApiError=await res.json();
   if(!res.ok)throw Error(data.error||"Could not create memory draft");
   setMemoryTitle("");setMemoryBody("");await refreshMemories(projectId);
   setStatus("Saved as a cloud draft. Approval is a separate, audited operation.");
  }catch(error){setStatus(error instanceof Error?error.message:"Memory draft failed")}
  finally{setBusy(false)}
 }
 async function approve(memory:Memory){
  if(!configured||!authenticated||busy||memory.project_id!==projectId)return;
  if(!window.confirm("Approve this exact cloud memory revision? It will become authoritative for this project."))return;
  setBusy(true);setStatus("");
  try{
   const res=await fetch("/api/private/memories/approve",{
    method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({projectId,memoryId:memory.id,expectedUpdatedAt:memory.updated_at})
   });
   const data:ApiError=await res.json();
   if(!res.ok)throw Error(data.error||"Memory could not be approved");
   await refreshMemories(projectId);
   setStatus("Approval recorded. Remember: approved notes are not independently verified external facts.");
  }catch(error){setStatus(error instanceof Error?error.message:"Approval failed")}
  finally{setBusy(false)}
 }
 async function signOut(){
  setBusy(true);setStatus("");
  try{
   const supabase=createBrowserSupabase();
   const {error}=await supabase.auth.signOut();
   if(error)throw Error("Sign-out could not be confirmed");
   setAuthenticated(false);setProjects([]);setMemories([]);setProjectId("");
  }catch{setStatus("Sign-out failed. Try again.")}
  finally{setBusy(false)}
 }
 if(!configured)return <section className="panel">
  <h2>Cloud workspace</h2>
  <p className="muted">Not connected. This area will become available only after you authorize and configure a dedicated UNITY backend. Your existing local projects stay here in your browser.</p>
  <div className="warning">No authentication, database or client information is connected.</div>
 </section>;
 if(authenticated===null)return <section className="panel"><h2>Cloud workspace</h2><p role="status">Checking your session...</p></section>;
 if(!authenticated)return <section className="panel"><h2>Cloud workspace</h2>
  <p>Sign in through the separately configured UNITY account to access cloud projects.</p>
  <a href="/auth/login">Open account sign-in</a>
  {status&&<p role="status">{status}</p>}
 </section>;
 return <div className="columns">
  <section className="panel">
   <div className="entry-head"><h2>Cloud projects</h2><button disabled={busy} onClick={()=>void signOut()}>Sign out</button></div>
   <p className="muted">Server-backed projects, separate from your unsynced browser workspace.</p>
   <form onSubmit={submitProject}>
    <label>New project<input required minLength={2} maxLength={100} value={projectName} onChange={e=>setProjectName(e.target.value)}/></label>
    <button disabled={busy||projectName.trim().length<2} className="primary">Create cloud project</button>
   </form>
   <label>Selected project<select value={projectId} onChange={e=>setProjectId(e.target.value)}>
    <option value="">Select a cloud project</option>
    {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
   </select></label>
   <div className="controls">
    <button type="button" className="primary" disabled={busy||!projectId} onClick={()=>void connectOpenRouter()}>{busy?"Please wait...":"Connect OpenRouter"}</button>
    <small>Opens OpenRouter authorization for this exact cloud project. No API key is shown in the browser.</small>
   </div>
   {status&&<p role="status" className="notice">{status}</p>}
  </section>
  <section className="panel">
   <h2>Authoritative memory drafts</h2>
   {!projectId?<p>Select a cloud project.</p>:<>
    <form onSubmit={submitMemory}>
     <label>Title<input maxLength={140} minLength={2} value={memoryTitle} onChange={e=>setMemoryTitle(e.target.value)} required/></label>
     <label>Memory draft<textarea maxLength={20000} minLength={2} value={memoryBody} onChange={e=>setMemoryBody(e.target.value)} required/></label>
     <button disabled={busy||!memoryTitle.trim()||!memoryBody.trim()} className="primary">Save cloud draft</button>
    </form>
    {memories.length===0?<p className="muted">No cloud memories for this project.</p>:memories.map(m=><article className="entry" key={m.id}>
     <div className="entry-head"><strong>{m.title}</strong><span className={m.status==="approved"?"pill approved":"pill"}>{m.status}</span></div>
     <p className="prewrap">{m.body}</p>
     <small>Last modified: {new Date(m.updated_at).toLocaleString()}</small><br/>
     {m.status==="draft"&&<button disabled={busy} onClick={()=>void approve(m)}>Review and approve</button>}
    </article>)}
   </>}
  </section>
 </div>;
}
