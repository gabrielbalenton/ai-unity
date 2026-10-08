"use client";

import {useMemo,useState} from "react";
import type {ProjectControlPlaneSummary} from "@/components/ProjectControlPlane";

type Provider="github"|"vercel"|"supabase";
type Action="discover"|"read"|"propose"|"write"|"deploy"|"send";
type Project={id:string;name:string};
type RoutePlan={
 allowed:boolean;
 status:"ready"|"approval_required"|"denied";
 reason:string;
 executionEnabled:false;
 requiresApproval:boolean;
 projectId?:string;
 provider?:Provider;
 resourceId?:string;
 action?:Action;
 permissionMode?:string;
};
type ApiResponse={
 error?:string;
 project?:Project;
 controlPlane?:ProjectControlPlaneSummary;
 plan?:RoutePlan|null;
};

type Props={
 disabled?:boolean;
 onProjectResolved:(project:Project,summary:ProjectControlPlaneSummary)=>void;
};

const ACTIONS:Record<Provider,Action[]>=Object.freeze({
 github:["read","propose","write"],
 vercel:["read","propose","deploy"],
 supabase:["read","propose","write"]
});

export default function CloudCommandConsole({disabled=false,onProjectResolved}:Props){
 const [command,setCommand]=useState("");
 const [provider,setProvider]=useState<Provider>("github");
 const [action,setAction]=useState<Action>("read");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [plan,setPlan]=useState<RoutePlan|null>(null);
 const actions=useMemo(()=>ACTIONS[provider],[provider]);

 function changeProvider(next:Provider){
  setProvider(next);
  setAction(ACTIONS[next][0]);
  setPlan(null);
  setMessage("");
 }

 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(disabled||busy||command.trim().length<3)return;
  setBusy(true);setMessage("");setPlan(null);
  try{
   const response=await fetch("/api/private/routing/resolve-command",{
    method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({command:command.trim(),provider,action})
   });
   const data:ApiResponse=await response.json();
   if(!response.ok||!data.project||!data.controlPlane)throw Error(data.error||"Project command could not be resolved");
   onProjectResolved(data.project,data.controlPlane);
   setPlan(data.plan||null);
   setMessage(`Resolved ${data.project.name}. No external action was executed.`);
  }catch(error){
   setMessage(error instanceof Error?error.message:"Project command failed");
  }finally{setBusy(false)}
 }

 const badge=plan?.status==="ready"?"READY":plan?.status==="approval_required"?"APPROVAL REQUIRED":plan?.status==="denied"?"DENIED":"NOT CHECKED";
 return <div className="entry" aria-label="Cloud command console">
  <div className="entry-head"><strong>Project command</strong><span className="pill">{badge}</span></div>
  <p className="muted">Use an exact command such as <strong>Switch to FPX</strong>. UNITY resolves only projects you own, then checks the exact bound service and permission. This screen never executes the action.</p>
  <form onSubmit={submit}>
   <label>Command<input value={command} minLength={3} maxLength={180} placeholder="Switch to FPX" onChange={event=>setCommand(event.target.value)}/></label>
   <div className="controls">
    <label>Service<select value={provider} onChange={event=>changeProvider(event.target.value as Provider)}><option value="github">GitHub</option><option value="vercel">Vercel</option><option value="supabase">Supabase</option></select></label>
    <label>Action<select value={action} onChange={event=>setAction(event.target.value as Action)}>{actions.map(item=><option key={item} value={item}>{item}</option>)}</select></label>
    <button type="submit" className="primary" disabled={disabled||busy||command.trim().length<3}>{busy?"Checking...":"Resolve and check route"}</button>
   </div>
  </form>
  {message&&<p role="status">{message}</p>}
  {plan&&<div className="model-list" aria-label="Routing preflight result">
   <article className="entry"><div className="entry-head"><strong>{plan.provider||provider}</strong><span className="pill">{plan.status}</span></div><small>{plan.resourceId||"No exact bound resource"}</small><p>{plan.reason}</p><small>Permission: {plan.permissionMode||"none"} · executionEnabled: false{plan.requiresApproval?" · exact approval still required":""}</small></article>
  </div>}
 </div>;
}
