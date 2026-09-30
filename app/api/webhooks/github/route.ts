import {NextResponse} from "next/server";
import {prepareAndRecordWebhook} from "@/lib/github/webhook-ingestion.mjs";
import {recordVerifiedGitHubDelivery} from "@/lib/github/webhook-store";
export const dynamic="force-dynamic";
export const runtime="nodejs";
const headers={"Cache-Control":"no-store"};
/**
 * Off until separately provisioned, explicitly enabled and live-tested.
 * A valid delivery only receives 202 after an atomic durable write. No agent
 * or GitHub project access can be authorized from webhook data alone.
 */
export async function POST(request:Request){
 if(process.env.UNITY_ENABLE_GITHUB_WEBHOOK_INGESTION!=="true")
  return NextResponse.json({code:"WEBHOOK_INGESTION_NOT_ACTIVATED"},{status:503,headers});
 const length=Number(request.headers.get("content-length")||"0");
 if(!Number.isFinite(length)||length>1_000_000)
  return NextResponse.json({code:"INVALID_BODY"},{status:413,headers});
 let rawBody:Buffer;
 try{
  rawBody=Buffer.from(await request.arrayBuffer());
 }catch{return NextResponse.json({code:"INVALID_BODY"},{status:400,headers})}
 const outcome=await prepareAndRecordWebhook({
  rawBody,
  eventName:request.headers.get("x-github-event"),
  deliveryId:request.headers.get("x-github-delivery"),
  signature:request.headers.get("x-hub-signature-256"),
  secret:process.env.GITHUB_WEBHOOK_SECRET,
  recordDelivery:recordVerifiedGitHubDelivery
 });
 if(outcome.status===204)return new Response(null,{status:204,headers});
 return NextResponse.json({code:outcome.code},{status:outcome.status,headers});
}
