"use client";
import { useEffect, useMemo, useState } from "react";
import { exportWorkspace, initialWorkspace, loadWorkspace, saveWorkspace } from "@/lib/workspace";
import type { CatalogModel, Workspace } from "@/lib/types";
type Tab = "Overview" | "Projects" | "Memory" | "Models" | "Connections";
const tabs: Tab[] = ["Overview","Projects","Memory","Models","Connections"];
const uid = () => crypto.randomUUID();
export default function Home() {
 const [tab,setTab] = useState<Tab>("Overview");
 const [workspace,setWorkspace] = useState<Workspace>(initialWorkspace);
 const [hydrated,setHydrated] = useState(false);
 const [projectId,setProjectId] = useState("");
 const [projectName,setProjectName] = useState("");
 const [projectDescription,setProjectDescription] = useState("");
 const [memoryTitle,setMemoryTitle] = useState("");
 const [memoryBody,setMemoryBody] = useState("");
 const [notice,setNotice] = useState("");
 const [catalog,setCatalog] = useState<CatalogModel[]>([]);
 const [catalogNotice,setCatalogNotice] = useState("Not retrieved");
 const [search,setSearch] = useState("");
 const [zeroPriceOnly,setZeroPriceOnly] = useState(true);
 useEffect(()=>{const state=loadWorkspace();setWorkspace(state);setProjectId(state.projects[0]?.id||"");setHydrated(true)},[]);
 useEffect(()=>{if(hydrated)saveWorkspace(workspace)},[workspace,hydrated]);
 const currentProject=workspace.projects.find(p=>p.id===projectId);
 const memories=workspace.memories.filter(m=>m.projectId===projectId).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
 const visibleModels=useMemo(()=>catalog.filter(m=>(!zeroPriceOnly||m.zeroTextPrice)&&(`${m.name} ${m.id}`.toLowerCase().includes(search.toLowerCase()))).slice(0,100),[catalog,zeroPriceOnly,search]);
 function createProject(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  const name=projectName.trim();
  if(name.length<2||name.length>100){setNotice("Project name must contain 2–100 characters.");return}
  const project={id:uid(),name,description:projectDescription.trim().slice(0,500),createdAt:new Date().toISOString()};
  setWorkspace(old=>({...old,projects:[...old.projects,project]}));setProjectId(project.id);
  setProjectName("");setProjectDescription("");setNotice("Project created in this browser.");
 }
 function createMemory(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!currentProject){setNotice("Select a project first.");return}
  if(memoryTitle.trim().length<2||memoryBody.trim().length<2){setNotice("Enter a title and your brain dump.");return}
  const now=new Date().toISOString();
  const memory={id:uid(),projectId:currentProject.id,title:memoryTitle.trim().slice(0,140),body:memoryBody.trim().slice(0,20000),status:"draft" as const,createdAt:now,updatedAt:now};
  setWorkspace(old=>({...old,memories:[...old.memories,memory]}));
  setMemoryTitle("");setMemoryBody("");setNotice("Saved as a draft. Review it before approval.");
 }
 function approve(id:string){
  setWorkspace(old=>({...old,memories:old.memories.map(m=>m.id===id?{...m,status:"approved",updatedAt:new Date().toISOString()}:m)}));
  setNotice("Approved for the selected project.");
 }
 async function discover(){
  setCatalogNotice("Loading...");
  try {const response=await fetch("/api/catalog",{cache:"no-store"});if(!response.ok)throw new Error("Unavailable");
   const result:{models:CatalogModel[],retrievedAt:string}=await response.json();
   setCatalog(result.models);setCatalogNotice(`Discovered ${result.models.length.toLocaleString()} entries at ${new Date(result.retrievedAt).toLocaleString()}`);
  }catch{setCatalogNotice("Catalog unavailable. No other data was affected.")}
 }
 return <div className="shell">
  <aside className="sidebar">
   <div className="brand">UNITY<span>.</span></div><p className="tagline">PERSONAL ALPHA · PUBLIC SOURCE</p>
   <nav aria-label="Main navigation">{tabs.map(t=><button key={t} className={tab===t?"selected":""} onClick={()=>{setTab(t);setNotice("")}}>{t}</button>)}</nav>
   <p className="side-note">Browser-only prototype. No account connections or AI execution are enabled.</p>
  </aside>
  <main className="main">
   <header className="header"><div><p className="eyebrow">Personal development environment</p><h1>{tab}</h1></div><button className="muted-button" onClick={()=>exportWorkspace(workspace)}>Export workspace JSON</button></header>
   <div role="note" className="warning"><strong>Prototype:</strong> Local browser storage is not encrypted or synced. Do not add secrets or confidential information. Free catalog discovery does not mean free inference.</div>
   {notice&&<div className="notice" role="status">{notice}</div>}
   {tab==="Overview"&&<><div className="stats"><article><small>Projects</small><strong>{workspace.projects.length}</strong></article><article><small>Approved memories</small><strong>{workspace.memories.filter(m=>m.status==="approved").length}</strong></article><article><small>Paid API calls</small><strong>0</strong><small>Execution not implemented</small></article></div><section className="panel"><h2>What works today</h2><p>Create isolated local project workspaces, record brain dumps, approve memory deliberately and discover publicly listed models. Export your data at any time.</p><h2>What comes next</h2><p>Authenticated database, audit-backed memory, secured GitHub connection and actual provider routing. There are no live connectors in this release.</p><button className="primary" onClick={()=>setTab("Projects")}>Create a project</button></section></>}
   {tab==="Projects"&&<div className="columns"><section className="panel"><h2>New project</h2><form onSubmit={createProject}><label>Name<input required minLength={2} maxLength={100} value={projectName} onChange={e=>setProjectName(e.target.value)} placeholder="Project name"/></label><label>Description<textarea maxLength={500} value={projectDescription} onChange={e=>setProjectDescription(e.target.value)} placeholder="What is this project for?"/></label><button className="primary">Create project</button></form></section><section className="panel"><h2>Your local projects</h2>{workspace.projects.length===0?<p className="muted">No projects yet.</p>:workspace.projects.map(p=><article className="entry" key={p.id}><div className="entry-head"><strong>{p.name}</strong><span className="pill">{workspace.memories.filter(m=>m.projectId===p.id).length} memories</span></div><p>{p.description||"No description"}</p><button onClick={()=>{setProjectId(p.id);setTab("Memory")}}>Open project memory</button></article>)}</section></div>}
   {tab==="Memory"&&<><section className="panel"><label>Active project<select value={projectId} onChange={e=>setProjectId(e.target.value)}><option value="">Choose a project</option>{workspace.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></section><div className="columns"><section className="panel"><h2>Brain dump</h2><p className="muted">All new entries start as drafts, not instructions.</p><form onSubmit={createMemory}><label>Title<input maxLength={140} value={memoryTitle} onChange={e=>setMemoryTitle(e.target.value)} placeholder="What should UNITY remember?"/></label><label>Raw information<textarea className="large" maxLength={20000} value={memoryBody} onChange={e=>setMemoryBody(e.target.value)} placeholder="Write your thoughts, decisions, constraints or procedures."/></label><button className="primary" disabled={!projectId}>Save draft</button></form></section><section className="panel"><h2>{currentProject?.name||"Project"} knowledge</h2>{!projectId?<p className="muted">Select or create a project.</p>:memories.length===0?<p className="muted">No entries yet.</p>:memories.map(m=><article className="entry" key={m.id}><div className="entry-head"><strong>{m.title}</strong><span className={m.status==="approved"?"pill approved":"pill"}>{m.status}</span></div><p className="prewrap">{m.body}</p><small>{new Date(m.updatedAt).toLocaleString()}</small>{m.status==="draft"&&<button onClick={()=>approve(m.id)}>Approve for project</button>}</article>)}</section></div></>}
   {tab==="Models"&&<section className="panel"><h2>Public AI catalog</h2><p className="muted">Read-only OpenRouter listing. Zero published prompt and completion token prices do not guarantee free access, free tools or remaining quota.</p><div className="controls"><button className="primary" onClick={discover}>Refresh catalog</button><span>{catalogNotice}</span></div><div className="controls"><input aria-label="Search models" placeholder="Search models" value={search} onChange={e=>setSearch(e.target.value)}/><label className="inline"><input type="checkbox" checked={zeroPriceOnly} onChange={e=>setZeroPriceOnly(e.target.checked)}/> Zero text-price only</label></div><small>Showing first {visibleModels.length} matches of {catalog.length} total entries.</small><div className="model-list">{visibleModels.map(m=><div className="entry" key={m.id}><div className="entry-head"><strong>{m.name}</strong><span className="pill">{m.zeroTextPrice?"Zero text price":"Price unknown/paid"}</span></div><small>{m.id} · Context: {m.contextLength?.toLocaleString()||"Unknown"}</small></div>)}</div></section>}
   {tab==="Connections"&&<section className="panel"><h2>Connection manager</h2><p>Planned: multiple GitHub installations, model gateways, MCP servers, general REST and GraphQL APIs, and credential authorization.</p><p className="muted">Connections are disabled until server-side authentication, credential storage and permission checks have been implemented and tested.</p></section>}
  </main>
 </div>;
}