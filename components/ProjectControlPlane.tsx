"use client";

type ProviderKey="github"|"vercel"|"supabase";
type ProviderRoute={
 provider:ProviderKey;
 state:"not_connected"|"authorized"|"bound"|"unavailable";
 accountLabel:string|null;
 status:string|null;
 resourceId:string|null;
 permissionMode:string|null;
 controlMode:"audit"|"development"|"production";
 routingReady:boolean;
};
export type ProjectControlPlaneSummary={
 projectId:string;
 projectName:string;
 effectiveMode:"audit"|"development"|"production";
 productionRequiresApproval:true;
 providers:Record<ProviderKey,ProviderRoute>;
};

const labels:Record<ProviderKey,string>={github:"GitHub",vercel:"Vercel",supabase:"Supabase"};
const order:ProviderKey[]=["github","vercel","supabase"];
function resourceLabel(provider:ProviderKey,resourceId:string|null){
 if(!resourceId)return "No exact resource selected";
 const prefixes:Record<ProviderKey,string>={github:"github:repo:",vercel:"vercel:project:",supabase:"supabase:project:"};
 return resourceId.startsWith(prefixes[provider])?resourceId.slice(prefixes[provider].length):resourceId;
}

export default function ProjectControlPlane({summary}:{summary:ProjectControlPlaneSummary|null}){
 if(!summary)return <div className="warning" aria-label="Project control plane">Select a cloud project to resolve its infrastructure.</div>;
 return <div className="entry" aria-label="Project control plane">
  <div className="entry-head"><div><strong>{summary.projectName}</strong><small className="muted"> · exact infrastructure routing</small></div><span className="pill">{summary.effectiveMode.toUpperCase()}</span></div>
  <p className="muted">UNITY routes this project only through the account and resource bindings below. The effective mode is the most restrictive bound provider mode.</p>
  <div className="model-list">
   {order.map(provider=>{const item=summary.providers[provider];return <article className="entry" key={provider}>
    <div className="entry-head"><strong>{labels[provider]}</strong><span className={item.routingReady?"pill approved":"pill"}>{item.state.replace("_"," ")}</span></div>
    <small>{item.accountLabel||"No authorized account"}</small><br/>
    <small>{resourceLabel(provider,item.resourceId)}</small><br/>
    <small>{item.permissionMode?`${item.permissionMode} grant → ${item.controlMode} mode`:"No project permission grant"}</small>
   </article>})}
  </div>
  <small>Production actions are never implied by this view. Deploy/send operations still require the separate UNITY approval gate.</small>
 </div>;
}
