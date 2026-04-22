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
function getSubjectInstruction(subject, level) {
  const isUGPG = ["UG", "PG"].includes(level);

  const instructions = {
    "Aptitude / Reasoning": isUGPG
      ? `Generate a logical reasoning question involving one of: syllogisms, blood relations, series completion, coding-decoding, or simple ranking/ordering.
- The question must be solvable purely by logic — no general knowledge needed.
- Student must mentally work through 2–3 reasoning steps to arrive at the answer.
- KEEP IT SHORT: State the entire question in 1–2 sentences maximum. No long paragraph setups.
- Use a brief, direct scenario — e.g. "A is taller than B. B is taller than C. Who is the shortest?" style.`
      : `Generate an aptitude or reasoning question involving one of: number series, direction sense, analogies, odd one out, or simple coding-decoding.
- Student must think through the pattern — no guessing allowed.
- KEEP IT SHORT: The full question must be 1–2 sentences. No long story setups.
- Use everyday Indian contexts (school, market, family, sports) but keep it brief.`,

    "English / Verbal": isUGPG
      ? `Generate a verbal ability question of one of these types:
  (a) Sentence correction — one sentence with a grammatical or meaning error, student picks the corrected version.
  (b) Vocabulary in context — one sentence with a word used in context, student picks its correct meaning.
  (c) Fill in the blank — one sentence with a blank, student picks the best word.
- NO reading comprehension passages — maximum ONE sentence of context.
- The answer must NOT be obvious — student must carefully read and eliminate distractors.
- Total question text must be under 30 words.`
      : `Generate an English language question of one of these types: fill in the blank (grammar-based), identify the grammatical error in a sentence, antonym or synonym in context, or one-word substitution.
- Use age-appropriate vocabulary.
- KEEP IT SHORT: The full question must be 1–2 sentences under 25 words.
- Test understanding, not rote memorization of word lists.`,

    "Analytical Thinking": isUGPG
      ? `Generate a critical reasoning question of one of these types:
  (a) Argument strengthening or weakening — ONE short argument sentence + 4 options.
  (b) Assumption identification — a short conclusion is given (1 sentence), student finds the hidden assumption.
  (c) Logical deduction — 2 short statements given, student picks what must be true.
- Student must evaluate logic and structure, not recall any facts.
- KEEP IT SHORT: The entire setup must be 1–2 sentences maximum. No long scenarios or paragraphs.`
      : `Generate a logical deduction question:
  (a) A set of 2–3 short statements and student must identify which conclusion follows, OR
  (b) A Venn diagram word problem in 1–2 sentences (e.g. "20 students like cricket, 15 like football, 8 like both. How many like only cricket?"), OR
  (c) A simple data comparison question with 2–3 numbers given inline.
- Keep numbers simple — the challenge is in the logic, not arithmetic.
- KEEP IT SHORT: Full question must be under 35 words.`,

    "Mathematics": `Generate a mathematics WORD PROBLEM.

ALLOWED TOPICS ONLY (pick one):
- Percentages (successive discounts, reverse percentage, percent change)
- Profit & Loss (marked price, discount chains, overall profit)
- Ratio & Proportion (mixture problems, partnership profit splits)
- Time, Speed & Distance (relative speed, trains, average speed traps)
- Time & Work (combined work, pipes and cisterns)
- Simple & Compound Interest (find principal or rate given final amount)
- Number System (LCM/HCF word problems, divisibility, remainders)
- Averages (weighted average, find the missing value)
- Basic Probability (coins, dice, cards — with a twist)
- Basic Geometry (area and perimeter word problems ONLY — no proofs, no theorems)

STRICT RULES:
- Must be a real-world word problem — NOT a direct formula application.
- Student must perform at least 2 logical/calculation steps to get the answer.
- NO trigonometry, NO integration, NO differentiation, NO coordinate geometry, NO vectors.
- This question must be solvable by ANY stream student — no stream-specific knowledge required.
- Include one distractor option that represents a very common calculation mistake.
- KEEP IT SHORT: State the problem in 1–2 sentences maximum (under 40 words). No long story setups.`
  };

  return instructions[subject] || instructions["Aptitude / Reasoning"];
}

// ✅ Master prompt builder
function buildPrompt(level, subject, previousQuestions = []) {
  const meta = levelMeta[level] || levelMeta["UG"];
  const subjectInstruction = getSubjectInstruction(subject, level);

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

━━━━━━━━━━━━━━━━━━━━━━━━━
QUESTION LENGTH RULES (mandatory)
━━━━━━━━━━━━━━━━━━━━━━━━━
- The question text must be SHORT — maximum 2 sentences or 40 words.
- Student must be able to READ the question in under 10 seconds.
- The remaining 20 seconds is for THINKING and answering.
- DO NOT write long paragraphs, research paper excerpts, or story-style setups.
- If the question needs context, give it in ONE short sentence only.

━━━━━━━━━━━━━━━━━━━━━━━━━
DISTRACTOR DESIGN RULES (mandatory)
━━━━━━━━━━━━━━━━━━━━━━━━━
- All 4 options must look plausible at first glance — no obviously silly options.
- At least 2 options must represent common mistakes, misconceptions, or partial answers.
- The correct answer must NOT always be the longest or most detailed option.
- Every option must make a student pause and think before eliminating.

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

// ✅ MAIN ROUTE
app.post("/generate", async (req, res) => {
  let { level, subject, previousQuestions = [] } = req.body;

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

  // --- Sanitize previousQuestions ---
  const safePrevious = Array.isArray(previousQuestions)
    ? previousQuestions.filter(q => typeof q === "string" && q.trim().length > 0)
    : [];

  const prompt = buildPrompt(finalLevel, finalSubject, safePrevious);
  const API_KEY = process.env.GROQ_API_KEY;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 700
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

    // ✅ Send back response
    res.json({
      level: finalLevel,
      subject: finalSubject,
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