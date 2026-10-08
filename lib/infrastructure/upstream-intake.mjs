const NONEMPTY = value => typeof value === "string" && value.trim().length > 0;

const VALID_REVIEW = new Set(["required", "verified"]);
const VALID_PROMOTION = new Set(["blocked", "reviewed", "approved"]);

export function validateUpstreamSource(source) {
  const errors = [];

  if (!source || typeof source !== "object") return { valid: false, errors: ["Source must be an object"] };
  if (!NONEMPTY(source.id)) errors.push("Missing source id");
  if (!NONEMPTY(source.name)) errors.push("Missing source name");
  if (!NONEMPTY(source.repository) || !source.repository.includes("/")) errors.push("Repository must use owner/name form");
  if (!NONEMPTY(source.role)) errors.push("Missing source role");
  if (!Array.isArray(source.capabilities) || source.capabilities.length === 0) errors.push("At least one capability is required");
  if (!Array.isArray(source.unityTargets) || source.unityTargets.length === 0) errors.push("At least one UNITY target is required");
  if (!Array.isArray(source.restrictedPaths)) errors.push("restrictedPaths must be an array");
  if (!VALID_REVIEW.has(source.licenseReview)) errors.push("licenseReview must be required or verified");
  if (!VALID_REVIEW.has(source.dependencyReview)) errors.push("dependencyReview must be required or verified");
  if (!VALID_PROMOTION.has(source.promotionState)) errors.push("Invalid promotionState");

  return { valid: errors.length === 0, errors };
}

export function canPromoteUpstreamSource(source, { testsPassed = false, capabilityMapApproved = false } = {}) {
  const validation = validateUpstreamSource(source);
  if (!validation.valid) return { allowed: false, reason: validation.errors.join("; ") };
  if (source.licenseReview !== "verified") return { allowed: false, reason: "License review is not verified" };
  if (source.dependencyReview !== "verified") return { allowed: false, reason: "Dependency review is not verified" };
  if (source.promotionState !== "approved") return { allowed: false, reason: "Source has not been approved for promotion" };
  if (!capabilityMapApproved) return { allowed: false, reason: "Capability mapping has not been approved" };
  if (!testsPassed) return { allowed: false, reason: "Required tests have not passed" };
  return { allowed: true, reason: "Upstream source is eligible for controlled promotion" };
}

export function isRestrictedPath(source, path) {
  if (!source || !Array.isArray(source.restrictedPaths) || !NONEMPTY(path)) return true;
  return source.restrictedPaths.some(pattern => {
    if (pattern.endsWith("/**")) return path === pattern.slice(0, -3) || path.startsWith(pattern.slice(0, -2));
    return path === pattern;
  });
}
