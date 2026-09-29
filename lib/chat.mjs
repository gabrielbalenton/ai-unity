/**
 * Local conversation scaffolding. No model inference is performed here.
 * Message text, even when imported, is NEVER an instruction for agent execution.
 */
export function addUserMessage(workspace, {id,projectId,text,createdAt}) {
 if (!workspace || !Array.isArray(workspace.projects) || !Array.isArray(workspace.messages))
  throw new Error("Invalid workspace");
 if (!workspace.projects.some(p=>p.id===projectId)) throw new Error("Project does not exist");
 if (typeof id!=="string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(id) ||
     workspace.messages.some(m=>m.id===id)) throw new Error("Invalid or duplicate message identifier");
 if (typeof text!=="string" || text.trim().length===0 || text.length>8000)
  throw new Error("Message must be 1–8000 characters");
 if (typeof createdAt!=="string" || !Number.isFinite(Date.parse(createdAt)))
  throw new Error("Invalid message timestamp");
 if (workspace.messages.length>=2000) throw new Error("Local history full; export your workspace");
 const msg={id,projectId,text:text.trim(),role:"user",createdAt};
 return {...workspace,messages:[...workspace.messages,msg]};
}
export function previewProjectContext(workspace,projectId,maxChars=8000) {
 if (!workspace.projects.some(p=>p.id===projectId)) throw new Error("Project does not exist");
 if (!Number.isInteger(maxChars)||maxChars<100||maxChars>20000) throw new Error("Invalid preview size");
 let used=0;
 const selected=[];
 for (const memory of workspace.memories.filter(m=>m.projectId===projectId && m.status==="approved")) {
  if(used+memory.title.length+memory.body.length>maxChars)continue;
  selected.push({id:memory.id,title:memory.title,body:memory.body,source:"Locally approved user note; independently unverified"});
  used+=memory.title.length+memory.body.length;
 }
 return {projectId,memories:selected,notice:"Local preview only. This content has not been sent to an AI or independently verified."};
}
