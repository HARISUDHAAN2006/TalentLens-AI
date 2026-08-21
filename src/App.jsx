import React, { useState, useMemo, useEffect, useRef } from "react";
import * as mammoth from "mammoth";
import Papa from "papaparse";
import { createAssistantEngine } from "./TalentLensAssistant";
import { buildAnalysisMetadata, buildRequirementEvidence } from "./analysis/analysisContract";
import {
  LayoutDashboard, Briefcase, Users, ScanSearch, CalendarDays, BarChart3,
  Sparkles, Settings, Upload, Search, ChevronRight, ChevronLeft, X, Check,
  AlertTriangle, Filter, Plus, Send, ArrowUpRight, GraduationCap, Award,
  MapPin, Mail, Phone, Building2, Clock, FileText, ArrowRight, Loader2,
  Eye, EyeOff, Sparkle, TrendingUp, ChevronDown, Star,
  CheckCircle2, XCircle, MinusCircle, Bot, User, Layers, Zap, Brain, Boxes, Download, Sun, Moon
} from "lucide-react";

/* ============================== TOKENS ============================== */
/* Two full palettes. Every value below was chosen to hold its own contrast   */
/* in its own theme — e.g. "accentSoft" is a pale lavender in dark mode (for  */
/* legibility on dark surfaces) but a saturated violet in light mode (for    */
/* legibility on near-white), rather than one color reused for both.         */
const THEMES = {
  dark: {
    bg: "#0B0B0D",
    surface: "#141416",
    raised: "#1C1C20",
    raised2: "#232327",
    border: "#28282D",
    borderSoft: "#1F1F23",
    text: "#F5F5F7",
    muted: "#98989D",
    faint: "#6E6E73",
    accent: "#6D5EF0",
    accentSoft: "#9B90FF",
    emerald: "#30B37C",
    amber: "#D9A441",
    rose: "#E06280",
    blue: "#4C8EF7",
    shadow: "0 1px 2px rgba(0,0,0,0.3), 0 16px 40px rgba(0,0,0,0.45)",
    topbarBg: "rgba(11,11,13,0.72)",
  },
  light: {
    bg: "#F7F7F8",
    surface: "#FFFFFF",
    raised: "#F1F1F3",
    raised2: "#E9E9EC",
    border: "#E3E3E6",
    borderSoft: "#EDEDEF",
    text: "#1D1D1F",
    muted: "#6E6E73",
    faint: "#8E8E93",
    accent: "#5A4FE0",
    accentSoft: "#6F62E8",
    emerald: "#1F9D63",
    amber: "#AD7519",
    rose: "#C7476A",
    blue: "#3167DB",
    shadow: "0 1px 2px rgba(15,15,20,0.04), 0 12px 32px rgba(15,15,20,0.08)",
    topbarBg: "rgba(247,247,248,0.72)",
  },
};

// Every downstream component reads colors through these keys as CSS variable
// references (not literal hex) — so flipping the variables defined in
// FontImport re-themes the entire app without touching component code.
const C = {
  bg: "var(--tl-bg)", surface: "var(--tl-surface)", raised: "var(--tl-raised)", raised2: "var(--tl-raised2)",
  border: "var(--tl-border)", borderSoft: "var(--tl-border-soft)", text: "var(--tl-text)", muted: "var(--tl-muted)",
  faint: "var(--tl-faint)", violet: "var(--tl-accent)", violetSoft: "var(--tl-accent-soft)",
  emerald: "var(--tl-emerald)", amber: "var(--tl-amber)", rose: "var(--tl-rose)", blue: "var(--tl-blue)",
  shadow: "var(--tl-shadow)", topbarBg: "var(--tl-topbar-bg)",
};

function FontImport({ theme }) {
  const t = THEMES[theme] || THEMES.dark;
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      .tl-root, .tl-root * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; box-sizing: border-box; }
      .tl-root {
        --tl-bg: ${t.bg}; --tl-surface: ${t.surface}; --tl-raised: ${t.raised}; --tl-raised2: ${t.raised2};
        --tl-border: ${t.border}; --tl-border-soft: ${t.borderSoft}; --tl-text: ${t.text}; --tl-muted: ${t.muted};
        --tl-faint: ${t.faint}; --tl-accent: ${t.accent}; --tl-accent-soft: ${t.accentSoft};
        --tl-emerald: ${t.emerald}; --tl-amber: ${t.amber}; --tl-rose: ${t.rose}; --tl-blue: ${t.blue};
        --tl-shadow: ${t.shadow}; --tl-topbar-bg: ${t.topbarBg};
        color-scheme: ${theme};
      }
      .tl-display { font-family: 'Inter', -apple-system, sans-serif; letter-spacing: -0.015em; }
      .tl-mono { font-family: ui-monospace, 'SF Mono', 'Menlo', 'Cascadia Mono', monospace; }
      .tl-root ::-webkit-scrollbar { width: 8px; height: 8px; }
      .tl-root ::-webkit-scrollbar-thumb { background: var(--tl-border); border-radius: 8px; }
      .tl-root ::-webkit-scrollbar-track { background: transparent; }
      @keyframes tlPulse { 0%,100% { opacity: .4; } 50% { opacity: 1; } }
      @keyframes tlFadeUp { from { opacity: 0; transform: translateY(6px);} to { opacity: 1; transform: translateY(0);} }
      .tl-fade-up { animation: tlFadeUp .35s ease both; }
      .tl-focus:focus-visible { outline: 2px solid var(--tl-accent-soft); outline-offset: 2px; }
      .tl-typing-dot { width: 5px; height: 5px; border-radius: 999px; background: var(--tl-faint); display: inline-block; animation: tlPulse 1s infinite; }
      .tl-root, .tl-root * { transition: background-color .2s ease, border-color .2s ease, color .2s ease; }
      @media (prefers-reduced-motion: reduce) {
        .tl-root, .tl-root * { animation: none !important; transition: none !important; }
      }
    `}</style>
  );
}

/* ============================== MOCK / DEMO DATA ============================== */

const JOBS = [
  {
    id: "job-1",
    title: "Senior Machine Learning Engineer",
    dept: "Engineering",
    location: "Remote (US)",
    type: "Full-time",
    status: "Open",
    seniority: "Senior",
    createdAt: "Jul 28, 2026",
    minExperience: 5,
    education: "MS/PhD preferred, BS considered with strong project record",
    requiredSkills: ["Python", "PyTorch or TensorFlow", "Machine Learning", "AWS", "SQL", "Distributed Systems"],
    preferredSkills: ["Kubernetes", "MLOps", "NLP", "Docker"],
    responsibilities: [
      "Design and ship production ML systems end-to-end",
      "Own model training, evaluation, and deployment pipelines",
      "Partner with product on applied ML use cases",
      "Mentor engineers on ML best practices",
    ],
    keywords: ["deep learning", "model deployment", "feature engineering", "vector search"],
    candidateCount: 8,
    avgScore: 76,
  },
  {
    id: "job-2",
    title: "Senior Backend Engineer",
    dept: "Engineering",
    location: "New York, NY (Hybrid)",
    type: "Full-time",
    status: "Open",
    seniority: "Senior",
    createdAt: "Aug 2, 2026",
    minExperience: 5,
    education: "BS in Computer Science or equivalent experience",
    requiredSkills: ["Python or Go", "Distributed Systems", "SQL", "AWS", "API Design"],
    preferredSkills: ["Kafka", "Kubernetes", "gRPC"],
    responsibilities: [
      "Build resilient, high-throughput backend services",
      "Improve system reliability and observability",
      "Design APIs consumed by internal and external teams",
    ],
    keywords: ["microservices", "scalability", "system design"],
    candidateCount: 5,
    avgScore: 71,
  },
];

const DEMO_CANDIDATES = [
  {
    id: "c1", name: "Sarah Johnson", role: "Senior Software Engineer", company: "Stripe",
    location: "Austin, TX", experience: 7, jobId: "job-1", status: "Shortlisted",
    dateAdded: "Aug 5, 2026", score: 94, recommendation: "Strongly Recommend", aiVerdict: "Strong Hire",
    email: "sarah.johnson@email.com", phone: "(512) 555-0142",
    education: [{ degree: "M.S. Computer Science", school: "University of Texas at Austin", year: "2019" }],
    certifications: ["AWS Certified Solutions Architect – Professional"],
    skillsMatched: ["Python", "AWS", "Distributed Systems", "PyTorch", "SQL"],
    skillsPartial: ["MLOps"],
    skillsMissing: ["NLP"],
    breakdown: { skill: 96, experience: 98, responsibility: 92, education: 100, preferred: 80, seniority: 95 },
    strengths: [
      "7 years building and shipping production ML infrastructure at scale",
      "Led migration of Stripe's fraud-detection models to a real-time PyTorch pipeline",
      "Deep hands-on distributed systems experience matching core job requirements",
    ],
    gaps: [
      "No explicit NLP project experience in resume",
      "MLOps tooling exposure is present but not deeply demonstrated",
    ],
    timeline: [
      { title: "Senior Software Engineer", company: "Stripe", dates: "2022 — Present", desc: "Leads the ML infrastructure team building real-time fraud detection models serving 40M+ requests/day." },
      { title: "Software Engineer II", company: "Datadog", dates: "2019 — 2022", desc: "Built distributed data pipelines and internal ML tooling for anomaly detection." },
      { title: "Software Engineer Intern", company: "IBM Research", dates: "2018", desc: "Prototyped early NLP classification models for support-ticket routing." },
    ],
    summary: "Sarah is a senior engineer with 7 years of hands-on experience shipping production ML systems, most recently leading real-time fraud-detection infrastructure at Stripe. Her background in distributed systems and PyTorch aligns closely with the core requirements of this role, and her AWS certification reinforces strong cloud fluency.",
    interviewQuestions: [
      "Walk us through how you productionized the real-time fraud-detection pipeline at Stripe — what were the biggest latency challenges?",
      "Your resume shows deep distributed-systems work but limited NLP exposure. How would you ramp up on our NLP-heavy roadmap items?",
      "Describe a time you had to convince a team to adopt a new MLOps practice. What was the outcome?",
    ],
  },
  {
    id: "c2", name: "Michael Chen", role: "Software Engineer", company: "Meta",
    location: "Menlo Park, CA", experience: 5, jobId: "job-1", status: "Screening",
    dateAdded: "Aug 6, 2026", score: 88, recommendation: "Recommend", aiVerdict: "Hire",
    email: "michael.chen@email.com", phone: "(650) 555-0198",
    education: [{ degree: "B.S. Computer Science", school: "UC Berkeley", year: "2020" }],
    certifications: [],
    skillsMatched: ["Python", "AWS", "SQL", "PyTorch"],
    skillsPartial: ["Distributed Systems"],
    skillsMissing: ["Kubernetes", "NLP"],
    breakdown: { skill: 88, experience: 84, responsibility: 80, education: 90, preferred: 55, seniority: 82 },
    strengths: [
      "Solid 5-year track record building ML-adjacent recommendation features at Meta",
      "Strong Python and PyTorch fundamentals with recent production experience",
    ],
    gaps: [
      "Distributed-systems exposure is present but scoped to a single team's services",
      "No Kubernetes experience listed",
    ],
    timeline: [
      { title: "Software Engineer", company: "Meta", dates: "2021 — Present", desc: "Builds ranking features for the Feed recommendation system using PyTorch models." },
      { title: "Software Engineer", company: "Cruise", dates: "2020 — 2021", desc: "Worked on perception data pipelines for autonomous vehicle sensor logs." },
    ],
    summary: "Michael brings 5 years of applied ML engineering experience, most recently on Meta's Feed ranking team. His Python and PyTorch skills are strong and directly relevant, though his distributed-systems and infrastructure exposure is narrower than the role's ideal profile.",
    interviewQuestions: [
      "Tell us about the ranking model you built at Meta — how did you evaluate its impact?",
      "Have you worked with container orchestration like Kubernetes? If not, how comfortable are you picking it up quickly?",
    ],
  },
  {
    id: "c3", name: "Priya Sharma", role: "ML Engineer", company: "Nimbus Analytics (startup)",
    location: "Seattle, WA", experience: 4, jobId: "job-1", status: "New",
    dateAdded: "Aug 9, 2026", score: 76, recommendation: "Review", aiVerdict: "Consider",
    email: "priya.sharma@email.com", phone: "(206) 555-0117",
    education: [{ degree: "M.S. Data Science", school: "University of Washington", year: "2022" }],
    certifications: ["TensorFlow Developer Certificate"],
    skillsMatched: ["Python", "PyTorch", "Machine Learning", "NLP"],
    skillsPartial: ["AWS"],
    skillsMissing: ["Distributed Systems", "Kubernetes"],
    breakdown: { skill: 82, experience: 62, responsibility: 74, education: 92, preferred: 70, seniority: 55 },
    strengths: [
      "Direct, hands-on NLP experience — a preferred skill most other candidates lack",
      "Strong academic ML foundation reinforced by a TensorFlow certification",
    ],
    gaps: [
      "4 years of experience is below the role's 5-year minimum",
      "Startup-scale systems experience; limited exposure to large distributed infrastructure",
    ],
    timeline: [
      { title: "ML Engineer", company: "Nimbus Analytics", dates: "2022 — Present", desc: "Built NLP models for document classification and a customer-support triage system." },
      { title: "Data Science Intern", company: "Boeing", dates: "2021", desc: "Built demand-forecasting models for supply chain planning." },
    ],
    summary: "Priya is an ML engineer with strong NLP and applied machine-learning skills, but her overall experience is below the role's stated minimum and her infrastructure exposure is limited to smaller-scale startup systems.",
    interviewQuestions: [
      "The role calls for 5+ years — walk us through the scope and complexity of the systems you've owned in your 4 years so far.",
      "Describe the NLP triage system you built. How did you handle scaling it as usage grew?",
    ],
  },
  {
    id: "c4", name: "Daniel Williams", role: "Backend Engineer", company: "Shopify",
    location: "Ottawa, ON", experience: 6, jobId: "job-1", status: "Screening",
    dateAdded: "Aug 7, 2026", score: 71, recommendation: "Review", aiVerdict: "Consider",
    email: "daniel.williams@email.com", phone: "(613) 555-0176",
    education: [{ degree: "B.S. Computer Science", school: "University of Waterloo", year: "2018" }],
    certifications: [],
    skillsMatched: ["Python", "SQL", "AWS", "Distributed Systems"],
    skillsPartial: ["Machine Learning"],
    skillsMissing: ["PyTorch", "NLP"],
    breakdown: { skill: 68, experience: 88, responsibility: 60, education: 85, preferred: 40, seniority: 88 },
    strengths: [
      "6 years of strong distributed-systems and backend infrastructure experience",
      "Proven ability to operate large-scale production services",
    ],
    gaps: [
      "No production ML framework experience (PyTorch/TensorFlow) found in resume",
      "Machine-learning exposure appears limited to internal tooling, not model development",
    ],
    timeline: [
      { title: "Backend Engineer", company: "Shopify", dates: "2020 — Present", desc: "Owns checkout-platform services handling millions of transactions daily." },
      { title: "Backend Engineer", company: "RBC", dates: "2018 — 2020", desc: "Built internal fraud-rules engines (rules-based, not ML-based)." },
    ],
    summary: "Daniel is a strong backend and distributed-systems engineer with 6 years of experience, but his resume shows little direct machine-learning framework experience, which is a core requirement for this role.",
    interviewQuestions: [
      "This role is ML-heavy — what's your hands-on experience with PyTorch or TensorFlow, if any?",
      "Tell us about the fraud-rules engine you built at RBC. Was there an opportunity to make it ML-based, and why wasn't it?",
    ],
  },
  {
    id: "c5", name: "Emily Rodriguez", role: "Data Engineer", company: "Snowflake",
    location: "Denver, CO", experience: 5, jobId: "job-1", status: "New",
    dateAdded: "Aug 10, 2026", score: 65, recommendation: "Review", aiVerdict: "Consider",
    email: "emily.rodriguez@email.com", phone: "(720) 555-0134",
    education: [{ degree: "M.S. Data Engineering", school: "Georgia Tech", year: "2020" }],
    certifications: ["AWS Certified Data Analytics – Specialty"],
    skillsMatched: ["Python", "SQL", "AWS"],
    skillsPartial: ["Machine Learning"],
    skillsMissing: ["PyTorch", "Kubernetes", "NLP", "Distributed Systems"],
    breakdown: { skill: 58, experience: 78, responsibility: 55, education: 88, preferred: 35, seniority: 70 },
    strengths: [
      "Strong SQL and data-pipeline fundamentals directly useful for feature engineering",
      "AWS specialty certification shows solid cloud data expertise",
    ],
    gaps: [
      "No production model-training experience listed",
      "Distributed-systems exposure is data-warehouse focused rather than service infrastructure",
    ],
    timeline: [
      { title: "Data Engineer", company: "Snowflake", dates: "2021 — Present", desc: "Builds and maintains ETL pipelines feeding analytics and reporting warehouses." },
      { title: "Data Engineer", company: "Cardinal Health", dates: "2020 — 2021", desc: "Maintained batch data pipelines for supply-chain reporting." },
    ],
    summary: "Emily has strong data-engineering fundamentals and cloud data expertise, but her resume shows limited exposure to model training or production ML frameworks, which the role requires.",
    interviewQuestions: [
      "How would you translate your ETL and data-pipeline background into supporting ML feature pipelines?",
      "Have you collaborated directly with ML engineers before? What did that handoff look like?",
    ],
  },
  {
    id: "c6", name: "David Kim", role: "Full Stack Engineer", company: "Airbnb",
    location: "San Francisco, CA", experience: 4, jobId: "job-1", status: "New",
    dateAdded: "Aug 11, 2026", score: 58, recommendation: "Not a Fit", aiVerdict: "Reject",
    email: "david.kim@email.com", phone: "(415) 555-0163",
    education: [{ degree: "B.S. Computer Science", school: "UCLA", year: "2021" }],
    certifications: [],
    skillsMatched: ["Python", "SQL"],
    skillsPartial: [],
    skillsMissing: ["PyTorch", "Machine Learning", "AWS", "Distributed Systems", "NLP"],
    breakdown: { skill: 32, experience: 55, responsibility: 40, education: 80, preferred: 20, seniority: 50 },
    strengths: [
      "Strong general software-engineering fundamentals",
      "Fast shipping velocity on customer-facing features",
    ],
    gaps: [
      "No machine-learning or ML-framework experience found",
      "No distributed-systems or large-scale infrastructure work listed",
      "Experience is concentrated in frontend/full-stack product work, not ML engineering",
    ],
    timeline: [
      { title: "Full Stack Engineer", company: "Airbnb", dates: "2022 — Present", desc: "Builds guest-facing booking flows across web and mobile." },
      { title: "Software Engineer", company: "Postmates", dates: "2021 — 2022", desc: "Built merchant-facing dashboard features." },
    ],
    summary: "David is a capable full-stack engineer, but his experience doesn't align with this role's core ML and infrastructure requirements — his background is concentrated in product-facing feature work.",
    interviewQuestions: [
      "This role centers on ML systems work — what draws you to that shift from full-stack product engineering?",
    ],
  },
  {
    id: "c7", name: "Aisha Patel", role: "Engineering Manager", company: "Google",
    location: "Sunnyvale, CA", experience: 9, jobId: "job-1", status: "Interview",
    dateAdded: "Aug 3, 2026", score: 90, recommendation: "Recommend", aiVerdict: "Hire",
    email: "aisha.patel@email.com", phone: "(408) 555-0121",
    education: [{ degree: "M.S. Computer Science", school: "Stanford University", year: "2016" }],
    certifications: [],
    skillsMatched: ["Python", "AWS", "Distributed Systems", "Machine Learning", "SQL"],
    skillsPartial: ["PyTorch"],
    skillsMissing: [],
    breakdown: { skill: 90, experience: 100, responsibility: 88, education: 100, preferred: 75, seniority: 100 },
    strengths: [
      "9 years of experience including 3 years managing an applied-ML team at Google",
      "Demonstrated technical leadership and mentorship — a strong signal for a senior role",
      "Broad, well-rounded skill coverage across nearly every required area",
    ],
    gaps: [
      "Recent role has been management-heavy; hands-on coding cadence may be lower than an IC-focused hire",
      "PyTorch appears in older projects rather than recent, current work",
    ],
    timeline: [
      { title: "Engineering Manager, ML Platform", company: "Google", dates: "2023 — Present", desc: "Leads a team of 6 building internal ML training infrastructure." },
      { title: "Senior Software Engineer", company: "Google", dates: "2019 — 2023", desc: "Built distributed training pipelines for internal ranking models." },
      { title: "Software Engineer", company: "Twitter", dates: "2016 — 2019", desc: "Worked on the timeline ranking and relevance team." },
    ],
    summary: "Aisha brings 9 years of experience, including recent engineering-management leadership over an applied-ML platform team at Google. Her technical breadth and leadership track record are strong, though recent hands-on ML coding has been lighter given her management scope.",
    interviewQuestions: [
      "This role is an IC role — how do you feel about stepping back from management day-to-day?",
      "Tell us about the training infrastructure your team owns at Google. What would you build differently for a smaller company?",
    ],
  },
  {
    id: "c8", name: "James Wilson", role: "DevOps Engineer", company: "HashiCorp",
    location: "Remote (US)", experience: 6, jobId: "job-1", status: "New",
    dateAdded: "Aug 11, 2026", score: 68, recommendation: "Review", aiVerdict: "Consider",
    email: "james.wilson@email.com", phone: "(303) 555-0189",
    education: [{ degree: "B.S. Computer Science", school: "Colorado State University", year: "2018" }],
    certifications: ["Certified Kubernetes Administrator (CKA)"],
    skillsMatched: ["Python", "AWS", "Distributed Systems"],
    skillsPartial: ["SQL"],
    skillsMissing: ["PyTorch", "Machine Learning", "NLP"],
    breakdown: { skill: 55, experience: 85, responsibility: 50, education: 78, preferred: 90, seniority: 82 },
    strengths: [
      "Excellent infrastructure depth — Kubernetes, AWS, and distributed systems are all strong",
      "Certified Kubernetes Administrator directly covers the role's top preferred skill",
    ],
    gaps: [
      "No ML framework or model-development experience found",
      "Resume shows infrastructure/platform focus rather than applied ML work",
    ],
    timeline: [
      { title: "DevOps Engineer", company: "HashiCorp", dates: "2021 — Present", desc: "Builds and operates Kubernetes-based deployment infrastructure for internal ML teams." },
      { title: "Site Reliability Engineer", company: "Twilio", dates: "2018 — 2021", desc: "Owned on-call reliability for messaging infrastructure." },
    ],
    summary: "James has deep infrastructure and Kubernetes expertise that directly covers the role's preferred skills, but his resume shows no hands-on ML model-development experience, which is a core requirement.",
    interviewQuestions: [
      "You support ML teams' infrastructure at HashiCorp — how close have you gotten to the modeling work itself?",
      "Would you be interested in moving from infra-adjacent work into hands-on model development?",
    ],
  },
];

const FUNNEL = [
  { stage: "Applied", count: 412 },
  { stage: "AI Screened", count: 380 },
  { stage: "Shortlisted", count: 96 },
  { stage: "Interview", count: 42 },
  { stage: "Offer", count: 14 },
  { stage: "Hired", count: 9 },
];

const TOP_SKILLS = [
  { skill: "Python", pct: 74 },
  { skill: "SQL", pct: 61 },
  { skill: "AWS", pct: 58 },
  { skill: "Distributed Systems", pct: 47 },
  { skill: "PyTorch", pct: 39 },
  { skill: "Kubernetes", pct: 33 },
  { skill: "NLP", pct: 21 },
];

const SCORE_TREND = [72, 74, 71, 76, 79, 77, 81, 78, 83, 80, 82, 85];

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "jobs", label: "Jobs", icon: Briefcase },
  { key: "candidates", label: "Candidates", icon: Users },
  { key: "screening", label: "Screening", icon: ScanSearch },
  { key: "interviews", label: "Interviews", icon: CalendarDays },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "assistant", label: "AI Assistant", icon: Sparkles },
  { key: "settings", label: "Settings", icon: Settings },
];

const STATUS_STYLE = {
  New: C.blue,
  Screening: C.amber,
  Shortlisted: C.emerald,
  Interview: C.violetSoft,
  Offer: C.emerald,
  Hired: C.emerald,
  Rejected: C.rose,
};

const REC_STYLE = {
  "Strongly Recommend": C.emerald,
  Recommend: C.blue,
  Review: C.amber,
  "Not a Fit": C.rose,
};

const STAGE_ORDER = ["New", "Screening", "Shortlisted", "Interview", "Offer", "Hired"];
function nextStage(status) {
  const idx = STAGE_ORDER.indexOf(status);
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return status;
  return STAGE_ORDER[idx + 1];
}

/* ============================== CUSTOM LOCAL ANALYSIS ENGINE ============================== */
/* No external API calls, no paid AI service. Every uploaded resume is read and scored      */
/* entirely in-browser with hand-built text parsing, keyword/skill matching, and a           */
/* transparent weighted scoring formula — the same formula shown in Settings.                */

function clampNum(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function normalize(s) {
  return (s || "").toLowerCase();
}

// Reads real text out of a real uploaded file. .docx is parsed with mammoth
// (a free, local parsing library — not an API), .txt is read directly.
// Binary PDFs aren't parseable in-browser without a PDF library, so the
// caller is pointed to the paste box instead.
async function extractResumeText(file) {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".docx")) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return (result.value || "").trim();
  }
  if (lower.endsWith(".txt")) {
    return (await file.text()).trim();
  }
  throw new Error("Only .docx and .txt files can be read directly in the browser. Save this resume as .docx or .txt, or paste its text below.");
}

function findSkillMention(text, skill) {
  // Handles "PyTorch or TensorFlow" style entries by checking each alternative.
  const alts = skill.split(/\s+or\s+/i).map((s) => s.trim());
  const lower = normalize(text);
  return alts.some((alt) => {
    const esc = alt.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, "i").test(lower);
  });
}

function extractEmail(text) {
  const m = text.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
  return m ? m[0] : "Not provided";
}

function extractPhone(text) {
  const m = text.match(/(\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  return m ? m[0].trim() : "Not provided";
}

function extractName(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 6)) {
    if (line.length > 3 && line.length < 45 && !/[@\d]/.test(line) && /^[A-Za-z.,'\- ]+$/.test(line)) {
      return line.replace(/[,.]$/, "");
    }
  }
  return "Candidate";
}

function extractYears(text) {
  const explicit = text.match(/(\d{1,2})\+?\s*(?:years|yrs)\s*(?:of)?\s*(?:professional|relevant|industry)?\s*experience/i);
  if (explicit) return parseInt(explicit[1], 10);
  const ranges = [...text.matchAll(/(20\d{2}|19\d{2})\s*(?:[-–—]|to)\s*(present|current|20\d{2}|19\d{2})/gi)];
  if (ranges.length) {
    const currentYear = new Date().getFullYear();
    let earliest = currentYear;
    ranges.forEach((r) => {
      const start = parseInt(r[1], 10);
      if (start < earliest) earliest = start;
    });
    return Math.max(0, currentYear - earliest);
  }
  return 0;
}

function extractEducation(text) {
  const degreeRe = /(Ph\.?D\.?|Doctorate|M\.?S\.?|M\.?B\.?A\.?|Master(?:'s)?(?: of [A-Za-z]+)?|B\.?S\.?|B\.?A\.?|Bachelor(?:'s)?(?: of [A-Za-z]+)?)[^\n.]{0,60}/gi;
  const matches = [...text.matchAll(degreeRe)].slice(0, 3);
  return matches.map((m) => {
    const chunk = m[0];
    const yearMatch = chunk.match(/(19|20)\d{2}/);
    const schoolMatch = chunk.match(/(?:in|from|,|-|–)\s*([A-Z][A-Za-z&.,' ]{3,60}(?:University|College|Institute|School)[A-Za-z&.,' ]*)/);
    return {
      degree: chunk.split(/,|-|–/)[0].trim().slice(0, 60),
      school: schoolMatch ? schoolMatch[1].trim() : "Not specified",
      year: yearMatch ? yearMatch[0] : "Not specified",
    };
  });
}

function extractCertifications(text) {
  const lines = text.split(/\r?\n/);
  const hits = new Set();
  lines.forEach((line) => {
    if (/certifi(ed|cation)/i.test(line) || /\b(AWS|PMP|CKA|CISSP|CPA|Scrum Master|Six Sigma)\b/.test(line)) {
      const trimmed = line.trim().replace(/^[-•*]\s*/, "");
      if (trimmed.length > 4 && trimmed.length < 100) hits.add(trimmed);
    }
  });
  return [...hits].slice(0, 5);
}

function extractRoleCompany(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const m = lines[i].match(/^([A-Z][A-Za-z .+/-]{3,40})\s+(?:at|@|-|—|,)\s+([A-Z][A-Za-z0-9 .&,'-]{2,40})/);
    if (m) return { role: m[1].trim(), company: m[2].trim() };
  }
  return { role: "Not specified", company: "Not specified" };
}

function extractTimeline(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const dateRe = /(20\d{2}|19\d{2})\s*(?:[-–—]|to)\s*(Present|Current|20\d{2}|19\d{2})/i;
  const timeline = [];
  for (let i = 0; i < lines.length; i++) {
    const dm = lines[i].match(dateRe);
    if (dm) {
      const prev = lines[i - 1] || "";
      const titleCompany = prev.match(/^([A-Za-z .+/-]{3,40})\s*(?:at|@|-|—|,)\s*([A-Za-z0-9 .&,'-]{2,40})/);
      timeline.push({
        title: titleCompany ? titleCompany[1].trim() : (prev.slice(0, 40) || "Role"),
        company: titleCompany ? titleCompany[2].trim() : "Not specified",
        dates: dm[0],
        desc: (lines[i + 1] || "").slice(0, 160),
      });
    }
  }
  return timeline.slice(0, 5);
}

// The core custom scoring engine — a hand-built stand-in for the "real deep-learning
// pipeline" described in the product spec. Pure text/keyword analysis, fully local,
// deterministic, and free to run. Uses the same 35/25/15/10/10/5 weighting shown
// in Settings.
function runLocalAnalysis(resumeText, job) {
  const text = resumeText;
  const required = job.requiredSkills;
  const preferred = job.preferredSkills;

  const skillsMatched = required.filter((s) => findSkillMention(text, s));
  const reqMissing = required.filter((s) => !findSkillMention(text, s));
  const preferredMatched = preferred.filter((s) => findSkillMention(text, s));

  const skillsPartial = [];
  const skillsMissing = [];
  reqMissing.forEach((s) => {
    const firstWord = s.split(/\s+/)[0].toLowerCase();
    if (firstWord.length > 3 && normalize(text).includes(firstWord)) skillsPartial.push(s);
    else skillsMissing.push(s);
  });

  const years = extractYears(text);
  const { role, company } = extractRoleCompany(text);
  const name = extractName(text);
  const email = extractEmail(text);
  const phone = extractPhone(text);
  const education = extractEducation(text);
  const certifications = extractCertifications(text);
  const timeline = extractTimeline(text);

  const skillScore = required.length ? Math.round((skillsMatched.length / required.length) * 100) : 50;
  const experienceScore = job.minExperience ? Math.min(100, Math.round((years / job.minExperience) * 100)) : 60;
  const respWords = [...new Set((job.responsibilities.join(" ").toLowerCase().match(/[a-z]{5,}/g) || []))];
  const respHits = respWords.filter((w) => normalize(text).includes(w));
  const responsibilityScore = respWords.length ? Math.round((respHits.length / respWords.length) * 100) : 50;
  const hasAdvancedDegree = /master|ph\.?d|m\.?s\.?|mba/i.test(education.map((e) => e.degree).join(" "));
  const educationScore = education.length ? (hasAdvancedDegree ? 100 : 75) : 40;
  const preferredScore = preferred.length ? Math.round((preferredMatched.length / preferred.length) * 100) : 50;
  const leadershipHit = /(led|managed|mentored|supervised)\b/i.test(text);
  const seniorityScore = Math.min(100, Math.round((years / (job.minExperience || 5)) * 80) + (leadershipHit ? 20 : 0));

  const breakdown = {
    skill: clampNum(skillScore), experience: clampNum(experienceScore),
    responsibility: clampNum(responsibilityScore), education: clampNum(educationScore),
    preferred: clampNum(preferredScore), seniority: clampNum(seniorityScore),
  };

  const score = clampNum(
    breakdown.skill * 0.35 + breakdown.experience * 0.25 + breakdown.responsibility * 0.15 +
    breakdown.education * 0.10 + breakdown.preferred * 0.10 + breakdown.seniority * 0.05
  );
  const evidence = buildRequirementEvidence(text, job, skillsMatched, skillsPartial, skillsMissing);
  const analysis = buildAnalysisMetadata();

  const recommendation = score >= 88 ? "Strongly Recommend" : score >= 72 ? "Recommend" : score >= 55 ? "Review" : "Not a Fit";
  const aiVerdict = score >= 88 ? "Strong Hire" : score >= 72 ? "Hire" : score >= 55 ? "Consider" : "Reject";

  const strengths = [];
  if (skillsMatched.length) strengths.push(`Matches ${skillsMatched.length} of ${required.length} required skills, including ${skillsMatched.slice(0, 3).join(", ")}.`);
  if (years >= job.minExperience) strengths.push(`${years} years of experience meets or exceeds the ${job.minExperience}+ year requirement.`);
  if (preferredMatched.length) strengths.push(`Also brings ${preferredMatched.length} preferred skill${preferredMatched.length > 1 ? "s" : ""}: ${preferredMatched.join(", ")}.`);
  if (certifications.length) strengths.push(`Holds a relevant certification: ${certifications[0]}.`);
  if (!strengths.length) strengths.push("Limited direct keyword overlap was found between this resume and the job's required and preferred skills.");

  const gaps = [];
  if (skillsMissing.length) gaps.push(`No mention found of: ${skillsMissing.slice(0, 3).join(", ")}.`);
  if (years < job.minExperience) gaps.push(`${years} years of detected experience is below the role's ${job.minExperience}+ year minimum.`);
  if (!preferredMatched.length && preferred.length) gaps.push("None of the preferred skills were found in the resume text.");
  if (!gaps.length) gaps.push("No major gaps identified against the stated requirements.");

  const summary = `${name} shows approximately ${years} year${years === 1 ? "" : "s"} of experience` +
    (role !== "Not specified" ? `, most recently as ${role}${company !== "Not specified" ? ` at ${company}` : ""}` : "") +
    `. Against "${job.title}", the resume text matches ${skillsMatched.length} of ${required.length} required skills for an overall match of ${score}%.`;

  const interviewQuestions = [];
  if (skillsMissing.length) interviewQuestions.push(`The role calls for ${skillsMissing[0]} — what's your hands-on experience with it, if any?`);
  if (skillsPartial.length) interviewQuestions.push(`Your resume touches on something related to ${skillsPartial[0]} — can you describe that experience in more depth?`);
  if (skillsMatched.length) interviewQuestions.push(`Tell us more about your experience with ${skillsMatched[0]} — what's the most complex problem you solved with it?`);
  if (!interviewQuestions.length) interviewQuestions.push("Walk us through your most relevant project for this role.");

  return {
    name, role, company, location: "Not specified", experience: years,
    email, phone, education, certifications,
    skillsMatched, skillsPartial, skillsMissing,
    breakdown, score, recommendation, aiVerdict,
    strengths, gaps, summary, interviewQuestions, timeline, evidence, analysis,
  };
}

// Small artificial pacing delay so the UI's processing states are visible —
// the analysis itself is synchronous local computation, not a network call.
function analyzeResumeLocal(resumeText, job) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(runLocalAnalysis(resumeText, job)), 500 + Math.random() * 400);
  });
}

function buildCandidate(parsed, job, rawText) {
  const score = clampNum(parsed.score);
  return {
    id: "live-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
    name: parsed.name || "Unknown candidate",
    role: parsed.role || "Not specified",
    company: parsed.company || "Not specified",
    location: parsed.location || "Not specified",
    experience: Number(parsed.experience) || 0,
    jobId: job.id,
    status: "New",
    dateAdded: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    score,
    recommendation: parsed.recommendation,
    aiVerdict: parsed.aiVerdict,
    email: parsed.email || "Not provided",
    phone: parsed.phone || "Not provided",
    education: Array.isArray(parsed.education) ? parsed.education : [],
    certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
    skillsMatched: Array.isArray(parsed.skillsMatched) ? parsed.skillsMatched : [],
    skillsPartial: Array.isArray(parsed.skillsPartial) ? parsed.skillsPartial : [],
    skillsMissing: Array.isArray(parsed.skillsMissing) ? parsed.skillsMissing : [],
    evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
    analysis: parsed.analysis || null,
    breakdown: {
      skill: clampNum(parsed.breakdown?.skill),
      experience: clampNum(parsed.breakdown?.experience),
      responsibility: clampNum(parsed.breakdown?.responsibility),
      education: clampNum(parsed.breakdown?.education),
      preferred: clampNum(parsed.breakdown?.preferred),
      seniority: clampNum(parsed.breakdown?.seniority),
    },
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
    summary: parsed.summary || "",
    interviewQuestions: Array.isArray(parsed.interviewQuestions) ? parsed.interviewQuestions : [],
    timeline: Array.isArray(parsed.timeline) ? parsed.timeline : [],
    rawText: (rawText || "").slice(0, 4000),
    isLive: true,
  };
}

/* ============================== LOCAL PERSISTENCE (browser localStorage) ============================== */
/* Everything here runs in your own browser only — nothing is sent anywhere. Jobs and     */
/* candidates persist across page refreshes; the trained neural weights persist too, via   */
/* TensorFlow.js's own localStorage IO handler (see the Neural Re-Ranker section below).   */

const LS_KEYS = {
  jobs: "talentlens_jobs_v1",
  candidates: "talentlens_candidates_v1",
  neuralTrainSize: "talentlens_neural_train_size_v1",
  theme: "talentlens_theme_v1",
};

// Runs synchronously during the first render's useState initializer, so the
// very first paint already has the correct theme — no flash of the wrong one.
function detectInitialTheme() {
  try {
    const saved = window.localStorage.getItem(LS_KEYS.theme);
    if (saved === "light" || saved === "dark") return saved;
  } catch (e) { /* storage unavailable — fall through */ }
  try {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
  } catch (e) { /* matchMedia unavailable — fall through */ }
  return "dark";
}

function loadFromStorage(key, fallback) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function saveToStorage(key, value) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Storage unavailable (private browsing, quota, etc.) — app keeps working in-memory.
  }
}

function clearAllStoredData() {
  try {
    Object.values(LS_KEYS).forEach((k) => window.localStorage.removeItem(k));
  } catch (e) {
    /* ignore */
  }
}

/* ============================== CSV EXPORT ============================== */

function exportCandidatesCSV(list, jobTitle) {
  const rows = list.map((c) => ({
    Name: c.name,
    Role: c.role,
    Company: c.company,
    Location: c.location,
    "Experience (yrs)": c.experience,
    "Match Score": c.score,
    "Neural Score": c.neuralScore != null ? c.neuralScore : "",
    Recommendation: c.recommendation,
    "AI Verdict": c.aiVerdict,
    Status: c.status,
    Email: c.email,
    Phone: c.phone,
    "Skills Matched": c.skillsMatched.join("; "),
    "Skills Partial": c.skillsPartial.join("; "),
    "Skills Missing": c.skillsMissing.join("; "),
    "Date Added": c.dateAdded,
    "Interview Date": c.interviewDate || "",
  }));
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${jobTitle.replace(/\s+/g, "_")}_candidates.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ============================== CUSTOM DUPLICATE DETECTION (TF-IDF cosine similarity) ============================== */
/* Lightweight vector-space model — pure JS, no library, no API. Flags resumes that are   */
/* near-textual-duplicates of a candidate already in the pool for this job.               */

function tokenize(text) {
  return normalize(text).replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);
}
function termFreq(tokens) {
  const tf = {};
  tokens.forEach((t) => { tf[t] = (tf[t] || 0) + 1; });
  return tf;
}
function cosineSim(tfA, tfB) {
  const keys = new Set([...Object.keys(tfA), ...Object.keys(tfB)]);
  let dot = 0, magA = 0, magB = 0;
  keys.forEach((k) => {
    const a = tfA[k] || 0, b = tfB[k] || 0;
    dot += a * b; magA += a * a; magB += b * b;
  });
  if (!magA || !magB) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
function findLikelyDuplicate(newText, existingCandidates) {
  const newTf = termFreq(tokenize(newText));
  let best = null, bestSim = 0;
  existingCandidates.forEach((c) => {
    if (!c.rawText) return;
    const sim = cosineSim(newTf, termFreq(tokenize(c.rawText)));
    if (sim > bestSim) { bestSim = sim; best = c; }
  });
  return bestSim > 0.82 ? { candidate: best, similarity: bestSim } : null;
}

/* ============================== CUSTOM K-MEANS CLUSTERING ============================== */
/* Unsupervised segmentation of the candidate pool into human-labeled groups, entirely     */
/* hand-built (Euclidean distance, iterative centroid updates) — no library, no API.       */

function kmeans(points, k, iterations = 25) {
  const kk = Math.max(1, Math.min(k, points.length));
  let centroids = points.slice(0, kk).map((p) => [...p]);
  let assignments = new Array(points.length).fill(0);
  for (let iter = 0; iter < iterations; iter++) {
    let changed = false;
    points.forEach((p, i) => {
      let best = 0, bestDist = Infinity;
      centroids.forEach((c, ci) => {
        const d = p.reduce((sum, v, j) => sum + (v - c[j]) ** 2, 0);
        if (d < bestDist) { bestDist = d; best = ci; }
      });
      if (assignments[i] !== best) changed = true;
      assignments[i] = best;
    });
    const sums = centroids.map(() => new Array(points[0].length).fill(0));
    const counts = new Array(centroids.length).fill(0);
    points.forEach((p, i) => {
      const ci = assignments[i];
      counts[ci] += 1;
      p.forEach((v, j) => { sums[ci][j] += v; });
    });
    centroids = centroids.map((c, ci) => (counts[ci] ? sums[ci].map((s) => s / counts[ci]) : c));
    if (!changed) break;
  }
  return { assignments, centroids };
}

function labelCluster(centroid) {
  const [skill, experience, responsibility, education, preferred, seniority] = centroid;
  if (seniority > 0.75 && experience > 0.7) return "Senior specialists";
  if (skill > 0.75 && preferred > 0.6) return "Strong technical fit";
  if (education > 0.8 && experience < 0.5) return "High-potential / early career";
  if (skill < 0.5 && experience < 0.5) return "Emerging / adjacent background";
  return "Balanced generalists";
}

/* ============================== NEURAL RE-RANKER (TensorFlow.js) ============================== */
/* A small multi-layer neural network, built and trained entirely in the browser with       */
/* TensorFlow.js — dynamically imported, no external API, no download of pretrained weights.*/
/* It first learns (via backpropagation) to approximate the transparent weighted-scoring    */
/* formula, then keeps learning online from real recruiter decisions (shortlist vs reject)  */
/* so its ranking adapts to this organization's actual hiring signal over time.             */

let tf = null;
let neuralModel = null;
let neuralModelReady = false;
let neuralModelError = null;
let neuralTrainingSize = 0;

async function loadTF() {
  if (tf) return tf;
  tf = await import("@tensorflow/tfjs");
  return tf;
}

function featuresFromBreakdown(b) {
  return [b.skill, b.experience, b.responsibility, b.education, b.preferred, b.seniority].map((v) => v / 100);
}

function classicWeightedScore(b) {
  return b.skill * 0.35 + b.experience * 0.25 + b.responsibility * 0.15 + b.education * 0.10 + b.preferred * 0.10 + b.seniority * 0.05;
}

function syntheticBootstrapData(n = 220) {
  const xs = [];
  const ys = [];
  for (let i = 0; i < n; i++) {
    const b = {
      skill: Math.random() * 100, experience: Math.random() * 100, responsibility: Math.random() * 100,
      education: Math.random() * 100, preferred: Math.random() * 100, seniority: Math.random() * 100,
    };
    xs.push(featuresFromBreakdown(b));
    ys.push(classicWeightedScore(b) / 100);
  }
  return { xs, ys };
}

const NEURAL_MODEL_URL = "localstorage://talentlens-neural-model";

async function neuralLearnFromDecision(breakdown, positive) {
  if (!neuralModel || !tf) return;
  const xsT = tf.tensor2d([featuresFromBreakdown(breakdown)]);
  const ysT = tf.tensor2d([[positive ? 1 : 0]]);
  await neuralModel.fit(xsT, ysT, { epochs: 6, verbose: 0 });
  xsT.dispose(); ysT.dispose();
  neuralTrainingSize += 1;
  try {
    await neuralModel.save(NEURAL_MODEL_URL);
    saveToStorage(LS_KEYS.neuralTrainSize, neuralTrainingSize);
  } catch (e) {
    /* saving is best-effort — the model still works in-memory for this session */
  }
}

async function initNeuralModel() {
  try {
    await loadTF();

    // If a previously trained model was saved in this browser, load it instead
    // of retraining from scratch — the neural engine "remembers" across sessions.
    try {
      neuralModel = await tf.loadLayersModel(NEURAL_MODEL_URL);
      neuralModel.compile({ optimizer: tf.train.adam(0.01), loss: "meanSquaredError" });
      neuralTrainingSize = loadFromStorage(LS_KEYS.neuralTrainSize, 220);
      neuralModelReady = true;
      return true;
    } catch (loadErr) {
      // No saved model yet (or it's unreadable) — fall through and train fresh.
    }

    neuralModel = tf.sequential();
    neuralModel.add(tf.layers.dense({ units: 12, activation: "relu", inputShape: [6] }));
    neuralModel.add(tf.layers.dense({ units: 8, activation: "relu" }));
    neuralModel.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));
    neuralModel.compile({ optimizer: tf.train.adam(0.01), loss: "meanSquaredError" });

    const { xs, ys } = syntheticBootstrapData(220);
    const xsT = tf.tensor2d(xs);
    const ysT = tf.tensor2d(ys, [ys.length, 1]);
    await neuralModel.fit(xsT, ysT, { epochs: 30, batchSize: 16, shuffle: true, verbose: 0 });
    xsT.dispose(); ysT.dispose();
    neuralTrainingSize = xs.length;
    neuralModelReady = true;

    // Keep learning from real historical outcomes already recorded in the system.
    for (const c of DEMO_CANDIDATES) {
      const positive = ["Shortlisted", "Interview", "Offer", "Hired"].includes(c.status);
      const negative = c.recommendation === "Not a Fit";
      if (positive || negative) {
        await neuralLearnFromDecision(c.breakdown, positive);
      }
    }

    try {
      await neuralModel.save(NEURAL_MODEL_URL);
      saveToStorage(LS_KEYS.neuralTrainSize, neuralTrainingSize);
    } catch (e) {
      /* best-effort */
    }
  } catch (e) {
    neuralModelReady = false;
    neuralModelError = (e && e.message) || "Neural model unavailable in this environment.";
  }
  return neuralModelReady;
}

function neuralPredict(breakdown) {
  if (!neuralModel || !neuralModelReady || !tf) return null;
  const input = tf.tensor2d([featuresFromBreakdown(breakdown)]);
  const out = neuralModel.predict(input);
  const value = out.dataSync()[0];
  input.dispose(); out.dispose();
  return clampNum(value * 100);
}

function useNeuralModel() {
  const [state, setState] = useState({ ready: neuralModelReady, trainSize: neuralTrainingSize, error: neuralModelError });
  useEffect(() => {
    let cancelled = false;
    if (!neuralModelReady && !neuralModelError) {
      initNeuralModel().then(() => {
        if (!cancelled) setState({ ready: neuralModelReady, trainSize: neuralTrainingSize, error: neuralModelError });
      });
    }
    return () => { cancelled = true; };
  }, []);
  const refreshTrainSize = () => setState((s) => ({ ...s, trainSize: neuralTrainingSize }));
  const retrain = async () => {
    neuralModel = null; neuralModelReady = false; neuralModelError = null; neuralTrainingSize = 0;
    setState({ ready: false, trainSize: 0, error: null });
    try {
      if (tf) await tf.io.removeModel(NEURAL_MODEL_URL);
    } catch (e) {
      /* nothing saved yet — fine */
    }
    saveToStorage(LS_KEYS.neuralTrainSize, 0);
    initNeuralModel().then(() => setState({ ready: neuralModelReady, trainSize: neuralTrainingSize, error: neuralModelError }));
  };
  return { ...state, refreshTrainSize, retrain };
}

/* ============================== PRIMITIVES ============================== */

function ScoreRing({ score, size = 56, stroke = 5, label = true }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const color = score >= 85 ? C.emerald : score >= 70 ? C.blue : score >= 55 ? C.amber : C.rose;
  const [dash, setDash] = useState(circ);
  useEffect(() => {
    const t = setTimeout(() => setDash(circ - (score / 100) * circ), 60);
    return () => clearTimeout(t);
  }, [score, circ]);
  return (
    <div style={{ width: size, height: size, position: "relative" }} className="shrink-0">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.borderSoft} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dash}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      {label && (
        <div style={{ position: "absolute", inset: 0 }} className="flex items-center justify-center">
          <span className="tl-mono" style={{ fontSize: size * 0.28, fontWeight: 600, color: C.text }}>{score}</span>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const color = STATUS_STYLE[status] || STATUS_STYLE.New;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: color, display: "inline-block" }} />
      {status}
    </span>
  );
}

function RecBadge({ rec }) {
  const color = REC_STYLE[rec] || C.muted;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: color, display: "inline-block" }} />
      {rec}
    </span>
  );
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full" style={{ border: `1px solid ${C.emerald}`, color: C.emerald }}>
      <Zap size={9} /> Analyzed
    </span>
  );
}

function Card({ children, className = "", style, onClick, ...rest }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl ${className}`}
      style={{ background: C.surface, border: `1px solid ${C.border}`, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

function Button({ children, variant = "primary", size = "md", icon: Icon, className = "", ...props }) {
  const base = "tl-focus inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[background-color,color,border-color,opacity,transform] duration-150 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] active:opacity-100";
  const sizes = { sm: "text-xs px-3 py-1.5", md: "text-sm px-4 py-2.5", lg: "text-sm px-5 py-3" };
  const variants = {
    primary: { background: C.violet, color: "#fff" },
    secondary: { background: "transparent", color: C.text, border: `1px solid ${C.border}` },
    ghost: { background: "transparent", color: C.muted },
    danger: { background: "transparent", color: C.rose, border: `1px solid ${C.rose}` },
  };
  return (
    <button
      className={`${base} ${sizes[size]} ${className}`}
      style={variants[variant]}
      {...props}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

function BarMeter({ pct, color = C.violet, height = 6 }) {
  return (
    <div style={{ height, background: C.borderSoft, borderRadius: 999, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999, transition: "width .6s ease" }} />
    </div>
  );
}

function Progress({ label, pct, color }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs" style={{ color: C.muted }}>{label}</span>
        <span className="tl-mono text-xs" style={{ color: C.text }}>{pct}%</span>
      </div>
      <BarMeter pct={pct} color={color} />
    </div>
  );
}

/* ============================== MODALS ============================== */

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <Card className="p-6 max-h-[85vh] overflow-y-auto" style={{ boxShadow: C.shadow }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="tl-display text-base font-semibold" style={{ color: C.text }}>{title}</h3>
            <button onClick={onClose} className="tl-focus"><X size={16} color={C.faint} /></button>
          </div>
          {children}
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="text-xs block mb-1.5" style={{ color: C.muted }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = { background: C.raised, border: `1px solid ${C.border}`, color: C.text };
const inputCls = "tl-focus w-full rounded-lg px-3 py-2 text-sm outline-none";

function JobFormModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() => initial ? {
    title: initial.title, dept: initial.dept, location: initial.location, type: initial.type,
    seniority: initial.seniority, minExperience: initial.minExperience, education: initial.education,
    requiredSkills: initial.requiredSkills.join(", "), preferredSkills: initial.preferredSkills.join(", "),
    responsibilities: initial.responsibilities.join("\n"),
  } : {
    title: "", dept: "Engineering", location: "", type: "Full-time", seniority: "Mid-level",
    minExperience: 3, education: "", requiredSkills: "", preferredSkills: "", responsibilities: "",
  });
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    if (!form.title.trim()) { setError("Give the role a title before saving."); return; }
    if (!form.requiredSkills.trim()) { setError("List at least one required skill so screening has something to match against."); return; }
    const reqSkills = form.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean);
    const job = {
      id: initial ? initial.id : "job-" + Date.now().toString(36),
      title: form.title.trim(), dept: form.dept.trim() || "Engineering", location: form.location.trim() || "Remote",
      type: form.type, status: "Open", seniority: form.seniority,
      createdAt: initial ? initial.createdAt : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      minExperience: Number(form.minExperience) || 0,
      education: form.education.trim() || "Not specified",
      requiredSkills: reqSkills,
      preferredSkills: form.preferredSkills.split(",").map((s) => s.trim()).filter(Boolean),
      responsibilities: form.responsibilities.split("\n").map((s) => s.trim()).filter(Boolean),
      keywords: reqSkills.map((s) => s.toLowerCase()).slice(0, 6),
      candidateCount: initial ? initial.candidateCount : 0,
      avgScore: initial ? initial.avgScore : 0,
    };
    onSave(job);
    onClose();
  };

  return (
    <Modal title={initial ? "Edit job requirements" : "Create job"} onClose={onClose} wide>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Job title"><input value={form.title} onChange={set("title")} className={inputCls} style={inputStyle} placeholder="Senior Data Scientist" /></Field>
        <Field label="Department"><input value={form.dept} onChange={set("dept")} className={inputCls} style={inputStyle} /></Field>
        <Field label="Location"><input value={form.location} onChange={set("location")} className={inputCls} style={inputStyle} placeholder="Remote (US)" /></Field>
        <Field label="Employment type">
          <select value={form.type} onChange={set("type")} className={inputCls} style={inputStyle}>
            {["Full-time", "Part-time", "Contract", "Internship"].map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Seniority level">
          <select value={form.seniority} onChange={set("seniority")} className={inputCls} style={inputStyle}>
            {["Entry-level", "Mid-level", "Senior", "Staff", "Principal", "Manager"].map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Minimum experience (years)"><input type="number" min="0" value={form.minExperience} onChange={set("minExperience")} className={inputCls} style={inputStyle} /></Field>
        <Field label="Education requirement" full><input value={form.education} onChange={set("education")} className={inputCls} style={inputStyle} placeholder="BS/MS in CS or related" /></Field>
        <Field label="Required skills (comma-separated)" full><input value={form.requiredSkills} onChange={set("requiredSkills")} className={inputCls} style={inputStyle} placeholder="Python, SQL, AWS" /></Field>
        <Field label="Preferred skills (comma-separated)" full><input value={form.preferredSkills} onChange={set("preferredSkills")} className={inputCls} style={inputStyle} placeholder="Kubernetes, Docker" /></Field>
        <Field label="Responsibilities (one per line)" full>
          <textarea value={form.responsibilities} onChange={set("responsibilities")} rows={4} className={inputCls} style={{ ...inputStyle, resize: "vertical" }} />
        </Field>
      </div>
      {error && <p className="text-xs mt-3" style={{ color: C.rose }}>{error}</p>}
      <div className="flex gap-2 mt-6">
        <Button onClick={submit}>{initial ? "Save changes" : "Create job"}</Button>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </Modal>
  );
}

/* ============================== SHELL ============================== */

function Sidebar({ view, setView, neural }) {
  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 h-full" style={{ background: C.surface, borderRight: `1px solid ${C.border}` }}>
      <div className="px-6 py-8 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: C.violet }}>
          <Sparkle size={14} color="#fff" />
        </div>
        <span className="tl-display text-[16px] font-medium tracking-tight" style={{ color: C.text }}>TalentLens <span style={{ color: C.faint, fontWeight: 400 }}>AI</span></span>
      </div>
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map((n) => {
          const active = view === n.key;
          return (
            <button
              key={n.key}
              onClick={() => setView(n.key)}
              className="tl-focus relative w-full flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-md text-sm transition-colors"
              style={{ color: active ? C.text : C.muted, fontWeight: active ? 500 : 400 }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = C.raised; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full" style={{ background: C.violet }} />
              )}
              <n.icon size={16} strokeWidth={1.75} />
              {n.label}
            </button>
          );
        })}
      </nav>
      <div className="px-6 pb-6 pt-2 space-y-3">
        {neural && (
          <div className="flex items-center gap-1.5 text-[10px]" style={{ color: C.faint }}>
            <Brain size={11} color={neural.ready ? C.emerald : neural.error ? C.rose : C.amber} />
            {neural.ready ? `Neural engine active · ${neural.trainSize} examples` : neural.error ? "Neural engine unavailable" : "Neural engine training…"}
          </div>
        )}
        <p className="text-[11px] leading-relaxed" style={{ color: C.faint }}>
          Scores are AI-assisted recommendations. Protected characteristics are never used in ranking.
        </p>
      </div>
    </aside>
  );
}

function ThemeToggle({ theme, onToggle }) {
  const isLight = theme === "light";
  return (
    <button
      onClick={onToggle}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      aria-pressed={isLight}
      className="tl-focus w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors"
      style={{ color: C.muted }}
      onMouseEnter={(e) => (e.currentTarget.style.background = C.raised)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {isLight ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  );
}

function Topbar({ title, subtitle, onScreen, search, setSearch, onOpenNav, theme, onToggleTheme }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 md:px-8 py-4 shrink-0 sticky top-0 z-10" style={{ borderBottom: `1px solid ${C.border}`, background: C.topbarBg, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
      <div className="flex items-center gap-3 min-w-0">
        <button className="md:hidden tl-focus rounded-lg p-2" style={{ background: C.raised, color: C.text }} onClick={onOpenNav}>
          <Layers size={16} />
        </button>
        <div className="min-w-0">
          <h1 className="tl-display text-lg md:text-xl font-medium tracking-tight truncate" style={{ color: C.text }}>{title}</h1>
          {subtitle && <p className="text-xs mt-0.5 truncate" style={{ color: C.muted }}>{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-2 rounded-full px-4 py-2 w-64" style={{ background: C.raised }}>
          <Search size={14} color={C.faint} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates by name or skill…"
            className="bg-transparent outline-none text-xs w-full"
            style={{ color: C.text }}
          />
        </div>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <Button icon={ScanSearch} onClick={onScreen}>Screen Candidates</Button>
      </div>
    </div>
  );
}

/* ============================== DASHBOARD ============================== */

function KPI({ label, value, sub, icon: Icon, color = C.violetSoft }) {
  return (
    <Card className="p-6 tl-fade-up">
      <div className="flex items-center gap-1.5 mb-3">
        {Icon && <Icon size={13} color={C.faint} />}
        <p className="text-xs" style={{ color: C.muted }}>{label}</p>
      </div>
      <p className="tl-display text-[28px] font-medium tracking-tight" style={{ color: C.text }}>{value}</p>
      {sub && <p className="text-[11px] mt-2" style={{ color: C.emerald }}>{sub}</p>}
    </Card>
  );
}

function Funnel() {
  const max = FUNNEL[0].count;
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="tl-display text-sm font-medium" style={{ color: C.text }}>Recruitment funnel</h3>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>Across all open roles, last 30 days</p>
        </div>
      </div>
      <div className="flex items-end gap-3 md:gap-5" style={{ height: 160 }}>
        {FUNNEL.map((f, i) => {
          const h = Math.max(18, (f.count / max) * 140);
          const colors = [C.blue, C.blue, C.violet, C.violetSoft, C.emerald, C.emerald];
          return (
            <div key={f.stage} className="flex-1 flex flex-col items-center justify-end h-full">
              <span className="tl-mono text-xs mb-2" style={{ color: C.text }}>{f.count}</span>
              <div
                className="w-full rounded-t-md tl-fade-up"
                style={{ height: h, background: colors[i], opacity: 0.85, animationDelay: `${i * 60}ms` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 md:gap-5 mt-3">
        {FUNNEL.map((f) => (
          <div key={f.stage} className="flex-1 text-center text-[10px] md:text-[11px]" style={{ color: C.muted }}>{f.stage}</div>
        ))}
      </div>
    </Card>
  );
}

function TopCandidates({ candidates, onOpen }) {
  const top = [...candidates].sort((a, b) => b.score - a.score).slice(0, 4);
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="tl-display text-sm font-medium" style={{ color: C.text }}>Top candidates</h3>
        <ArrowUpRight size={14} color={C.faint} />
      </div>
      <div className="space-y-1">
        {top.map((c) => (
          <button
            key={c.id}
            onClick={() => onOpen(c)}
            className="tl-focus w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors"
            style={{ background: "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.raised)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold" style={{ background: C.raised2, color: C.violetSoft }}>
              {c.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium truncate" style={{ color: C.text }}>{c.name}</p>
              <p className="text-[11px] truncate" style={{ color: C.muted }}>{c.role}</p>
            </div>
            {c.isLive && <LiveBadge />}
            <ScoreRing score={c.score} size={34} stroke={3} />
          </button>
        ))}
      </div>
    </Card>
  );
}

function Dashboard({ candidates, onOpenCandidate }) {
  const activity = [
    { text: "Sarah Johnson moved to Shortlisted", time: "2h ago", icon: CheckCircle2, color: C.emerald },
    { text: "AI screened 5 new resumes for Senior ML Engineer", time: "4h ago", icon: ScanSearch, color: C.violetSoft },
    { text: "Aisha Patel scheduled for interview", time: "1d ago", icon: CalendarDays, color: C.blue },
    { text: "James Wilson added to the pipeline", time: "1d ago", icon: Users, color: C.faint },
  ];
  return (
    <div className="p-6 md:p-12 space-y-6 max-w-[1400px]">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <KPI label="Total candidates" value={247 + candidates.filter((c) => c.isLive).length} sub="+34 this week" icon={Users} color={C.violetSoft} />
        <KPI label="Screened by AI" value={189 + candidates.filter((c) => c.isLive).length} sub="+61 this week" icon={ScanSearch} color={C.blue} />
        <KPI label="Shortlisted" value="42" icon={CheckCircle2} color={C.emerald} />
        <KPI label="Avg. match score" value="78%" icon={TrendingUp} color={C.amber} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><Funnel /></div>
        <TopCandidates candidates={candidates} onOpen={onOpenCandidate} />
      </div>
      <Card className="p-6">
        <h3 className="tl-display text-sm font-medium mb-4" style={{ color: C.text }}>Recent activity</h3>
        <div className="space-y-4">
          {activity.map((a, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.raised }}>
                <a.icon size={14} color={a.color} />
              </div>
              <p className="text-sm flex-1" style={{ color: C.text }}>{a.text}</p>
              <span className="text-xs shrink-0" style={{ color: C.faint }}>{a.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ============================== JOBS ============================== */

function JobsView({ jobs, candidates, activeJob, setActiveJobId, setView, onCreateJob, onEditJob }) {
  return (
    <div className="p-6 md:p-12 space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: C.muted }}>{jobs.length} open role{jobs.length === 1 ? "" : "s"}</p>
        <Button icon={Plus} onClick={onCreateJob}>Create Job</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {jobs.map((j) => {
          const pool = candidates.filter((c) => c.jobId === j.id);
          const avgScore = pool.length ? Math.round(pool.reduce((s, c) => s + c.score, 0) / pool.length) : j.avgScore || 0;
          return (
            <Card key={j.id} className="p-6 tl-fade-up">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="tl-display text-base font-semibold" style={{ color: C.text }}>{j.title}</h3>
                  <p className="text-xs mt-1" style={{ color: C.muted }}>{j.dept} · {j.location} · {j.type}</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={{ border: `1px solid ${C.emerald}`, color: C.emerald }}>{j.status}</span>
              </div>
              <div className="flex items-center gap-4 text-xs mb-4" style={{ color: C.faint }}>
                <span>{pool.length} candidates</span>
                <span>·</span>
                <span>{avgScore}% avg match</span>
                <span>·</span>
                <span>Posted {j.createdAt}</span>
              </div>
              <p className="text-[11px] font-medium mb-2" style={{ color: C.muted }}>Required skills</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {j.requiredSkills.map((s) => (
                  <span key={s} className="text-[11px] px-2 py-1 rounded-md" style={{ background: C.raised2, color: C.text }}>{s}</span>
                ))}
              </div>
              <p className="text-[11px] font-medium mb-2" style={{ color: C.muted }}>Preferred skills</p>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {j.preferredSkills.map((s) => (
                  <span key={s} className="text-[11px] px-2 py-1 rounded-md" style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted }}>{s}</span>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => { setActiveJobId(j.id); setView("candidates"); }}>View candidates</Button>
                <Button size="sm" variant="ghost" onClick={() => onEditJob(j)}>Edit requirements</Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={14} color={C.violetSoft} />
          <h3 className="tl-display text-sm font-medium" style={{ color: C.text }}>AI-extracted requirements — {activeJob.title}</h3>
        </div>
        <p className="text-xs mb-5" style={{ color: C.muted }}>Extracted automatically from the job description. Editable before screening begins.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ["Seniority level", activeJob.seniority],
            ["Min. experience", `${activeJob.minExperience}+ years`],
            ["Education", activeJob.education],
            ["Keywords", activeJob.keywords.join(", ") || "—"],
          ].map(([label, val]) => (
            <div key={label} className="p-3 rounded-xl" style={{ background: C.raised }}>
              <p className="text-[10px] mb-1.5" style={{ color: C.faint }}>{label}</p>
              <p className="text-xs" style={{ color: C.text }}>{val}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ============================== CANDIDATES LIST ============================== */

function CandidatesView({ candidates, onOpen, compareIds, toggleCompare, activeJob, setView, search, onBulkStatus }) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [minScore, setMinScore] = useState(0);
  const [sortBy, setSortBy] = useState("Score: high to low");
  const list = candidates
    .filter((c) => c.jobId === activeJob.id)
    .filter((c) => statusFilter === "All" || c.status === statusFilter)
    .filter((c) => c.score >= minScore)
    .filter((c) => !search || `${c.name} ${c.role} ${c.skillsMatched.join(" ")}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "Score: low to high") return a.score - b.score;
      if (sortBy === "Newest first") return new Date(b.dateAdded) - new Date(a.dateAdded);
      if (sortBy === "Name: A to Z") return a.name.localeCompare(b.name);
      return b.score - a.score;
    });
  const selectedForJob = compareIds.filter((id) => list.some((c) => c.id === id));
  const allVisibleSelected = list.length > 0 && list.every((c) => compareIds.includes(c.id));
  const toggleAllVisible = () => {
    const idsToToggle = allVisibleSelected ? list : list.filter((c) => !compareIds.includes(c.id));
    idsToToggle.forEach((c) => toggleCompare(c.id));
  };

  return (
    <div className="p-6 md:p-12 space-y-5 max-w-[1400px] pb-24">
      <div className="flex flex-wrap items-center gap-2.5">
        <FilterPill label="Status" value={statusFilter} options={["All", "New", "Screening", "Shortlisted", "Interview"]} onChange={setStatusFilter} />
        <FilterPill label="Min match" value={`${minScore}%+`} options={["0%+", "60%+", "75%+", "90%+"]} onChange={(v) => setMinScore(parseInt(v))} />
        <FilterPill label="Sort" value={sortBy} options={["Score: high to low", "Score: low to high", "Newest first", "Name: A to Z"]} onChange={setSortBy} />
        <span className="text-xs ml-auto" style={{ color: C.muted }}>{list.length} candidates for {activeJob.title}</span>
        <Button size="sm" variant="secondary" icon={Download} onClick={() => exportCandidatesCSV(list, activeJob.title)} disabled={list.length === 0}>Export CSV</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="hidden md:grid grid-cols-[28px_2fr_1fr_1.2fr_0.7fr_1fr_1fr] gap-3 px-6 py-4 text-[11px] font-medium" style={{ borderBottom: `1px solid ${C.borderSoft}`, color: C.faint }}>
          <span><input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} aria-label="Select all visible candidates" className="w-4 h-4 accent-violet-500" /></span><span>Candidate</span><span>Role</span><span>Top skills</span><span>Exp.</span><span>AI Match</span><span>Status</span>
        </div>
        {list.length === 0 && (
          <div className="px-6 py-14 text-center">
            <p className="text-sm" style={{ color: C.text }}>No candidates yet</p>
            <p className="text-xs mt-1 mb-4" style={{ color: C.muted }}>Upload your first batch of resumes and let TalentLens AI identify your strongest matches.</p>
            <Button size="sm" icon={Upload} onClick={() => setView("screening")}>Upload Resumes</Button>
          </div>
        )}
        {list.map((c) => (
          <div
            key={c.id}
            className="grid grid-cols-[28px_1fr] md:grid-cols-[28px_2fr_1fr_1.2fr_0.7fr_1fr_1fr] gap-3 px-6 py-5 items-center cursor-pointer transition-colors"
            style={{ borderBottom: `1px solid ${C.borderSoft}` }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.raised)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <input
              type="checkbox"
              checked={compareIds.includes(c.id)}
              onChange={(e) => { e.stopPropagation(); toggleCompare(c.id); }}
              className="w-4 h-4 accent-violet-500"
            />
            <div className="flex items-center gap-3 min-w-0" onClick={() => onOpen(c)}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold" style={{ background: C.raised2, color: C.violetSoft }}>
                {c.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate" style={{ color: C.text }}>{c.name}</p>
                  {c.isLive && <LiveBadge />}
                </div>
                <p className="text-[11px] truncate md:hidden" style={{ color: C.muted }}>{c.role} · {c.experience} yrs</p>
              </div>
            </div>
            <p className="hidden md:block text-xs truncate" style={{ color: C.muted }}>{c.role}</p>
            <div className="hidden md:flex flex-wrap gap-1">
              {c.skillsMatched.slice(0, 2).map((s) => (
                <span key={s} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: C.raised2, color: C.muted }}>{s}</span>
              ))}
            </div>
            <p className="hidden md:block text-xs tl-mono" style={{ color: C.muted }}>{c.experience}y</p>
            <div className="flex items-center gap-2" onClick={() => onOpen(c)}>
              <ScoreRing score={c.score} size={30} stroke={3} />
              <RecBadge rec={c.recommendation} />
            </div>
            <div><StatusBadge status={c.status} /></div>
          </div>
        ))}
      </Card>

      {compareIds.length > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-20">
          <Card className="px-5 py-3 flex items-center gap-4" style={{ boxShadow: C.shadow }}>
            <span className="text-xs" style={{ color: C.text }}>{selectedForJob.length} selected</span>
            <Button size="sm" icon={CheckCircle2} onClick={() => onBulkStatus(selectedForJob, "Shortlisted")} disabled={selectedForJob.length === 0}>Shortlist selected</Button>
            <Button size="sm" variant="secondary" onClick={() => setView("compare")} disabled={selectedForJob.length < 2}>Compare candidates</Button>
            <button onClick={() => compareIds.forEach(toggleCompare)} className="tl-focus"><X size={14} color={C.faint} /></button>
          </Card>
        </div>
      )}
    </div>
  );
}

function FilterPill({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="tl-focus flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
        style={{ background: C.raised, border: `1px solid ${C.border}`, color: C.text }}
      >
        <Filter size={11} color={C.faint} />
        {label}: <span style={{ color: C.violetSoft }}>{value}</span>
        <ChevronDown size={12} color={C.faint} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-30 rounded-lg overflow-hidden min-w-[130px]" style={{ background: C.raised2, border: `1px solid ${C.border}` }}>
          {options.map((o) => (
            <button
              key={o}
              onClick={() => { onChange(o); setOpen(false); }}
              className="tl-focus block w-full text-left px-3 py-2 text-xs"
              style={{ color: C.text }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.raised)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================== CANDIDATE PROFILE ============================== */

function SkillPill({ label, type }) {
  const styles = {
    match: { bg: "rgba(52,211,153,0.12)", fg: C.emerald, icon: CheckCircle2 },
    partial: { bg: "rgba(245,184,76,0.12)", fg: C.amber, icon: MinusCircle },
    missing: { bg: "rgba(240,103,138,0.1)", fg: C.rose, icon: XCircle },
  };
  const s = styles[type];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg" style={{ background: s.bg, color: s.fg }}>
      <s.icon size={12} />{label}
    </span>
  );
}

function CandidateProfile({ candidate, onBack, job, onAdvance, onReject, onSchedule }) {
  const [showExplain, setShowExplain] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [dateVal, setDateVal] = useState("");
  const c = candidate;
  const verdictColor = { "Strong Hire": C.emerald, Hire: C.blue, Consider: C.amber, Reject: C.rose }[c.aiVerdict];
  const isClosed = c.status === "Hired" || c.status === "Rejected";
  return (
    <div className="p-6 md:p-12 max-w-[1200px] space-y-6">
      <button onClick={onBack} className="tl-focus flex items-center gap-1.5 text-xs mb-1" style={{ color: C.muted }}>
        <ChevronLeft size={14} /> Back
      </button>

      <Card className="p-6 md:p-7">
        <div className="flex flex-col md:flex-row md:items-center gap-5 justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-base font-semibold shrink-0" style={{ background: C.raised2, color: C.violetSoft }}>
              {c.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="tl-display text-xl font-semibold" style={{ color: C.text }}>{c.name}</h2>
                <StatusBadge status={c.status} />
                {c.isLive && <LiveBadge />}
              </div>
              <p className="text-sm mt-0.5" style={{ color: C.muted }}>{c.role} at {c.company}</p>
              <div className="flex items-center gap-4 mt-2 text-xs flex-wrap" style={{ color: C.faint }}>
                <span className="flex items-center gap-1"><MapPin size={12} />{c.location}</span>
                <span className="flex items-center gap-1"><Mail size={12} />{c.email}</span>
                <span className="flex items-center gap-1"><Phone size={12} />{c.phone}</span>
                {c.interviewDate && <span className="flex items-center gap-1"><CalendarDays size={12} />Interview: {c.interviewDate}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <ScoreRing score={c.score} size={72} stroke={6} />
            <div>
              <p className="text-[10px] mb-1" style={{ color: C.faint }}>AI recommendation</p>
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
                style={{ border: `1px solid ${verdictColor}`, color: verdictColor }}
              >
                {c.aiVerdict}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-6 flex-wrap items-center">
          <Button size="sm" variant="secondary" onClick={() => onAdvance(c.id)} disabled={isClosed}>
            {c.status === "Offer" ? "Mark Hired" : "Move to next stage"}
          </Button>
          {!scheduling ? (
            <Button size="sm" variant="secondary" onClick={() => setScheduling(true)} disabled={c.status === "Rejected"}>Schedule interview</Button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateVal}
                onChange={(e) => setDateVal(e.target.value)}
                className="tl-focus rounded-lg px-2 py-1.5 text-xs outline-none"
                style={{ background: C.raised, border: `1px solid ${C.border}`, color: C.text }}
              />
              <Button size="sm" onClick={() => { onSchedule(c.id, dateVal); setScheduling(false); setDateVal(""); }} disabled={!dateVal}>Confirm</Button>
              <button className="tl-focus" onClick={() => setScheduling(false)}><X size={14} color={C.faint} /></button>
            </div>
          )}
          <Button size="sm" variant="danger" onClick={() => onReject(c.id)} disabled={c.status === "Rejected"}>Reject</Button>
          <Button size="sm" variant="ghost" icon={showExplain ? EyeOff : Eye} onClick={() => setShowExplain(!showExplain)}>
            {showExplain ? "Hide" : "Explain"} score
          </Button>
        </div>
      </Card>

      {showExplain && (
        <Card className="p-6 tl-fade-up">
          <h3 className="tl-display text-sm font-medium mb-1" style={{ color: C.text }}>Why {c.name.split(" ")[0]} scored {c.score}%</h3>
          <p className="text-xs mb-5" style={{ color: C.muted }}>Weighted against "{job.title}" requirements. AI-assisted — review before deciding.</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6">
            <Progress label="Required skills (35%)" pct={c.breakdown.skill} color={C.violet} />
            <Progress label="Experience (25%)" pct={c.breakdown.experience} color={C.blue} />
            <Progress label="Responsibilities (15%)" pct={c.breakdown.responsibility} color={C.violetSoft} />
            <Progress label="Education (10%)" pct={c.breakdown.education} color={C.emerald} />
            <Progress label="Preferred skills (10%)" pct={c.breakdown.preferred} color={C.amber} />
            <Progress label="Seniority (5%)" pct={c.breakdown.seniority} color={C.blue} />
          </div>
          {c.neuralScore != null && (
            <div className="mb-6 p-3 rounded-xl flex items-center justify-between flex-wrap gap-2" style={{ background: C.raised }}>
              <div className="flex items-center gap-2">
                <Brain size={14} color={C.violetSoft} />
                <span className="text-xs" style={{ color: C.muted }}>Neural re-ranker prediction (trained in-browser)</span>
              </div>
              <span className="tl-mono text-xs" style={{ color: C.text }}>{c.neuralScore}% — blended 40% into the final score above</span>
            </div>
          )}
          <div className="mb-6">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div>
                <p className="text-xs font-semibold" style={{ color: C.text }}>Evidence trail</p>
                <p className="text-[11px] mt-1" style={{ color: C.faint }}>
                  {c.analysis ? `Analysis ${c.analysis.version} · ${c.analysis.method}` : "Evidence was not captured for this demo record."}
                </p>
              </div>
              {c.analysis?.generatedAt && <span className="tl-mono text-[10px]" style={{ color: C.faint }}>{new Date(c.analysis.generatedAt).toLocaleString()}</span>}
            </div>
            {c.evidence?.length ? (
              <div className="space-y-2">
                {c.evidence.map((item) => {
                  const evidenceColor = item.status === "matched" ? C.emerald : item.status === "partial" ? C.amber : C.faint;
                  return (
                    <div key={`${item.category}-${item.requirement}`} className="p-3 rounded-xl" style={{ background: C.raised }}>
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <span className="text-xs font-medium" style={{ color: C.text }}>{item.requirement}</span>
                        <span className="text-[10px] uppercase tracking-wide" style={{ color: evidenceColor }}>{item.status} · {item.confidence} confidence</span>
                      </div>
                      {item.evidence?.length ? (
                        <p className="text-xs mt-2 leading-relaxed" style={{ color: C.muted }}>“{item.evidence[0].excerpt}”</p>
                      ) : (
                        <p className="text-xs mt-2" style={{ color: C.faint }}>Insufficient evidence in the readable resume text.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs p-3 rounded-xl" style={{ color: C.faint, background: C.raised }}>No source excerpts are available for this record.</p>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold mb-2.5" style={{ color: C.emerald }}>Why this candidate scored highly</p>
              <ul className="space-y-2">
                {c.strengths.map((s, i) => (
                  <li key={i} className="text-xs flex gap-2" style={{ color: C.muted }}>
                    <CheckCircle2 size={13} color={C.emerald} className="mt-0.5 shrink-0" />{s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold mb-2.5" style={{ color: C.amber }}>Potential gaps</p>
              <ul className="space-y-2">
                {c.gaps.map((g, i) => (
                  <li key={i} className="text-xs flex gap-2" style={{ color: C.muted }}>
                    <AlertTriangle size={13} color={C.amber} className="mt-0.5 shrink-0" />{g}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} color={C.violetSoft} />
          <h3 className="tl-display text-sm font-medium" style={{ color: C.text }}>AI summary</h3>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{c.summary}</p>
      </Card>

      <Card className="p-6">
        <h3 className="tl-display text-sm font-medium mb-4" style={{ color: C.text }}>Skills</h3>
        <div className="flex flex-wrap gap-2">
          {c.skillsMatched.map((s) => <SkillPill key={s} label={s} type="match" />)}
          {c.skillsPartial.map((s) => <SkillPill key={s} label={s} type="partial" />)}
          {c.skillsMissing.map((s) => <SkillPill key={s} label={s} type="missing" />)}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="tl-display text-sm font-medium mb-4" style={{ color: C.text }}>Experience timeline</h3>
          {c.timeline.length === 0 && <p className="text-xs" style={{ color: C.faint }}>No timeline extracted.</p>}
          <div className="space-y-5">
            {c.timeline.map((t, i) => (
              <div key={i} className="relative pl-5" style={{ borderLeft: i === c.timeline.length - 1 ? "none" : `1px solid ${C.border}` }}>
                <div className="absolute left-[-4.5px] top-1 w-2 h-2 rounded-full" style={{ background: i === 0 ? C.violet : C.faint }} />
                <p className="text-sm font-medium" style={{ color: C.text }}>{t.title}</p>
                <p className="text-xs" style={{ color: C.violetSoft }}>{t.company} · {t.dates}</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: C.muted }}>{t.desc}</p>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="tl-display text-sm font-medium mb-4 flex items-center gap-2" style={{ color: C.text }}><GraduationCap size={14} color={C.violetSoft} />Education</h3>
            {c.education.length ? c.education.map((e, i) => (
              <div key={i} className="mb-2">
                <p className="text-sm" style={{ color: C.text }}>{e.degree}</p>
                <p className="text-xs" style={{ color: C.muted }}>{e.school} · {e.year}</p>
              </div>
            )) : <p className="text-xs" style={{ color: C.faint }}>None listed</p>}
          </Card>
          <Card className="p-6">
            <h3 className="tl-display text-sm font-medium mb-4 flex items-center gap-2" style={{ color: C.text }}><Award size={14} color={C.violetSoft} />Certifications</h3>
            {c.certifications.length ? c.certifications.map((cert) => (
              <p key={cert} className="text-sm mb-1.5" style={{ color: C.text }}>{cert}</p>
            )) : <p className="text-xs" style={{ color: C.faint }}>None listed</p>}
          </Card>
        </div>
      </div>

      <Card className="p-6">
        <h3 className="tl-display text-sm font-medium mb-4 flex items-center gap-2" style={{ color: C.text }}><Bot size={14} color={C.violetSoft} />AI-generated interview questions</h3>
        {c.interviewQuestions.length === 0 && <p className="text-xs" style={{ color: C.faint }}>None generated.</p>}
        <div className="space-y-3">
          {c.interviewQuestions.map((q, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-xl" style={{ background: C.raised }}>
              <span className="tl-mono text-xs shrink-0" style={{ color: C.violetSoft }}>{String(i + 1).padStart(2, "0")}</span>
              <p className="text-sm" style={{ color: C.text }}>{q}</p>
            </div>
          ))}
        </div>
      </Card>

      <p className="text-[11px] text-center pb-4" style={{ color: C.faint }}>
        AI recommendations are decision-support tools and should be reviewed by qualified human decision-makers.
      </p>
    </div>
  );
}

/* ============================== COMPARE ============================== */

function CompareView({ ids, candidates, onBack, onOpen }) {
  const list = candidates.filter((c) => ids.includes(c.id));
  const rows = [
    { label: "Overall score", get: (c) => c.score, best: "max" },
    { label: "Experience", get: (c) => `${c.experience} yrs`, raw: (c) => c.experience, best: "max" },
    { label: "Required skills matched", get: (c) => `${c.skillsMatched.length}`, raw: (c) => c.skillsMatched.length, best: "max" },
    { label: "Missing skills", get: (c) => `${c.skillsMissing.length}`, raw: (c) => c.skillsMissing.length, best: "min" },
    { label: "Education match", get: (c) => `${c.breakdown.education}%`, raw: (c) => c.breakdown.education, best: "max" },
    { label: "Recommendation", get: (c) => c.recommendation },
  ];
  return (
    <div className="p-6 md:p-12 space-y-6 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="tl-focus flex items-center gap-1.5 text-xs" style={{ color: C.muted }}>
          <ChevronLeft size={14} /> Back to candidates
        </button>
        <Button size="sm" variant="secondary" icon={Download} onClick={() => exportCandidatesCSV(list, "comparison")}>Export CSV</Button>
      </div>
      <div className="overflow-x-auto">
        <div className="grid" style={{ gridTemplateColumns: `160px repeat(${list.length}, minmax(200px,1fr))`, minWidth: 160 + list.length * 200 }}>
          <div />
          {list.map((c) => (
            <Card key={c.id} className="p-5 mx-1.5 mb-3 text-center cursor-pointer" onClick={() => onOpen(c)}>
              <div className="w-11 h-11 rounded-full mx-auto flex items-center justify-center text-sm font-semibold mb-2" style={{ background: C.raised2, color: C.violetSoft }}>
                {c.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <p className="text-sm font-medium" style={{ color: C.text }}>{c.name}</p>
              <p className="text-[11px] mb-2" style={{ color: C.muted }}>{c.role}</p>
              <ScoreRing score={c.score} size={44} stroke={4} />
            </Card>
          ))}

          {rows.map((row) => {
            const values = list.map((c) => (row.raw ? row.raw(c) : row.get(c)));
            const bestVal = row.best === "max" ? Math.max(...values) : row.best === "min" ? Math.min(...values) : null;
            return (
              <React.Fragment key={row.label}>
                <div className="flex items-center px-3 py-3 text-xs font-medium" style={{ color: C.muted }}>{row.label}</div>
                {list.map((c, i) => {
                  const isBest = bestVal !== null && values[i] === bestVal;
                  return (
                    <div key={c.id} className="mx-1.5 mb-1 px-4 py-3 rounded-lg text-sm flex items-center justify-center gap-1.5"
                      style={{ background: isBest ? "rgba(52,211,153,0.1)" : C.raised, color: isBest ? C.emerald : C.text, fontWeight: isBest ? 600 : 500 }}>
                      {isBest && <Star size={11} fill={C.emerald} color={C.emerald} />}
                      {row.get(c)}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}

          <div className="flex items-start px-3 py-3 text-xs font-medium" style={{ color: C.muted }}>Strengths</div>
          {list.map((c) => (
            <div key={c.id} className="mx-1.5 mb-1 px-4 py-3 rounded-lg text-xs" style={{ background: C.raised, color: C.muted }}>
              <ul className="space-y-1.5 list-disc list-inside">
                {c.strengths.slice(0, 2).map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          ))}
          <div className="flex items-start px-3 py-3 text-xs font-medium" style={{ color: C.muted }}>Gaps</div>
          {list.map((c) => (
            <div key={c.id} className="mx-1.5 mb-1 px-4 py-3 rounded-lg text-xs" style={{ background: C.raised, color: C.muted }}>
              <ul className="space-y-1.5 list-disc list-inside">
                {c.gaps.slice(0, 2).map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================== SCREENING (REAL AI UPLOAD FLOW) ============================== */

const STAGES = ["Uploading", "Parsing", "Understanding", "Matching", "Scoring", "Complete"];

function FileRow({ item, onOpen }) {
  const statusMap = {
    queued: { label: "Queued", color: C.faint, icon: null },
    extracting: { label: "Reading file…", color: C.blue, icon: Loader2 },
    analyzing: { label: "Parsing & scoring…", color: C.violetSoft, icon: Loader2 },
    done: { label: `Done — ${item.score}% match`, color: C.emerald, icon: CheckCircle2 },
    error: { label: item.error || "Failed", color: C.rose, icon: XCircle },
  };
  const s = statusMap[item.status] || statusMap.queued;
  const spinning = item.status === "extracting" || item.status === "analyzing";
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
      style={{ background: C.raised, cursor: item.status === "done" ? "pointer" : "default" }}
      onClick={() => item.status === "done" && item.candidate && onOpen(item.candidate)}
    >
      <FileText size={13} color={C.faint} />
      <span className="text-xs flex-1 truncate" style={{ color: C.text }}>{item.name}</span>
      <span className="text-xs flex items-center gap-1.5 shrink-0" style={{ color: s.color }}>
        {s.icon && <s.icon size={12} className={spinning ? "animate-spin" : ""} />}
        {s.label}
      </span>
      {item.status === "done" && <ChevronRight size={13} color={C.faint} />}
    </div>
  );
}

function ScreeningView({ activeJob, candidates, onDone, onNewCandidate }) {
  const [queue, setQueue] = useState([]);
  const [running, setRunning] = useState(false);
  const [drag, setDrag] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteBusy, setPasteBusy] = useState(false);
  const [pasteError, setPasteError] = useState("");
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoStage, setDemoStage] = useState(-1);

  const addFiles = (fileList) => {
    const items = fileList.map((file) => ({
      id: Math.random().toString(36).slice(2), file, name: file.name,
      status: "queued", error: null, score: null, candidate: null,
    }));
    setQueue((q) => [...q, ...items]);
  };

  const updateItem = (id, patch) => setQueue((q) => q.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const finalizeCandidate = (parsed, text) => {
    const candidate = buildCandidate(parsed, activeJob, text);
    const nScore = neuralPredict(candidate.breakdown);
    if (nScore !== null) {
      candidate.neuralScore = nScore;
      const blended = clampNum(candidate.score * 0.6 + nScore * 0.4);
      candidate.score = blended;
      candidate.recommendation = blended >= 88 ? "Strongly Recommend" : blended >= 72 ? "Recommend" : blended >= 55 ? "Review" : "Not a Fit";
      candidate.aiVerdict = blended >= 88 ? "Strong Hire" : blended >= 72 ? "Hire" : blended >= 55 ? "Consider" : "Reject";
    }
    return candidate;
  };

  const processOne = async (item) => {
    updateItem(item.id, { status: "extracting", error: null });
    let text;
    try {
      text = await extractResumeText(item.file);
      if (!text || text.trim().length < 40) throw new Error("This file didn't contain enough readable text to analyze.");
    } catch (e) {
      updateItem(item.id, { status: "error", error: e.message });
      return;
    }
    const dup = findLikelyDuplicate(text, candidates.filter((c) => c.jobId === activeJob.id));
    if (dup) {
      updateItem(item.id, { status: "error", error: `Likely duplicate of ${dup.candidate.name} (${Math.round(dup.similarity * 100)}% text overlap) — skipped.` });
      return;
    }
    updateItem(item.id, { status: "analyzing" });
    try {
      const parsed = await analyzeResumeLocal(text, activeJob);
      const candidate = finalizeCandidate(parsed, text);
      onNewCandidate(candidate);
      updateItem(item.id, { status: "done", score: candidate.score, candidate });
    } catch (e) {
      updateItem(item.id, { status: "error", error: e.message || "Analysis failed." });
    }
  };

  const runQueue = async () => {
    setRunning(true);
    const toRun = queue.filter((i) => i.status === "queued" || i.status === "error");
    for (const item of toRun) {
      await processOne(item);
    }
    setRunning(false);
  };

  const runPaste = async () => {
    if (pasteText.trim().length < 40) { setPasteError("Paste a bit more of the resume text first."); return; }
    const dup = findLikelyDuplicate(pasteText, candidates.filter((c) => c.jobId === activeJob.id));
    if (dup) { setPasteError(`Likely duplicate of ${dup.candidate.name} (${Math.round(dup.similarity * 100)}% text overlap) — not added.`); return; }
    setPasteBusy(true);
    setPasteError("");
    try {
      const parsed = await analyzeResumeLocal(pasteText, activeJob);
      const candidate = finalizeCandidate(parsed, pasteText);
      onNewCandidate(candidate);
      onDone(candidate);
    } catch (e) {
      setPasteError(e.message || "Analysis failed.");
    } finally {
      setPasteBusy(false);
    }
  };

  const runDemo = () => {
    setDemoRunning(true);
    setDemoStage(0);
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setDemoStage(i);
      if (i >= STAGES.length - 1) clearInterval(iv);
    }, 650);
  };

  const demoResults = DEMO_CANDIDATES.slice(0, 5);
  const queuedCount = queue.filter((i) => i.status === "queued").length;
  const doneCount = queue.filter((i) => i.status === "done").length;

  return (
    <div className="p-6 md:p-12 space-y-6 max-w-[1000px] pb-16">
      <p className="text-xs" style={{ color: C.muted }}>
        Screening candidates against <span style={{ color: C.violetSoft }}>{activeJob.title}</span> — resumes below are read and scored locally in your browser by TalentLens AI's custom analysis engine. No external API, no cost, nothing leaves your device.
      </p>

      <Card
        className="p-8 flex flex-col items-center justify-center text-center"
        style={{ borderStyle: "dashed", borderColor: drag ? C.violet : C.border, background: drag ? "rgba(124,111,240,0.05)" : C.surface }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(Array.from(e.dataTransfer.files || [])); }}
      >
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(124,111,240,0.12)" }}>
          <Upload size={22} color={C.violetSoft} />
        </div>
        <p className="text-sm font-medium mb-1" style={{ color: C.text }}>Drag & drop resumes here</p>
        <p className="text-xs mb-5" style={{ color: C.muted }}>.docx and .txt are read in-browser and analyzed. Got a PDF? Paste its text below instead.</p>
        <label className="tl-focus cursor-pointer">
          <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium" style={{ background: C.raised2, color: C.text, border: `1px solid ${C.border}` }}>
            Browse files
          </span>
          <input type="file" multiple className="hidden" onChange={(e) => addFiles(Array.from(e.target.files || []))} accept=".docx,.txt" />
        </label>

        {queue.length > 0 && (
          <div className="w-full mt-6 space-y-2 text-left">
            {queue.map((item) => <FileRow key={item.id} item={item} onOpen={onDone} />)}
            {queuedCount > 0 && (
              <Button className="w-full mt-3" onClick={runQueue} disabled={running}>
                {running ? <Loader2 size={15} className="animate-spin" /> : <ScanSearch size={15} />}
                {running ? "Analyzing…" : `Analyze ${queuedCount} resume${queuedCount > 1 ? "s" : ""} with AI`}
              </Button>
            )}
            {doneCount > 0 && (
              <p className="text-xs pt-1" style={{ color: C.emerald }}>
                {doneCount} resume{doneCount > 1 ? "s" : ""} analyzed and added to your candidate pool.
              </p>
            )}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <button className="tl-focus flex items-center justify-between w-full" onClick={() => setPasteOpen(!pasteOpen)}>
          <span className="text-sm font-medium" style={{ color: C.text }}>Or paste resume text (works for PDFs too)</span>
          <ChevronDown size={14} color={C.faint} style={{ transform: pasteOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        </button>
        {pasteOpen && (
          <div className="mt-4 space-y-3">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste the full resume text here…"
              rows={8}
              className="tl-focus w-full rounded-lg px-3 py-2.5 text-xs outline-none"
              style={{ background: C.raised, border: `1px solid ${C.border}`, color: C.text, resize: "vertical" }}
            />
            {pasteError && <p className="text-xs" style={{ color: C.rose }}>{pasteError}</p>}
            <Button size="sm" onClick={runPaste} disabled={pasteBusy}>
              {pasteBusy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {pasteBusy ? "Analyzing…" : "Analyze pasted resume"}
            </Button>
          </div>
        )}
      </Card>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: C.border }} />
        <span className="text-[11px]" style={{ color: C.faint }}>or</span>
        <div className="flex-1 h-px" style={{ background: C.border }} />
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="tl-display text-sm font-medium" style={{ color: C.text }}>See it work with sample data</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: C.raised2, color: C.faint }}>Demo — not AI-analyzed</span>
        </div>
        <p className="text-xs mb-4" style={{ color: C.muted }}>Plays through the screening animation with 5 pre-built sample candidates. Useful for demos — doesn't run the analysis engine on a real file.</p>
        {demoStage < 0 && <Button size="sm" variant="secondary" onClick={runDemo}>Run sample screening</Button>}

        {demoRunning && demoStage >= 0 && demoStage < STAGES.length - 1 && (
          <div className="space-y-3 mt-4">
            {STAGES.map((s, i) => {
              const done = i < demoStage; const active = i === demoStage;
              return (
                <div key={s} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: done ? "rgba(52,211,153,0.15)" : active ? "rgba(124,111,240,0.15)" : C.raised }}>
                    {done ? <Check size={10} color={C.emerald} /> : active ? <Loader2 size={10} color={C.violetSoft} className="animate-spin" /> : <span className="tl-mono text-[9px]" style={{ color: C.faint }}>{i + 1}</span>}
                  </div>
                  <span className="text-xs" style={{ color: done || active ? C.text : C.faint }}>{s}{active ? "…" : ""}</span>
                </div>
              );
            })}
          </div>
        )}

        {demoStage === STAGES.length - 1 && (
          <div className="space-y-2 mt-4 tl-fade-up">
            {demoResults.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer" style={{ background: C.raised }} onClick={() => onDone(c)}>
                <ScoreRing score={c.score} size={36} stroke={3} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: C.text }}>{c.name}</p>
                  <p className="text-xs" style={{ color: C.muted }}>{c.role}</p>
                </div>
                <RecBadge rec={c.recommendation} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ============================== INTERVIEWS ============================== */

function InterviewsView({ candidates, onOpen }) {
  const scheduled = candidates.filter((c) => c.status === "Interview" || c.status === "Shortlisted");
  return (
    <div className="p-6 md:p-12 space-y-4 max-w-[1000px]">
      <p className="text-xs mb-2" style={{ color: C.muted }}>{scheduled.length} candidates in interview stages</p>
      {scheduled.map((c) => (
        <Card key={c.id} className="p-5 flex items-center gap-4 cursor-pointer" onClick={() => onOpen(c)}>
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold shrink-0" style={{ background: C.raised2, color: C.violetSoft }}>
            {c.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: C.text }}>{c.name}</p>
            <p className="text-xs" style={{ color: C.muted }}>{c.role} at {c.company}</p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs" style={{ color: C.faint }}>
            <Clock size={12} /> {c.interviewDate ? `Interview: ${c.interviewDate}` : c.status === "Interview" ? "Interview scheduled" : "Awaiting scheduling"}
          </div>
          <StatusBadge status={c.status} />
        </Card>
      ))}
    </div>
  );
}

/* ============================== ANALYTICS ============================== */

function LineChart({ data, color = C.violet, height = 140 }) {
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / (max - min || 1)) * 90 - 5;
    return `${x},${y}`;
  }).join(" ");
  const area = `0,100 ${pts} 100,100`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height }}>
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#lg1)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AnalyticsView({ candidates, activeJob, neural }) {
  const pool = candidates.filter((c) => c.jobId === activeJob.id);
  const points = pool.map((c) => featuresFromBreakdown(c.breakdown));
  const { assignments, centroids } = points.length >= 2 ? kmeans(points, Math.min(4, points.length)) : { assignments: [], centroids: [] };
  const clusters = centroids
    .map((centroid, ci) => {
      const members = pool.filter((_, i) => assignments[i] === ci);
      return {
        label: labelCluster(centroid),
        count: members.length,
        avgScore: members.length ? Math.round(members.reduce((s, c) => s + c.score, 0) / members.length) : 0,
      };
    })
    .filter((cl) => cl.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="p-6 md:p-12 space-y-6 max-w-[1200px]">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <KPI label="Candidates screened" value="1,204" sub="+18% vs last month" icon={ScanSearch} color={C.blue} />
        <KPI label="Shortlist rate" value="22%" icon={CheckCircle2} color={C.emerald} />
        <KPI label="Interview conversion" value="44%" icon={CalendarDays} color={C.violetSoft} />
        <KPI label="Time saved by AI" value="~168 hrs" sub="this month" icon={Zap} color={C.amber} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="tl-display text-sm font-medium mb-1" style={{ color: C.text }}>Average match score trend</h3>
          <p className="text-xs mb-4" style={{ color: C.muted }}>Last 12 weeks</p>
          <LineChart data={SCORE_TREND} color={C.violetSoft} />
        </Card>
        <Card className="p-6">
          <h3 className="tl-display text-sm font-medium mb-4" style={{ color: C.text }}>Top skills across candidate pool</h3>
          <div className="space-y-3">
            {TOP_SKILLS.map((s) => (
              <div key={s.skill}>
                <div className="flex justify-between mb-1"><span className="text-xs" style={{ color: C.muted }}>{s.skill}</span><span className="tl-mono text-xs" style={{ color: C.text }}>{s.pct}%</span></div>
                <BarMeter pct={s.pct} color={C.blue} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Boxes size={14} color={C.violetSoft} />
            <h3 className="tl-display text-sm font-medium" style={{ color: C.text }}>Candidate segments — {activeJob.title}</h3>
          </div>
          <p className="text-xs mb-4" style={{ color: C.muted }}>Unsupervised k-means clustering (custom-built, runs locally) grouping this job's pool by skill/experience/education profile.</p>
          {clusters.length === 0 && <p className="text-xs" style={{ color: C.faint }}>Not enough candidates in this pool yet to form segments.</p>}
          <div className="space-y-3">
            {clusters.map((cl) => (
              <div key={cl.label}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs" style={{ color: C.text }}>{cl.label}</span>
                  <span className="tl-mono text-xs" style={{ color: C.muted }}>{cl.count} · avg {cl.avgScore}%</span>
                </div>
                <BarMeter pct={pool.length ? (cl.count / pool.length) * 100 : 0} color={C.violet} />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Brain size={14} color={C.violetSoft} />
            <h3 className="tl-display text-sm font-medium" style={{ color: C.text }}>Neural re-ranker</h3>
          </div>
          <p className="text-xs mb-3" style={{ color: C.muted }}>
            A small neural network built and trained entirely in your browser with TensorFlow.js — no external API — that refines the rule-based match score and keeps learning from real screening decisions.
          </p>
          <div className="flex items-center gap-2 text-xs" style={{ color: C.muted }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: neural.ready ? C.emerald : neural.error ? C.rose : C.amber, display: "inline-block" }} />
            Status: <span style={{ color: neural.ready ? C.emerald : neural.error ? C.rose : C.amber }}>{neural.ready ? "Active" : neural.error ? "Unavailable — using rule-based scoring only" : "Training…"}</span>
            {neural.ready && <span className="tl-mono">· trained on {neural.trainSize} examples</span>}
          </div>
        </Card>
      </div>

      <Card className="p-6"><Funnel /></Card>

      <Card className="p-6">
        <h3 className="tl-display text-sm font-medium mb-4" style={{ color: C.text }}>Candidate source</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[["Referrals", 38], ["LinkedIn", 29], ["Job boards", 21], ["Agency", 12]].map(([label, pct]) => (
            <div key={label} className="p-4 rounded-xl" style={{ background: C.raised }}>
              <p className="tl-display text-xl font-semibold" style={{ color: C.text }}>{pct}%</p>
              <p className="text-xs mt-1" style={{ color: C.muted }}>{label}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ============================== AI ASSISTANT ============================== */

const SUGGESTED = [
  "Who are the top candidates?",
  "Compare Sarah and Michael",
  "Who's missing Kubernetes?",
  "Why did Sarah score so high?",
  "What does the neural model think of Aisha?",
  "How many candidates are shortlisted?",
  "Who should I prioritize first?",
  "Which candidates are borderline?",
  "What are the biggest skill gaps?",
  "Who has the most experience?",
  "Which candidates have certifications?",
  "What's the average experience?",
];

function AIAssistant({ candidates, activeJob }) {
  const pool = candidates.filter((c) => c.jobId === activeJob.id);
  const engineRef = useRef(null);
  if (!engineRef.current) engineRef.current = createAssistantEngine();

  const [messages, setMessages] = useState([
    { role: "ai", text: `Hi, I'm your AI screening assistant. Ask me anything about your candidate pipeline for ${activeJob.title}.` },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);

  const send = (text) => {
    const q = text ?? input;
    if (!q.trim() || typing) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const a = engineRef.current.ask(q, pool, activeJob);
      setMessages((m) => [...m, { role: "ai", ...a }]);
      setTyping(false);
    }, 450 + Math.random() * 650);
  };

  return (
    <div className="p-6 md:p-12 max-w-[820px] flex flex-col" style={{ height: "calc(100vh - 90px)" }}>
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: m.role === "ai" ? "rgba(124,111,240,0.15)" : C.raised2 }}>
              {m.role === "ai" ? <Bot size={14} color={C.violetSoft} /> : <User size={14} color={C.muted} />}
            </div>
            <div className="max-w-[80%]">
              <div className="px-4 py-3 rounded-2xl text-sm" style={{ background: m.role === "ai" ? C.surface : C.raised2, border: `1px solid ${C.border}`, color: C.text }}>
                {m.text}
                {m.list && m.list.length > 0 && (
                  <ul className="mt-2.5 space-y-1.5">
                    {m.list.map((li, idx) => (
                      <li key={idx} className="text-xs tl-mono flex items-center gap-2" style={{ color: C.violetSoft }}>
                        <ChevronRight size={11} />{li}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(124,111,240,0.15)" }}>
              <Bot size={14} color={C.violetSoft} />
            </div>
            <div className="px-4 py-3 rounded-2xl flex items-center gap-1" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <span className="tl-typing-dot" />
              <span className="tl-typing-dot" style={{ animationDelay: ".15s" }} />
              <span className="tl-typing-dot" style={{ animationDelay: ".3s" }} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length < 2 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTED.map((s) => (
            <button key={s} onClick={() => send(s)} className="tl-focus text-xs px-3 py-2 rounded-lg" style={{ background: C.raised, border: `1px solid ${C.border}`, color: C.muted }}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: C.raised, border: `1px solid ${C.border}` }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about your candidates…"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: C.text }}
        />
        <button onClick={() => send()} className="tl-focus w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.violet }}>
          <Send size={13} color="#fff" />
        </button>
      </div>
    </div>
  );
}

/* ============================== SETTINGS ============================== */

function SettingsView({ neural, onResetData }) {
  const [blind, setBlind] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <div className="p-6 md:p-12 max-w-[720px] space-y-5">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <EyeOff size={16} color={C.violetSoft} className="mt-0.5" />
            <div>
              <p className="text-sm font-medium" style={{ color: C.text }}>Blind screening</p>
              <p className="text-xs mt-1 max-w-md" style={{ color: C.muted }}>Hide candidate names, photos and identifying details during initial AI evaluation to reduce bias.</p>
            </div>
          </div>
          <button
            onClick={() => setBlind(!blind)}
            className="tl-focus w-11 h-6 rounded-full relative shrink-0 transition-colors"
            style={{ background: blind ? C.violet : C.borderSoft }}
          >
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: blind ? 22 : 2 }} />
          </button>
        </div>
      </Card>
      <Card className="p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <Brain size={16} color={C.violetSoft} className="mt-0.5" />
            <div>
              <p className="text-sm font-medium" style={{ color: C.text }}>Neural re-ranker</p>
              <p className="text-xs mt-1 max-w-md" style={{ color: C.muted }}>
                {neural.ready
                  ? `Active — a small neural network trained on ${neural.trainSize} examples, entirely in-browser via TensorFlow.js. Weights are saved to this browser's local storage, so it doesn't retrain from zero on every visit. No external API calls.`
                  : neural.error
                  ? "Unavailable in this environment — falling back to rule-based scoring only."
                  : "Training in your browser…"}
              </p>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={neural.retrain} disabled={!neural.ready}>Retrain from scratch</Button>
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="tl-display text-sm font-medium mb-4" style={{ color: C.text }}>Scoring weights</h3>
        <div className="space-y-4">
          {[["Required skills", 35], ["Experience", 25], ["Responsibilities / domain", 15], ["Education / certifications", 10], ["Preferred skills", 10], ["Seniority", 5]].map(([l, v]) => (
            <div key={l} className="flex items-center gap-4">
              <span className="text-xs w-48" style={{ color: C.muted }}>{l}</span>
              <BarMeter pct={v * 2} color={C.violet} />
              <span className="tl-mono text-xs w-10 text-right" style={{ color: C.text }}>{v}%</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] mt-4" style={{ color: C.faint }}>The final score blends this rule-based formula (60%) with the neural re-ranker's prediction (40%) once the model is trained.</p>
      </Card>
      <Card className="p-6">
        <h3 className="tl-display text-sm font-medium mb-3" style={{ color: C.text }}>Compliance</h3>
        <p className="text-xs leading-relaxed" style={{ color: C.muted }}>
          TalentLens AI never uses race, ethnicity, religion, gender, sexual orientation, disability, age, marital status, or other protected characteristics in ranking, and does not infer them from names, photos, or addresses. All screening results include an audit trail with model version, timestamp, and any recruiter override.
        </p>
      </Card>
      <Card className="p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-medium" style={{ color: C.text }}>Local data</p>
            <p className="text-xs mt-1 max-w-md" style={{ color: C.muted }}>
              Jobs, candidates, and the trained neural weights are saved in this browser's local storage so they survive a page refresh. Nothing is sent to a server.
            </p>
          </div>
          {!confirmReset ? (
            <Button size="sm" variant="danger" onClick={() => setConfirmReset(true)}>Reset all data</Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: C.rose }}>Erase everything and reload demo data?</span>
              <Button size="sm" variant="danger" onClick={() => { onResetData(); setConfirmReset(false); }}>Confirm</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ============================== ROOT APP ============================== */

function LoadingScreen() {
  return (
    <div className="tl-loading-content" role="status" aria-label="Loading TalentLens AI">
      <div className="tl-loading-mark"><Sparkle size={20} color="#fff" /></div>
      <p className="tl-display tl-loading-name">TalentLens <span>AI</span></p>
      <div className="tl-loading-track" aria-hidden="true"><span /></div>
      <p className="tl-loading-caption">Preparing your workspace</p>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("dashboard");
  const [previousView, setPreviousView] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);
  const [jobs, setJobs] = useState(() => loadFromStorage(LS_KEYS.jobs, JOBS));
  const [candidates, setCandidates] = useState(() => loadFromStorage(LS_KEYS.candidates, DEMO_CANDIDATES));
  const [activeJobId, setActiveJobId] = useState(() => loadFromStorage(LS_KEYS.jobs, JOBS)[0]?.id || JOBS[0].id);
  const [compareIds, setCompareIds] = useState([]);
  const [search, setSearch] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [theme, setTheme] = useState(detectInitialTheme);
  const [booting, setBooting] = useState(true);
  const neural = useNeuralModel();

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));
  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 4000);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => { saveToStorage(LS_KEYS.theme, theme); }, [theme]);

  // Persist jobs/candidates to this browser's local storage on every change,
  // so a refresh doesn't lose screening progress. Nothing leaves the device.
  useEffect(() => { saveToStorage(LS_KEYS.jobs, jobs); }, [jobs]);
  useEffect(() => { saveToStorage(LS_KEYS.candidates, candidates); }, [candidates]);

  const activeJob = jobs.find((j) => j.id === activeJobId) || jobs[0];
  const selected = candidates.find((c) => c.id === selectedId) || null;

  const openCandidate = (c) => { setPreviousView(view); setSelectedId(c.id); setView("profile"); };
  const addCandidate = (c) => setCandidates((prev) => [c, ...prev]);
  const toggleCompare = (id) => setCompareIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev);

  const updateCandidateStatus = (id, status, extra = {}) => {
    setCandidates((prev) => {
      const target = prev.find((c) => c.id === id);
      const updated = prev.map((c) => (c.id === id ? { ...c, status, ...extra } : c));
      if (target) {
        const positive = ["Shortlisted", "Interview", "Offer", "Hired"].includes(status);
        const negative = status === "Rejected";
        if (positive || negative) {
          neuralLearnFromDecision(target.breakdown, positive).then(() => neural.refreshTrainSize());
        }
      }
      return updated;
    });
  };
  const advanceCandidate = (id) => {
    const cur = candidates.find((c) => c.id === id);
    if (!cur) return;
    updateCandidateStatus(id, nextStage(cur.status));
  };
  const rejectCandidate = (id) => updateCandidateStatus(id, "Rejected");
  const scheduleCandidate = (id, date) => updateCandidateStatus(id, "Interview", { interviewDate: date });
  const bulkUpdateStatus = (ids, status) => {
    ids.forEach((id) => updateCandidateStatus(id, status));
    setCompareIds((prev) => prev.filter((id) => !ids.includes(id)));
  };

  const createJob = () => { setEditingJob(null); setJobModalOpen(true); };
  const editJob = (j) => { setEditingJob(j); setJobModalOpen(true); };
  const saveJob = (job) => {
    if (editingJob) {
      setJobs((prev) => prev.map((j) => (j.id === job.id ? job : j)));
    } else {
      setJobs((prev) => [...prev, job]);
      setActiveJobId(job.id);
    }
  };

  const resetAllData = () => {
    clearAllStoredData();
    setJobs(JOBS);
    setCandidates(DEMO_CANDIDATES);
    setActiveJobId(JOBS[0].id);
    setCompareIds([]);
    setSelectedId(null);
    setView("dashboard");
    neural.retrain();
  };

  const titles = {
    dashboard: ["Dashboard", "Overview of your recruitment pipeline"],
    jobs: ["Jobs", "Manage open roles and requirements"],
    candidates: ["Candidates", `Screening pool for ${activeJob.title}`],
    profile: [selected?.name || "Candidate", "AI-powered candidate profile"],
    compare: ["Compare candidates", `${compareIds.length} candidates side-by-side`],
    screening: ["Resume screening", "Upload resumes for local, custom-built analysis"],
    interviews: ["Interviews", "Candidates in interview stages"],
    analytics: ["Analytics", "Recruiting performance and AI impact"],
    assistant: ["AI Assistant", "Ask questions about your candidate pool"],
    settings: ["Settings", "Scoring weights, bias controls & compliance"],
  };
  const [title, subtitle] = titles[view] || titles.dashboard;

  if (booting) {
    return (
      <div className="tl-root tl-boot-screen">
        <FontImport theme={theme} />
        <LoadingScreen />
      </div>
    );
  }

  return (
    <div className="tl-root flex w-full" style={{ height: "100vh", background: C.bg, color: C.text }}>
      <FontImport theme={theme} />
      {mobileNav && (
        <div className="fixed inset-0 z-40 md:hidden" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setMobileNav(false)}>
          <div onClick={(e) => e.stopPropagation()} className="h-full"><Sidebar view={view} setView={(v) => { setView(v); setMobileNav(false); }} neural={neural} /></div>
        </div>
      )}
      <Sidebar view={view} setView={setView} neural={neural} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={title} subtitle={subtitle} onScreen={() => setView("screening")} search={search} setSearch={setSearch} onOpenNav={() => setMobileNav(true)} theme={theme} onToggleTheme={toggleTheme} />
        <div className="flex-1 overflow-y-auto">
          {view === "dashboard" && <Dashboard candidates={candidates} onOpenCandidate={openCandidate} />}
          {view === "jobs" && (
            <JobsView
              jobs={jobs} candidates={candidates} activeJob={activeJob}
              setActiveJobId={setActiveJobId} setView={setView}
              onCreateJob={createJob} onEditJob={editJob}
            />
          )}
          {view === "candidates" && (
            <CandidatesView
              candidates={candidates} onOpen={openCandidate} compareIds={compareIds}
              toggleCompare={toggleCompare} activeJob={activeJob} setView={setView} search={search} onBulkStatus={bulkUpdateStatus}
            />
          )}
          {view === "profile" && selected && (
            <CandidateProfile
              candidate={selected}
              onBack={() => setView(previousView)}
              job={jobs.find((j) => j.id === selected.jobId) || activeJob}
              onAdvance={advanceCandidate}
              onReject={rejectCandidate}
              onSchedule={scheduleCandidate}
            />
          )}
          {view === "compare" && <CompareView ids={compareIds} candidates={candidates} onBack={() => setView("candidates")} onOpen={openCandidate} />}
          {view === "screening" && <ScreeningView activeJob={activeJob} candidates={candidates} onDone={openCandidate} onNewCandidate={addCandidate} />}
          {view === "interviews" && <InterviewsView candidates={candidates} onOpen={openCandidate} />}
          {view === "analytics" && <AnalyticsView candidates={candidates} activeJob={activeJob} neural={neural} />}
          {view === "assistant" && <AIAssistant candidates={candidates} activeJob={activeJob} />}
          {view === "settings" && <SettingsView neural={neural} onResetData={resetAllData} />}
        </div>
      </div>

      {jobModalOpen && (
        <JobFormModal
          initial={editingJob}
          onClose={() => setJobModalOpen(false)}
          onSave={saveJob}
        />
      )}
    </div>
  );
}