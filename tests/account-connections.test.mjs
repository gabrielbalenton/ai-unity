import test from "node:test";
import assert from "node:assert/strict";
import {
  createAccountConnection,
  createAccountConnectionRegistry,
  resolveAccountConnection,
  summarizeAccountConnections
} from "../lib/infrastructure/account-connections.mjs";

test("multiple accounts for one provider remain distinct", () => {
  const registry = createAccountConnectionRegistry([
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
      id: "vercel-pebble",
      provider: "vercel",
      accountLabel: "Pebble Vercel",
      signInMethod: "github",
      authMethod: "api_key_ref",
      secretRef: "secret:accounts/vercel/pebble",
      status: "ready"
    }
  ]);

  assert.equal(resolveAccountConnection(registry, { connectionId: "vercel-fpx", provider: "vercel" }).accountLabel, "FPX Vercel");
  assert.equal(resolveAccountConnection(registry, { connectionId: "vercel-pebble", provider: "vercel" }).accountLabel, "Pebble Vercel");
});

test("sign-in method is descriptive and does not replace authorization", () => {
  assert.throws(() => createAccountConnection({
    id: "gemini-main",
    provider: "gemini",
    accountLabel: "Google AI Studio",
    signInMethod: "google",
    authMethod: "api_key_ref",
    status: "ready"
  }), /secret reference/);
});

test("unconfigured login metadata may exist without credentials", () => {
  const record = createAccountConnection({
    id: "supabase-client-a",
    provider: "supabase",
    accountLabel: "Client A Supabase",
    signInMethod: "github",
    status: "unconfigured"
  });
  assert.equal(record.signInMethod, "github");
  assert.equal(record.secretRef, null);
});

test("wrong provider cannot borrow another connection", () => {
  const registry = createAccountConnectionRegistry([
    {
      id: "github-fpx",
      provider: "github",
      accountLabel: "FPX GitHub",
      signInMethod: "google",
      authMethod: "github_app_ref",
      secretRef: "secret:accounts/github/fpx",
      status: "ready"
    }
  ]);
  assert.throws(() => resolveAccountConnection(registry, {
    connectionId: "github-fpx",
    provider: "vercel"
  }), /provider mismatch/);
});

test("revoked account cannot be resolved", () => {
  const registry = createAccountConnectionRegistry([
    {
      id: "groq-main",
      provider: "groq",
      accountLabel: "Groq Main",
      signInMethod: "google",
      authMethod: "api_key_ref",
      secretRef: "secret:accounts/groq/main",
      status: "revoked"
    }
  ]);
  assert.throws(() => resolveAccountConnection(registry, {
    connectionId: "groq-main",
    provider: "groq"
  }), /unavailable/);
});

test("client summary never includes secret references", () => {
  const registry = createAccountConnectionRegistry([
    {
      id: "openrouter-main",
      provider: "openrouter",
      accountLabel: "OpenRouter Main",
      authMethod: "api_key_ref",
      secretRef: "secret:accounts/openrouter/main",
      status: "ready"
    }
  ]);
  const summary = summarizeAccountConnections(registry);
  assert.equal(summary[0].configured, true);
  assert.equal("secretRef" in summary[0], false);
  assert.equal("externalAccountId" in summary[0], false);
});
