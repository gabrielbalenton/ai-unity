import type {Workspace} from "../types";
export type KnowledgeGraphNode={id:string;type:"project"|"knowledge"|"task"|"source";label:string;status:string};
export type KnowledgeGraphEdge={from:string;to:string;relation:string};
export function buildKnowledgeGraph(workspace:Workspace,options?:{projectId?:string|null;maxNodes?:number}):{
 nodes:KnowledgeGraphNode[];edges:KnowledgeGraphEdge[];truncated:boolean;notice:string;
};
