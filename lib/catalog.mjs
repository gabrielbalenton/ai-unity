/** Normalize public catalog metadata. Catalog presence never implies free inference. */
export function normalizeOpenRouter(data) {
 if (!Array.isArray(data?.data)) throw new Error("Invalid OpenRouter catalog");
 return data.data.filter(m=>m && typeof m.id==="string" && m.id).map(m=>({
  id:m.id,name:typeof m.name==="string" && m.name?m.name:m.id,source:"OpenRouter",
  contextLength:Number.isFinite(m.context_length)?m.context_length:null,
  zeroTextPrice:m.pricing?.prompt==="0" && m.pricing?.completion==="0",
  availableForExecution:false,
  note:"Published catalog metadata. Availability, paid features and current free quota are unverified."
 }));
}
export function normalizeHuggingFace(data) {
 if (!Array.isArray(data)) throw new Error("Invalid Hugging Face catalog");
 return data.filter(m=>m && typeof m.id==="string" && m.id).map(m=>({
  id:m.id,name:m.id,source:"Hugging Face",
  contextLength:null,zeroTextPrice:false,availableForExecution:false,
  note:"Discovery only. Hosting, inference availability and price are not verified."
 }));
}
export function deduplicateCatalog(models) {
 const seen=new Set();
 return models.filter(m=>{
  const key=m.source+":"+m.id.toLowerCase();
  if(seen.has(key))return false;
  seen.add(key);return true;
 });
}
