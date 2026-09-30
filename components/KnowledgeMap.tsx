"use client";
import {useMemo} from "react";
import {BookOpen,Folder,GitBranch,Network,Workflow} from "lucide-react";
import type {Workspace} from "@/lib/types";
import {buildKnowledgeGraph} from "@/lib/knowledge/graph.mjs";

type Props={workspace:Workspace;projectId:string};

export default function KnowledgeMap({workspace,projectId}:Props){
 const graph=useMemo(()=>buildKnowledgeGraph(workspace,{projectId,maxNodes:80}),[workspace,projectId]);
 const project=workspace.projects.find(p=>p.id===projectId);
 const icons={project:Folder,knowledge:BookOpen,task:Workflow,source:GitBranch} as const;
 return <section className="panel knowledge-map">
  <div className="entry-head"><div><span className="section-overline">RELATIONSHIP MAP</span><h2>{project?project.name+" map":"Your knowledge map"}</h2></div><span className="pill">{graph.nodes.length} nodes</span></div>
  <p className="muted">A simple view of how this project's existing knowledge, work and sources relate. UNITY can use this structure internally without forcing you to manage a graph manually.</p>
  {!project?<div className="room-empty"><Network size={22}/><strong>Select a project to see its map.</strong></div>:
  graph.nodes.length<=1?<div className="room-empty"><Network size={22}/><strong>Your map will grow naturally.</strong><p>Add approved knowledge, tasks or sources. UNITY will connect them to the project automatically.</p></div>:
  <div className="graph-shell" role="list" aria-label="Project relationship map">
   <div className="graph-root"><Folder size={18}/><strong>{project.name}</strong></div>
   <div className="graph-branches">{graph.nodes.filter(n=>n.type!=="project").map(node=>{
    const Icon=icons[node.type as keyof typeof icons]||BookOpen;
    return <div className={"graph-node graph-"+node.type} key={node.id} role="listitem"><span className="graph-line"/><span className="graph-node-icon"><Icon size={16}/></span><span><strong>{node.label}</strong><small>{node.type} · {node.status}</small></span></div>;
   })}</div>
  </div>}
  <small>{graph.notice}</small>
 </section>;
}
