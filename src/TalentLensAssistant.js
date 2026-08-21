// TalentLensAssistant.js
//
// A fully custom, rule-based conversational engine for the TalentLens AI
// recruiting assistant. There is no external API call and no LLM here —
// this is pattern-matching intent detection + entity extraction against
// your live candidate/job data, with a little conversational memory (so
// "what about her gaps?" resolves to whoever you were just discussing)
// and randomized phrasing so it doesn't sound like the same three
// canned replies over and over.
//
// HOW TO USE
//   import { createAssistantEngine } from "./TalentLensAssistant";
//   const engine = createAssistantEngine();
//   const reply = engine.ask("who has Kubernetes?", candidatesForThisJob, job);
//   // reply => { text: "...", list?: ["...", "..."] }
//
// The engine keeps a tiny bit of memory (last candidate / skill discussed)
// inside the object returned by createAssistantEngine(), so create ONE
// engine per conversation (e.g. with useRef in React) rather than a new
// one on every message.

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function normalizeText(s) {
  return (s || "").toLowerCase().trim();
}

// Mirrors the weighting used in the main scoring engine, duplicated here
// so this file has zero dependency on the rest of the app.
function classicWeightedScore(b) {
  return b.skill * 0.35 + b.experience * 0.25 + b.responsibility * 0.15 + b.education * 0.10 + b.preferred * 0.10 + b.seniority * 0.05;
}

/* ---------------------------- entity extraction ---------------------------- */

function findCandidateMention(text, pool) {
  const lower = normalizeText(text);
  let best = null;
  let bestLen = 0;
  pool.forEach((c) => {
    const nameLower = c.name.toLowerCase();
    const first = nameLower.split(" ")[0];
    if (lower.includes(nameLower) && nameLower.length > bestLen) {
      best = c;
      bestLen = nameLower.length;
    } else if (bestLen === 0 && new RegExp(`\\b${first}\\b`).test(lower)) {
      best = c;
      bestLen = first.length;
    }
  });
  return best;
}

function findTwoCandidateMentions(text, pool) {
  const lower = normalizeText(text);
  return pool
    .filter((c) => new RegExp(`\\b${c.name.toLowerCase().split(" ")[0]}\\b`).test(lower))
    .slice(0, 2);
}

function findSkillMention(text, job) {
  const lower = normalizeText(text);
  const allSkills = [...new Set([...(job.requiredSkills || []), ...(job.preferredSkills || [])])];
  let best = null;
  allSkills.forEach((s) => {
    const alt = s.split(/\s+or\s+/i)[0].toLowerCase();
    if (lower.includes(alt) && (!best || alt.length > best.length)) best = s;
  });
  return best;
}

function findYearsMention(text) {
  const m = text.match(/(\d{1,2})\+?\s*years?/i);
  return m ? parseInt(m[1], 10) : null;
}

function findStatusMention(text) {
  const statuses = ["shortlisted", "interview", "offer", "hired", "rejected", "new", "screening"];
  const lower = normalizeText(text);
  return statuses.find((s) => lower.includes(s));
}

/* ------------------------------ formatting ------------------------------ */

function candidateLine(c) {
  return `${c.name} — ${c.score}%${c.neuralScore != null ? ` (neural: ${c.neuralScore}%)` : ""} · ${c.recommendation}`;
}

/* -------------------------------- engine -------------------------------- */

export function createAssistantEngine() {
  const memory = { lastCandidateId: null, lastSkill: null, turns: 0 };

  function resolveCandidate(text, pool) {
    const direct = findCandidateMention(text, pool);
    if (direct) return direct;
    if (/\b(her|him|them|they|their|she|he)\b/i.test(text) && memory.lastCandidateId) {
      return pool.find((c) => c.id === memory.lastCandidateId) || null;
    }
    return null;
  }

  function ask(rawText, pool, job) {
    memory.turns += 1;
    const text = rawText || "";
    const lower = normalizeText(text);

    // greetings / small talk / identity / capabilities -------------------
    if (/^(hi|hello|hey|yo|sup)\b/.test(lower)) {
      return {
        text: pick([
          `Hey! I've got ${pool.length} candidate${pool.length === 1 ? "" : "s"} loaded for ${job.title}. What do you want to know?`,
          `Hi there — ready when you are. Ask me about scores, skills, or a specific candidate.`,
          `Hello! Fire away — candidates, skills, comparisons, whatever's useful.`,
        ]),
      };
    }
    if (/\b(thank you|thanks|appreciate it|cheers)\b/.test(lower)) {
      return {
        text: pick([
          "Anytime — let me know if you want another angle on the data.",
          "Happy to help. Anything else you're curious about?",
          "Glad that was useful!",
        ]),
      };
    }
    if (/\b(who are you|what are you|are you (a )?real|are you an? llm|are you chatgpt|are you gpt)\b/.test(lower)) {
      return {
        text: "I'm TalentLens AI's built-in screening assistant — a rule-based engine that reads your actual candidate and job data directly, plus a small neural model trained right in your browser. No external AI service, nothing leaves your device.",
      };
    }
    if (/\b(help|what can you do|capabilities)\b/.test(lower)) {
      return {
        text: 'I can rank candidates, filter by skill/experience/status, compare two people, explain a score, summarize a candidate, or tell you what the neural re-ranker thinks. Try: "compare Sarah and Michael" or "who\'s missing Kubernetes?"',
      };
    }

    // compare two named candidates -----------------------------------------
    const pair = findTwoCandidateMentions(text, pool);
    if (pair.length === 2 && /\b(vs|versus|compare|better|or)\b/.test(lower)) {
      const [a, b] = [...pair].sort((x, y) => y.score - x.score);
      memory.lastCandidateId = a.id;
      return {
        text: `${a.name} edges out ${b.name}, ${a.score}% vs ${b.score}%. ${a.name} ${
          a.skillsMatched.length > b.skillsMatched.length
            ? `matches more required skills (${a.skillsMatched.length} vs ${b.skillsMatched.length})`
            : "has the stronger overall profile"
        }, while ${b.name}'s standout is ${(b.strengths[0] || "a solid background").toLowerCase()}.`,
        list: [candidateLine(a), candidateLine(b)],
      };
    }

    const target = resolveCandidate(text, pool);

    // why / explain score ---------------------------------------------------
    if (target && /\b(why|explain|how (did|does)|breakdown)\b/.test(lower)) {
      memory.lastCandidateId = target.id;
      const b = target.breakdown;
      const entries = Object.entries(b);
      const strongest = entries.reduce((a, e) => (e[1] > a[1] ? e : a));
      const weakest = entries.reduce((a, e) => (e[1] < a[1] ? e : a));
      const neuralNote =
        target.neuralScore != null
          ? ` The neural re-ranker independently estimated ${target.neuralScore}%, which was blended into the final number.`
          : "";
      return {
        text: `${target.name} scored ${target.score}% overall — driven mostly by ${strongest[0]} (${strongest[1]}%), with ${weakest[0]} (${weakest[1]}%) pulling it down the most.${neuralNote}${target.gaps[0] ? " " + target.gaps[0] : ""}`,
      };
    }

    // neural confidence for a candidate -------------------------------------
    if (target && /\b(neural|deep learning|model think|confidence)\b/.test(lower)) {
      memory.lastCandidateId = target.id;
      if (target.neuralScore == null) {
        return {
          text: `${target.name} was screened before I had a saved neural prediction for them — only the rule-based score (${target.score}%) is on file.`,
        };
      }
      const diff = target.neuralScore - Math.round(classicWeightedScore(target.breakdown));
      const direction = diff > 3 ? "more favorably than" : diff < -3 ? "less favorably than" : "about the same as";
      return {
        text: `The neural re-ranker independently predicted ${target.neuralScore}% for ${target.name} — that's ${direction} the plain rule-based formula. The two were blended into the final ${target.score}%.`,
      };
    }

    // candidate summary -------------------------------------------------------
    if (target && /\b(who is|tell me about|summar|profile|background)\b/.test(lower)) {
      memory.lastCandidateId = target.id;
      return {
        text: target.summary || `${target.name} is a ${target.role} at ${target.company} with ${target.experience} years of experience.`,
      };
    }

    // gaps ---------------------------------------------------------------------
    if (target && /\b(gap|weak|missing|concern|risk)\b/.test(lower)) {
      memory.lastCandidateId = target.id;
      return { text: `Here's what I'd flag for ${target.name}:`, list: target.gaps };
    }

    // strengths ------------------------------------------------------------------
    if (target && /\b(strength|good at|best at|why (should|hire))\b/.test(lower)) {
      memory.lastCandidateId = target.id;
      return { text: `${target.name}'s strongest points:`, list: target.strengths };
    }

    // generic candidate mention, no clear verb matched ----------------------------
    if (target) {
      memory.lastCandidateId = target.id;
      return {
        text: `${target.name} is at ${target.score}% (${target.recommendation}), currently ${target.status}. Want the score breakdown, strengths, gaps, or a comparison?`,
      };
    }

    // pool insights ------------------------------------------------------------------
    if (/\b(borderline|on the fence|uncertain|mixed signals)\b/.test(lower)) {
      const list = [...pool].filter((c) => c.score >= 65 && c.score < 80).sort((a, b) => b.score - a.score);
      return {
        text: list.length ? `${list.length} candidate${list.length === 1 ? " is" : "s are"} in the borderline 65–79% range. These profiles deserve a closer human review:` : "No candidates currently fall in the borderline 65–79% range.",
        list: list.map(candidateLine),
      };
    }
    if (/\b(prioritize|priority|focus on first|start with|next step)\b/.test(lower)) {
      const list = [...pool].sort((a, b) => b.score - a.score).slice(0, 3);
      return {
        text: list.length ? `Start with the strongest evidence-based matches, then validate their gaps in interviews:` : "There are no candidates in this pool to prioritize yet.",
        list: list.map(candidateLine),
      };
    }
    if (/\b(biggest|main|common|overall).*(gap|missing|shortfall)|\b(skill gaps|skills? are missing)\b/.test(lower)) {
      const gaps = new Map();
      pool.forEach((c) => (c.skillsMissing || []).forEach((skill) => gaps.set(skill, (gaps.get(skill) || 0) + 1)));
      const list = [...gaps.entries()].sort((a, b) => b[1] - a[1]).map(([skill, count]) => `${skill} — missing from ${count} candidate${count === 1 ? "" : "s"}`);
      return {
        text: list.length ? "The most common missing skills in this pool are:" : "No missing skills are recorded for this pool.",
        list,
      };
    }
    if (/\b(most|highest|strongest).*(experience|experienced)|\bwho.*experienced\b/.test(lower)) {
      const list = [...pool].sort((a, b) => b.experience - a.experience).slice(0, 5);
      return {
        text: list.length ? "These candidates have the deepest experience for this role:" : "There are no candidates in this pool yet.",
        list: list.map((c) => `${c.name} — ${c.experience} years · ${c.score}% match`),
      };
    }
    if (/\b(certification|certified|certifications)\b/.test(lower)) {
      const list = pool.filter((c) => c.certifications?.length).map((c) => `${c.name} — ${c.certifications.join(", ")}`);
      return {
        text: list.length ? `${list.length} candidate${list.length === 1 ? " has" : "s have"} certification evidence:` : "No certification evidence is recorded in this pool.",
        list,
      };
    }
    if (/\baverage|avg|mean\b/.test(lower) && /\bexperience|years|tenure\b/.test(lower)) {
      const avg = pool.length ? (pool.reduce((sum, c) => sum + c.experience, 0) / pool.length).toFixed(1) : "0.0";
      return { text: `The pool averages ${avg} years of experience across ${pool.length} candidate${pool.length === 1 ? "" : "s"}.` };
    }
    const belowScore = lower.match(/(?:below|under|less than)\s*(\d{2,3})\s*%?/);
    if (belowScore && /\b(score|match|candidate|people)\b/.test(lower)) {
      const threshold = parseInt(belowScore[1], 10);
      const list = pool.filter((c) => c.score < threshold).sort((a, b) => b.score - a.score);
      return {
        text: list.length ? `${list.length} candidate${list.length === 1 ? " is" : "s are"} below ${threshold}%:` : `No candidates are below ${threshold}%.`,
        list: list.map(candidateLine),
      };
    }

    // top / ranking ----------------------------------------------------------------
    if (/\b(top|best|rank|who should i (hire|interview)|strongest)\b/.test(lower)) {
      const n = /top\s*10/.test(lower) ? 10 : /top\s*3/.test(lower) ? 3 : 5;
      const top = [...pool].sort((a, b) => b.score - a.score).slice(0, n);
      return {
        text: pick([
          `Here's the current ranking for ${job.title}:`,
          "Based on the data so far, here's who's leading the pack:",
        ]),
        list: top.map(candidateLine),
      };
    }

    // skill-based filtering ---------------------------------------------------------
    const skill = findSkillMention(text, job);
    if (skill && /\b(missing|lack|without|don'?t have|no)\b/.test(lower)) {
      memory.lastSkill = skill;
      const list = pool.filter((c) => !c.skillsMatched.includes(skill));
      return {
        text: list.length ? `${list.length} candidate${list.length === 1 ? "" : "s"} don't show ${skill}:` : `Everyone in the pool shows evidence of ${skill}.`,
        list: list.map(candidateLine),
      };
    }
    if (skill) {
      memory.lastSkill = skill;
      const list = pool.filter((c) => c.skillsMatched.includes(skill));
      return {
        text: list.length ? `${list.length} candidate${list.length === 1 ? "" : "s"} with ${skill}:` : `No one in this pool has clear evidence of ${skill} yet.`,
        list: list.map(candidateLine),
      };
    }
    if (/\b(it|that skill)\b/.test(lower) && memory.lastSkill) {
      const list = pool.filter((c) => c.skillsMatched.includes(memory.lastSkill));
      return {
        text: `Following up on ${memory.lastSkill} — ${list.length} candidate${list.length === 1 ? "" : "s"} match:`,
        list: list.map(candidateLine),
      };
    }

    // experience filter ------------------------------------------------------------
    const years = findYearsMention(lower);
    if (years !== null && /\b(experience|years|yrs)\b/.test(lower)) {
      const list = pool.filter((c) => c.experience >= years);
      return {
        text: `${list.length} candidate${list.length === 1 ? "" : "s"} with ${years}+ years of experience:`,
        list: list.map(candidateLine),
      };
    }

    // status filter ------------------------------------------------------------------
    const status = findStatusMention(lower);
    if (status) {
      const label = status.charAt(0).toUpperCase() + status.slice(1);
      const list = pool.filter((c) => c.status.toLowerCase() === status);
      return {
        text: list.length ? `${list.length} candidate${list.length === 1 ? "" : "s"} currently ${label}:` : `No one is currently marked ${label}.`,
        list: list.map(candidateLine),
      };
    }

    // counts -----------------------------------------------------------------------
    if (/\bhow many\b/.test(lower)) {
      return { text: `There ${pool.length === 1 ? "is" : "are"} ${pool.length} candidate${pool.length === 1 ? "" : "s"} in the pool for ${job.title} right now.` };
    }

    // average score -----------------------------------------------------------------
    if (/(average|avg|mean).*score|score.*(average|avg)/.test(lower)) {
      const avg = pool.length ? Math.round(pool.reduce((s, c) => s + c.score, 0) / pool.length) : 0;
      return { text: `The average match score across this pool is ${avg}%.` };
    }

    // leadership ----------------------------------------------------------------------
    if (/\b(leadership|manager|management background)\b/.test(lower)) {
      const mgr = pool.find((c) => /manager|lead/i.test(c.role));
      if (mgr) {
        memory.lastCandidateId = mgr.id;
        return { text: `${mgr.name} has the strongest leadership signal — ${mgr.summary}` };
      }
      return { text: "No one in this pool has a management or lead title on record." };
    }

    // job requirements -----------------------------------------------------------------
    if (/\b(requirement|what does this job need|skills? (needed|required)|what.*looking for)\b/.test(lower)) {
      return {
        text: `${job.title} calls for: ${job.requiredSkills.join(", ")} (required), plus ${job.preferredSkills.join(", ") || "no specific preferred skills"}. Minimum ${job.minExperience}+ years, ${job.education}.`,
      };
    }

    // generic hire/reject advice ---------------------------------------------------------
    if (/\bshould i (hire|reject|shortlist)\b/.test(lower)) {
      const top = [...pool].sort((a, b) => b.score - a.score)[0];
      return top
        ? { text: `If you need one name right now, ${top.name} is the strongest fit at ${top.score}% — but skim the full breakdown before deciding.` }
        : { text: "I don't have anyone in the pool yet to advise on." };
    }

    // fallback — varied, and nudges toward what it's actually good at -----------------------
    return {
      text: pick([
        'I didn\'t quite catch that — try asking about a specific candidate, a skill, or "top candidates."',
        'Not sure I followed. You can ask things like "compare Sarah and Michael" or "who\'s missing AWS?"',
        "Hmm, can you rephrase? I'm best with candidate names, skills, experience, or status questions.",
      ]),
    };
  }

  return { ask };
}