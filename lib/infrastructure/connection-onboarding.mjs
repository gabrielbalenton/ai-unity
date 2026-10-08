const SERVICE_ID = /^[a-z0-9][a-z0-9._-]{1,79}$/;
const ACCOUNT_ID = /^[a-z0-9][a-z0-9._:-]{2,119}$/;

const SERVICE_PLANS = Object.freeze({
  github: Object.freeze({
    category: "development",
    preferredAuth: "github_app_ref",
    signInMayUse: Object.freeze(["google", "email", "other"]),
    checks: Object.freeze(["account-identified", "repository-scope-selected", "read-permission-verified", "write-permission-explicit"])
  }),
  vercel: Object.freeze({
    category: "development",
    preferredAuth: "api_key_ref",
    signInMayUse: Object.freeze(["github", "email", "other"]),
    checks: Object.freeze(["account-identified", "team-scope-selected", "project-scope-selected", "deployment-permission-explicit"])
  }),
  supabase: Object.freeze({
    category: "development",
    preferredAuth: "api_key_ref",
    signInMayUse: Object.freeze(["github", "email", "other"]),
    checks: Object.freeze(["account-identified", "project-scope-selected", "read-only-first", "database-write-permission-explicit"])
  }),
  openrouter: Object.freeze({
    category: "model",
    preferredAuth: "api_key_ref",
    signInMayUse: Object.freeze(["google", "github", "email", "other"]),
    checks: Object.freeze(["account-identified", "credential-reference-created", "zero-paid-policy-enabled", "free-eligibility-verified-at-runtime"])
  }),
  gemini: Object.freeze({
    category: "model",
    preferredAuth: "api_key_ref",
    signInMayUse: Object.freeze(["google"]),
    checks: Object.freeze(["account-identified", "credential-reference-created", "zero-paid-policy-enabled", "free-eligibility-verified-at-runtime"])
  }),
  groq: Object.freeze({
    category: "model",
    preferredAuth: "api_key_ref",
    signInMayUse: Object.freeze(["google", "github", "email", "other"]),
    checks: Object.freeze(["account-identified", "credential-reference-created", "zero-paid-policy-enabled", "free-eligibility-verified-at-runtime"])
  }),
  mistral: Object.freeze({
    category: "model",
    preferredAuth: "api_key_ref",
    signInMayUse: Object.freeze(["google", "github", "email", "other"]),
    checks: Object.freeze(["account-identified", "credential-reference-created", "zero-paid-policy-enabled", "free-eligibility-verified-at-runtime"])
  }),
  huggingface: Object.freeze({
    category: "model",
    preferredAuth: "api_key_ref",
    signInMayUse: Object.freeze(["google", "github", "email", "other"]),
    checks: Object.freeze(["account-identified", "credential-reference-created", "zero-paid-policy-enabled", "free-eligibility-verified-at-runtime"])
  }),
  cerebras: Object.freeze({
    category: "model",
    preferredAuth: "api_key_ref",
    signInMayUse: Object.freeze(["google", "github", "email", "other"]),
    checks: Object.freeze(["account-identified", "credential-reference-created", "zero-paid-policy-enabled", "free-credit-status-verified-at-runtime"])
  })
});

export function supportedConnectionServices() {
  return Object.freeze(Object.keys(SERVICE_PLANS));
}

/**
 * Returns an inert checklist. It never creates credentials, contacts providers,
 * or treats a website sign-in method as authorization for UNITY.
 */
export function createConnectionOnboardingPlan({service, connectionId, signInMethod = "unknown"}) {
  if (!SERVICE_ID.test(service ?? "") || !ACCOUNT_ID.test(connectionId ?? "")) {
    throw new Error("Invalid connection onboarding request");
  }
  const definition = SERVICE_PLANS[service];
  if (!definition) throw new Error("Unsupported connection service");
  if (signInMethod !== "unknown" && !definition.signInMayUse.includes(signInMethod)) {
    throw new Error("Unexpected sign-in method for service");
  }

  return Object.freeze({
    service,
    connectionId,
    category: definition.category,
    preferredAuth: definition.preferredAuth,
    signInMethod,
    checks: definition.checks,
    status: "not_started",
    credentialsPresent: false,
    executable: false
  });
}

export function assessConnectionOnboarding(plan, completedChecks = []) {
  if (!plan || !SERVICE_PLANS[plan.service] || !Array.isArray(completedChecks)) {
    throw new Error("Invalid onboarding assessment");
  }
  const expected = SERVICE_PLANS[plan.service].checks;
  if (!completedChecks.every(check => expected.includes(check))) {
    throw new Error("Unknown onboarding check");
  }
  const complete = expected.every(check => completedChecks.includes(check));
  return Object.freeze({
    service: plan.service,
    connectionId: plan.connectionId,
    completedChecks: Object.freeze([...new Set(completedChecks)]),
    missingChecks: Object.freeze(expected.filter(check => !completedChecks.includes(check))),
    status: complete ? "ready_for_secure_credential_link" : "incomplete",
    executable: false
  });
}
