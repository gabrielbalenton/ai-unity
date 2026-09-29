import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
const paths=execFileSync("git",["ls-files","-z"],{encoding:"utf8"}).split("\0").filter(Boolean);
const prohibited=/^(?:\.env(?:\.|$)|.*\.(?:pem|p12|pfx|key)|id_rsa(?:\.pub)?)$/i;
const patterns=[
 {type:"GitHub PAT",regex:/\bgh[pousr]_[A-Za-z0-9]{30,}\b/},
 {type:"Supabase secret",regex:/\bsb_secret_[A-Za-z0-9_-]{12,}\b/},
 {type:"OpenAI-style secret",regex:/\bsk-[A-Za-z0-9_-]{32,}\b/},
 {type:"private key PEM",regex:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/}
];
const failures=[];
for (const path of paths) {
 const basename=path.split("/").pop();
 if(prohibited.test(basename) && basename!==".env.example") {
  failures.push(path+": prohibited tracked credential file");continue;
 }
 if (!/\.(?:[cm]?js|tsx?|md|json|ya?ml|sql|env|example|txt)$/.test(path))continue;
 let content;
 try {content=readFileSync(path,"utf8");}catch {continue}
 for(const pattern of patterns) {
  if(pattern.regex.test(content))failures.push(path+": possible "+pattern.type);
 }
}
if(failures.length){
 process.stderr.write("Repository safety check failed:\n"+failures.join("\n")+"\n");
 process.exitCode=1;
}else process.stdout.write("Repository safety check passed (heuristic scan; not a full secret audit).\n");
