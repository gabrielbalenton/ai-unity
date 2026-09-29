"use client";
import {useState} from "react";
import {inspectOpenApiJson,type OpenApiPreview} from "@/lib/connectors/openapi.mjs";
/** Untrusted API specs remain local to the browser and are never executed. */
export default function OpenApiDesigner(){
 const [source,setSource]=useState("");
 const [preview,setPreview]=useState<OpenApiPreview|null>(null);
 const [error,setError]=useState("");
 function inspect(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  try{setPreview(inspectOpenApiJson(source));setError("")}
  catch(e){setPreview(null);setError(e instanceof Error?e.message:"Invalid specification")}
 }
 return <section className="panel">
  <h2>API capability designer</h2>
  <p className="muted">Paste an OpenAPI 3.0/3.1 <strong>JSON</strong> specification to inspect endpoints without connecting anything. Do not paste live API keys or confidential specifications into this prototype.</p>
  <form onSubmit={inspect}>
   <label>OpenAPI JSON<textarea className="large" value={source} maxLength={400000}
    onChange={e=>{setSource(e.target.value);setPreview(null);setError("")}}
    placeholder={'{"openapi":"3.1.0","info":{"title":"Example"},"paths":{"/items":{"get":{"summary":"List items"}}}}'} /></label>
   <button className="primary" disabled={!source.trim()}>Analyze API specification locally</button>
  </form>
  {error&&<p className="warning" role="alert">{error}</p>}
  {preview&&<div className="entry">
   <h2>{preview.title}</h2>
   <p className="muted">OpenAPI {preview.specVersion} · {preview.operations.length} operations · {preview.referenceCount} skipped referenced paths</p>
   <p className="warning">{preview.notice}</p>
   {preview.servers.length>0&&<p>Declared HTTPS servers (unverified): {preview.servers.join(", ")}</p>}
   <div className="model-list">
    {preview.operations.length===0?<p>No directly described operations found.</p>:preview.operations.map((o,i)=>
      <article className="entry" key={i}>
       <div className="entry-head"><strong>{o.method} {o.path}</strong><span className="pill">{o.category}</span></div>
       <p>{o.summary||o.id}</p><small>Security: {o.security} · Discovery-only · Not authorized</small>
      </article>)}
   </div>
  </div>}
 </section>;
}
