import {type NextRequest,NextResponse} from "next/server";
import {createServerClient} from "@supabase/ssr";
import {isSupabaseConfigured,requireSupabaseConfig} from "./lib/supabase/config";
import type {CookieUpdate} from "./lib/supabase/cookie-types";

// Next.js 16 Proxy refreshes auth cookies; API routes independently authorize every request.
export async function proxy(request:NextRequest){
 if(!isSupabaseConfigured())return NextResponse.next({request});
 const {url,key}=requireSupabaseConfig();
 let response=NextResponse.next({request});
 response.headers.set("Cache-Control","private, no-store");
 const supabase=createServerClient(url,key,{
  cookies:{
   getAll(){return request.cookies.getAll();},
   setAll(changes:CookieUpdate[]){
    changes.forEach(({name,value})=>request.cookies.set(name,value));
    response=NextResponse.next({request});
    response.headers.set("Cache-Control","private, no-store");
    changes.forEach(({name,value,options})=>response.cookies.set(name,value,options));
   }
  }
 });
 // This only refreshes a session. Route handlers STILL call getUser and check ownership.
 await supabase.auth.getClaims();
 return response;
}
export const config={matcher:["/auth/:path*","/api/private/:path*"]};
