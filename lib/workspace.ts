import type { Workspace } from "./types";
import { parseWorkspaceImport, validateWorkspace } from "./workspace-validation.mjs";
const storageKey = "unity-personal-alpha-v1";
export function initialWorkspace(): Workspace { return { version: 1, projects: [], memories: [], githubLinks: [] }; }
export function loadWorkspace(): Workspace {
 if (typeof window === "undefined") return initialWorkspace();
 const raw = localStorage.getItem(storageKey);
 if (raw === null) return initialWorkspace();
 let value: unknown;
 try { value = JSON.parse(raw); }
 catch { throw new Error("Your existing workspace is not valid JSON. It was NOT overwritten. Please preserve your browser data."); }
 try { return validateWorkspace(value); }
 catch { throw new Error("Your stored workspace failed validation. It was NOT overwritten. Please preserve your browser data."); }
}
export function saveWorkspace(workspace: Workspace): void {
 if (typeof window !== "undefined") {
  // Validate every write so malformed data cannot silently replace a valid workspace.
  const safe = validateWorkspace(workspace);
  localStorage.setItem(storageKey, JSON.stringify(safe));
 }
}
export function previewWorkspaceImport(text: string): Workspace {
 return parseWorkspaceImport(text);
}
export function exportWorkspace(workspace: Workspace): void {
 const safe = validateWorkspace(workspace);
 const blob = new Blob([JSON.stringify(safe, null, 2)], {type:"application/json"});
 const url = URL.createObjectURL(blob);
 const anchor = document.createElement("a");
 anchor.href = url; anchor.download = "unity-workspace.json"; anchor.click();
 // Delay revocation until the browser has started downloading.
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
