export type Project = { id: string; name: string; description: string; createdAt: string };
export type Memory = { id: string; projectId: string; title: string; body: string; status: "draft" | "approved"; createdAt: string; updatedAt: string };
export type GitHubLink = { id: string; projectId: string; fullName: string; url: string; defaultBranch: string; checkedAt: string };
export type ChatMessage = { id:string; projectId:string; text:string; role:'user'; createdAt:string };
export type AutomationPlan = { id:string; projectId:string; title:string; trigger:"manual"|"schedule"|"event"; action:string; status:"draft"; createdAt:string; updatedAt:string };
export type {LocalTask} from "./runtime/tasks.mjs";
import type {LocalTask} from "./runtime/tasks.mjs";
export type Workspace = { version: 1; projects: Project[]; memories: Memory[]; githubLinks: GitHubLink[]; messages: ChatMessage[]; tasks: LocalTask[]; automations: AutomationPlan[] };
export type CatalogModel = { id: string; name: string; source: "OpenRouter" | "Hugging Face"; contextLength: number | null; zeroTextPrice: boolean; availableForExecution: false; note: string };
