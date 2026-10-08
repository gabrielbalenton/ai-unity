import test from "node:test";
import assert from "node:assert/strict";
import { createProviderRecord, createProviderRegistry, planProviderOrder } from "../lib/ai/provider-registry.mjs";

test("provider records store secret references, never plaintext credentials", () => {
  const record = createProviderRecord({
    id: "openrouter",
    displayName: "OpenRouter",
    secretRef: "secret:providers/openrouter",
    status: "ready",
    capabilities: ["chat"],
    priority: 10
  });
  assert.equal(record.secretRef, "secret:providers/openrouter");
  assert.equal(record.zeroPaidOnly, true);
});

test("plaintext-like values cannot be used as provider secret refs", () => {
  assert.throws(() => createProviderRecord({
    id: "google",
    displayName: "Google AI Studio",
    secretRef: "plain-text-value-not-a-secret-reference",
    status: "ready"
  }), /secret reference/);
});

test("provider order excludes unconfigured, exhausted and disabled providers", () => {
  const registry = createProviderRegistry([
    { id: "openrouter", displayName: "OpenRouter", secretRef: "secret:providers/openrouter", status: "ready", priority: 20 },
    { id: "gemini", displayName: "Google AI Studio", secretRef: "secret:providers/gemini", status: "ready", priority: 10 },
    { id: "groq", displayName: "Groq", secretRef: "secret:providers/groq", status: "rate_limited", priority: 1 },
    { id: "mistral", displayName: "Mistral", status: "unconfigured", priority: 5 },
    { id: "huggingface", displayName: "Hugging Face", secretRef: "secret:providers/huggingface", status: "exhausted", priority: 2 }
  ]);
  const plan = planProviderOrder({ registry, capability: "chat" });
  assert.deepEqual(plan.providers.map(item => item.providerId), ["gemini", "openrouter"]);
  assert.equal(plan.executionEnabled, false);
});

test("free status is not inferred from a model or provider name", () => {
  const record = createProviderRecord({
    id: "openrouter",
    displayName: "OpenRouter",
    models: [{ id: "some-free-looking-model:free", capabilities: ["chat"] }]
  });
  assert.equal(record.models[0].freeEligibilityVerified, false);
  assert.equal(record.models[0].estimatedPaidUsd, null);
});

test("duplicate provider identities fail closed", () => {
  assert.throws(() => createProviderRegistry([
    { id: "openrouter", displayName: "OpenRouter" },
    { id: "openrouter", displayName: "OpenRouter duplicate" }
  ]), /Duplicate provider/);
});
