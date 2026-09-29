"use client";
import {useMemo,useState} from "react";
import type {Workspace} from "@/lib/types";
import {addUserMessage,previewProjectContext} from "@/lib/chat.mjs";
type Props = {
 projectId:string; workspace:Workspace; onChange:(next:Workspace)=>void; disabled:boolean;
};
export default function ChatPanel({projectId,workspace,onChange,disabled}:Props) {
 const [draft,setDraft]=useState("");
 const [error,setError]=useState("");
 const [showContext,setShowContext]=useState(false);
 const active=workspace.projects.find(p=>p.id===projectId);
 const conversation=useMemo(()=>workspace.messages.filter(m=>m.projectId===projectId),[workspace.messages,projectId]);
 const context=useMemo(()=>active?previewProjectContext(workspace,projectId):null,[workspace,projectId,active]);
 function submit(event:React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  try {
   const updated=addUserMessage(workspace,{id:crypto.randomUUID(),projectId,text:draft,createdAt:new Date().toISOString()});
   onChange(updated);setDraft("");setError("");
  } catch(e) {setError(e instanceof Error?e.message:"Unable to record local message")}
 }
 return <section className="panel">
  <h2>Project conversation</h2>
  <p className="muted">A local conversation record for future AI integrations. Messages are NOT sent to any AI yet. This is not a secure vault; don't enter confidential client information.</p>
  {!active?<p className="warning">Create or select a project first.</p>:<>
   <div className="entry-head"><strong>{active.name}</strong><span className="pill">{conversation.length} local messages</span></div>
   <div aria-label="Project message history" className="model-list chat-history">
    {conversation.length===0?<p className="muted">No messages yet.</p>:conversation.map(msg=><article key={msg.id} className="chat-message"><strong>You</strong><p className="prewrap">{msg.text}</p><small>{new Date(msg.createdAt).toLocaleString()}</small></article>)}
   </div>
   <form onSubmit={submit}>
    <label>Write a message<textarea maxLength={8000} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Record a question, instruction or task for this project" /></label>
    <button className="primary" disabled={disabled||!draft.trim()}>Save local message</button>
   </form>
   {error&&<p role="alert" className="warning">{error}</p>}
   <div className="entry">
    <button type="button" onClick={()=>setShowContext(!showContext)}>{showContext?"Hide":"Preview"} approved project context</button>
    {showContext&&<div><p className="muted">This is the context that future agents could receive after authenticated permissions and source verification are implemented.</p>
     {context?.memories.length===0?<p>No approved notes for this project.</p>:context?.memories.map(m=><div className="entry" key={m.id}><strong>{m.title}</strong><p className="prewrap">{m.body}</p><small>{m.source}</small></div>)}
    </div>}
   </div>
  </>}
 </section>;
}
