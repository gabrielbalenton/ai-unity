const COMMAND_PREFIX=/^(?:switch\s+to|work\s+on|open|use|select)\s+(?:project\s+)?(.+?)\s*$/i;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeProjectName(value){
 if(typeof value!=="string")return "";
 return value.normalize("NFKC").trim().toLocaleLowerCase("en-US").replace(/[\s_-]+/g," ");
}

export function extractProjectCommandTarget(command){
 if(typeof command!=="string"||command.length<3||command.length>180||/[\u0000-\u001f\u007f]/.test(command))return null;
 const match=command.trim().match(COMMAND_PREFIX);
 if(!match)return null;
 const target=match[1]?.trim()||"";
 if(target.length<2||target.length>100)return null;
 return target;
}

/**
 * @typedef {{id:string,name:string}} OwnedProject
 * @typedef {{status:"resolved",project:OwnedProject,target:string}|{status:"not_found"|"ambiguous"|"invalid_command",project:null,target:string|null}} ProjectResolution
 */

/**
 * Resolve only an explicit project-switch command against the caller's already
 * owner-scoped project list. Matching is case-insensitive and separator-normalized,
 * never fuzzy. Duplicate normalized names fail closed as ambiguous.
 * @param {string} command
 * @param {OwnedProject[]} projects
 * @returns {ProjectResolution}
 */
export function resolveProjectCommand(command,projects=[]){
 const target=extractProjectCommandTarget(command);
 if(!target)return Object.freeze({status:"invalid_command",project:null,target:null});
 if(!Array.isArray(projects))throw new Error("Projects must be an array");
 const normalizedTarget=normalizeProjectName(target);
 const valid=projects.filter(item=>item&&UUID.test(item.id)&&typeof item.name==="string"&&item.name.trim().length>=2);
 const matches=valid.filter(item=>normalizeProjectName(item.name)===normalizedTarget);
 if(matches.length===0)return Object.freeze({status:"not_found",project:null,target});
 if(matches.length!==1)return Object.freeze({status:"ambiguous",project:null,target});
 return Object.freeze({status:"resolved",project:Object.freeze({id:matches[0].id,name:matches[0].name}),target});
}
