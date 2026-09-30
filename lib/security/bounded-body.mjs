/**
 * Stream-aware input guard. Never trust Content-Length: HTTP clients may omit
 * or falsify it, and reading request.json()/arrayBuffer() directly can buffer
 * arbitrary payloads before the application validates their size.
 */
export class BodyReadError extends Error {
 constructor(code){super(code);this.name="BodyReadError";this.code=code}
}
export async function readBoundedBytes(request,{maxBytes}={}){
 if(!request||typeof request!=="object"||
   !Number.isInteger(maxBytes)||maxBytes<1||maxBytes>2_000_000)
  throw new BodyReadError("INVALID_BODY_LIMIT");
 const declared=request.headers?.get("content-length");
 if(declared!==null&&declared!==undefined){
  if(!/^\d+$/.test(declared)||Number(declared)>maxBytes)
   throw new BodyReadError("BODY_TOO_LARGE_OR_MALFORMED");
 }
 const encoding=request.headers?.get("content-encoding");
 if(encoding&&encoding.toLowerCase()!=="identity")
  throw new BodyReadError("ENCODED_BODY_NOT_SUPPORTED");
 if(!request.body)return new Uint8Array();
 const reader=request.body.getReader();
 const chunks=[];
 let total=0;
 try{
  for(;;){
   const result=await reader.read();
   if(result.done)break;
   const chunk=result.value;
   if(!(chunk instanceof Uint8Array))throw new BodyReadError("INVALID_BODY_CHUNK");
   total+=chunk.byteLength;
   if(total>maxBytes)throw new BodyReadError("BODY_TOO_LARGE");
   chunks.push(chunk);
  }
 }catch(error){
  try{await reader.cancel()}catch{/* best effort: request is rejected regardless */}
  if(error instanceof BodyReadError)throw error;
  throw new BodyReadError("BODY_READ_FAILED");
 }finally{
  reader.releaseLock();
 }
 const output=new Uint8Array(total);
 let offset=0;
 for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.byteLength}
 return output;
}
export async function readBoundedJson(request,{maxBytes}={}){
 const contentType=request?.headers?.get("content-type")||"";
 if(!/^application\/json(?:;\s*charset=utf-8)?$/i.test(contentType.trim()))
  throw new BodyReadError("JSON_CONTENT_TYPE_REQUIRED");
 const bytes=await readBoundedBytes(request,{maxBytes});
 let text;
 try{text=new TextDecoder("utf-8",{fatal:true}).decode(bytes)}
 catch{throw new BodyReadError("INVALID_UTF8")}
 try{return JSON.parse(text)}
 catch{throw new BodyReadError("INVALID_JSON")}
}
