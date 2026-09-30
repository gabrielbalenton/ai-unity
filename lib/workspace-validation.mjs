/**
 * Strict boundary for untrusted user-imported browser workspace JSON.
 * Future server-side authorization must validate independently.
 */
const idPattern = /^[a-zA-Z0-9_-]{1,100}$/;
const statuses = new Set(["draft", "approved"]);
const isObject = value => !!value && typeof value === "object" && !Array.isArray(value);
const cleanString = (value, max) => typeof value === "string" && value.length <= max;
const timestamp = value => typeof value === "string" && value.length < 50 && Number.isFinite(Date.parse(value));

export function validateWorkspace(value, {importMode = false} = {}) {
 if (!isObject(value) || value.version !== 1) throw new Error("Not a UNITY v1 workspace.");
 if (!Array.isArray(value.projects) || !Array.isArray(value.memories) ||
    (value.githubLinks != null && !Array.isArray(value.githubLinks)) ||
    (value.messages != null && !Array.isArray(value.messages)) ||
    (value.tasks != null && !Array.isArray(value.tasks)) ||
    (value.automations != null && !Array.isArray(value.automations))) throw new Error("Invalid workspace collections.");
 if (value.projects.length > 200 || value.memories.length > 5000 || (value.githubLinks || []).length > 1000 || (value.messages || []).length > 2000 || (value.tasks || []).length > 2000 || (value.automations || []).length > 1000)
   throw new Error("Workspace exceeds import limits.");
 const projectIds = new Set(), memoryIds = new Set(), linkIds = new Set();
 const projects = value.projects.map(p => {
  if (!isObject(p) || !cleanString(p.id,100) || !idPattern.test(p.id) || projectIds.has(p.id) ||
   !cleanString(p.name,100) || p.name.trim().length < 2 || !cleanString(p.description,500) ||
   !timestamp(p.createdAt)) throw new Error("Invalid or duplicated project.");
  projectIds.add(p.id);
  return {id:p.id,name:p.name,description:p.description,createdAt:p.createdAt};
 });
 const memories = value.memories.map(m => {
  if (!isObject(m) || !cleanString(m.id,100) || !idPattern.test(m.id) || memoryIds.has(m.id) ||
   !projectIds.has(m.projectId) || !cleanString(m.title,140) || m.title.trim().length < 2 ||
   !cleanString(m.body,20000) || m.body.trim().length < 2 || !statuses.has(m.status) ||
   !timestamp(m.createdAt) || !timestamp(m.updatedAt)) throw new Error("Invalid memory entry or cross-project reference.");
  memoryIds.add(m.id);
  // Files can be tampered with. Imported approvals MUST be manually reapproved.
  return {id:m.id,projectId:m.projectId,title:m.title,body:m.body,
   status:importMode ? "draft" : m.status,createdAt:m.createdAt,updatedAt:m.updatedAt};
 });
 const githubLinks = (value.githubLinks || []).map(l => {
  if (!isObject(l) || !cleanString(l.id,100) || !idPattern.test(l.id) || linkIds.has(l.id) ||
   !projectIds.has(l.projectId) || !cleanString(l.fullName,140) ||
   !/^[A-Za-z0-9_.-]{1,39}\/[A-Za-z0-9_.-]{1,100}$/.test(l.fullName) ||
   !cleanString(l.url,400) || l.url !== "https://github.com/" + l.fullName ||
   !cleanString(l.defaultBranch,200) || !timestamp(l.checkedAt))
   throw new Error("Invalid GitHub link or cross-project reference.");
  linkIds.add(l.id);
  return {id:l.id,projectId:l.projectId,fullName:l.fullName,url:l.url,
   defaultBranch:l.defaultBranch,checkedAt:l.checkedAt};
 });
 const messageIds=new Set();
 const messages=(value.messages || []).map(m=>{
  if (!isObject(m) || !cleanString(m.id,100) || !idPattern.test(m.id) ||
      messageIds.has(m.id) || !projectIds.has(m.projectId) || m.role!=="user" ||
      !cleanString(m.text,8000) || !m.text.trim() || !timestamp(m.createdAt))
   throw new Error("Invalid conversation or cross-project reference");
  messageIds.add(m.id);
  return {id:m.id,projectId:m.projectId,text:m.text,role:"user",createdAt:m.createdAt};
 });
 const taskIds=new Set();
 const states=new Set(["draft","queued","running","awaiting_approval","failed","completed","cancelled"]);
 const tasks=(value.tasks || []).map(t=>{
  if (!isObject(t) || !cleanString(t.id,100) || !idPattern.test(t.id) ||
      taskIds.has(t.id) || !projectIds.has(t.projectId) || !cleanString(t.title,160) ||
      t.title.trim().length<3 || !cleanString(t.requiredCapability,80) ||
      !states.has(t.state) || !Number.isInteger(t.revision) || t.revision<0 ||
      !Array.isArray(t.evidence) || t.evidence.length>100 ||
      !t.evidence.every(x=>cleanString(x,400) && x.trim()) ||
      !Array.isArray(t.history) || t.history.length>500 ||
      !t.history.every(e=>isObject(e) && states.has(e.from) && states.has(e.to) &&
       cleanString(e.actor,100) && cleanString(e.reason,300) &&
       Array.isArray(e.evidence) && e.evidence.every(x=>cleanString(x,400)) &&
       (e.approvalId===null||cleanString(e.approvalId,100))) ||
      t.revision!==t.history.length)
   throw new Error("Invalid task or cross-project reference");
  taskIds.add(t.id);
  // Imported state/history cannot be treated as trusted execution records.
  if(importMode)return {id:t.id,projectId:t.projectId,title:t.title,requiredCapability:t.requiredCapability,
   state:"draft",revision:0,evidence:[],history:[]};
  return {id:t.id,projectId:t.projectId,title:t.title,requiredCapability:t.requiredCapability,
   state:t.state,revision:t.revision,evidence:t.evidence.slice(),
   history:t.history.map(e=>({from:e.from,to:e.to,actor:e.actor,reason:e.reason,evidence:e.evidence.slice(),approvalId:e.approvalId}))};
 });
 const automationIds=new Set();
 const triggers=new Set(["manual","schedule","event"]);
 const automations=(value.automations || []).map(a=>{
  if(!isObject(a)||!cleanString(a.id,100)||!idPattern.test(a.id)||automationIds.has(a.id)||
     !projectIds.has(a.projectId)||!cleanString(a.title,120)||a.title.trim().length<3||
     !triggers.has(a.trigger)||!cleanString(a.action,1000)||a.action.trim().length<3||
     a.status!=="draft"||!timestamp(a.createdAt)||!timestamp(a.updatedAt))
    throw new Error("Invalid automation draft or cross-project reference");
  automationIds.add(a.id);
  // Imported automation plans stay inert drafts and can never carry executable state.
  return {id:a.id,projectId:a.projectId,title:a.title,trigger:a.trigger,action:a.action,status:"draft",createdAt:a.createdAt,updatedAt:a.updatedAt};
 });
 return {version:1,projects,memories,githubLinks,messages,tasks,automations};
}
export function parseWorkspaceImport(text) {
 if (typeof text !== "string" || text.length > 2_000_000) throw new Error("Import must be a JSON file smaller than 2 MB.");
 let value;
 try {value = JSON.parse(text);} catch {throw new Error("Import contains invalid JSON.");}
 return validateWorkspace(value, {importMode:true});
}
