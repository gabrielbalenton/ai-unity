import {createCipheriv,createDecipheriv,createHash,randomBytes} from "node:crypto";

const VERSION="v1";
const MAX_PAYLOAD_BYTES=4096;
const b64=value=>Buffer.from(value).toString("base64url");
const fromB64=value=>Buffer.from(value,"base64url");

function keyFromSecret(secret){
 if(typeof secret!=="string"||secret.length<32)throw new Error("Connection session secret is not configured securely");
 return createHash("sha256").update(secret).digest();
}

export function sealConnectionAuthSession(session,secret){
 if(!session||typeof session!=="object")throw new Error("Invalid connection session");
 const plaintext=Buffer.from(JSON.stringify(session),"utf8");
 if(plaintext.byteLength===0||plaintext.byteLength>MAX_PAYLOAD_BYTES)throw new Error("Connection session is too large");
 const iv=randomBytes(12);
 const cipher=createCipheriv("aes-256-gcm",keyFromSecret(secret),iv);
 cipher.setAAD(Buffer.from(VERSION));
 const encrypted=Buffer.concat([cipher.update(plaintext),cipher.final()]);
 const tag=cipher.getAuthTag();
 return `${VERSION}.${b64(iv)}.${b64(encrypted)}.${b64(tag)}`;
}

export function openConnectionAuthSession(token,secret){
 if(typeof token!=="string")throw new Error("Invalid connection session token");
 const parts=token.split(".");
 if(parts.length!==4||parts[0]!==VERSION)throw new Error("Invalid connection session token");
 let iv,encrypted,tag;
 try{
  iv=fromB64(parts[1]);encrypted=fromB64(parts[2]);tag=fromB64(parts[3]);
 }catch{throw new Error("Invalid connection session token")}
 if(iv.length!==12||tag.length!==16||encrypted.length===0||encrypted.length>MAX_PAYLOAD_BYTES+32)
  throw new Error("Invalid connection session token");
 try{
  const decipher=createDecipheriv("aes-256-gcm",keyFromSecret(secret),iv);
  decipher.setAAD(Buffer.from(VERSION));
  decipher.setAuthTag(tag);
  const plaintext=Buffer.concat([decipher.update(encrypted),decipher.final()]);
  const value=JSON.parse(plaintext.toString("utf8"));
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error();
  return value;
 }catch{
  throw new Error("Connection session token could not be verified");
 }
}

export const CONNECTION_AUTH_COOKIE=Object.freeze({
 name:"__Host-unity-connection-auth",
 httpOnly:true,
 secure:true,
 sameSite:"lax",
 path:"/",
 maxAge:15*60
});
