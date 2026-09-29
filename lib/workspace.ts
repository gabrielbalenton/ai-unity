import type { Workspace } from "./types";
const storageKey = "unity-personal-alpha-v1";
export function initialWorkspace(): Workspace { return { version: 1, projects: [], memories: [] }; }
export function loadWorkspace(): Workspace {
 if (typeof window === "undefined") return initialWorkspace();
 try {
  const parsed: unknown = JSON.parse(localStorage.getItem(storageKey) || "null");
  if (parsed && typeof parsed === "object" && "version" in parsed && parsed.version === 1 &&
      "projects" in parsed && Array.isArray(parsed.projects) && "memories" in parsed && Array.isArray(parsed.memories)) {
   return parsed as Workspace;
  }
 } catch { /* Corrupt or inaccessible local data; return fresh workspace. */ }
 return initialWorkspace();
}
export function saveWorkspace(workspace: Workspace): void {
 if (typeof window !== "undefined") localStorage.setItem(storageKey, JSON.stringify(workspace));
}
export function exportWorkspace(workspace: Workspace): void {
 const blob = new Blob([JSON.stringify(workspace, null, 2)], {type:"application/json"});
 const url = URL.createObjectURL(blob);
 const anchor = document.createElement("a");
 anchor.href = url; anchor.download = "unity-workspace.json"; anchor.click();
 URL.revokeObjectURL(url);
}
