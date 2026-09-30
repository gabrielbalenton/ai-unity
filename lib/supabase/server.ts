import "server-only";
import {createServerClient} from "@supabase/ssr";
import {cookies} from "next/headers";
import {requireSupabaseConfig} from "./config";
import type {CookieUpdate} from "./cookie-types";
export async function createServerSupabase() {
 const {url,key}=requireSupabaseConfig();
 const cookieStore=await cookies();
 return createServerClient(url,key,{
  cookies:{
   getAll(){return cookieStore.getAll();},
   setAll(changes:CookieUpdate[]){
    try {changes.forEach(({name,value,options})=>cookieStore.set(name,value,options))}
    catch{
     // Server Components cannot set cookies. Proxy refreshes supported auth paths.
     // This catch must not be interpreted as proof of a valid session.
    }
   }
  }
 });
}
export async function getVerifiedUser() {
 const supabase=await createServerSupabase();
 const {data,error}=await supabase.auth.getUser(); // Network-verified user, never cookie-only getSession.
 if(error||!data.user) return {supabase,user:null};
 return {supabase,user:data.user};
}
