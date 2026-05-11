/**
 * demo-registry.ts
 *
 * Static demo data registry. Loads all fixture data for the /demo pages.
 * No Supabase, no API calls, no runtime execution required.
 * All data is statically typed and consumed purely by demo UI components.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DemoInputField {
  key:            string;
  label:          string;
  type:           "text" | "string" | "select";
  required:       boolean;
  placeholder?:   string;
  options?:       string[];
  default_value?: string;
}

export interface DemoOutputField {
  key:   string;
  label: string;
  type:  "text" | "string";
}

export interface DemoCasePackNode {
  id:    string;
  label: string;
  role:  string;
  outputKeys: string[];
}

export interface DemoBridgeEdge {
  from:       string;
  to:         string;
  label:      string;
  handoffKeys: string[];
}

export interface DemoTraceEvent {
  step:       number;
  nodeId:     string;
  nodeLabel:  string;
  eventType:  "start" | "complete";
  durationMs: number;
}

export interface DemoSuite {
  slug:          string;
  title:         string;
  description:   string;
  category:      string;
  appType:       "graph" | "casepack";
  appSlug:       string;
  stepCount:     number;
  accentColor:   string;
  icon:          string;
  inputFields:   DemoInputField[];
  sampleInput:   Record<string, string>;
  outputFields:  DemoOutputField[];
  sampleOutput:  Record<string, string>;
  nodes:         DemoCasePackNode[];
  edges:         DemoBridgeEdge[];
  traceTimeline: DemoTraceEvent[];
}

// ── Corporate PR Suite ─────────────────────────────────────────────────────────

const CORPORATE_PR: DemoSuite = {
  slug:        "corporate-pr-suite",
  title:       "Corporate PR Turnkey Suite",
  description: "Transform your company details into a full PR kit: brand positioning, answer card, press release, company profile, web brochure, and a consistency audit — all in one pipeline.",
  category:    "Corporate Communications",
  appType:     "graph",
  appSlug:     "corporate-pr-suite",
  stepCount:   7,
  accentColor: "#6c63ff",
  icon:        "📣",
  inputFields: [
    { key: "company_name",  label: "Company Name",            type: "string", required: true,  placeholder: "Acme AI Solutions" },
    { key: "industry",      label: "Industry / Sector",       type: "text",   required: true,  placeholder: "Artificial Intelligence / SaaS" },
    { key: "announcement",  label: "Key Announcement or News", type: "text",  required: true,  placeholder: "Launching StrategyGPT for mid-market planning..." },
    { key: "company_url",   label: "Company Website (optional)", type: "string", required: false, placeholder: "https://example.com" },
    { key: "founding_year", label: "Founding Year (optional)",   type: "string", required: false, placeholder: "2021" },
  ],
  sampleInput: {
    company_name:  "Acme AI Solutions",
    industry:      "Artificial Intelligence / SaaS",
    announcement:  "Acme AI Solutions is launching StrategyGPT — an AI-powered strategic planning assistant that helps mid-market companies build 90-day growth plans in under 10 minutes.",
    company_url:   "https://acmeai.example.com",
    founding_year: "2021",
  },
  outputFields: [
    { key: "brand_positioning_statement", label: "Brand Positioning Statement", type: "text" },
    { key: "key_messages",                label: "Key Messages",                type: "text" },
    { key: "answer_card",                 label: "Answer Card",                 type: "text" },
    { key: "press_release",               label: "Press Release",               type: "text" },
    { key: "company_profile",             label: "Company Profile",             type: "text" },
    { key: "tagline",                     label: "Tagline",                     type: "text" },
    { key: "consistency_audit",           label: "Consistency Audit",           type: "text" },
    { key: "risk_notes",                  label: "Risk Notes",                  type: "text" },
  ],
  sampleOutput: {
    brand_positioning_statement: "For mid-market leaders who need strategic clarity fast, Acme AI Solutions delivers AI-powered 90-day growth plans in minutes — replacing weeks of consultant-led planning with instant, actionable strategy.",
    key_messages:                "1. Speed without sacrifice: Build a full 90-day strategic plan in under 10 minutes, not weeks.\n2. Built for the mid-market: Unlike enterprise-only tools, Acme AI is sized and priced for 50-500 person companies.\n3. AI that thinks like a strategist: Powered by LLMs trained on proven planning frameworks.",
    answer_card:                 "Q: What does Acme AI Solutions do?\nA: Acme AI Solutions helps mid-market companies build comprehensive 90-day strategic growth plans using AI. Our product, StrategyGPT, guides leadership teams through a structured planning process and delivers an actionable plan in under 10 minutes.",
    press_release:               "FOR IMMEDIATE RELEASE\n\nAcme AI Solutions Launches StrategyGPT to Bring AI-Powered Strategic Planning to Mid-Market Companies\n\nNew AI platform enables leadership teams to build complete 90-day growth plans in under 10 minutes...",
    company_profile:             "Acme AI Solutions is an artificial intelligence company dedicated to making strategic planning accessible to mid-market businesses. Founded in 2021, the company develops AI-powered tools that help leadership teams build and execute growth strategies faster than traditional approaches allow.",
    tagline:                     "Strategy at AI speed. Plans in minutes.",
    consistency_audit:           "Tone Consistency: All materials use a confident, professional tone aligned with a B2B AI SaaS brand. Message Alignment: The brand positioning statement is consistently reflected across all materials.\n\nOverall Assessment: Materials are internally consistent and well-aligned. One factual claim requires validation before distribution.",
    risk_notes:                  "The '10-minute' speed claim is repeated across multiple materials and is the primary factual risk. Recommend obtaining documented benchmarks before public distribution.",
  },
  nodes: [
    { id: "company_intake",           label: "Company Intake",         role: "Senior brand strategist", outputKeys: ["company_overview", "target_audience", "key_differentiators"] },
    { id: "brand_positioning",        label: "Brand Positioning",      role: "Brand positioning expert", outputKeys: ["brand_positioning_statement", "key_messages", "tone_guidelines"] },
    { id: "answer_card",              label: "Answer Card",            role: "FAQ specialist", outputKeys: ["answer_card", "faq_summary"] },
    { id: "press_release",            label: "Press Release",          role: "PR writer", outputKeys: ["headline", "press_release"] },
    { id: "company_profile",          label: "Company Profile",        role: "Corporate writer", outputKeys: ["company_profile", "founding_story"] },
    { id: "web_brochure",             label: "Web Brochure",           role: "Content strategist", outputKeys: ["tagline", "web_brochure"] },
    { id: "message_consistency_audit",label: "Consistency Audit",      role: "Communications auditor", outputKeys: ["consistency_audit", "risk_notes", "audit_score"] },
  ],
  edges: [
    { from: "company_intake",            to: "brand_positioning",         label: "Intake → Positioning",   handoffKeys: ["company_overview", "target_audience", "key_differentiators"] },
    { from: "brand_positioning",         to: "answer_card",               label: "Positioning → Answer",   handoffKeys: ["brand_positioning_statement", "key_messages", "tone_guidelines"] },
    { from: "answer_card",               to: "press_release",             label: "Answer → Press",         handoffKeys: ["brand_positioning_statement", "key_messages", "answer_card"] },
    { from: "press_release",             to: "company_profile",           label: "Press → Profile",        handoffKeys: ["brand_positioning_statement", "key_messages", "press_release"] },
    { from: "company_profile",           to: "web_brochure",              label: "Profile → Brochure",     handoffKeys: ["brand_positioning_statement", "company_profile"] },
    { from: "web_brochure",              to: "message_consistency_audit", label: "Brochure → Audit",       handoffKeys: ["brand_positioning_statement", "key_messages", "answer_card", "press_release"] },
  ],
  traceTimeline: [
    { step: 1, nodeId: "company_intake",            nodeLabel: "Company Intake",         eventType: "complete", durationMs: 1240 },
    { step: 2, nodeId: "brand_positioning",         nodeLabel: "Brand Positioning",      eventType: "complete", durationMs: 1580 },
    { step: 3, nodeId: "answer_card",               nodeLabel: "Answer Card",            eventType: "complete", durationMs: 1190 },
    { step: 4, nodeId: "press_release",             nodeLabel: "Press Release",          eventType: "complete", durationMs: 2100 },
    { step: 5, nodeId: "company_profile",           nodeLabel: "Company Profile",        eventType: "complete", durationMs: 1820 },
    { step: 6, nodeId: "web_brochure",              nodeLabel: "Web Brochure",           eventType: "complete", durationMs: 1650 },
    { step: 7, nodeId: "message_consistency_audit", nodeLabel: "Consistency Audit",      eventType: "complete", durationMs: 1380 },
  ],
};

// ── Book-to-Agent Suite ────────────────────────────────────────────────────────

const BOOK_TO_AGENT: DemoSuite = {
  slug:        "book-to-agent",
  title:       "Book-to-Agent Suite",
  description: "Transform any non-fiction book into a personalised AI knowledge agent. Get a structured knowledge summary, insight Q&A, personalised interpretation, action plan, reflection questions, and risk notes.",
  category:    "Learning & Knowledge",
  appType:     "graph",
  appSlug:     "book-to-agent",
  stepCount:   5,
  accentColor: "#34d399",
  icon:        "📚",
  inputFields: [
    { key: "book_title",      label: "Book Title",                          type: "string", required: true,  placeholder: "Thinking, Fast and Slow" },
    { key: "book_author",     label: "Author",                              type: "string", required: true,  placeholder: "Daniel Kahneman" },
    { key: "reader_goal",     label: "Your Goal for Reading This Book",     type: "text",   required: true,  placeholder: "I want to understand cognitive biases..." },
    { key: "key_chapters",    label: "Key Chapters or Sections (optional)", type: "text",   required: false, placeholder: "Part I: Two Systems, Part II: Heuristics..." },
    { key: "reading_context", label: "Reading Context (optional)",          type: "text",   required: false, placeholder: "I am a VC analyst who..." },
  ],
  sampleInput: {
    book_title:      "Thinking, Fast and Slow",
    book_author:     "Daniel Kahneman",
    reader_goal:     "I want to understand my own cognitive biases so I can make better business decisions under uncertainty and avoid common thinking traps when evaluating investment opportunities.",
    key_chapters:    "Part I: Two Systems, Part II: Heuristics and Biases, Part IV: Choices",
    reading_context: "I am a venture capital analyst who frequently makes high-stakes decisions under time pressure.",
  },
  outputFields: [
    { key: "book_knowledge_summary",   label: "Knowledge Summary",           type: "text" },
    { key: "insight_qa",               label: "Insight Q&A",                 type: "text" },
    { key: "personalized_interpretation", label: "Personalised Interpretation", type: "text" },
    { key: "action_plan",              label: "Action Plan",                 type: "text" },
    { key: "next_steps",               label: "Next Steps",                  type: "text" },
    { key: "reflection_questions",     label: "Reflection Questions",        type: "text" },
    { key: "risk_notes",               label: "Risk Notes",                  type: "text" },
  ],
  sampleOutput: {
    book_knowledge_summary:    "Kahneman's central insight is that human judgment is governed by two systems. System 1 generates fast, confident conclusions from pattern recognition. System 2 is slower, more accurate, and required for statistical reasoning — but it is lazy and frequently defers to System 1's conclusions. For decision-makers in complex environments, the danger is not that System 1 is always wrong, but that it is reliably unreliable in low-validity environments like investing.",
    insight_qa:                "Q: Why does expertise not protect VC analysts from cognitive biases?\nA: Expert intuition is only reliable in high-validity environments with fast feedback loops. VC investing has long feedback delays, making expert intuition particularly susceptible to narrative bias and overconfidence.\n\nQ: What is WYSIATI?\nA: What You See Is All There Is — System 1 builds the most coherent story from available data, ignoring what is missing. In fast deal evaluation, this creates false confidence.",
    personalized_interpretation: "As a VC analyst operating under time pressure, your greatest cognitive risk is the confident, coherent System-1-generated thesis built on incomplete information. Every well-crafted pitch deck is engineered to activate System 1 pattern recognition. Under competitive deal pressure, this effect is amplified.",
    action_plan:               "Step 1 — Base Rate First Rule: Before reading any pitch deck, identify and document the base rate for companies at this stage and sector.\n\nStep 2 — Anchoring Protocol: For every valuation discussion, record the first number encountered and note how it was established.\n\nStep 3 — Pre-Mortem at IC: For every investment reaching IC stage, run a 10-minute pre-mortem assuming the investment has already failed.",
    next_steps:                "1. This week: Find the base rate for your current active pipeline — one number per deal.\n2. This week: Re-read Chapter 22 on expert intuition.\n3. Next IC meeting: Propose a 10-minute pre-mortem as a standing agenda item.\n4. Next deal: Document the first valuation anchor received.",
    reflection_questions:      "1. Think of a recent investment you felt highly confident about. What base rate information did you explicitly consider?\n\n2. When was the last time a compelling founder narrative caused you to underweight a clearly negative signal?\n\n3. Kahneman argues that knowing about biases does not reliably reduce them — only structural process changes do. Which one structural change would you commit to?",
    risk_notes:                "Kahneman's interventions require institutional support. A solo analyst applying base rates and pre-mortems in a culture that rewards speed may face social friction. The most common failure mode is adopting the vocabulary of bias-awareness as a substitute for actual process changes.",
  },
  nodes: [
    { id: "book_intake",           label: "Book Intake",          role: "Knowledge strategist",    outputKeys: ["book_summary", "key_themes", "reader_profile"] },
    { id: "book_knowledge",        label: "Knowledge Structurer", role: "Knowledge architect",     outputKeys: ["book_knowledge_summary", "core_concepts", "structural_outline"] },
    { id: "book_insight_qa",       label: "Insight Q&A",          role: "Insight analyst",         outputKeys: ["insight_qa", "personalized_interpretation", "knowledge_digest"] },
    { id: "book_action_coach",     label: "Action Coach",         role: "Executive coach",         outputKeys: ["action_plan", "next_steps"] },
    { id: "book_reflection_coach", label: "Reflection Coach",     role: "Reflective practice coach", outputKeys: ["reflection_questions", "risk_notes"] },
  ],
  edges: [
    { from: "book_intake",           to: "book_knowledge",        label: "Intake → Knowledge",   handoffKeys: ["book_summary", "key_themes", "reader_profile"] },
    { from: "book_knowledge",        to: "book_insight_qa",       label: "Knowledge → Insight",  handoffKeys: ["book_knowledge_summary", "core_concepts"] },
    { from: "book_insight_qa",       to: "book_action_coach",     label: "Insight → Action",     handoffKeys: ["insight_qa", "knowledge_digest"] },
    { from: "book_action_coach",     to: "book_reflection_coach", label: "Action → Reflection",  handoffKeys: ["action_plan", "next_steps"] },
  ],
  traceTimeline: [
    { step: 1, nodeId: "book_intake",           nodeLabel: "Book Intake",          eventType: "complete", durationMs: 980  },
    { step: 2, nodeId: "book_knowledge",        nodeLabel: "Knowledge Structurer", eventType: "complete", durationMs: 1620 },
    { step: 3, nodeId: "book_insight_qa",       nodeLabel: "Insight Q&A",          eventType: "complete", durationMs: 2240 },
    { step: 4, nodeId: "book_action_coach",     nodeLabel: "Action Coach",         eventType: "complete", durationMs: 1480 },
    { step: 5, nodeId: "book_reflection_coach", nodeLabel: "Reflection Coach",     eventType: "complete", durationMs: 1190 },
  ],
};

// ── AI Training Practice Suite ─────────────────────────────────────────────────

const AI_TRAINING: DemoSuite = {
  slug:        "ai-training-practice-suite",
  title:       "AI Training Practice Suite",
  description: "A complete 3-step AI training session: get your prompt diagnosed and improved, evaluate it against a professional rubric, and receive personalised coaching with a targeted next practice challenge.",
  category:    "AI Training & Education",
  appType:     "graph",
  appSlug:     "ai-training-practice-suite",
  stepCount:   3,
  accentColor: "#fb923c",
  icon:        "🎯",
  inputFields: [
    { key: "original_prompt", label: "Your Original Prompt",          type: "text",   required: true,  placeholder: "Tell me about AI" },
    { key: "task_context",    label: "Task Context (optional)",        type: "text",   required: false, placeholder: "I want to write a beginner blog post..." },
    { key: "learner_level",   label: "Experience Level",              type: "select", required: false, options: ["beginner", "intermediate", "advanced"], default_value: "beginner" },
  ],
  sampleInput: {
    original_prompt: "Tell me about AI",
    task_context:    "I want to learn about artificial intelligence for a beginner-level blog post I am writing for a non-technical audience.",
    learner_level:   "beginner",
  },
  outputFields: [
    { key: "diagnosis",               label: "Diagnosis",               type: "text" },
    { key: "improved_prompt",         label: "Improved Prompt",         type: "text" },
    { key: "improvement_explanation", label: "Improvement Explanation", type: "text" },
    { key: "rubric_evaluation",       label: "Rubric Evaluation",       type: "text" },
    { key: "quality_checklist",       label: "Quality Checklist",       type: "text" },
    { key: "learner_feedback",        label: "Learner Feedback",        type: "text" },
    { key: "next_practice",           label: "Next Practice Challenge", type: "text" },
  ],
  sampleOutput: {
    diagnosis:               "Weakness 1 — No specificity of scope: 'Tell me about AI' could generate a response ranging from a 2-sentence definition to a 500-page textbook.\n\nWeakness 2 — No audience definition: Without knowing the audience, the AI will default to a generic, often overly technical explanation.\n\nWeakness 3 — No output format specified.\n\nWeakness 4 — No angle or focus: 'AI' is a vast field.",
    improved_prompt:         "You are a science writer explaining complex technology topics to non-technical readers.\n\nWrite a beginner-friendly introduction to artificial intelligence for a general audience blog post.\n\nCover the following in order:\n1. A one-sentence plain-English definition of AI\n2. Two real-world examples of AI the reader already uses daily\n3. A simple explanation of how AI 'learns' from data\n4. One honest limitation of current AI systems\n\nFormat: 4 clearly labelled sections. Total length: 250-300 words.",
    improvement_explanation: "What changed and why:\n1. Added a role: 'You are a science writer...' — gives the AI a voice and expertise.\n2. Defined the audience: 'non-technical readers' — adjusts vocabulary and depth.\n3. Structured the output with numbered sections.\n4. Added format and length: '4 labelled sections, 250-300 words'.",
    rubric_evaluation:       "1. Clarity of Intent: 5/5 — Unambiguous task.\n2. Audience Definition: 5/5 — Defined at three levels.\n3. Role / Persona: 5/5 — Specific and functional.\n4. Output Format: 5/5 — Numbered sections, word count, tone.\n5. Constraint & Boundary: 4/5 — Minor gap: no 'avoid' instruction.\n\nOverall: 28/30 — Excellent prompt for a beginner.",
    quality_checklist:       "☐ 1. Role: Have you told the AI who it is?\n☐ 2. Audience: Have you specified who the output is for?\n☐ 3. Task clarity: Is the task unambiguous?\n☐ 4. Structure: Have you specified sections or steps?\n☐ 5. Format: Have you specified format and length?\n☐ 6. Tone: Have you specified tone?\n☐ 7. Constraints: Have you stated what to avoid?\n☐ 8. One-task rule: Is your prompt asking for one clear thing?",
    learner_feedback:        "Strong work on this exercise. Your improved prompt demonstrates the most important beginner breakthrough: understanding that structure and role definition are the two highest-leverage changes you can make. Your primary remaining skill gap is constraint specificity.",
    next_practice:           "Next Practice Challenge: The Constraint Layer\n\nTask: Take your improved prompt and add a 'Constraints' section with 3 specific things the AI should NOT do. Run both versions and compare outputs.\n\nSkill practised: Negative constraints are often more powerful than positive instructions for controlling AI output quality.",
  },
  nodes: [
    { id: "prompt_improvement", label: "Prompt Improvement Practice", role: "Expert AI prompt engineer", outputKeys: ["diagnosis", "improved_prompt", "improvement_explanation"] },
    { id: "rubric_evaluation",  label: "Rubric Evaluation",           role: "AI training assessment specialist", outputKeys: ["rubric_evaluation", "quality_checklist"] },
    { id: "learner_feedback",   label: "Learner Feedback",            role: "AI learning coach", outputKeys: ["learner_feedback", "next_practice"] },
  ],
  edges: [
    { from: "prompt_improvement", to: "rubric_evaluation", label: "Practice → Rubric",   handoffKeys: ["improved_prompt", "diagnosis"] },
    { from: "rubric_evaluation",  to: "learner_feedback",  label: "Rubric → Feedback",   handoffKeys: ["rubric_evaluation", "quality_checklist"] },
  ],
  traceTimeline: [
    { step: 1, nodeId: "prompt_improvement", nodeLabel: "Prompt Improvement",  eventType: "complete", durationMs: 1420 },
    { step: 2, nodeId: "rubric_evaluation",  nodeLabel: "Rubric Evaluation",   eventType: "complete", durationMs: 1180 },
    { step: 3, nodeId: "learner_feedback",   nodeLabel: "Learner Feedback",    eventType: "complete", durationMs: 980  },
  ],
};

// ── Registry ───────────────────────────────────────────────────────────────────

export const DEMO_SUITES: DemoSuite[] = [
  CORPORATE_PR,
  BOOK_TO_AGENT,
  AI_TRAINING,
];

export function getDemoSuite(slug: string): DemoSuite | undefined {
  return DEMO_SUITES.find((s) => s.slug === slug);
}
