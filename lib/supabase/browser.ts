"use client";
import {createBrowserClient} from "@supabase/ssr";
import {requireSupabaseConfig} from "./config";
export function createBrowserSupabase(){
 const {url,key}=requireSupabaseConfig();
 // Only the public publishable key enters the browser; RLS protects each row.
 return createBrowserClient(url,key);
}
