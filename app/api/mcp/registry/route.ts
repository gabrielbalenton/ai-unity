import { type NextRequest, NextResponse } from "next/server";
import { normalizeRegistryPage } from "@/lib/mcp-registry.mjs";
export const dynamic = "force-dynamic";
const base = "https://registry.modelcontextprotocol.io/v0.1/servers";
export async function GET(request:NextRequest) {
 const query=(request.nextUrl.searchParams.get("search")||"").trim();
 if(query.length>80 || /[\x00-\x1f]/.test(query))
  return NextResponse.json({error:"Search must be 80 printable characters or fewer."},{status:400});
 // Fixed API target and bounded result size: users cannot supply arbitrary upstream URLs.
 const url=new URL(base);
 url.searchParams.set("limit","30");url.searchParams.set("version","latest");
 if(query) url.searchParams.set("search",query);
 try {
  const response=await fetch(url,{next:{revalidate:300},signal:AbortSignal.timeout(7000)});
  if(!response.ok)throw new Error("Unavailable");
  const normalized=normalizeRegistryPage(await response.json());
  return NextResponse.json({...normalized,query,retrievedAt:new Date().toISOString(),
   notice:"Discovery only. Registry entries are third-party claims; no MCP server is authorized, installed or executed."});
 }catch{
  return NextResponse.json({error:"MCP registry is unavailable; no tools were connected."},{status:503});
 }
}
