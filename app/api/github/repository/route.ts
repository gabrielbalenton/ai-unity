import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
/** Read-only PUBLIC repository metadata lookup. No credentials, no private repository access. */
export async function GET(request: NextRequest) {
 const candidate = request.nextUrl.searchParams.get("repo") || "";
 if (!/^[A-Za-z0-9_.-]{1,39}\/[A-Za-z0-9_.-]{1,100}$/.test(candidate) || candidate.includes(".."))
  return NextResponse.json({error:"Use owner/repository format."},{status:400});
 try {
  const response=await fetch(`https://api.github.com/repos/${candidate}`,{
   headers:{Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"},
   signal:AbortSignal.timeout(6500), cache:"no-store"
  });
  if (response.status===404) return NextResponse.json({error:"Public repository not found. Private repositories require future authenticated GitHub installation."},{status:404});
  if (response.status===403 || response.status===429) return NextResponse.json({error:"GitHub public rate limit reached; try later."},{status:503});
  if (!response.ok) return NextResponse.json({error:"GitHub lookup unavailable."},{status:503});
  const data: unknown=await response.json();
  if (!data || typeof data!=="object") throw new Error("Invalid GitHub response");
  const d=data as Record<string,unknown>;
  if (d.private!==false) return NextResponse.json({error:"Only public repositories are supported in alpha."},{status:403});
  return NextResponse.json({
   fullName:String(d.full_name||candidate),url:String(d.html_url||""),
   defaultBranch:String(d.default_branch||""),description:typeof d.description==="string"?d.description:"",
   updatedAt:typeof d.updated_at==="string"?d.updated_at:null,
   notice:"Read-only public repository metadata; no GitHub account connected."
  });
 } catch {return NextResponse.json({error:"GitHub lookup timed out or is unavailable."},{status:503})}
}
