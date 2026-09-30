"use client";
import { useEffect, useMemo, useState } from "react";
import { exportWorkspace, initialWorkspace, loadWorkspace, saveWorkspace, previewWorkspaceImport } from "@/lib/workspace";
import type { CatalogModel, Workspace } from "@/lib/types";
import VoiceDictation from "@/components/VoiceDictation";
import ChatPanel from "@/components/ChatPanel";
import TaskBoard from "@/components/TaskBoard";
import CloudWorkspace from "@/components/CloudWorkspace";
import OpenApiDesigner from "@/components/OpenApiDesigner";
import CommandCenter,{type Area} from "@/components/CommandCenter";
import ReadinessPanel from "@/components/ReadinessPanel";
import AppearanceControl from "@/components/AppearanceControl";
import {Activity, ArrowRight, AudioLines, BrainCircuit, ChevronDown, Cloud, Command, Cpu, Database, Download, FolderKanban, GitBranch, Layers3, Menu, MessageSquare, Network, Search, ShieldCheck, Sparkles, Workflow, Wrench, X} from "lucide-react";
type Tab = Area;
const navGroups:{label:string;items:{tab:Tab;icon:typeof Activity;note?:string}[]}[]=[
 {label:"COMMAND",items:[{tab:"Overview",icon:Layers3},{tab:"Chat",icon:MessageSquare},{tab:"Tasks",icon:Workflow},{tab:"Readiness",icon:ShieldCheck}]},
 {label:"WORKSPACE",items:[{tab:"Projects",icon:FolderKanban},{tab:"Memory",icon:BrainCircuit},{tab:"Cloud",icon:Cloud,note:"OFFLINE"}]},
 {label:"NETWORK",items:[{tab:"Models",icon:Cpu},{tab:"Tools",icon:Wrench},{tab:"Connections",icon:Network}]}
];
const tabs:Tab[]=navGroups.flatMap(g=>g.items.map(i=>i.tab));
const moduleDetails:Record<Exclude<Tab,"Overview">,{kicker:string;description:string;status:string}>={
 Readiness:{kicker:"LAUNCH VERIFICATION",description:"Review every release requirement before enabling external integrations or deployment.",status:"RELEASE LOCKED"},
 Projects:{kicker:"YOUR WORKSPACE",description:"Separate working environments, decisions and approved public repository references.",status:"LOCAL WORKSPACE"},
 Cloud:{kicker:"PERSISTENCE",description:"An optional, explicitly separate server-backed workspace. Requires your future dedicated UNITY database.",status:"NOT VERIFIED"},
 Tasks:{kicker:"TASK ORCHESTRATION",description:"Plan missions and track evidence in this browser. No agents run tasks automatically.",status:"LOCAL PREVIEW"},
 Chat:{kicker:"CONVERSATION",description:"Capture project-specific discussion now. AI inference activates only after authorization and budget checks.",status:"LOCAL RECORDS"},
 Memory:{kicker:"KNOWLEDGE",description:"Capture brain dumps, review project notes and deliberately promote approved knowledge.",status:"LOCAL STORAGE"},
 Models:{kicker:"AI CAPABILITY",description:"Discover public AI models across catalogs. Discovery is not an active provider connection.",status:"DISCOVERY ONLY"},
 Tools:{kicker:"EXTENSIONS",description:"Browse supported MCP registry listings without installing or executing third-party software.",status:"DISCOVERY ONLY"},
 Connections:{kicker:"INTEGRATION HUB",description:"Link public repository metadata and design API connectors. Private access requires separately authorized installations.",status:"PREVIEW"}
};
const uid = () => crypto.randomUUID();
export default function Home() {
 const [tab,setTab] = useState<Tab>("Overview");
 const [menuOpen,setMenuOpen] = useState(false);
 const [paletteOpen,setPaletteOpen] = useState(false);
 const [paletteQuery,setPaletteQuery] = useState("");
 const [workspace,setWorkspace] = useState<Workspace>(initialWorkspace);
 const [hydrated,setHydrated] = useState(false);
 const [importFile,setImportFile] = useState<File|null>(null);
 const [importPreview,setImportPreview] = useState<Workspace|null>(null);
 const [storageError,setStorageError] = useState(false);
 const [projectId,setProjectId] = useState("");
 const [projectName,setProjectName] = useState("");
 const [projectDescription,setProjectDescription] = useState("");
 const [memoryTitle,setMemoryTitle] = useState("");
 const [memoryBody,setMemoryBody] = useState("");
 const [notice,setNotice] = useState("");
 const [githubRepo,setGithubRepo] = useState("");
 const [githubBusy,setGithubBusy] = useState(false);
 const [catalog,setCatalog] = useState<CatalogModel[]>([]);
 const [catalogNotice,setCatalogNotice] = useState("Not retrieved");
 const [search,setSearch] = useState("");
 const [zeroPriceOnly,setZeroPriceOnly] = useState(false);
 const [sourceFilter,setSourceFilter] = useState("All");
 const [catalogSources,setCatalogSources] = useState<{name:string;status:string;count:number}[]>([]);
 const [mcpSearch,setMcpSearch] = useState("");
 const [mcpNotice,setMcpNotice] = useState("Not retrieved");
 const [mcpResults,setMcpResults] = useState<{name:string;description:string;version:string;status:string;connectable:false}[]>([]);
 useEffect(()=>{try {const state=loadWorkspace();setWorkspace(state);setProjectId(state.projects[0]?.id||"");setHydrated(true)} catch(e) {setStorageError(true);setNotice(e instanceof Error?e.message:"Unable to load stored data.");}},[]);
 useEffect(()=>{if(hydrated){try{saveWorkspace(workspace)}catch(e){setNotice(e instanceof Error?e.message:"Browser storage failed.");}}},[workspace,hydrated]);
 useEffect(()=>{
  const handleKey=(event:KeyboardEvent)=>{
   if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){
    event.preventDefault();setPaletteOpen(open=>!open);
   } else if(event.key==="Escape"){setPaletteOpen(false);setMenuOpen(false);}
  };
  window.addEventListener("keydown",handleKey);
  return()=>window.removeEventListener("keydown",handleKey);
 },[]);
 function navigate(next:Tab){setTab(next);setNotice("");setMenuOpen(false);setPaletteOpen(false);setPaletteQuery("");}
 const currentProject=workspace.projects.find(p=>p.id===projectId);
 const memories=workspace.memories.filter(m=>m.projectId===projectId).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
 const visibleModels=useMemo(()=>catalog.filter(m=>(sourceFilter==="All"||m.source===sourceFilter)&&(!zeroPriceOnly||m.zeroTextPrice)&&(`${m.name} ${m.id}`.toLowerCase().includes(search.toLowerCase()))).slice(0,100),[catalog,zeroPriceOnly,search,sourceFilter]);
 async function previewImport(file:File|null){
  setImportFile(null);setImportPreview(null);
  if(!file)return;
  if(file.size>2_000_000){setNotice("Import must be smaller than 2 MB.");return}
  try{const preview=previewWorkspaceImport(await file.text());
   setImportFile(file);setImportPreview(preview);setNotice("Import validated. All imported memories will require fresh approval. Review the counts before replacing your current local workspace.");
  }catch(e){setNotice(e instanceof Error?e.message:"Invalid workspace file.");}
 }
 function confirmImport(){
  if(!importPreview || !importFile || !hydrated || storageError)return;
  if(!window.confirm("This replaces all local UNITY projects and memories in THIS browser. Export your current data first. Imported memories are drafts. Continue?"))return;
  try{saveWorkspace(importPreview);setWorkspace(importPreview);setProjectId(importPreview.projects[0]?.id||"");
    setImportFile(null);setImportPreview(null);setNotice("Imported validated workspace. Review and reapprove all memories.");
  }catch(e){setNotice(e instanceof Error?e.message:"Unable to import workspace.");}
 }
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
 async function linkPublicGithub(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!currentProject){setNotice("Select or create a project first.");return}
  setGithubBusy(true);setNotice("");
  try{
   const response=await fetch("/api/github/repository?repo="+encodeURIComponent(githubRepo.trim()));
   const data: {error?:string;fullName?:string;url?:string;defaultBranch?:string}=await response.json();
   if(!response.ok || !data.fullName || !data.url) throw new Error(data.error||"Lookup failed");
   if(workspace.githubLinks.some(l=>l.projectId===projectId&&l.fullName.toLowerCase()===data.fullName!.toLowerCase()))
    throw new Error("This repository is already linked to the selected project.");
   const link={id:uid(),projectId,fullName:data.fullName,url:data.url,defaultBranch:data.defaultBranch||"",checkedAt:new Date().toISOString()};
   setWorkspace(old=>({...old,githubLinks:[...old.githubLinks,link]}));
   setGithubRepo("");setNotice("Linked read-only public repository metadata. No GitHub authorization or write access.");
  }catch(error){setNotice(error instanceof Error?error.message:"Unable to link repository.")}
  finally{setGithubBusy(false)}
 }
 async function discoverMcp(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();setMcpNotice("Searching public registry...");setMcpResults([]);
  try {
   const response=await fetch("/api/mcp/registry?search="+encodeURIComponent(mcpSearch.trim()),{cache:"no-store"});
   const result:{error?:string;servers?:{name:string;description:string;version:string;status:string;connectable:false}[]}=await response.json();
   if(!response.ok||!result.servers)throw new Error(result.error||"Registry unavailable");
   setMcpResults(result.servers);setMcpNotice(result.servers.length+" discovery results (first page only).");
  }catch(e){setMcpNotice(e instanceof Error?e.message:"Registry unavailable")}
 }
 async function discover(){
  setCatalogNotice("Loading...");
  try {const response=await fetch("/api/catalog",{cache:"no-store"});if(!response.ok)throw new Error("Unavailable");
   const result:{models:CatalogModel[],retrievedAt:string,sources:{name:string;status:string;count:number}[]}=await response.json();
   setCatalog(result.models);setCatalogSources(result.sources);setCatalogNotice(`Discovered ${result.models.length.toLocaleString()} entries at ${new Date(result.retrievedAt).toLocaleString()}`);
  }catch{setCatalogNotice("Catalog unavailable. No other data was affected.")}
 }
 return <div className="shell">
  {menuOpen&&<button className="mobile-scrim" type="button" aria-label="Close navigation" onClick={()=>setMenuOpen(false)}/>}
  <aside className={`sidebar ${menuOpen?"sidebar-visible":""}`}>
   <div className="sidebar-top">
    <button type="button" className="brand-mark" aria-label="UNITY home" onClick={()=>navigate("Overview")}><span className="brand-glyph"><svg className="unity-monogram" width="29" height="29" viewBox="0 0 40 40" role="img" aria-label="UNITY geometric U mark" fill="none"><path d="M9.5 9v13.2c0 6.2 4.3 10.4 10.5 10.4s10.5-4.2 10.5-10.4V9" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round"/><path d="M20 12v9.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".58"/><circle cx="30.5" cy="7.5" r="2.5" fill="currentColor"/></svg></span><span className="brand-name">UNITY<span className="brand-period">.</span><small>UNIFIED INTELLIGENCE</small></span></button>
    <button className="sidebar-close" type="button" aria-label="Close navigation" onClick={()=>setMenuOpen(false)}><X size={20}/></button>
   </div>
   <div className="side-workspace-label"><span className="side-tenant-avatar">U</span><span><strong>Personal workspace</strong><small>Development environment</small></span><ChevronDown size={14}/></div>
   <nav aria-label="Primary navigation" className="nav-groups">
    {navGroups.map(group=><div className="nav-group" key={group.label}>
     <div className="nav-group-label">{group.label}</div>
     {group.items.map(({tab:target,icon:Icon,note})=><button key={target} type="button" className={`nav-item ${tab===target?"nav-current":""}`} aria-current={tab===target?"page":undefined} onClick={()=>navigate(target)}><Icon size={18} strokeWidth={1.65}/><span>{target==="Overview"?"Mission Control":target==="Chat"?"Conversations":target==="Memory"?"Knowledge":target==="Models"?"AI Models":target==="Tools"?"Tool Registry":target==="Connections"?"Integrations":target==="Cloud"?"Cloud Workspace":target}</span>{note&&<span className="nav-note">{note}</span>}</button>)}
    </div>)}
   </nav>
   <div className="sidebar-spacer"/>
   <div className="side-policy"><div className="side-policy-icon"><ShieldCheck size={19}/></div><div><strong>Safety first</strong><small>External execution locked<br/>Zero paid API allowance</small></div><span className="safe-indicator"/></div>
   <div className="side-account"><span className="side-avatar">U</span><span><strong>Personal alpha</strong><small>Public source · Local mode</small></span><span className="side-version">v0.x</span></div>
  </aside>
  <main className="main">
   <header className="header">
    <div className="header-identity">
     <button className="mobile-menu" type="button" aria-label="Open navigation" onClick={()=>setMenuOpen(true)}><Menu size={22}/></button>
     <div><div className="breadcrumbs"><span>Workspace</span><span className="bread-separator">/</span><strong>{tab==="Overview"?"Mission Control":tab}</strong></div><h1>{tab==="Overview"?"Mission Control":tab==="Memory"?"Knowledge Core":tab==="Models"?"Model Network":tab==="Tools"?"Tool Registry":tab==="Connections"?"Integration Hub":tab}</h1></div>
    </div>
    <div className="header-tools">
     <span className="header-environment"><span className="header-pulse"/> DEVELOPMENT</span>
     <AppearanceControl/>
     <button className="command-search" type="button" onClick={()=>setPaletteOpen(true)} aria-label="Open command menu"><Search size={17}/><span>Quick navigation</span><kbd>⌘ K</kbd></button>
     <button type="button" className="header-export" title="Export local workspace" onClick={()=>exportWorkspace(workspace)} disabled={storageError||!hydrated}><Download size={17}/></button>
    </div>
   </header>
   {paletteOpen&&<div className="command-overlay" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setPaletteOpen(false)}}>
    <div className="command-dialog" role="dialog" aria-label="Quick navigation" aria-modal="true">
     <div className="command-input"><Search size={20}/><input autoFocus aria-label="Search workspace destinations" placeholder="Where would you like to go?" value={paletteQuery} onChange={event=>setPaletteQuery(event.target.value)}/><button onClick={()=>setPaletteOpen(false)} aria-label="Close command menu"><X size={18}/></button></div>
     <span className="command-results-label">WORKSPACE</span>
     {navGroups.flatMap(group=>group.items).filter(item=>(item.tab+" "+(item.tab==="Overview"?"Mission Control":"")).toLowerCase().includes(paletteQuery.toLowerCase())).map(item=><button key={item.tab} className="command-result" onClick={()=>navigate(item.tab)}><item.icon size={18}/><span>{item.tab==="Overview"?"Mission Control":item.tab}</span><ArrowRight size={16}/></button>)}
    </div>
   </div>}
   {storageError&&<div role="alert" className="warning"><strong>Storage recovery required:</strong> UNITY detected invalid existing browser data and has disabled changes to avoid overwriting it. Preserve your browser profile before continuing.</div>}
   <div role="note" className="warning"><strong>Prototype:</strong> Local browser storage is not encrypted or synced. Do not add secrets or confidential information. Free catalog discovery does not mean free inference.</div>
   {notice&&<div className="notice" role="status">{notice}</div>}
   {tab!=="Overview"&&<section className="workspace-intro">
    <div><span className="section-overline">{moduleDetails[tab].kicker}</span><h2>{tab==="Memory"?"Your knowledge, organized.":tab==="Models"?"Explore the network.":tab==="Connections"?"Connect the right tools.":tab==="Chat"?"Every conversation, in context.":tab==="Tasks"?"From intention to action.":tab==="Cloud"?"Your permanent workspace.":tab==="Tools"?"Discover what is possible.":"Build without boundaries."}</h2><p>{moduleDetails[tab].description}</p></div>
    <span className="workspace-status"><span/>{moduleDetails[tab].status}</span>
   </section>}
   {tab==="Overview"&&<>
    <CommandCenter workspace={workspace} selectedProjectId={projectId} onNavigate={navigate} onExport={()=>exportWorkspace(workspace)}/>
    <details className="backup-panel"><summary><span><Database size={17}/> Local backup and recovery</span><ChevronDown size={16}/></summary>
     <p className="muted">Your personal workspace is currently stored only in this browser. Back up before clearing browser data. All imported memories return to draft and require your approval.</p>
     <div className="controls"><button onClick={()=>exportWorkspace(workspace)} disabled={!hydrated||storageError}>Export JSON backup</button><label className="backup-upload">Validate existing backup<input type="file" accept=".json,application/json" onChange={event=>void previewImport(event.target.files?.[0]||null)} disabled={!hydrated||storageError}/></label></div>
     {importPreview&&<div className="entry"><strong>Import preview</strong><p>{importPreview.projects.length} projects · {importPreview.memories.length} draft notes · {importPreview.githubLinks.length} public repo links · {importPreview.messages.length} local messages · {importPreview.tasks.length} draft tasks</p><button className="primary" onClick={confirmImport}>Replace local workspace</button> <button onClick={()=>{setImportFile(null);setImportPreview(null)}}>Cancel</button></div>}
    </details>
   </>}
   {tab==="Projects"&&<div className="columns"><section className="panel"><h2>New project</h2><form onSubmit={createProject}><label>Name<input required minLength={2} maxLength={100} value={projectName} onChange={e=>setProjectName(e.target.value)} placeholder="Project name"/></label><label>Description<textarea maxLength={500} value={projectDescription} onChange={e=>setProjectDescription(e.target.value)} placeholder="What is this project for?"/></label><button className="primary" disabled={storageError}>Create project</button></form></section><section className="panel"><h2>Your local projects</h2>{workspace.projects.length===0?<p className="muted">No projects yet.</p>:workspace.projects.map(p=><article className="entry" key={p.id}><div className="entry-head"><strong>{p.name}</strong><span className="pill">{workspace.memories.filter(m=>m.projectId===p.id).length} memories</span></div><p>{p.description||"No description"}</p><button onClick={()=>{setProjectId(p.id);setTab("Memory")}}>Open project memory</button></article>)}</section></div>}
   {tab==="Tasks"&&<><section className="panel"><label>Active project<select value={projectId} onChange={e=>setProjectId(e.target.value)}><option value="">Choose a project</option>{workspace.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></section><TaskBoard projectId={projectId} workspace={workspace} onChange={setWorkspace} disabled={storageError}/></>}
   {tab==="Chat"&&<><section className="panel"><label>Active project<select value={projectId} onChange={e=>setProjectId(e.target.value)}><option value="">Choose a project</option>{workspace.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></section><ChatPanel projectId={projectId} workspace={workspace} onChange={setWorkspace} disabled={storageError}/></>}
   {tab==="Memory"&&<><section className="panel"><label>Active project<select value={projectId} onChange={e=>setProjectId(e.target.value)}><option value="">Choose a project</option>{workspace.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></section><div className="columns"><section className="panel"><h2>Brain dump</h2><p className="muted">All new entries start as drafts, not instructions.</p><form onSubmit={createMemory}><label>Title<input maxLength={140} value={memoryTitle} onChange={e=>setMemoryTitle(e.target.value)} placeholder="What should UNITY remember?"/></label><label>Raw information<textarea className="large" maxLength={20000} value={memoryBody} onChange={e=>setMemoryBody(e.target.value)} placeholder="Write your thoughts, decisions, constraints or procedures."/></label><VoiceDictation onTranscript={text=>setMemoryBody(old=>(old+" "+text).trim().slice(0,20000))}/><button className="primary" disabled={!projectId||storageError}>Save draft</button></form></section><section className="panel"><h2>{currentProject?.name||"Project"} knowledge</h2>{!projectId?<p className="muted">Select or create a project.</p>:memories.length===0?<p className="muted">No entries yet.</p>:memories.map(m=><article className="entry" key={m.id}><div className="entry-head"><strong>{m.title}</strong><span className={m.status==="approved"?"pill approved":"pill"}>{m.status}</span></div><p className="prewrap">{m.body}</p><small>{new Date(m.updatedAt).toLocaleString()}</small>{m.status==="draft"&&<button onClick={()=>approve(m.id)}>Approve for project</button>}</article>)}</section></div></>}
   {tab==="Models"&&<section className="panel"><h2>Public AI catalog</h2><p className="muted">Read-only OpenRouter and Hugging Face discovery. Hugging Face results are a capped sample, not its full catalog. Zero published text prices do not guarantee free access, free tools or remaining quota. No models can execute yet.</p><div className="controls"><button className="primary" onClick={discover}>Refresh catalog</button><span>{catalogNotice}</span></div>{catalogSources.length>0&&<div className="controls">{catalogSources.map(s=><span className="pill" key={s.name}>{s.name}: {s.status==="ok"?`${s.count} listed`:"unavailable"}</span>)}</div>}<div className="controls"><input aria-label="Search models" placeholder="Search models" value={search} onChange={e=>setSearch(e.target.value)}/><label>Source<select value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)}><option value="All">All</option><option value="OpenRouter">OpenRouter</option><option value="Hugging Face">Hugging Face</option></select></label><label className="inline"><input type="checkbox" checked={zeroPriceOnly} onChange={e=>setZeroPriceOnly(e.target.checked)}/> Zero published text price only</label></div><small>Showing first {visibleModels.length} matches of {catalog.length} total entries.</small><div className="model-list">{visibleModels.map(m=><div className="entry" key={m.id}><div className="entry-head"><strong>{m.name}</strong><span className="pill">{m.source} · {m.zeroTextPrice?"Zero text price":"Price unknown/paid"}</span></div><small>{m.id} · Context: {m.contextLength?.toLocaleString()||"Unknown"}</small><p className="muted">{m.note}</p></div>)}</div></section>}
   {tab==="Tools"&&<section className="panel"><h2>Public MCP server directory</h2><p className="muted">Browse a small sample of the official public registry. Listings have not been verified for safety or availability. NOTHING HERE IS INSTALLED OR CONNECTED.</p><form onSubmit={discoverMcp}><label>Search MCP servers<input maxLength={80} value={mcpSearch} onChange={e=>setMcpSearch(e.target.value)} placeholder="e.g. filesystem" /></label><button className="primary">Search directory</button></form><p role="status">{mcpNotice}</p><div className="model-list">{mcpResults.map(m=><article className="entry" key={m.name}><div className="entry-head"><strong>{m.name}</strong><span className="pill">Discovery only</span></div><p>{m.description||"No description provided"}</p><small>Version: {m.version} · Status: {m.status}</small></article>)}</div></section>}
   {tab==="Cloud"&&<CloudWorkspace/>}
   {tab==="Readiness"&&<ReadinessPanel/>}
   {tab==="Connections"&&<><section className="panel"><h2>Public GitHub repository explorer</h2><p className="muted">Preview: link multiple PUBLIC repository metadata records to isolated local projects. No login, code access, cloning or write operations. GitHub API rate limits apply. Private repositories require a future authorized GitHub App.</p><label>Project<select value={projectId} onChange={e=>setProjectId(e.target.value)}><option value="">Choose a project</option>{workspace.projects.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label><form onSubmit={linkPublicGithub}><label>Public repository (owner/name)<input value={githubRepo} onChange={e=>setGithubRepo(e.target.value)} placeholder="owner/repository" required/></label><button className="primary" disabled={!projectId||githubBusy}>{githubBusy?"Checking GitHub...":"Link public repository"}</button></form></section><section className="panel"><h2>Linked repositories for {currentProject?.name||"selected project"}</h2>{workspace.githubLinks.filter(l=>l.projectId===projectId).length===0?<p className="muted">No public repositories linked yet.</p>:workspace.githubLinks.filter(l=>l.projectId===projectId).map(l=><article className="entry" key={l.id}><div className="entry-head"><strong>{l.fullName}</strong><span className="pill">Read-only metadata</span></div><p><a href={l.url} target="_blank" rel="noopener noreferrer">{l.url}</a></p><small>Default branch: {l.defaultBranch||"unknown"} · Checked: {new Date(l.checkedAt).toLocaleString()}</small><br/><button onClick={()=>setWorkspace(old=>({...old,githubLinks:old.githubLinks.filter(x=>x.id!==l.id)}))}>Remove local link</button></article>)}</section><OpenApiDesigner/><section className="panel"><h2>Additional integrations</h2><p className="muted">Authenticated private GitHub installations, model gateways, MCP and API credentials remain disabled until server-side authorization and encrypted credential storage are implemented.</p></section></>}
  </main>
 </div>;
}