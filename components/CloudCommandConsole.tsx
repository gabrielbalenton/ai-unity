"use client";

import {useEffect,useMemo,useState} from "react";
import type {ProjectControlPlaneSummary} from "@/components/ProjectControlPlane";

type Provider="github"|"vercel"|"supabase";
type Action="discover"|"read"|"propose"|"write"|"deploy"|"send";
type ModelProvider="gemini"|"groq"|"mistral"|"huggingface"|"cerebras";
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
type SetupService={configured:boolean;required:string[]};
type SetupReadiness={allConfigured:boolean;secretValuesExposed:false;services:Record<string,SetupService>};
type ProviderPlan={
 providers:{providerId:string;displayName:string;connected:boolean;ambiguous:boolean;resourceId:string|null;zeroPaidOnly:boolean;freeEligibility:"verify_live"}[];
 fallbackOrder:string[];
 liveFreeEligibilityRequired:true;
 automaticPaidFallback:false;
 executionEnabled:false;
 notice:string;
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
const MODEL_LABELS:Record<ModelProvider,string>=Object.freeze({
 gemini:"Google AI Studio / Gemini",
 groq:"Groq",
 mistral:"Mistral",
 huggingface:"Hugging Face",
 cerebras:"Cerebras"
});
const SETUP_LABELS:Record<string,string>=Object.freeze({backend:"UNITY backend",infisical:"Infisical vault",github:"GitHub App",supabase:"Supabase OAuth",vercel:"Vercel Integration"});

export default function CloudCommandConsole({disabled=false,onProjectResolved}:Props){
 const [command,setCommand]=useState("");
 const [provider,setProvider]=useState<Provider>("github");
 const [action,setAction]=useState<Action>("read");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [plan,setPlan]=useState<RoutePlan|null>(null);
 const [readiness,setReadiness]=useState<SetupReadiness|null>(null);
 const [resolvedProject,setResolvedProject]=useState<Project|null>(null);
 const [modelProvider,setModelProvider]=useState<ModelProvider>("gemini");
 const [credential,setCredential]=useState("");
 const [providerMessage,setProviderMessage]=useState("");
 const [providerPlan,setProviderPlan]=useState<ProviderPlan|null>(null);
 const actions=useMemo(()=>ACTIONS[provider],[provider]);
 const vaultReady=readiness?.services?.infisical?.configured===true;

 useEffect(()=>{
  let active=true;
  fetch("/api/private/setup/readiness",{credentials:"same-origin",cache:"no-store"})
   .then(async response=>({ok:response.ok,data:await response.json()}))
   .then(({ok,data})=>{if(active&&ok)setReadiness(data as SetupReadiness)})
   .catch(()=>{});
  return()=>{active=false};
 },[]);

 function changeProvider(next:Provider){
  setProvider(next);
  setAction(ACTIONS[next][0]);
  setPlan(null);
  setMessage("");
 }

 async function refreshProviderPlan(projectId:string){
  if(!projectId){setProviderPlan(null);return}
  try{
   const response=await fetch(`/api/private/models/provider-plan?projectId=${encodeURIComponent(projectId)}`,{credentials:"same-origin",cache:"no-store"});
   const data:{error?:string;plan?:ProviderPlan}=await response.json();
   if(!response.ok||!data.plan)throw Error(data.error||"AI provider plan unavailable");
   setProviderPlan(data.plan);
  }catch(error){
   setProviderPlan(null);
   setProviderMessage(error instanceof Error?error.message:"AI provider plan unavailable");
  }
 }

 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(disabled||busy||command.trim().length<3)return;
  setBusy(true);setMessage("");setPlan(null);setProviderMessage("");
  try{
   const response=await fetch("/api/private/routing/resolve-command",{
    method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({command:command.trim(),provider,action})
   });
   const data:ApiResponse=await response.json();
   if(!response.ok||!data.project||!data.controlPlane)throw Error(data.error||"Project command could not be resolved");
   onProjectResolved(data.project,data.controlPlane);
   setResolvedProject(data.project);
   setPlan(data.plan||null);
   setMessage(`Resolved ${data.project.name}. No external action was executed.`);
   await refreshProviderPlan(data.project.id);
  }catch(error){
   setMessage(error instanceof Error?error.message:"Project command failed");
  }finally{setBusy(false)}
 }

 async function connectModelProvider(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(disabled||busy||!resolvedProject||!vaultReady||credential.trim().length<10)return;
  setBusy(true);setProviderMessage("");
  try{
   const response=await fetch("/api/private/connect/model-key",{
    method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({projectId:resolvedProject.id,provider:modelProvider,credential:credential.trim()})
   });
   const data:{error?:string;connection?:{accountLabel:string}}=await response.json();
   if(!response.ok||!data.connection)throw Error(data.error||"AI provider could not be connected");
   setCredential("");
   setProviderMessage(`${data.connection.accountLabel} connected to ${resolvedProject.name}. The credential was stored in the vault.`);
   await refreshProviderPlan(resolvedProject.id);
  }catch(error){
   setCredential("");
   setProviderMessage(error instanceof Error?error.message:"AI provider connection failed");
  }finally{setBusy(false)}
 }

 const badge=plan?.status==="ready"?"READY":plan?.status==="approval_required"?"APPROVAL REQUIRED":plan?.status==="denied"?"DENIED":"NOT CHECKED";
 return <div className="entry" aria-label="Cloud command console">
  <div className="entry-head"><strong>Project command</strong><span className="pill">{badge}</span></div>
  <p className="muted">Use an exact command such as <strong>Switch to FPX</strong>. UNITY resolves only projects you own, then checks the exact bound service and permission. This screen never executes the action.</p>
  {readiness&&<div className="model-list" aria-label="External setup readiness">
   {Object.entries(readiness.services).map(([key,item])=><article className="entry" key={key}><div className="entry-head"><strong>{SETUP_LABELS[key]||key}</strong><span className="pill">{item.configured?"CONFIGURED":"SETUP NEEDED"}</span></div>{!item.configured&&<small>Needs: {item.required.join(" · ")}</small>}</article>)}
  </div>}
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

  <div className="entry" aria-label="AI provider connections">
   <div className="entry-head"><strong>AI provider connections</strong><span className="pill">ZERO-PAID DEFAULT</span></div>
   <p className="muted">OpenRouter uses its one-click authorization flow in the project connections above. Gemini, Groq, Mistral, Hugging Face and Cerebras currently use provider API credentials. Enter one here once; UNITY sends it directly to Infisical and does not display it again.</p>
   {!resolvedProject&&<small>Resolve an exact cloud project first, for example “Switch to FPX”.</small>}
   {resolvedProject&&!vaultReady&&<small>Infisical must be configured before UNITY can accept a provider credential.</small>}
   <form onSubmit={connectModelProvider}>
    <div className="controls">
     <label>Provider<select value={modelProvider} onChange={event=>{setModelProvider(event.target.value as ModelProvider);setCredential("");setProviderMessage("")}}>{(Object.keys(MODEL_LABELS) as ModelProvider[]).map(item=><option key={item} value={item}>{MODEL_LABELS[item]}</option>)}</select></label>
     <label>API key / access token<input type="password" autoComplete="off" spellCheck={false} value={credential} minLength={10} maxLength={8000} onChange={event=>setCredential(event.target.value)} placeholder="Stored directly in Infisical"/></label>
     <button type="submit" className="primary" disabled={disabled||busy||!resolvedProject||!vaultReady||credential.trim().length<10}>{busy?"Storing securely...":`Connect ${MODEL_LABELS[modelProvider]}`}</button>
    </div>
   </form>
   {providerMessage&&<p role="status">{providerMessage}</p>}
   {providerPlan&&<div className="model-list" aria-label="AI fallback plan">
    <article className="entry"><div className="entry-head"><strong>Fallback order</strong><span className="pill">PLANNING ONLY</span></div><p>{providerPlan.fallbackOrder.length?providerPlan.fallbackOrder.join(" → "):"No connected AI provider yet."}</p><small>Only connected providers are candidates. Current model free eligibility and quota must be verified at use time. Paid fallback is disabled. executionEnabled: false.</small></article>
    {providerPlan.providers.map(item=><article className="entry" key={item.providerId}><div className="entry-head"><strong>{item.displayName}</strong><span className="pill">{item.ambiguous?"AMBIGUOUS":item.connected?"CONNECTED":"NOT CONNECTED"}</span></div><small>{item.zeroPaidOnly?"Zero-paid only":"Paid use not enabled"} · free eligibility: verify live</small></article>)}
   </div>}
  </div>
 </div>;
}
