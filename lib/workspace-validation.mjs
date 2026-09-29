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
    (value.messages != null && !Array.isArray(value.messages))) throw new Error("Invalid workspace collections.");
 if (value.projects.length > 200 || value.memories.length > 5000 || (value.githubLinks || []).length > 1000 || (value.messages || []).length > 2000)
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
 return {version:1,projects,memories,githubLinks,messages};
}
export function parseWorkspaceImport(text) {
 if (typeof text !== "string" || text.length > 2_000_000) throw new Error("Import must be a JSON file smaller than 2 MB.");
 let value;
 try {value = JSON.parse(text);} catch {throw new Error("Import contains invalid JSON.");}
 return validateWorkspace(value, {importMode:true});
}
