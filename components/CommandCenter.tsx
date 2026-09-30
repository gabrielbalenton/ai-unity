"use client";

import { useMemo, useState } from "react";
import {
 ArrowRight, ArrowUpRight, AudioLines, BrainCircuit, CheckCircle2,
 ChevronDown, ChevronRight, CircleDot, Cloud, Code2, Cpu, Database,
 FolderGit2, GitBranch, Layers3, LockKeyhole, Network, Radio, ShieldCheck,
 Sparkles, Workflow, Zap
} from "lucide-react";
import type { Workspace } from "@/lib/types";

export type Area =
 "Overview" | "Projects" | "Cloud" | "Tasks" | "Chat" | "Memory" | "Models" | "Tools" | "Connections";

type Props = {
 workspace:Workspace;
 selectedProjectId:string;
 onNavigate:(area:Area)=>void;
 onExport:()=>void;
};

type Module = {
 title:string;
 subtitle:string;
 description:string;
 status:"offline"|"local"|"planned";
 area:Area;
 icon:typeof Cpu;
};

const modules:Module[] = [
 {title:"Project workspace",subtitle:"WORKSPACE",description:"Project-level organization, separate local histories and repository references.",status:"local",area:"Projects",icon:Layers3},
 {title:"Knowledge core",subtitle:"MEMORY",description:"Brain dumps, deliberate approval and project-scoped memory previews.",status:"local",area:"Memory",icon:BrainCircuit},
 {title:"Model network",subtitle:"AI MODELS",description:"Browse multiple model catalogs. No provider can execute until authorized.",status:"offline",area:"Models",icon:Cpu},
 {title:"Integration hub",subtitle:"CONNECTORS",description:"Public GitHub metadata, OpenAPI design and future authorized adapters.",status:"offline",area:"Connections",icon:Network},
 {title:"Task orchestration",subtitle:"WORKFLOWS",description:"Plan tasks using explicit evidence, checkpoints and project ownership.",status:"local",area:"Tasks",icon:Workflow},
 {title:"Cloud foundation",subtitle:"PERSISTENCE",description:"Authenticated routes and database contracts, not yet connected to infrastructure.",status:"planned",area:"Cloud",icon:Cloud},
 {title:"Tool registry",subtitle:"TOOLS",description:"Inspect public MCP server listings without installing or executing them.",status:"offline",area:"Tools",icon:Code2},
 {title:"Voice interface",subtitle:"INTERACTION",description:"Opt-in browser voice dictation for local brain dumps.",status:"local",area:"Memory",icon:AudioLines}
];

const statusLabel = {
 local:"LOCAL READY",
 offline:"DISCOVERY",
 planned:"NOT CONNECTED"
} as const;

export default function CommandCenter({workspace,selectedProjectId,onNavigate,onExport}:Props){
 const [showAll,setShowAll]=useState(false);
 const [activityOpen,setActivityOpen]=useState(true);
 const approved=workspace.memories.filter(note=>note.status==="approved");
 const upcoming=useMemo(()=>workspace.tasks
  .filter(task=>!["completed","cancelled"].includes(task.state))
  .slice(-5).reverse(),[workspace.tasks]);
 const activeModules=showAll?modules:modules.slice(0,6);
 return <div className="command-center">
  <section className="command-hero" aria-labelledby="unity-hero-title">
   <div className="hero-grid-overlay" aria-hidden="true"/>
   <div className="hero-orb" aria-hidden="true">
    <div className="orb-outer"/><div className="orb-middle"/><div className="orb-core">
     <BrainCircuit size={57} strokeWidth={1.25}/>
    </div>
    <span className="orb-point orb-point-a"/><span className="orb-point orb-point-b"/>
   </div>
   <div className="hero-content">
    <div className="hero-kicker"><span className="live-dot"/> UNITY / DEVELOPMENT ENVIRONMENT <span className="hero-kicker-rule"/></div>
    <h2 id="unity-hero-title">One system.<br/><span>Every possibility.</span></h2>
    <p>One workspace for your knowledge, models, projects and future agents. Every connection stays within your control.</p>
    <div className="hero-actions">
     <button type="button" className="hero-primary" onClick={()=>onNavigate("Projects")}>Open workspace <ArrowRight size={16}/></button>
     <button type="button" className="hero-secondary" onClick={()=>onNavigate("Models")}>Explore models <ArrowUpRight size={15}/></button>
    </div>
   </div>
   <div className="hero-bottom"><span><CircleDot size={12}/> PERSONAL ALPHA</span><span><LockKeyhole size={12}/> EXECUTION LOCKED</span><span>BUILD / GITHUB ALPHA</span></div>
  </section>
  <section className="stat-strip" aria-label="Current verified local workspace statistics">
   <div className="stat-item"><span className="stat-icon"><Layers3 size={17}/></span><div><strong>{workspace.projects.length.toString().padStart(2,"0")}</strong><span>Local projects</span></div></div>
   <div className="stat-item"><span className="stat-icon"><BrainCircuit size={17}/></span><div><strong>{approved.length.toString().padStart(2,"0")}</strong><span>Approved local notes</span></div></div>
   <div className="stat-item"><span className="stat-icon"><GitBranch size={17}/></span><div><strong>{workspace.githubLinks.length.toString().padStart(2,"0")}</strong><span>Public repo links</span></div></div>
   <div className="stat-item"><span className="stat-icon"><ShieldCheck size={17}/></span><div><strong>LOCKED</strong><span>External execution</span></div></div>
  </section>
  <div className="center-columns">
   <section className="center-main">
    <div className="section-heading">
     <div><span className="section-overline">YOUR ENVIRONMENT</span><h3>System overview</h3></div>
     <button type="button" className="link-action" onClick={()=>setShowAll(!showAll)}>
      {showAll?"Show core modules":"View all modules"} <ChevronRight size={16}/>
     </button>
    </div>
    <div className="module-grid">
     {activeModules.map(module=>{
      const Icon=module.icon;
      return <button key={module.title} type="button" className="module-tile" onClick={()=>onNavigate(module.area)}>
       <div className="module-tile-top"><span className="module-icon"><Icon size={21} strokeWidth={1.65}/></span><ArrowUpRight className="module-arrow" size={17}/></div>
       <span className="module-caption">{module.subtitle}</span>
       <strong>{module.title}</strong>
       <p>{module.description}</p>
       <span className={`module-status status-${module.status}`}><span/>{statusLabel[module.status]}</span>
      </button>;
     })}
    </div>
    <section className="workflow-preview">
     <div className="workflow-head">
      <span className="workflow-label"><Radio size={15}/> SYSTEM ARCHITECTURE</span>
      <span className="pill">DESIGN PREVIEW</span>
     </div>
     <div className="architecture-line">
      <div className="architecture-node"><Sparkles size={19}/><span>Interface</span></div>
      <span className="architecture-dash"/>
      <div className="architecture-node architecture-node-focus"><Workflow size={19}/><span>Orchestrator</span></div>
      <span className="architecture-dash"/>
      <div className="architecture-stack">
       <span><Database size={15}/> Knowledge</span>
       <span><Cpu size={15}/> Models</span>
       <span><Network size={15}/> Connectors</span>
      </div>
     </div>
     <p>This is the proposed modular architecture. Live agent execution and shared cloud memory are not activated.</p>
    </section>
   </section>
   <aside className="center-rail" aria-label="Workspace information">
    <section className="rail-panel">
     <div className="rail-panel-title"><span>QUICK ACCESS</span><Zap size={15}/></div>
     <button className="quick-link" onClick={()=>onNavigate("Chat")}><span className="quick-icon"><Sparkles size={17}/></span><span>Project conversation<small>Local record only</small></span><ArrowUpRight size={16}/></button>
     <button className="quick-link" onClick={()=>onNavigate("Memory")}><span className="quick-icon"><BrainCircuit size={17}/></span><span>Brain dump<small>Capture knowledge</small></span><ArrowUpRight size={16}/></button>
     <button className="quick-link" onClick={()=>onNavigate("Tasks")}><span className="quick-icon"><Workflow size={17}/></span><span>Plan a mission<small>Manual task board</small></span><ArrowUpRight size={16}/></button>
     <button className="quick-link" onClick={onExport}><span className="quick-icon"><Database size={17}/></span><span>Export workspace<small>Local JSON backup</small></span><ArrowUpRight size={16}/></button>
    </section>
    <section className="rail-panel rail-status">
     <div className="rail-panel-title"><span>ENVIRONMENT STATUS</span><span className="live-dot"/></div>
     <div className="health-row"><span>Local workspace</span><span className="health-status"><CheckCircle2 size={14}/> Available</span></div>
     <div className="health-row"><span>Model inference</span><span className="health-muted">Not enabled</span></div>
     <div className="health-row"><span>Cloud backend</span><span className="health-muted">Not verified</span></div>
     <div className="health-row"><span>Paid API access</span><span className="health-muted">Disabled</span></div>
     <p className="status-footnote">These are feature states, not live infrastructure health checks.</p>
    </section>
    <section className="rail-panel">
     <button className="rail-heading-button" type="button" onClick={()=>setActivityOpen(!activityOpen)} aria-expanded={activityOpen}>
      <span>LOCAL TASKS</span><ChevronDown size={15} className={activityOpen?"":"closed"}/>
     </button>
     {activityOpen&&(upcoming.length===0?<div className="empty-activity"><FolderGit2 size={23}/><span>No pending local tasks</span><button onClick={()=>onNavigate("Tasks")}>Create task <ArrowRight size={14}/></button></div>:
      <div className="activity-list">{upcoming.map(task=><button key={task.id} className="activity-item" onClick={()=>onNavigate("Tasks")}>
       <span className="activity-mark"/><span><strong>{task.title}</strong><small>{task.state.replaceAll("_"," ")} · {workspace.projects.find(p=>p.id===task.projectId)?.name||"Project"}</small></span>
      </button>)}</div>)}
    </section>
   </aside>
  </div>
  <footer className="center-footer"><span>UNITY / PRIVATE DEVELOPMENT</span><span>LOCAL FIRST · PERMISSION CONTROLLED · NO PAID API CALLS</span></footer>
 </div>;
}
