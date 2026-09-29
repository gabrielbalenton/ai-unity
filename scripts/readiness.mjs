import {existsSync} from "node:fs";
import {inspectConfiguration,assertNoClientSecretExposure} from "../lib/infrastructure/config.mjs";
const files=[
 "AGENTS.md","docs/ARCHITECTURE.md","docs/FEATURE_MATRIX.md",
 "docs/DECISIONS.md","docs/DEPLOYMENT_CHECKLIST.md",
 "supabase/migrations/0001_core.sql","supabase/schema-proposals/runtime.sql",
 "app/api/health/route.ts","lib/runtime/policy.mjs",
 "lib/infrastructure/config.mjs","lib/infrastructure/audit.mjs"
];
const missing=files.filter(p=>!existsSync(p));
const config=inspectConfiguration(process.env);
let clientEnvSafe=true;
try{assertNoClientSecretExposure(process.env)}catch{clientEnvSafe=false}
const result={
 stage:"repository-development",
 sourceFilesPresent:missing.length===0,
 missingFiles:missing,
 clientEnvironmentNamingSafe:clientEnvSafe,
 verifiedOperationalAuth:false,
 verifiedLiveModelInference:false,
 verifiedPrivateGithubIntegration:false,
 verifiedExternalToolExecution:false,
 verifiedPersistentMemory:false,
 verifiedBackupRestore:false,
 verifiedDeployment:false,
 deploymentReady:false,
 configurationStatus:config
};
process.stdout.write(JSON.stringify(result,null,2)+"\n");
if(missing.length || !clientEnvSafe)process.exitCode=1;
