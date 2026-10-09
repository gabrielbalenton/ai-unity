import roster from "@/config/unity-army-roster.json";
import { buildArmySnapshot } from "@/lib/army/control-plane.mjs";

type ArmyAgent = {
  id: string;
  name: string;
  level: string;
  department: string;
  reportsTo: string | null;
  specialties: string[];
  status: string;
};

const statusLabel: Record<string,string> = {
  IDLE:"Idle",ASSIGNED:"Assigned",WORKING:"Working",WAITING:"Waiting",BLOCKED:"Blocked",REVIEWING:"Reviewing",READY_FOR_REVIEW:"Ready for review",PAUSED:"Paused",FAILED:"Failed",DONE:"Done",CANCELLED:"Cancelled",STALE:"Stale"
};

export default function UnityArmyPage() {
  const snapshot = buildArmySnapshot(roster, []);
  const agents = snapshot.agents as ArmyAgent[];
  const principal = agents.find((agent: ArmyAgent) => agent.id === snapshot.principalAgentId)!;
  const leads = agents.filter((agent: ArmyAgent) => agent.reportsTo === principal.id);
  const specialists = (leadId:string) => agents.filter((agent: ArmyAgent) => agent.reportsTo === leadId);
  return <main style={{maxWidth:1200,margin:"0 auto",padding:"32px 20px",fontFamily:"system-ui,sans-serif"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:24,alignItems:"flex-start",flexWrap:"wrap"}}>
      <div><div style={{fontSize:12,fontWeight:800,letterSpacing:1.4}}>UNITY ARMY</div><h1 style={{fontSize:38,margin:"6px 0 8px"}}>Agent Control Room</h1><p style={{maxWidth:760,lineHeight:1.6,opacity:.75}}>Principal Engineer → Lead Engineers → single-specialty engineers. The roster is configured, but live agent execution is intentionally disabled until the runtime, model providers, persistence and approval chain are connected.</p></div>
      <div style={{border:"1px solid currentColor",borderRadius:14,padding:"14px 18px",opacity:.8}}><strong>Runtime: NOT CONNECTED</strong><div>{snapshot.summary.total} configured agents · {snapshot.summary.active} active</div></div>
    </div>
    <section style={{marginTop:28,border:"1px solid #8885",borderRadius:16,padding:20}}><div style={{fontSize:12,fontWeight:800,letterSpacing:1}}>COMMAND</div><h2 style={{margin:"6px 0"}}>{principal.name}</h2><div>Status: {statusLabel[principal.status]}</div><p style={{opacity:.7}}>Owns architecture, delegation, cross-team integration and the final engineering gate.</p></section>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:16,marginTop:20}}>
      {leads.map((lead: ArmyAgent)=><section key={lead.id} style={{border:"1px solid #8885",borderRadius:16,padding:18}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12}}><div><div style={{fontSize:11,fontWeight:800,letterSpacing:1}}>{lead.department.toUpperCase()}</div><h2 style={{fontSize:20,margin:"5px 0"}}>{lead.name}</h2></div><span>{statusLabel[lead.status]}</span></div>
        <div style={{display:"grid",gap:10,marginTop:14}}>{specialists(lead.id).map((agent: ArmyAgent)=><article key={agent.id} style={{background:"#8881",borderRadius:12,padding:12}}><div style={{display:"flex",justifyContent:"space-between",gap:10}}><strong>{agent.name}</strong><span style={{fontSize:12}}>{statusLabel[agent.status]}</span></div><div style={{fontSize:12,opacity:.7,marginTop:5}}>{agent.specialties.join(" · ")}</div><div style={{fontSize:12,marginTop:6}}>Task: none · Heartbeat: none</div></article>)}</div>
      </section>)}
    </div>
    <section style={{marginTop:22,border:"1px solid #8885",borderRadius:16,padding:18}}><h2 style={{marginTop:0}}>Status contract</h2><p style={{lineHeight:1.6,opacity:.75}}>WORKING is only valid while a real task has a fresh heartbeat. Missing or expired heartbeats become STALE. Waiting, blocked, paused, reviewing, ready-for-review, failed and done are first-class states. UNITY Army will never display an agent as working merely because the model says it is working.</p></section>
  </main>;
}
