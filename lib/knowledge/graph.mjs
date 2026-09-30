/**
 * Derives a bounded relationship graph from already-authorized/local workspace
 * records. It does not infer hidden relationships or persist new facts.
 */
export function buildKnowledgeGraph(workspace,{projectId=null,maxNodes=120}={}){
 if(!workspace||!Array.isArray(workspace.projects)||!Number.isInteger(maxNodes)||maxNodes<10||maxNodes>500)
  throw Error("Invalid graph input");
 const projects=projectId?workspace.projects.filter(p=>p.id===projectId):workspace.projects;
 const allowed=new Set(projects.map(p=>p.id));
 const nodes=[],edges=[];
 const add=(node)=>{if(nodes.length<maxNodes)nodes.push(node);};
 for(const p of projects)add({id:"project:"+p.id,type:"project",label:p.name,status:"local"});
 for(const m of workspace.memories||[]){
  if(!allowed.has(m.projectId)||nodes.length>=maxNodes)continue;
  const id="memory:"+m.id;add({id,type:"knowledge",label:m.title,status:m.status});
  edges.push({from:"project:"+m.projectId,to:id,relation:"contains"});
 }
 for(const t of workspace.tasks||[]){
  if(!allowed.has(t.projectId)||nodes.length>=maxNodes)continue;
  const id="task:"+t.id;add({id,type:"task",label:t.title,status:t.state});
  edges.push({from:"project:"+t.projectId,to:id,relation:"tracks"});
 }
 for(const l of workspace.githubLinks||[]){
  if(!allowed.has(l.projectId)||nodes.length>=maxNodes)continue;
  const id="source:"+l.id;add({id,type:"source",label:l.fullName,status:"linked-metadata"});
  edges.push({from:"project:"+l.projectId,to:id,relation:"references"});
 }
 return {nodes,edges,truncated:nodes.length>=maxNodes,notice:"Derived only from existing workspace records; no hidden or AI-inferred relationships."};
}
