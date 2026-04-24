require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// ✅ Health check
app.get("/", (req, res) => {
  res.json({ status: "Server is running ✅" });
});

// ✅ Allowed subjects per level group
const ugpgSubjects = ["Aptitude / Reasoning", "English / Verbal", "Analytical Thinking"];
const schoolSubjects = ["Aptitude / Reasoning", "English / Verbal", "Analytical Thinking", "Mathematics"];

// ✅ Level metadata
const levelMeta = {
  "10th": {
    bloomLevel: "Understand & Apply",
    style: "single-step reasoning with a small twist",
    examRef: "NTSE / State Board style",
    difficulty: "easy to moderate",
    description: "Class 10 (Secondary School)"
  },
  "11th": {
    bloomLevel: "Apply",
    style: "2-step problems with one trap option",
    examRef: "NDA / State CET style",
    difficulty: "moderate to hard",
    description: "Class 11 (Higher Secondary)"
  },
  "12th": {
    bloomLevel: "Apply & Analyze",
    style: "multi-step, board exam rigor, time-pressure style",
    examRef: "CUET / CAT Foundation style",
    difficulty: "hard",
    description: "Class 12 (Higher Secondary)"
  },
  "UG": {
    bloomLevel: "Analyze & Evaluate",
    style: "abstract reasoning, no memory-based answers, all logic",
    examRef: "CAT / CMAT / campus placement style",
    difficulty: "very difficult",
    description: "Undergraduate (College)"
  },
  "PG": {
    bloomLevel: "Evaluate & Create",
    style: "edge case reasoning, assumptions and inferences, high ambiguity tolerance needed",
    examRef: "GMAT / UPSC CSAT / research aptitude style",
    difficulty: "extremely difficult",
    description: "Postgraduate (Masters)"
  }
};

// ✅ Build subject-specific instructions
// NEW: accepts medium param — adds Kannada instruction when needed
function getSubjectInstruction(subject, level, medium = "English") {
  const isUGPG = ["UG", "PG"].includes(level);

  const instructions = {
    "Aptitude / Reasoning": isUGPG
      ? `Generate a logical reasoning question using one of: syllogisms, blood relations, series completion, coding-decoding, or ranking/ordering.
- The question must be solvable purely by logic — no general knowledge needed.
- Student must combine 2–3 pieces of information to deduce the answer — it must NOT be directly stated.
- FORMAT: Give 2–3 short factual statements (one per line), then ask a question that requires combining them.
- GOOD EXAMPLE: "A ranks higher than B. C ranks higher than A. D ranks just below B. Who ranks second from the bottom?"
- BAD EXAMPLE: "A is faster than B because A runs more. Why is A faster?" — answer is given in the question, NEVER do this.`
      : `Generate an aptitude or reasoning question using one of: number series (find the next term), direction sense (final direction/position), odd one out (with a non-obvious pattern), or simple coding-decoding.
- The answer must come from recognising a hidden pattern — not from reading the question text.
- FORMAT: 1–2 short sentences that set up a pattern or scenario, then a direct question.
- GOOD EXAMPLE: "In a code, MANGO is written as OCPIQ. How is APPLE written in that code?"
- BAD EXAMPLE: "Ram walks north. He then walks north again. In which direction is he facing?" — too obvious.`,

    "English / Verbal": isUGPG
      ? `Generate a verbal ability question of ONE of these types:
  (a) Fill in the blank — one sentence with a blank; student picks the word that fits both grammatically AND in meaning. Make the blank require understanding of tone/context, not just grammar.
  (b) Sentence correction — one sentence with a subtle error (wrong tense, misplaced modifier, subject-verb disagreement). The error must not be immediately obvious.
  (c) Vocabulary in context — one sentence using a slightly uncommon word; student picks the closest meaning. The word must have a plausible misleading meaning.
- The question must be 1–2 lines only.
- The correct answer must NOT be the one that sounds most familiar — it must require careful reading.
- One wrong option must use a word from the sentence to trap careless readers.`
      : `Generate an English language question of ONE of these types: fill in the blank (grammar + meaning combined), spot the error in a sentence (subtle, not obvious), antonym/synonym where the word has a secondary meaning, or one-word substitution for a precise phrase.
- The question must be 1–2 lines only.
- Use words that sound similar but mean differently to create plausible wrong options.
- Test inference and understanding — NOT rote memory of vocabulary lists.`,

    "Analytical Thinking": isUGPG
      ? `Generate a critical reasoning question of ONE of these types:
  (a) Assumption identification — give a 1–2 line argument/conclusion; student identifies the unstated assumption that MUST be true for the conclusion to hold.
  (b) Argument weakening — give a 1–2 line argument; student picks the option that most weakens it (not just contradicts it — must attack the core logic).
  (c) Logical deduction — give exactly 2 statements; student picks what MUST be true (not possibly true, not probably true — MUST).
- The answer must require going ONE logical step beyond what is written.
- BANNED: Questions where the correct answer is just a restatement of the premise.
- One wrong option must be something that is POSSIBLY true but not necessarily true — this is the key trap.`
      : `Generate a logical deduction or analytical question of ONE of these types:
  (a) Venn diagram word problem — give 3 numbers (total, overlap, one group) and ask for the missing value. e.g. "Of 40 students, 25 play cricket, 20 play football, and 10 play both. How many play neither?"
  (b) Statement-conclusion — give 2 short statements; student picks which conclusion logically follows (must follow, not just might follow).
  (c) Ranking/arrangement — give 3–4 comparison statements; student finds a specific position.
- Numbers must be simple but the logic must require 2 steps.
- BANNED: Questions where the answer is visible by reading one statement alone.`,

    "Mathematics": `Generate a mathematics WORD PROBLEM on ONE of these topics:
- Percentages (reverse percentage, percent change, successive discounts)
- Profit & Loss (marked price, discount chains, overall profit %)
- Ratio & Proportion (mixture, partnership profit split)
- Time, Speed & Distance (relative speed, average speed trap)
- Time & Work (combined work rate, pipes and cisterns)
- Simple & Compound Interest (find principal or rate from final amount)
- Number System (LCM/HCF application, remainder problems)
- Averages (weighted average, find the missing value)
- Probability (coins/dice/cards with a non-obvious twist)

STRICT RULES:
- Real-world scenario — NOT a direct formula plug-in.
- Student must perform exactly 2 calculation steps — no more, no less.
- NO trigonometry, vectors, coordinate geometry, calculus.
- Solvable by any stream student (Science/Commerce/Arts).
- The problem must be stated in 2–3 lines (under 45 words).
- Include one distractor option that is the result of a common single-step mistake (e.g. forgetting to subtract, using simple instead of compound interest).`
  };

  return instructions[subject] || instructions["Aptitude / Reasoning"];
}

// ✅ NEW: Kannada language instruction block
// Only injected when medium === "Kannada" and level === "10th"
function getKannadaInstruction(subject) {
  // For Verbal/English subject — switch to Kannada language skills instead
  const isVerbal = subject === "English / Verbal";

  if (isVerbal) {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━
LANGUAGE & SUBJECT OVERRIDE
━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ KANNADA MEDIUM STUDENT — This is a Kannada medium 10th class student.
- Since this is Kannada medium, replace "English / Verbal" with a KANNADA LANGUAGE question instead.
- Write a question testing Kannada grammar, Kannada vocabulary, or Kannada comprehension.
- The entire question, all 4 options, and the explanation MUST be written in Kannada script (ಕನ್ನಡ ಲಿಪಿ).
- Numbers and math symbols stay as-is (1, 2, 3, %, ÷ etc.).
- Use simple, clear Kannada — appropriate for a 10th class Karnataka state board student.
- Do NOT use English words anywhere in the question or options.
`;
  }

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━
LANGUAGE INSTRUCTION
━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ KANNADA MEDIUM STUDENT — Write the entire question, all 4 options, and the explanation in Kannada script (ಕನ್ನಡ ಲಿಪಿ).
- Numbers, math symbols, and proper nouns (names like Ram, Priya) may remain in their original form.
- Use simple, clear Kannada appropriate for a 10th class Karnataka state board student.
- Do NOT mix English and Kannada — the full output must be in Kannada only.
- The JSON keys ("question", "options", "correct", "explanation") must remain in English.
`;
}

// ✅ Master prompt builder — now accepts medium param
function buildPrompt(level, subject, previousQuestions = [], medium = "English") {
  const meta = levelMeta[level] || levelMeta["UG"];
  const subjectInstruction = getSubjectInstruction(subject, level, medium);

  // NEW: only add Kannada block if 10th + Kannada medium
  const kannadaBlock = (medium === "Kannada" && level === "10th")
    ? getKannadaInstruction(subject)
    : "";

  const exclusionBlock = previousQuestions.length > 0
    ? `\n⛔ DO NOT repeat, rephrase, or closely resemble ANY of these already-asked questions in this session:\n${previousQuestions.slice(-15).map((q, i) => `${i + 1}. ${q}`).join("\n")}\n`
    : "";

  return `You are an expert Indian competitive exam question setter with 20 years of experience designing assessments for CBSE, CUET, CAT, SSC, and campus placement drives.

━━━━━━━━━━━━━━━━━━━━━━━━━
STUDENT PROFILE
━━━━━━━━━━━━━━━━━━━━━━━━━
Level        : ${level} — ${meta.description}
Bloom's Level: ${meta.bloomLevel}
Question Style: ${meta.style}
Reference Exam: ${meta.examRef}
Difficulty   : ${meta.difficulty}

━━━━━━━━━━━━━━━━━━━━━━━━━
SUBJECT TASK: ${subject}
━━━━━━━━━━━━━━━━━━━━━━━━━
${subjectInstruction}
${kannadaBlock}
━━━━━━━━━━━━━━━━━━━━━━━━━
QUESTION LENGTH RULES (mandatory)
━━━━━━━━━━━━━━━━━━━━━━━━━
- Question must be 2–3 lines long — short enough to read in 10 seconds, deep enough to require 20 seconds of thinking.
- DO NOT write long paragraphs or story-style setups.
- Every word must serve a purpose — no filler sentences.

━━━━━━━━━━━━━━━━━━━━━━━━━
QUESTION QUALITY RULES (mandatory)
━━━━━━━━━━━━━━━━━━━━━━━━━
- The correct answer must NEVER appear — even partially — in the question text.
- The student must go at least ONE logical step beyond what is written to reach the answer.
- A student who skims the question and picks the most familiar-sounding option must get it WRONG.
- A student who reads carefully and thinks must get it RIGHT.
- BANNED patterns (never generate these):
  → "According to the above, which is true?" — answer is stated directly
  → "X happens because of Y. Why does X happen?" — circular, answer is given
  → Any option that is a direct copy of a phrase from the question

━━━━━━━━━━━━━━━━━━━━━━━━━
DISTRACTOR DESIGN RULES (mandatory)
━━━━━━━━━━━━━━━━━━━━━━━━━
- One wrong option MUST use words directly from the question to trap careless readers.
- One wrong option must represent the most common reasoning mistake for this question type.
- The correct answer must use different phrasing from the question — student must have reasoned to it, not spotted it.
- All 4 options must look equally plausible at first glance.

━━━━━━━━━━━━━━━━━━━━━━━━━
SELF-CHECK BEFORE OUTPUTTING (mandatory)
━━━━━━━━━━━━━━━━━━━━━━━━━
Before writing your JSON, ask yourself:
1. Can a student answer this by just re-reading the question without thinking? → If YES, discard and rewrite.
2. Does reaching the correct answer require at least one logical/calculation step not stated in the question? → Must be YES.
3. Would a student who skims and picks the familiar-sounding option get it wrong? → Must be YES.
4. Is the question 2–3 lines only? → Must be YES.
If any check fails, rewrite the question before outputting.

━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━
Return ONLY a valid JSON object. No explanation outside JSON, no markdown, no preamble.

{
  "question": "Full question text here",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct": "Exact string of the correct option",
  "explanation": "2-3 sentences: why the correct answer is right, and why the most common wrong option is wrong"
}
${exclusionBlock}`;
}

// ✅ MAIN ROUTE — now reads medium from request body
app.post("/generate", async (req, res) => {
  // NEW: destructure medium from body, default to "English"
  let { level, subject, previousQuestions = [], medium = "English" } = req.body;

  // --- Normalize level ---
  if (level) {
    if (level.includes("10")) level = "10th";
    else if (level.includes("11")) level = "11th";
    else if (level.includes("12")) level = "12th";
    else if (level.toLowerCase().includes("ug")) level = "UG";
    else if (level.toLowerCase().includes("pg")) level = "PG";
  }

  // --- Normalize subject ---
  const subjectMap = {
    "aptitude": "Aptitude / Reasoning",
    "reasoning": "Aptitude / Reasoning",
    "aptitude / reasoning": "Aptitude / Reasoning",
    "verbal": "English / Verbal",
    "english": "English / Verbal",
    "english / verbal": "English / Verbal",
    "analytical": "Analytical Thinking",
    "analytical thinking": "Analytical Thinking",
    "maths": "Mathematics",
    "math": "Mathematics",
    "mathematics": "Mathematics"
  };
  if (subject) subject = subjectMap[subject.toLowerCase()] || subject;

  // --- Validate level ---
  const finalLevel = levelMeta[level] ? level : "UG";

  // --- Validate subject against level ---
  const isUGPG = ["UG", "PG"].includes(finalLevel);
  const allowedSubjects = isUGPG ? ugpgSubjects : schoolSubjects;
  const finalSubject = allowedSubjects.includes(subject) ? subject : allowedSubjects[0];

  // NEW: Normalize medium — only "Kannada" is valid for 10th, else always "English"
  const finalMedium = (medium === "Kannada" && finalLevel === "10th") ? "Kannada" : "English";

  // --- Sanitize previousQuestions ---
  const safePrevious = Array.isArray(previousQuestions)
    ? previousQuestions.filter(q => typeof q === "string" && q.trim().length > 0)
    : [];

  // NEW: pass finalMedium to buildPrompt
  const prompt = buildPrompt(finalLevel, finalSubject, safePrevious, finalMedium);
  const API_KEY = process.env.GROQ_API_KEY;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        // NEW: slightly higher temperature for Kannada to avoid repetitive phrasing
        temperature: finalMedium === "Kannada" ? 0.9 : 0.85,
        max_tokens: 800
      })
    });

    const data = await response.json();
    let rawText = data.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI did not return valid JSON");

    const question = JSON.parse(match[0]);

    // Validate structure
    if (!question.question || !question.options || question.options.length < 4 || !question.correct) {
      throw new Error("Incomplete question structure from AI");
    }

    // NEW: Kannada validation — check if Kannada script is present when expected
    // Unicode range for Kannada: \u0C80–\u0CFF
    if (finalMedium === "Kannada") {
      const hasKannadaScript = /[\u0C80-\u0CFF]/.test(question.question);
      if (!hasKannadaScript) {
        // AI returned English despite instruction — flag it so frontend can show warning
        console.warn("Kannada requested but AI returned English. Flagging response.");
        return res.json({
          level: finalLevel,
          subject: finalSubject,
          medium: "English",           // tell frontend it fell back
          kannadaFallback: true,        // NEW flag
          question: question.question,
          options: question.options,
          correct: question.correct,
          explanation: question.explanation || "No explanation provided."
        });
      }
    }

    // ✅ Send back response — now includes medium in response
    res.json({
      level: finalLevel,
      subject: finalSubject,
      medium: finalMedium,             // NEW: echo medium back to frontend
      kannadaFallback: false,
      question: question.question,
      options: question.options,
      correct: question.correct,
      explanation: question.explanation || "No explanation provided."
    });

  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: "Failed to generate question. Please try again." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));