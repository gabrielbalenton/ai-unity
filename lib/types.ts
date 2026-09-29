export type Project = { id: string; name: string; description: string; createdAt: string };
export type Memory = { id: string; projectId: string; title: string; body: string; status: "draft" | "approved"; createdAt: string; updatedAt: string };
export type Workspace = { version: 1; projects: Project[]; memories: Memory[] };
export type CatalogModel = { id: string; name: string; contextLength: number | null; zeroTextPrice: boolean };
