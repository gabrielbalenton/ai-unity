import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
 try {
  const response = await fetch("https://openrouter.ai/api/v1/models", {signal:AbortSignal.timeout(8000), cache:"no-store"});
  if (!response.ok) return NextResponse.json({error:"Catalog provider unavailable"}, {status:503});
  const raw: unknown = await response.json();
  if (!raw || typeof raw !== "object" || !("data" in raw) || !Array.isArray(raw.data))
   return NextResponse.json({error:"Unexpected provider response"}, {status:502});
  const models = raw.data.filter((m:unknown)=>m!==null && typeof m==="object").map((m:unknown)=>{
   const x=m as Record<string,unknown>;
   const pricing = x.pricing && typeof x.pricing==="object" ? x.pricing as Record<string,unknown> : {};
   return {
    id: String(x.id ?? ""), name: String(x.name ?? x.id ?? "Unknown"),
    contextLength: typeof x.context_length==="number" ? x.context_length : null,
    zeroTextPrice: pricing.prompt==="0" && pricing.completion==="0"
   };
  }).filter(m=>m.id);
  return NextResponse.json({models,retrievedAt:new Date().toISOString(),notice:"Zero published text prices do not guarantee free inference or remaining quota."});
 } catch { return NextResponse.json({error:"Catalog temporarily unavailable"}, {status:503}); }
}
