export type Project = { id: string; name: string; description: string; createdAt: string };
export type Memory = { id: string; projectId: string; title: string; body: string; status: "draft" | "approved"; createdAt: string; updatedAt: string };
export type GitHubLink = { id: string; projectId: string; fullName: string; url: string; defaultBranch: string; checkedAt: string };
export type Workspace = { version: 1; projects: Project[]; memories: Memory[]; githubLinks: GitHubLink[] };
export type CatalogModel = { id: string; name: string; source: "OpenRouter" | "Hugging Face"; contextLength: number | null; zeroTextPrice: boolean; availableForExecution: false; note: string };
