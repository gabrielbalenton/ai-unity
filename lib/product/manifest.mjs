/**
 * Static end-state product map. This is a release planning contract, not a
 * service health monitor. Capabilities cannot become operational merely by
 * editing this file; end-to-end tests and independent approvals remain required.
 */
const statuses=new Set(["local","offline","planned"]);
const areas=new Set(["Overview","Projects","Cloud","Tasks","Chat","Memory","Automations","Models","Tools","Connections"]);
const phases=new Set(["foundation","infrastructure","personal-alpha","expansion"]);
export function validateProductManifest(value){
 if(!value||typeof value!=="object"||value.schemaVersion!==1||
    value.product!=="UNITY"||value.deploymentAuthorized!==false||
    value.paidApiBudgetDefaultUsd!==0||
    !Array.isArray(value.modules)||value.modules.length<10||value.modules.length>40)
   throw Error("Invalid UNITY product manifest");
 const map=new Map();
 for(const module of value.modules){
  if(!module||typeof module.id!=="string"||!/^[a-z][a-z0-9-]{2,40}$/.test(module.id)||
    map.has(module.id)||!statuses.has(module.status)||!areas.has(module.area)||
    !phases.has(module.phase)||typeof module.title!=="string"||module.title.length<4||
    typeof module.subtitle!=="string"||!Array.isArray(module.dependencies)||
    typeof module.acceptance!=="string"||module.acceptance.length<20)
   throw Error("Invalid or duplicated module");
  map.set(module.id,module);
 }
 for(const module of value.modules){
  if(module.dependencies.some(dep=>!map.has(dep)||dep===module.id))
   throw Error("Missing or circular module dependency");
 }
 const visiting=new Set(),visited=new Set();
 function visit(id){
  if(visiting.has(id))throw Error("Cyclic module dependency");
  if(visited.has(id))return;
  visiting.add(id);
  for(const dep of map.get(id).dependencies)visit(dep);
  visiting.delete(id);visited.add(id);
 }
 for(const id of map.keys())visit(id);
 return {
  total:value.modules.length,
  local:value.modules.filter(m=>m.status==="local").length,
  discovery:value.modules.filter(m=>m.status==="offline").length,
  planned:value.modules.filter(m=>m.status==="planned").length,
  dependencyOrder:[...visited],
  deploymentAuthorized:false
 };
}
