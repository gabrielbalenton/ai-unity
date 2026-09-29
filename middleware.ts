import {type NextRequest,NextResponse} from "next/server";
import {createServerClient} from "@supabase/ssr";
import {isSupabaseConfigured,requireSupabaseConfig} from "./lib/supabase/config";
import type {CookieUpdate} from "./lib/supabase/cookie-types";

// Next.js 15 uses middleware.ts; v16 uses proxy.ts. Version upgrades need revalidation.
export async function middleware(request:NextRequest){
 if(!isSupabaseConfigured())return NextResponse.next({request});
 const {url,key}=requireSupabaseConfig();
 let response=NextResponse.next({request});
 const supabase=createServerClient(url,key,{
  cookies:{
   getAll(){return request.cookies.getAll();},
   setAll(changes:CookieUpdate[]){
    changes.forEach(({name,value})=>request.cookies.set(name,value));
    response=NextResponse.next({request});
    changes.forEach(({name,value,options})=>response.cookies.set(name,value,options));
   }
  }
 });
 // This only refreshes a session. Route handlers STILL call getUser and check ownership.
 await supabase.auth.getClaims();
 return response;
}
export const config={matcher:["/auth/:path*","/api/private/:path*"]};
