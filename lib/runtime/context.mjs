/**
 * Central brain retrieval contract. Only approved knowledge for the requested
 * project enters a task context. Unverified suggestions are NEVER instructions.
 */
const safe = value => typeof value === "string" && value.trim().length > 0;
export function buildTaskContext({projectId,taskId,memories,sourceRecords,maxChars=24000}) {
 if (!safe(projectId) || !safe(taskId) || !Array.isArray(memories) ||
     !Array.isArray(sourceRecords) || !Number.isInteger(maxChars) ||
     maxChars < 100 || maxChars > 100000) throw new Error("Invalid context request");
 const relevant = memories.filter(m=>m && m.projectId === projectId &&
   m.status === "approved" && safe(m.title) && safe(m.body));
 const sources = sourceRecords.filter(s=>s && s.projectId===projectId && safe(s.id) &&
   safe(s.reference) && s.verified === true);
 const sourceMap = new Map(sources.map(s=>[s.id,s.reference]));
 const included = [], excluded = [];
 let size = 0;
 for(const m of relevant) {
  // Local user-approved memories may have no source reference; label explicitly.
  const evidence = m.sourceId && sourceMap.has(m.sourceId)
   ? {type:"verified_source",reference:sourceMap.get(m.sourceId)}
   : {type:"user_approved_note",reference:null};
  const next = m.title.length + m.body.length;
  if (size + next > maxChars) {excluded.push(m.id);continue}
  included.push({id:m.id,title:m.title,body:m.body,evidence});
  size += next;
 }
 return Object.freeze({projectId,taskId,memories:included,
  excludedMemoryIds:excluded,sourceCount:sources.length,
  instruction:"Use only authorized context. Do not represent unsourced notes as independently verified facts."});
}
