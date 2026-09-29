export type PublicMcpServer = {name:string;description:string;version:string;status:string;connectable:false};
export function normalizeRegistryPage(data: unknown): {servers:PublicMcpServer[];nextCursor:string|null};
