import {existsSync} from "node:fs";
import {inspectConfiguration,assertNoClientSecretExposure} from "../lib/infrastructure/config.mjs";
import {validateProductManifest} from "../lib/product/manifest.mjs";
import {validateReleaseGates} from "../lib/product/release-gates.mjs";
import {readFileSync} from "node:fs";
const files=[
 "AGENTS.md","SECURITY.md","docs/REPOSITORY_SECURITY.md","docs/ARCHITECTURE.md","docs/ROOM_MODEL.md","docs/ENDGAME_ARCHITECTURE.md",
 "docs/FEATURE_MATRIX.md","docs/DESIGN_SYSTEM.md","docs/APPROVED_UI_HANDOFF.md","config/system-manifest.json","config/release-gates.json",
 "docs/DECISIONS.md","docs/DEPLOYMENT_CHECKLIST.md",
 "supabase/migrations/0001_core.sql","supabase/schema-proposals/runtime.sql",
 "app/api/health/route.ts","lib/runtime/policy.mjs",
 "lib/infrastructure/config.mjs","lib/infrastructure/audit.mjs",
 "lib/security/bounded-body.mjs",
 "lib/runtime/worker-queue.mjs","lib/runtime/dispatch-preflight.mjs",
 "lib/ai/protocol.mjs","lib/ai/packet.mjs","lib/ai/stream.mjs","lib/ai/fallback.mjs",
 "docs/DURABLE_EXECUTION.md",".github/CODEOWNERS","scripts/create-recovery-bundle.sh","next.config.mjs","vercel.json","public/unity-brand/unity-symbol.svg","public/unity-brand/terrain-light.svg",
 "supabase/schema-proposals/execution-queue.sql"
];
const missing=files.filter(p=>!existsSync(p));
const config=inspectConfiguration(process.env);
const manifest=validateProductManifest(JSON.parse(readFileSync("config/system-manifest.json","utf8")));
const releaseGates=validateReleaseGates(JSON.parse(readFileSync("config/release-gates.json","utf8")));
let clientEnvSafe=true;
try{assertNoClientSecretExposure(process.env)}catch{clientEnvSafe=false}
const result={
 stage:"repository-development",
 moduleManifest:manifest,
 releaseGates,
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
 previewCodeReady:missing.length===0&&clientEnvSafe,
 productionActivationReady:false,
 deploymentReady:false,
 configurationStatus:config
};
process.stdout.write(JSON.stringify(result,null,2)+"\n");
if(missing.length || !clientEnvSafe)process.exitCode=1;
