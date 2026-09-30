import "server-only";
import {createClient} from "@supabase/supabase-js";
import type {VerifiedDelivery} from "./webhook-ingestion.mjs";

/**
 * Backend-only service-role store. This NEVER grants repository access and
 * never processes events. It stores only allowlisted metadata, not raw bodies.
 */
export async function recordVerifiedGitHubDelivery(delivery:VerifiedDelivery):Promise<"inserted"|"duplicate">{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const secret=process.env.UNITY_SUPABASE_BACKEND_SECRET;
 if(!url||!/^https:\/\/[a-z0-9.-]+\.supabase\.co\/?$/i.test(url)||
   !secret||secret.length<20)throw Error("Dedicated durable store is unconfigured");
 const db=createClient(url,secret,{
  auth:{autoRefreshToken:false,persistSession:false},
  global:{headers:{"X-UNITY-Component":"webhook-intake"}}
 });
 const row={
  delivery_id:delivery.deliveryId,event_name:delivery.eventName,
  event_action:delivery.action,installation_id:delivery.installationId,
  repository_ids:delivery.repositoryIds,payload_hash:delivery.payloadHash,
  processing_status:"unapplied"
 };
 const {error}=await db.from("github_webhook_deliveries").insert(row);
 if(!error)return "inserted";
 if(error.code!=="23505")throw Error("Durable webhook store unavailable");
 // Duplicate GUIDs must have identical content. Otherwise reject instead of
 // silently treating a changed payload as an idempotent redelivery.
 const {data, error:lookupError}=await db.from("github_webhook_deliveries")
  .select("payload_hash").eq("delivery_id",delivery.deliveryId).maybeSingle();
 if(lookupError||!data||data.payload_hash!==delivery.payloadHash)
  throw Error("Conflicting delivery identifier");
 return "duplicate";
}
