"use client";
import { useEffect, useRef, useState } from "react";

// Browser SpeechRecognition varies by device and browser. This is explicitly opt-in.
type SpeechResult = ArrayLike<{transcript:string}> & {isFinal:boolean};
type SpeechEvent = {results:ArrayLike<SpeechResult>;resultIndex:number};
type Recognition = {
 lang:string; continuous:boolean; interimResults:boolean;
 onresult:((event:SpeechEvent)=>void)|null;
 onerror:(()=>void)|null; onend:(()=>void)|null;
 start:()=>void; stop:()=>void;
};
type RecognitionCtor = new()=>Recognition;
type SpeechWindow = Window & {SpeechRecognition?:RecognitionCtor;webkitSpeechRecognition?:RecognitionCtor};
export default function VoiceDictation({onTranscript}:{onTranscript:(text:string)=>void}) {
 const [available,setAvailable]=useState(false);
 const [listening,setListening]=useState(false);
 const [error,setError]=useState("");
 const recognition=useRef<Recognition|null>(null);
 useEffect(()=>{
  const w=window as SpeechWindow;
  setAvailable(!!(w.SpeechRecognition||w.webkitSpeechRecognition));
  return ()=>{try{recognition.current?.stop()}catch{/* no active recognizer */} recognition.current=null};
 },[]);
 function toggle(){
  if(listening){recognition.current?.stop();setListening(false);return}
  const w=window as SpeechWindow;
  const Ctor=w.SpeechRecognition||w.webkitSpeechRecognition;
  if(!Ctor){setError("Voice dictation is unavailable in this browser.");return}
  const instance=new Ctor();
  instance.lang="en-US";instance.continuous=false;instance.interimResults=false;
  instance.onresult=event=>{
   const phrases:string[]=[];
   for(let i=event.resultIndex;i<event.results.length;i++){
    const item=event.results[i];
    if(item?.isFinal && item[0]?.transcript)phrases.push(item[0].transcript.trim());
   }
   const phrase=phrases.join(" ").trim();
   if(phrase)onTranscript(phrase);
  };
  instance.onerror=()=>{setError("Microphone or speech recognition failed. Try typing instead.");setListening(false)};
  instance.onend=()=>{setListening(false);recognition.current=null};
  try{recognition.current=instance;instance.start();setListening(true);setError("")}
  catch{recognition.current=null;setListening(false);setError("Unable to start voice dictation. Check microphone permission.")}
 }
 return <div className="voice-box">
   <button type="button" onClick={toggle} disabled={!available} aria-pressed={listening}>
    {listening?"Stop dictation":"Start voice brain dump"}
   </button>
   <p className="muted">{available
    ?"Optional browser speech recognition. Audio may be processed by your browser's speech provider; do not dictate confidential information."
    :"Voice dictation is unavailable here. You can type your brain dump."}</p>
   {error&&<p role="alert" className="warning">{error}</p>}
 </div>;
}
