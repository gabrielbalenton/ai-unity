import { NextResponse } from "next/server";
// Public liveness only. Never expose env status, connector names or credentials.
export const dynamic="force-dynamic";
export function GET(){
 return NextResponse.json({service:"unity",status:"online",phase:"development",
  externalExecution:false},{headers:{"Cache-Control":"no-store"}});
}
