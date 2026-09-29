export type OpenApiPreview={title:string;specVersion:string;servers:string[];referenceCount:number;notice:string;
 operations:Array<{id:string;method:string;path:string;summary:string;category:string;security:string;executable:false;authorized:false}>};
export function inspectOpenApiDocument(input:unknown):OpenApiPreview;
export function inspectOpenApiJson(text:string):OpenApiPreview;
