import { NextResponse } from "next/server";
import { normalizeOpenRouter, normalizeHuggingFace, deduplicateCatalog } from "@/lib/catalog.mjs";
export const dynamic = "force-dynamic";
// Two fixed public discovery endpoints. No keys, no inference or arbitrary URL fetching.
const providers = [
 {name:"OpenRouter",url:"https://openrouter.ai/api/v1/models",normalize:normalizeOpenRouter},
 {name:"Hugging Face",url:"https://huggingface.co/api/models?pipeline_tag=text-generation&sort=downloads&limit=100",normalize:normalizeHuggingFace}
] as const;
export async function GET() {
 const results = await Promise.all(providers.map(async p=>{
  try {
   const response = await fetch(p.url,{next:{revalidate:300},signal:AbortSignal.timeout(7500)});
   if(!response.ok) throw new Error("Upstream unavailable");
   const data:unknown = await response.json();
   // Narrow each catalog without allowing arbitrary upstream data to become UI commands.
   const models = p.name==="OpenRouter" ? normalizeOpenRouter(data) : normalizeHuggingFace(data);
   return {name:p.name,status:"ok" as const,models};
  } catch {
   return {name:p.name,status:"unavailable" as const,models:[]};
  }
 }));
 if(results.every(r=>r.status==="unavailable"))
  return NextResponse.json({error:"All public catalogs are temporarily unavailable",sources:results.map(({name,status})=>({name,status}))},{status:503});
 return NextResponse.json({
  models:deduplicateCatalog(results.flatMap(r=>r.models)),
  sources:results.map(({name,status,models})=>({name,status,count:models.length})),
  retrievedAt:new Date().toISOString(),
  notice:"These are catalog records, not verified unique model weights or authorized free inference."
 });
}
