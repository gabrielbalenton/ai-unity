"use client";
import {useState} from "react";
import Link from "next/link";
import {isSupabaseConfigured} from "@/lib/supabase/config";
import {createBrowserSupabase} from "@/lib/supabase/browser";

export default function LoginPage(){
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 // Only shows the login for a separately provisioned and configured UNITY database.
 const configured=isSupabaseConfigured();
 async function signIn(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!configured||busy)return;
  setBusy(true);setMessage("");
  try{
   const supabase=createBrowserSupabase();
   const {error}=await supabase.auth.signInWithPassword({email,password});
   // Avoid identifying whether an email exists through detailed error output.
   if(error)throw Error("Sign-in failed. Check your credentials or account configuration.");
   setPassword("");
   window.location.href="/";
  }catch(e){setMessage(e instanceof Error?e.message:"Sign-in unavailable");setBusy(false)}
 }
 return <main className="auth-page">
  <section className="panel">
   <p className="eyebrow">UNITY · PERSONAL ALPHA</p><h1>Account access</h1>
   <p className="muted">This optional login connects only to your future dedicated UNITY backend. Local workspace data remains in this browser until a separately tested migration is implemented.</p>
   {!configured?<div className="warning" role="status">A dedicated UNITY authentication service has not been configured. No external account connection has been attempted.</div>:
    <form onSubmit={signIn}>
     <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required/></label>
     <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required minLength={8}/></label>
     <button className="primary" disabled={busy}>{busy?"Signing in...":"Sign in"}</button>
     {message&&<p role="alert" className="warning">{message}</p>}
    </form>}
   <p><Link href="/">Return to local workspace</Link></p>
  </section>
 </main>;
}
