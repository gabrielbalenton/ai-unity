import test from "node:test";
import assert from "node:assert/strict";
import {
  supportedConnectionServices,
  createConnectionOnboardingPlan,
  assessConnectionOnboarding
} from "../lib/infrastructure/connection-onboarding.mjs";

test("supported services include development and free-model providers", () => {
  const services = supportedConnectionServices();
  for (const expected of ["github", "vercel", "supabase", "openrouter", "gemini", "groq", "mistral", "huggingface", "cerebras"]) {
    assert.equal(services.includes(expected), true);
  }
});

test("GitHub-created Vercel account remains a Vercel connection", () => {
  const plan = createConnectionOnboardingPlan({
    service: "vercel",
    connectionId: "vercel-fpx",
    signInMethod: "github"
  });
  assert.equal(plan.service, "vercel");
  assert.equal(plan.signInMethod, "github");
  assert.equal(plan.preferredAuth, "api_key_ref");
  assert.equal(plan.executable, false);
});

test("Google login does not count as Gemini API authorization", () => {
  const plan = createConnectionOnboardingPlan({
    service: "gemini",
    connectionId: "gemini-main",
    signInMethod: "google"
  });
  assert.equal(plan.signInMethod, "google");
  assert.equal(plan.credentialsPresent, false);
  assert.equal(plan.status, "not_started");
});

test("onboarding stays incomplete until every required safety check is done", () => {
  const plan = createConnectionOnboardingPlan({ service: "openrouter", connectionId: "openrouter-main" });
  const assessment = assessConnectionOnboarding(plan, ["account-identified", "credential-reference-created"]);
  assert.equal(assessment.status, "incomplete");
  assert.equal(assessment.missingChecks.includes("zero-paid-policy-enabled"), true);
  assert.equal(assessment.executable, false);
});

test("completed onboarding is only ready for secure credential linking, not execution", () => {
  const plan = createConnectionOnboardingPlan({ service: "supabase", connectionId: "supabase-fpx", signInMethod: "github" });
  const assessment = assessConnectionOnboarding(plan, [
    "account-identified",
    "project-scope-selected",
    "read-only-first",
    "database-write-permission-explicit"
  ]);
  assert.equal(assessment.status, "ready_for_secure_credential_link");
  assert.equal(assessment.executable, false);
});

test("unsupported services and unexpected sign-in methods fail closed", () => {
  assert.throws(() => createConnectionOnboardingPlan({
    service: "unknown-provider",
    connectionId: "unknown-main"
  }), /Unsupported/);
  assert.throws(() => createConnectionOnboardingPlan({
    service: "gemini",
    connectionId: "gemini-main",
    signInMethod: "github"
  }), /Unexpected/);
});
