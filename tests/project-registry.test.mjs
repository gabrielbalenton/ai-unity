import test from "node:test";
import assert from "node:assert/strict";
import {
  createProjectProfile,
  createProjectRegistry,
  validateProjectAccountBindings,
  routeProjectProfile,
  getProjectProfile
} from "../lib/infrastructure/project-registry.mjs";
import { createAccountConnectionRegistry } from "../lib/infrastructure/account-connections.mjs";

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

const accounts = createAccountConnectionRegistry([
  {
    id: "github-fpx",
    provider: "github",
    accountLabel: "FPX GitHub",
    signInMethod: "google",
    authMethod: "github_app_ref",
    secretRef: "secret:accounts/github/fpx",
    status: "ready"
  },
  {
    id: "vercel-fpx",
    provider: "vercel",
    accountLabel: "FPX Vercel",
    signInMethod: "github",
    authMethod: "api_key_ref",
    secretRef: "secret:accounts/vercel/fpx",
    status: "ready"
  },
  {
    id: "supabase-fpx",
    provider: "supabase",
    accountLabel: "FPX Supabase",
    signInMethod: "github",
    authMethod: "api_key_ref",
    secretRef: "secret:accounts/supabase/fpx",
    status: "ready"
  }
]);

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

test("project bindings resolve exact GitHub, Vercel and Supabase accounts", () => {
  const profile = createProjectProfile(fpx);
  const bound = validateProjectAccountBindings(profile, accounts);
  assert.equal(bound.bindings.github.accountLabel, "FPX GitHub");
  assert.equal(bound.bindings.vercel.connectionId, "vercel-fpx");
  assert.equal(bound.bindings.supabase.resourceId, "project:example-ref");
});

test("wrong account provider cannot satisfy a project binding", () => {
  const profile = createProjectProfile({
    ...fpx,
    resources: {
      github: { connectorId: "vercel-fpx", resourceId: "repo:wrong" }
    }
  });
  assert.throws(() => validateProjectAccountBindings(profile, accounts), /provider mismatch/);
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
