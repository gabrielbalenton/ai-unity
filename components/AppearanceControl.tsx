"use client";

import {useEffect,useState} from "react";
import {Monitor, Moon, Sun} from "lucide-react";

type Appearance="system"|"light"|"dark";
const storageKey="unity-appearance-v1";
const isAppearance=(value:unknown):value is Appearance=>
 value==="system"||value==="light"||value==="dark";

/**
 * This preference is explicitly local. System mode follows operating-system
 * light/dark changes; a saved manual selection overrides only this browser.
 * There is no network or provider dependency.
 */
export default function AppearanceControl(){
 const [appearance,setAppearance]=useState<Appearance>("system");
 const [loaded,setLoaded]=useState(false);

 useEffect(()=>{
  try{
   const value=window.localStorage.getItem(storageKey);
   if(isAppearance(value))setAppearance(value);
  }catch{/* Storage unavailable: keep System default. */}
  setLoaded(true);
 },[]);

 useEffect(()=>{
  if(!loaded)return;
  const media=window.matchMedia("(prefers-color-scheme: dark)");
  function apply(){
   const resolved=appearance==="system"?(media.matches?"dark":"light"):appearance;
   document.documentElement.dataset.resolvedTheme=resolved;
   document.documentElement.dataset.appearance=appearance;
  }
  apply();
  media.addEventListener?.("change",apply);
  return()=>media.removeEventListener?.("change",apply);
 },[appearance,loaded]);

 function change(value:string){
  if(!isAppearance(value))return;
  setAppearance(value);
  try{window.localStorage.setItem(storageKey,value)}catch{/* Nonpersistent fallback. */}
 }
 const Icon=appearance==="dark"?Moon:appearance==="light"?Sun:Monitor;
 return <label className="appearance-control" title="Choose the appearance for this browser">
  <Icon size={16} aria-hidden="true"/>
  <span className="appearance-label">Appearance</span>
  <select aria-label="Appearance" value={appearance} onChange={event=>change(event.target.value)}>
   <option value="system">System</option>
   <option value="light">Light</option>
   <option value="dark">Dark</option>
  </select>
 </label>;
}
