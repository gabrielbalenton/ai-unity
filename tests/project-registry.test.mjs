import test from "node:test";
import assert from "node:assert/strict";
import {
  createProjectProfile,
  createProjectRegistry,
  routeProjectProfile,
  getProjectProfile
} from "../lib/infrastructure/project-registry.mjs";

const fpx = {
  id: "fpx",
  name: "Forest Products Exchange",
  resources: {
    github: { connectorId: "github-fpx", resourceId: "repo:FPXTeam/fpx-website" },
    vercel: { connectorId: "vercel-fpx", resourceId: "project:fpx-website" },
    supabase: { connectorId: "supabase-fpx", resourceId: "project:example-ref" }
  },
  productionUrl: "https://www.fpx.nz/"
};

test("project profile maps multiple providers without storing credentials", () => {
  const profile = createProjectProfile(fpx);
  assert.equal(profile.resources.github.connectorId, "github-fpx");
  assert.equal(profile.resources.vercel.resourceId, "project:fpx-website");
  assert.equal(profile.productionUrl, "https://www.fpx.nz/");
  assert.equal(JSON.stringify(profile).includes("accessToken"), false);
});

test("credentials are rejected from project resources", () => {
  assert.throws(() => createProjectProfile({
    ...fpx,
    resources: {
      github: { connectorId: "github-fpx", resourceId: "repo:fpx", token: "should-never-live-here" }
    }
  }), /Credentials do not belong/);
});

test("registry rejects duplicate project identities", () => {
  assert.throws(() => createProjectRegistry([fpx, fpx]), /Duplicate project id/);
});

test("routing returns exact account connector and resource references", () => {
  const profile = createProjectProfile(fpx);
  const route = routeProjectProfile(profile, "development");
  assert.equal(route.projectId, "fpx");
  assert.equal(route.connections.github, "github-fpx");
  assert.equal(route.resources.github, "repo:FPXTeam/fpx-website");
  assert.equal(route.connections.vercel, "vercel-fpx");
});

test("unknown project cannot silently fall back to another account", () => {
  const registry = createProjectRegistry([fpx]);
  assert.throws(() => getProjectProfile(registry, "pebble"), /Unknown project/);
});
