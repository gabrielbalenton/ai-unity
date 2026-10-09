"use client";

import {useEffect,useMemo,useRef,useState} from "react";

type ArmyAgent={id:string;name:string;level:string;department:string;reportsTo:string|null;specialties:string[];status:string;taskTitle:string|null;lastHeartbeatAt:string|null;lastAction:string|null;blockedBy:string[];branch:string|null};
type ArmySnapshot={name:string;executionEnabled:boolean;principalAgentId:string;agents:ArmyAgent[];summary:{total:number;active:number;waiting:number;blocked:number;stale:number;done:number}};

type MenuState={x:number;y:number;agent:ArmyAgent}|null;

const DISPLAY:Record<string,string>={IDLE:"Idle",ASSIGNED:"Working",WORKING:"Working",WAITING:"Paused",BLOCKED:"Stopped",REVIEWING:"Working",READY_FOR_REVIEW:"Paused",PAUSED:"Paused",FAILED:"Stopped",DONE:"Finished",CANCELLED:"Stopped",STALE:"Stopped"};
const STATUS_DETAIL:Record<string,string>={
 IDLE:"No approved task assigned",
 ASSIGNED:"Task assigned and ready to start",
 WORKING:"Actively working with a fresh heartbeat",
 WAITING:"Waiting for a dependency or another engineer",
 BLOCKED:"Blocked by a dependency or unresolved problem",
 REVIEWING:"Reviewing another engineer's work",
 READY_FOR_REVIEW:"Work finished and waiting for lead review",
 PAUSED:"Paused by the GM, lead, or approval policy",
 FAILED:"Task failed; error review required",
 DONE:"Task finished and accepted",
 CANCELLED:"Task cancelled",
 STALE:"Heartbeat expired; agent may have stopped unexpectedly"
};

function initials(name:string){return name.split(/\s+/).filter(Boolean).slice(0,2).map((x)=>x[0]).join("").toUpperCase()}
function displayStatus(agent:ArmyAgent){return DISPLAY[agent.status]||agent.status}
function statusClass(agent:ArmyAgent){return displayStatus(agent).toLowerCase()}
function relativeHeartbeat(value:string|null){if(!value)return "No heartbeat";const ms=Date.now()-Date.parse(value);if(!Number.isFinite(ms))return "Invalid heartbeat";if(ms<60000)return "Heartbeat <1 min ago";return `Heartbeat ${Math.floor(ms/60000)} min ago`}

export default function UnityArmyOffice({initialSnapshot}:{initialSnapshot:ArmySnapshot}){
 const [snapshot,setSnapshot]=useState(initialSnapshot);
 const [selected,setSelected]=useState<ArmyAgent|null>(null);
 const [menu,setMenu]=useState<MenuState>(null);
 const [lastRefresh,setLastRefresh]=useState(new Date());
 const root=useRef<HTMLDivElement>(null);
 const departments=useMemo(()=>Array.from(new Set(snapshot.agents.filter((a)=>a.level!=="principal"&&a.level!=="reviewer").map((a)=>a.department))),[snapshot.agents]);
 const principal=snapshot.agents.find((a)=>a.id===snapshot.principalAgentId)!;
 const reviewer=snapshot.agents.find((a)=>a.level==="reviewer");

 useEffect(()=>{
  const close=()=>setMenu(null);
  window.addEventListener("click",close);
  const timer=window.setInterval(async()=>{
   try{
    const res=await fetch("/api/private/army/snapshot",{cache:"no-store"});
    if(res.ok){const data=await res.json();if(data?.snapshot?.agents){setSnapshot(data.snapshot);setLastRefresh(new Date())}}
   }catch{}
  },60000);
  return()=>{window.removeEventListener("click",close);window.clearInterval(timer)};
 },[]);

 function openMenu(event:React.MouseEvent,agent:ArmyAgent){event.preventDefault();event.stopPropagation();setSelected(agent);setMenu({x:event.clientX,y:event.clientY,agent})}
 function choose(agent:ArmyAgent){setSelected(agent)}
 function control(action:string,agent:ArmyAgent){setMenu(null);setSelected(agent);if(!snapshot.executionEnabled)return;void action}

 return <div ref={root} className="army-root">
  <style>{`
   .army-root{--border:#8a8f982f;--panel:#8881;--soft:#8882;color:inherit;display:grid;gap:18px}.army-head{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-start}.army-kicker{font-size:12px;font-weight:800;letter-spacing:1.4px}.army-title{font-size:36px;margin:5px 0 8px}.army-sub{max-width:780px;line-height:1.55;opacity:.72;margin:0}.army-live{border:1px solid var(--border);border-radius:14px;padding:12px 14px;min-width:220px}.army-layout{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:16px;align-items:start}.office{border:1px solid var(--border);border-radius:18px;padding:14px;background:linear-gradient(135deg,#8880,#8881);min-width:0}.command-room{display:flex;gap:12px;align-items:center;border:1px solid var(--border);border-radius:14px;padding:12px;margin-bottom:12px;background:var(--panel)}.avatar{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font-weight:800;border:2px solid currentColor;flex:0 0 auto}.rooms{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.room{border:1px solid var(--border);border-radius:14px;padding:10px;min-width:0}.room-label{font-size:11px;font-weight:900;letter-spacing:1px;opacity:.7;margin-bottom:8px}.desks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.agent{position:relative;border:1px solid var(--border);border-radius:12px;padding:9px;background:var(--panel);cursor:pointer;min-width:0}.agent:hover,.agent:focus{outline:2px solid currentColor;outline-offset:1px}.agent-top{display:flex;gap:8px;align-items:center}.mini-avatar{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:900;border:2px solid currentColor;flex:0 0 auto}.agent-name{font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.agent-task{font-size:11px;opacity:.72;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.status-dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:5px;background:#8a8f98}.working .status-dot{background:#2e9d62}.paused .status-dot{background:#c29125}.stopped .status-dot{background:#c24c4c}.finished .status-dot{background:#4776c7}.side{display:grid;gap:12px}.panel{border:1px solid var(--border);border-radius:14px;padding:14px}.panel h3{margin:0 0 10px;font-size:15px}.metric-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.metric{background:var(--panel);border-radius:10px;padding:10px}.metric b{display:block;font-size:20px}.detail-name{font-size:18px;font-weight:800}.detail-status{margin:6px 0}.detail-row{font-size:12px;margin-top:9px}.muted{opacity:.65}.decision{border-left:3px solid currentColor;padding-left:10px}.menu{position:fixed;z-index:50;min-width:230px;border:1px solid var(--border);border-radius:12px;padding:6px;background:Canvas;color:CanvasText;box-shadow:0 12px 35px #0004}.menu button{width:100%;text-align:left;border:0;background:transparent;color:inherit;padding:9px 10px;border-radius:8px;cursor:pointer}.menu button:hover:not(:disabled){background:var(--soft)}.menu button:disabled{opacity:.45;cursor:not-allowed}.menu-title{padding:8px 10px 5px;font-size:11px;font-weight:900;letter-spacing:.8px;opacity:.65}.legend{display:flex;gap:10px;flex-wrap:wrap;font-size:12px;opacity:.75}.review-desk{margin-top:10px}.control-note{font-size:11px;opacity:.62;margin-top:7px}@media(max-width:900px){.army-layout{grid-template-columns:1fr}.rooms{grid-template-columns:1fr}}@media(max-width:520px){.desks{grid-template-columns:1fr}.army-title{font-size:30px}}
  `}</style>
  <header className="army-head"><div><div className="army-kicker">UNITY ARMY</div><h1 className="army-title">Agent Control Room</h1><p className="army-sub">An interactive office for the specialist engineering teams. Right-click an engineer for controls and status. Live worker execution is only enabled after the runtime and approval chain are connected.</p></div><div className="army-live"><strong>{snapshot.executionEnabled?"LIVE CONTROL CONNECTED":"CONTROL RUNTIME NOT CONNECTED"}</strong><div className="muted" style={{fontSize:12,marginTop:5}}>Auto-refresh: 60 sec · Last refresh {lastRefresh.toLocaleTimeString()}</div></div></header>
  <div className="legend"><span><i className="status-dot" style={{background:"#2e9d62"}}/>Working</span><span><i className="status-dot" style={{background:"#c29125"}}/>Paused</span><span><i className="status-dot" style={{background:"#c24c4c"}}/>Stopped</span><span><i className="status-dot" style={{background:"#4776c7"}}/>Finished</span></div>
  <div className="army-layout">
   <section className="office" aria-label="UNITY Army department office">
    <div className="command-room" onContextMenu={(e)=>openMenu(e,principal)} onClick={()=>choose(principal)}><div className="avatar">{initials(principal.name)}</div><div><div className="room-label">GENERAL MANAGEMENT / COMMAND</div><strong>{principal.name}</strong><div className="agent-task"><span className="status-dot"/> {displayStatus(principal)} · {principal.taskTitle||"No active task"}</div></div></div>
    <div className="rooms">{departments.map((department)=>{const team=snapshot.agents.filter((a)=>a.department===department&&a.level!=="principal");const lead=team.find((a)=>a.level==="lead");const staff=team.filter((a)=>a.level!=="lead");return <section className="room" key={department}><div className="room-label">{department.toUpperCase()} DEPARTMENT</div>{lead&&<button type="button" className={`agent ${statusClass(lead)}`} style={{width:"100%",textAlign:"left",marginBottom:8,color:"inherit"}} onClick={()=>choose(lead)} onContextMenu={(e)=>openMenu(e,lead)}><div className="agent-top"><span className="mini-avatar">{initials(lead.name)}</span><div style={{minWidth:0}}><div className="agent-name">{lead.name}</div><div className="agent-task"><span className="status-dot"/>{displayStatus(lead)} · {lead.taskTitle||"No active task"}</div></div></div></button>}<div className="desks">{staff.map((agent)=><button type="button" className={`agent ${statusClass(agent)}`} key={agent.id} onClick={()=>choose(agent)} onContextMenu={(e)=>openMenu(e,agent)} style={{textAlign:"left",color:"inherit"}}><div className="agent-top"><span className="mini-avatar">{initials(agent.name)}</span><div style={{minWidth:0}}><div className="agent-name">{agent.name}</div><div className="agent-task"><span className="status-dot"/>{displayStatus(agent)}</div></div></div><div className="agent-task">{agent.taskTitle||"No task assigned"}</div></button>)}</div></section>})}</div>
    {reviewer&&<div className="review-desk command-room" onContextMenu={(e)=>openMenu(e,reviewer)} onClick={()=>choose(reviewer)}><div className="mini-avatar">{initials(reviewer.name)}</div><div><div className="room-label">INDEPENDENT REVIEW</div><strong>{reviewer.name}</strong><div className="agent-task">{displayStatus(reviewer)} · {reviewer.taskTitle||"No review assigned"}</div></div></div>}
   </section>
   <aside className="side"><section className="panel"><h3>Army status report</h3><div className="metric-grid"><div className="metric"><b>{snapshot.summary.active}</b><span>Working</span></div><div className="metric"><b>{snapshot.summary.waiting}</b><span>Waiting</span></div><div className="metric"><b>{snapshot.summary.blocked+snapshot.summary.stale}</b><span>Stopped / stale</span></div><div className="metric"><b>{snapshot.summary.done}</b><span>Finished</span></div></div><div className="control-note">Counts come from real task state. No heartbeat means UNITY must not claim an engineer is working.</div></section>
    <section className="panel">{selected?<><div className="detail-name">{selected.name}</div><div className={`detail-status ${statusClass(selected)}`}><span className="status-dot"/><strong>{displayStatus(selected)}</strong></div><div className="detail-row"><b>Department:</b> {selected.department}</div><div className="detail-row"><b>Task:</b> {selected.taskTitle||"None"}</div><div className="detail-row"><b>Why:</b> {STATUS_DETAIL[selected.status]||"Status reason unavailable"}</div><div className="detail-row"><b>Heartbeat:</b> {relativeHeartbeat(selected.lastHeartbeatAt)}</div><div className="detail-row"><b>Last action:</b> {selected.lastAction||"None"}</div><div className="detail-row"><b>Blocked by:</b> {selected.blockedBy.length?selected.blockedBy.join(", "):"Nothing recorded"}</div><div className="detail-row"><b>Branch:</b> {selected.branch||"None"}</div><div className="detail-row decision"><b>GM rule:</b> continue safe approved work automatically; pause and ask Gabriel for protected, ambiguous, paid, production, cross-project, or owner-only decisions.</div></>:<><h3>Engineer details</h3><p className="muted">Click or right-click an engineer to inspect status, task, blocker and heartbeat.</p></>}</section>
   </aside>
  </div>
  {menu&&<div className="menu" style={{left:Math.min(menu.x,window.innerWidth-245),top:Math.min(menu.y,window.innerHeight-300)}} role="menu" onClick={(e)=>e.stopPropagation()}><div className="menu-title">{menu.agent.name}</div><button type="button" onClick={()=>choose(menu.agent)}>View status report</button><button type="button" disabled={!snapshot.executionEnabled} onClick={()=>control("continue",menu.agent)}>Continue working</button><button type="button" disabled={!snapshot.executionEnabled} onClick={()=>control("pause",menu.agent)}>Pause engineer</button><button type="button" disabled={!snapshot.executionEnabled} onClick={()=>control("stop",menu.agent)}>Stop engineer</button><button type="button" disabled={!snapshot.executionEnabled} onClick={()=>control("assign",menu.agent)}>Assign next approved task</button><button type="button" disabled={!snapshot.executionEnabled} onClick={()=>control("decision",menu.agent)}>Request Gabriel decision</button>{!snapshot.executionEnabled&&<div className="control-note" style={{padding:"4px 10px 8px"}}>Controls unlock when the Army runtime is connected.</div>}</div>}
 </div>;
}
