import type { Workspace } from "./types";
export function addUserMessage(workspace:Workspace,input:{id:string;projectId:string;text:string;createdAt:string}):Workspace;
export function previewProjectContext(workspace:Workspace,projectId:string,maxChars?:number):{projectId:string;memories:Array<{id:string;title:string;body:string;source:string}>;notice:string};
