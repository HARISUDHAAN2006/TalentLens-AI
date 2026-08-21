const ANALYSIS_VERSION = "local-rules-v1";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findEvidenceExcerpt(text, requirement, partial = false) {
  const lines = (text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const terms = partial ? [requirement.split(/\s+/)[0]] : requirement.split(/\s+or\s+/i);
  const matcher = new RegExp(terms.map((term) => escapeRegExp(term.trim())).join("|"), "i");
  const line = lines.find((candidate) => matcher.test(candidate));
  return line ? line.slice(0, 220) : null;
}

function evidenceFor(requirement, category, status, text, partial = false) {
  const excerpt = status === "insufficient-evidence" ? null : findEvidenceExcerpt(text, requirement, partial);
  const confidence = status === "matched" ? "high" : status === "partial" ? "medium" : "low";
  return {
    requirement,
    category,
    status,
    confidence,
    evidence: excerpt ? [{ source: "resume", section: "detected text", excerpt }] : [],
  };
}

export function buildRequirementEvidence(text, job, skillsMatched, skillsPartial, skillsMissing) {
  const matched = new Set(skillsMatched);
  const partial = new Set(skillsPartial);
  const required = (job.requiredSkills || []).map((requirement) => evidenceFor(
    requirement,
    "must-have",
    matched.has(requirement) ? "matched" : partial.has(requirement) ? "partial" : "insufficient-evidence",
    text,
    partial.has(requirement),
  ));
  const preferred = (job.preferredSkills || []).map((requirement) => evidenceFor(
    requirement,
    "preferred",
    findEvidenceExcerpt(text, requirement) ? "matched" : "insufficient-evidence",
    text,
  ));
  return [...required, ...preferred];
}

export function buildAnalysisMetadata() {
  return {
    version: ANALYSIS_VERSION,
    method: "deterministic requirement matching and weighted scoring",
    generatedAt: new Date().toISOString(),
    limitations: [
      "Evidence is extracted from readable resume text only.",
      "Semantic equivalence and protected characteristics are not inferred by this local analyzer.",
    ],
  };
}

export { ANALYSIS_VERSION };
