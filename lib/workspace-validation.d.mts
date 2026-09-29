import type { Workspace } from "./types";
export function validateWorkspace(value: unknown, options?: {importMode?:boolean}): Workspace;
export function parseWorkspaceImport(text: string): Workspace;
