"use client";

import {useEffect,useState} from "react";
import {Monitor,Moon,Sun} from "lucide-react";

export type Appearance="system"|"light"|"dark";
const storageKey="unity-appearance-v1";
const isAppearance=(value:unknown):value is Appearance=>
 value==="system"||value==="light"||value==="dark";

export default function AppearanceControl(){
 const [appearance,setAppearance]=useState<Appearance>("system");
 const [loaded,setLoaded]=useState(false);

 useEffect(()=>{
  try{
   const saved=window.localStorage.getItem(storageKey);
   if(isAppearance(saved))setAppearance(saved);
  }catch{/* System remains the safe local default. */}
  setLoaded(true);
 },[]);

 useEffect(()=>{
  if(!loaded)return;
  const media=window.matchMedia("(prefers-color-scheme: dark)");
  const apply=()=>{
   const resolved=appearance==="system"?(media.matches?"dark":"light"):appearance;
   document.documentElement.dataset.unityTheme=appearance;
   document.documentElement.dataset.resolvedTheme=resolved;
  };
  apply();
  media.addEventListener?.("change",apply);
  return()=>media.removeEventListener?.("change",apply);
 },[appearance,loaded]);

 function change(value:string){
  if(!isAppearance(value))return;
  setAppearance(value);
  try{window.localStorage.setItem(storageKey,value)}catch{/* Non-persistent browser fallback. */}
 }
 const Icon=appearance==="dark"?Moon:appearance==="light"?Sun:Monitor;
 return <label className="appearance-control">
  <Icon size={17} aria-hidden="true"/>
  <span className="appearance-label">Appearance</span>
  <select aria-label="Appearance" value={appearance} onChange={event=>change(event.target.value)}>
   <option value="system">System</option>
   <option value="light">Light</option>
   <option value="dark">Dark</option>
  </select>
 </label>;
}
