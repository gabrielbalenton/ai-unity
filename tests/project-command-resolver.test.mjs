import test from "node:test";
import assert from "node:assert/strict";
import {extractProjectCommandTarget,normalizeProjectName,resolveProjectCommand} from "../lib/infrastructure/project-command-resolver.mjs";

const FPX={id:"11111111-1111-4111-8111-111111111111",name:"FPX"};
const PEBBLE={id:"22222222-2222-4222-8222-222222222222",name:"Pebble"};

test("explicit project commands resolve exact owned project names",()=>{
 assert.equal(extractProjectCommandTarget("Switch to FPX"),"FPX");
 assert.equal(extractProjectCommandTarget("Work on project Pebble"),"Pebble");
 assert.equal(resolveProjectCommand("work on pebble",[FPX,PEBBLE]).project.id,PEBBLE.id);
});

test("name normalization is case insensitive and separator tolerant but not fuzzy",()=>{
 assert.equal(normalizeProjectName("  HAVOC_Guild-Ops  "),"havoc guild ops");
 assert.equal(resolveProjectCommand("open fpx",[FPX]).status,"resolved");
 assert.equal(resolveProjectCommand("open fp",[FPX]).status,"not_found");
});

test("vague commands and raw names fail closed",()=>{
 for(const command of ["FPX","switch project","do something with FPX","switch to *"]){
  assert.equal(resolveProjectCommand(command,[FPX]).status,"invalid_command");
 }
});

test("duplicate normalized names are ambiguous instead of silently choosing one",()=>{
 const duplicate={id:"33333333-3333-4333-8333-333333333333",name:"fpx"};
 assert.equal(resolveProjectCommand("switch to FPX",[FPX,duplicate]).status,"ambiguous");
});

test("malformed project rows cannot be selected",()=>{
 const bad=[{id:"not-a-uuid",name:"FPX"},{id:PEBBLE.id,name:""}];
 assert.equal(resolveProjectCommand("switch to FPX",bad).status,"not_found");
});
