/**
 * Provider-neutral low-level HTTP transport.
 * IMPORTANT: This is NOT an authorized dispatcher or public API endpoint.
 * Only a server-side service that verifies user/project scope, fresh entitlement,
 * account quotas and exact budget limits may ever call executeTransport.
 */
const endpoints = Object.freeze({
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  huggingface: "https://router.huggingface.co/v1/chat/completions"
});
const modelId = /^[a-zA-Z0-9_.-]{1,100}\/[a-zA-Z0-9_.:-]{1,150}$/;
export function validateChatRequest(request) {
  const {provider, model, messages, maxTokens = 512} = request || {};
  if (!Object.hasOwn(endpoints, provider) || typeof model !== "string" || !modelId.test(model) ||
      !Array.isArray(messages) || messages.length === 0 || messages.length > 30 ||
      !messages.every(m => m && ["system", "user", "assistant"].includes(m.role) &&
        typeof m.content === "string" && m.content.trim().length > 0 && m.content.length <= 16000) ||
      !Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 2048)
    throw Error("Invalid provider chat request");
  return {provider, model, messages: messages.map(m => ({role:m.role,content:m.content})), maxTokens};
}
export function prepareChatHttp({apiKey,siteUrl,...request}) {
  const safe = validateChatRequest(request);
  if (typeof apiKey !== "string" || apiKey.trim().length < 12 || /[\r\n]/.test(apiKey))
    throw Error("Provider credential unavailable");
  const headers = {"Authorization":"Bearer " + apiKey,"Content-Type":"application/json","Accept":"application/json"};
  if (safe.provider === "openrouter" && typeof siteUrl === "string" &&
      /^https:\/\/[a-zA-Z0-9.-]+(?::[0-9]+)?\/?$/.test(siteUrl))
    headers["HTTP-Referer"] = siteUrl;
  return Object.freeze({
    provider:safe.provider, model:safe.model, url:endpoints[safe.provider],
    options:{
      method:"POST",redirect:"error",headers,
      body:JSON.stringify({model:safe.model,messages:safe.messages,max_tokens:safe.maxTokens,stream:false})
    }
  });
}
export function normalizeChatResult(raw,provider,model) {
  const choice = raw?.choices?.[0];
  if (typeof choice?.message?.content !== "string" || choice.message.content.length > 250000)
    throw Error("Invalid provider chat result");
  const usage = raw?.usage;
  const safeUsage = Number.isSafeInteger(usage?.prompt_tokens) && usage.prompt_tokens >= 0 &&
    Number.isSafeInteger(usage?.completion_tokens) && usage.completion_tokens >= 0
    ? {inputTokens:usage.prompt_tokens,outputTokens:usage.completion_tokens} : null;
  return {provider,model,text:choice.message.content,usage:safeUsage,
    finishReason:typeof choice.finish_reason === "string" ? choice.finish_reason : null,
    independentlyVerified:false};
}
export async function executeTransport(request,{fetcher=fetch,timeoutMs=15000}={}) {
  if (!request || !Object.hasOwn(endpoints,request.provider) ||
      request.url !== endpoints[request.provider] || !Number.isInteger(timeoutMs) ||
      timeoutMs < 1000 || timeoutMs > 30000) throw Error("Invalid provider transport");
  let response;
  try {
    response = await fetcher(request.url,{...request.options,signal:AbortSignal.timeout(timeoutMs)});
  } catch {
    throw Error("Provider unavailable");
  }
  if (!response?.ok) throw Error("Provider request rejected");
  // Limit server memory when reading text from a remote provider.
  let bytes=0; const chunks=[];
  try {
    if (response.body?.getReader) {
      const reader=response.body.getReader();
      try {
        for (;;) {
          const {value,done}=await reader.read();
          if(done)break;
          bytes+=value.length;
          if(bytes>550000)throw Error("Provider result too large");
          chunks.push(value);
        }
      } finally {reader.releaseLock();}
    } else {
      const text=await response.text();
      const value=new TextEncoder().encode(text);
      if(value.length>550000)throw Error("Provider result too large");
      chunks.push(value);bytes=value.length;
    }
    const joined=new Uint8Array(bytes);let offset=0;
    for(const part of chunks){joined.set(part,offset);offset+=part.length;}
    return normalizeChatResult(JSON.parse(new TextDecoder().decode(joined)),request.provider,request.model);
  } catch {
    throw Error("Provider output unavailable or invalid");
  }
}
