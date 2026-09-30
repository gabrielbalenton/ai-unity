import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";

const paths=execFileSync("git",["ls-files","-z"],{encoding:"utf8"}).split("\0").filter(Boolean);
const prohibited=/^(?:\.env(?:\.|$)|.*\.(?:pem|p12|pfx|key)|id_rsa(?:\.pub)?|credentials\.json|service-account.*\.json)$/i;
const patterns=[
 {type:"GitHub token",regex:/\bgh[pousr]_[A-Za-z0-9]{30,}\b/},
 {type:"Supabase secret",regex:/\bsb_secret_[A-Za-z0-9_-]{12,}\b/},
 {type:"OpenAI-style secret",regex:/\bsk-[A-Za-z0-9_-]{32,}\b/},
 {type:"AWS access key",regex:/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/},
 {type:"Google API key",regex:/\bAIza[0-9A-Za-z_-]{30,}\b/},
 {type:"Slack token",regex:/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/},
 {type:"Stripe live secret",regex:/\bsk_live_[A-Za-z0-9]{16,}\b/},
 {type:"npm token",regex:/\bnpm_[A-Za-z0-9]{30,}\b/},
 {type:"database URL with password",regex:/\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:@/]+:[^\s@/]+@/i},
 {type:"private key PEM",regex:/-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/}
];
const failures=[];

for(const path of paths){
 const basename=path.split("/").pop();
 if(prohibited.test(basename)&&basename!==".env.example"){
  failures.push(path+": prohibited tracked credential file");
  continue;
 }
 if(!/\.(?:[cm]?js|tsx?|md|json|ya?ml|sql|env|example|txt|sh)$/.test(path))continue;
 let content;
 try{content=readFileSync(path,"utf8")}catch{continue}
 for(const pattern of patterns){
  if(pattern.regex.test(content))failures.push(path+": possible "+pattern.type);
 }
 if(path.startsWith(".github/workflows/")){
  if(/\bpull_request_target\s*:/.test(content))
   failures.push(path+": pull_request_target is prohibited without a dedicated security review");
  if(/permissions:\s*write-all/.test(content))
   failures.push(path+": broad GitHub Actions write-all permission is prohibited");
  if(/secrets:\s*inherit/.test(content))
   failures.push(path+": inherited workflow secrets are prohibited");
  if(/(?:curl|wget)[^\n|;]*(?:\||&&)\s*(?:bash|sh)\b/.test(content))
   failures.push(path+": remote script piping into a shell is prohibited");
 }
}

if(failures.length){
 process.stderr.write("Repository safety check failed:\n"+failures.join("\n")+"\n");
 process.exitCode=1;
}else{
 process.stdout.write("Repository safety check passed (defense-in-depth heuristic scan; GitHub push protection and secret scanning remain required).\n");
}
