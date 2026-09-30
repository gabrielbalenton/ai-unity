/**
 * Bounded vendor-neutral SSE framing. Only a separately verified adapter may
 * map provider-specific wire events into this contract. Parser output is
 * untrusted data, never commands or tool execution approval.
 */
const allowedEvents=new Set(["delta","usage","done","error","message"]);
export function createSSEDecoder({maxFrameBytes=32_768,maxBufferedBytes=65_536}={}){
 if(!Number.isInteger(maxFrameBytes)||maxFrameBytes<100||maxFrameBytes>262_144||
    !Number.isInteger(maxBufferedBytes)||maxBufferedBytes<maxFrameBytes||maxBufferedBytes>524_288)
  throw Error("Invalid streaming limits");
 const decoder=new TextDecoder("utf-8",{fatal:true});
 let buffer="";
 let finished=false;
 function decodeFrames(){
  const out=[];
  for(;;){
   // Normalize all supported event delimiters before examining one frame.
   const normalized=buffer.replace(/\r\n/g,"\n").replace(/\r/g,"\n");
   const boundary=normalized.indexOf("\n\n");
   if(boundary<0){buffer=normalized;break}
   const frame=normalized.slice(0,boundary);
   buffer=normalized.slice(boundary+2);
   if(Buffer.byteLength(frame,"utf8")>maxFrameBytes)throw Error("Oversized streaming frame");
   let event="message",data=[];
   for(const line of frame.split("\n")){
    if(line.startsWith(":"))continue;
    if(line.startsWith("event:")){
     event=line.slice(6).trim();
     if(!allowedEvents.has(event))throw Error("Unsupported streaming event");
    }else if(line.startsWith("data:")){
     data.push(line.slice(5).replace(/^ /,""));
    }
   }
   if(data.length)out.push(Object.freeze({event,data:data.join("\n")}));
  }
  if(Buffer.byteLength(buffer,"utf8")>maxBufferedBytes)
   throw Error("Streaming buffer exceeded limit");
  return out;
 }
 return Object.freeze({
  feed(chunk){
   if(finished)throw Error("Decoder already finished");
   if(!(chunk instanceof Uint8Array))throw Error("Expected binary UTF-8 chunk");
   buffer+=decoder.decode(chunk,{stream:true});
   if(Buffer.byteLength(buffer,"utf8")>maxBufferedBytes)throw Error("Streaming buffer exceeded limit");
   return decodeFrames();
  },
  finish(){
   if(finished)throw Error("Decoder already finished");
   finished=true;
   buffer+=decoder.decode();
   const output=decodeFrames();
   // Incomplete frames are intentionally discarded, never treated as
   // authoritative result or success when the network closes unexpectedly.
   if(buffer.trim())throw Error("Incomplete streaming frame");
   return output;
  }
 });
}
export function normalizeStreamEvent(frame){
 if(!frame||typeof frame!=="object"||!allowedEvents.has(frame.event)||
   typeof frame.data!=="string")throw Error("Invalid normalized stream event");
 if(frame.data==="[DONE]"||frame.event==="done")
  return Object.freeze({kind:"done",content:null});
 if(frame.event==="error")
  return Object.freeze({kind:"error",code:"PROVIDER_STREAM_FAILED"});
 let payload;
 try{payload=JSON.parse(frame.data)}catch{throw Error("Invalid stream JSON")}
 if(frame.event==="delta"){
  if(typeof payload?.text!=="string"||payload.text.length>16_000)
   throw Error("Invalid text delta");
  return Object.freeze({kind:"delta",text:payload.text,trust:"unverified_ai_output"});
 }
 if(frame.event==="usage"){
  const positive=n=>Number.isInteger(n)&&n>=0&&n<=1_000_000_000;
  if(!positive(payload?.inputTokens)||!positive(payload?.outputTokens))
   throw Error("Invalid streaming usage metadata");
  return Object.freeze({kind:"usage",inputTokens:payload.inputTokens,
   outputTokens:payload.outputTokens,billingVerified:false});
 }
 // Unrecognized generic provider messages are NEVER used as tool commands.
 throw Error("Stream frame requires a provider-specific adapter");
}
