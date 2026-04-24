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
    examRef: "NTSE / Karnataka State Board style",
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

// ============================================================
// SUBJECT INSTRUCTIONS — ENGLISH MEDIUM
// ============================================================
function getSubjectInstruction_English(subject, level) {
  const isUGPG = ["UG", "PG"].includes(level);

  const instructions = {

    "Aptitude / Reasoning": isUGPG
      ? `Generate a logical reasoning question using ONE of these types (rotate — do NOT repeat the same type twice in a row):
- Syllogisms (All/Some/No statements → conclusion)
- Blood relations (family tree deduction)
- Series completion (number or letter pattern — find next term)
- Coding-decoding (MANGO → OCPIQ style, English letters only)
- Ranking / ordering (tallest, fastest, sitting arrangement)
- Direction sense (final position or direction after turns)

RULES:
- Student must combine 2–3 clues to reach the answer — answer must NOT be directly stated.
- One wrong option must be a plausible trap (e.g. second-best logical deduction).
- FORMAT: 2–3 short clue statements, then a direct question.`

      : `Generate an aptitude/reasoning question using ONE of these types (rotate each time — never repeat the same type consecutively):
- Number series (find the next or missing term — use non-obvious patterns: differences of differences, alternating, squares+1 etc.)
- Letter/alphabet series (find next letter using position patterns)
- Coding-decoding (MANGO → OCPIQ style — English letter position shift or reversal)
- Direction sense (final direction or distance after multiple turns)
- Blood relations (2–3 step family deduction)
- Ranking / ordering (who is tallest/fastest/highest rank)
- Odd one out (find the item that doesn't belong — use non-obvious category like "all are prime except one")
- Seating arrangement (3–4 people, linear or circular, find specific position)
- Analogy (Word1:Word2 :: Word3:? — find the relationship pair)

RULES:
- Answer must require recognising a hidden pattern — NOT re-reading the question.
- For series questions: the pattern must require at least 2 steps to identify.
- One wrong option must use a number/letter from the question to trap careless readers.`,

    "English / Verbal": isUGPG
      ? `Generate a verbal ability question of ONE of these types (rotate — never use same type twice in a row):
- Fill in the blank (tone/context fit — not just grammar)
- Sentence correction (subtle error: wrong tense, misplaced modifier, subject-verb)
- Vocabulary in context (uncommon word, pick closest meaning)
- Synonyms / Antonyms (secondary meaning — not the obvious one)
- Para-jumble (4 short sentences — arrange in logical order)

RULES:
- Question must be 1–2 lines only.
- Correct answer must NOT be the most familiar-sounding option.
- One wrong option must use a word from the sentence as a trap.`

      : `Generate an English language question of ONE of these types (rotate — never use same type twice in a row):
- Fill in the blank (grammar + meaning combined)
- Spot the error in a sentence (subtle — not obvious)
- Synonyms / Antonyms (word with a secondary meaning)
- One-word substitution for a precise phrase
- Sentence completion (choose the best ending)
- Idioms and phrases (meaning of a common idiom)

RULES:
- Question must be 1–2 lines only.
- Use words that sound similar but mean differently to create plausible wrong options.
- Test inference and understanding — NOT rote memory.`,

    "Analytical Thinking": isUGPG
      ? `Generate a critical reasoning question of ONE of these types (rotate — never repeat same type twice):
- Assumption identification (unstated assumption for conclusion to hold)
- Argument weakening (option that attacks core logic — not just contradicts)
- Logical deduction from 2 statements (what MUST be true — not possibly)
- Cause and effect (identify the strongest cause for the given effect)
- Course of action (which action logically follows from the situation)

RULES:
- Answer requires going ONE logical step beyond what is written.
- BANNED: Questions where correct answer is a restatement of the premise.
- One wrong option must be POSSIBLY true but not necessarily true.`

      : `Generate a logical/analytical question of ONE of these types (rotate — never repeat same type twice):
- Venn diagram word problem (3 numbers: total, overlap, one group → find missing value)
- Statement-conclusion (2 short statements → which conclusion must follow)
- Ranking/arrangement (3–4 comparison statements → find specific position)
- Analogy reasoning (A:B :: C:? — identify the relationship and apply it)
- Cause and effect (identify which is cause and which is effect from two events)
- Statement-assumption (identify the hidden assumption in a short argument)

RULES:
- Numbers must be simple but logic must require 2 steps.
- BANNED: Questions where the answer is visible by reading one statement alone.`,

    "Mathematics":
      `Generate a mathematics WORD PROBLEM on ONE of these topics (rotate — never repeat same topic twice):
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
- Student must perform exactly 2 calculation steps.
- NO trigonometry, vectors, coordinate geometry, calculus.
- The problem must be stated in 2–3 lines (under 45 words).
- Include one distractor option that is the result of a common single-step mistake.`
  };

  return instructions[subject] || instructions["Aptitude / Reasoning"];
}


// ============================================================
// SUBJECT INSTRUCTIONS — KANNADA MEDIUM (10th only)
// ============================================================
function getSubjectInstruction_Kannada(subject) {

  if (subject === "English / Verbal") {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━
SUBJECT & LANGUAGE: ಕನ್ನಡ ಭಾಷಾ ಪ್ರಶ್ನೆ
━━━━━━━━━━━━━━━━━━━━━━━━━
Since this is a Kannada medium student, generate a KANNADA LANGUAGE question of ONE of these types (rotate each time):
- ಸಮಾನಾರ್ಥಕ ಪದ (Synonyms — give a Kannada word, pick the closest meaning)
- ವಿರುದ್ಧಾರ್ಥಕ ಪದ (Antonyms — give a Kannada word, pick the opposite)
- ಖಾಲಿ ಸ್ಥಳ ತುಂಬಿ (Fill in the blank — one Kannada sentence with a blank)
- ವಾಕ್ಯ ತಿದ್ದುಪಡಿ (Sentence correction — find the grammatical error in a Kannada sentence)
- ನುಡಿಗಟ್ಟು ಅರ್ಥ (Idiom meaning — give a Kannada idiom, pick its correct meaning)
- ಪದ ವರ್ಗೀಕರಣ (Word classification — noun/verb/adjective identification in Kannada)

RULES:
- Entire question, all 4 options, and explanation must be in Kannada script (ಕನ್ನಡ ಲಿಪಿ).
- Question must be 1–2 lines only.
- Use vocabulary appropriate for Karnataka 10th state board level.
- JSON keys must remain in English.
`;
  }

  if (subject === "Aptitude / Reasoning") {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━
SUBJECT & LANGUAGE: ಅಭಿರುಚಿ / ತರ್ಕಶಾಸ್ತ್ರ — ಕನ್ನಡ ಮಾಧ್ಯಮ
━━━━━━━━━━━━━━━━━━━━━━━━━
Generate a question using ONE of these types (rotate strictly — never repeat the same type twice in a row):

TYPE 1 — ಸಂಖ್ಯಾ ಸರಣಿ (Number Series)
⚠️ CRITICAL RULES FOR NUMBER SERIES:
- The pattern must be NON-OBVIOUS — never use simple +2, +3, +5, or multiples of a single number.
- BANNED patterns (too easy): 3,6,9,12... / 2,4,6,8... / 5,10,15... / any arithmetic sequence with constant difference.
- REQUIRED patterns (use one of these):
  a) Differences that themselves increase: e.g. +2,+4,+6,+8 → 3,5,9,15,23,?
  b) Alternating two operations: e.g. ×2,+3,×2,+3 → 2,4,7,14,17,?
  c) Squares or cubes with offset: e.g. 1²+1, 2²+1, 3²+1 → 2,5,10,17,?
  d) Two interleaved series: e.g. 1,2,4,5,7,8,10,? (two series +3 each, offset by 1)
  e) Differences of differences pattern: e.g. 1,3,7,13,21,? (diff: 2,4,6,8 → next diff 10 → answer 31)
- Question sentence in Kannada. Example: "ಈ ಸರಣಿಯಲ್ಲಿ ಮುಂದಿನ ಸಂಖ್ಯೆ ಯಾವುದು? 2, 5, 10, 17, 26, ?"
- Options are numbers. Wrong options must include: (answer-1), (answer+1), and result of applying wrong pattern.
- SELF-CHECK: If someone can find the next term by just adding the same number every time, the pattern is TOO SIMPLE. Rewrite.

TYPE 2 — ಸಂಕೇತ ಭಾಷೆ (Coding-Decoding)
⚠️ CRITICAL RULES FOR CODING-DECODING:
- The question SENTENCE is in Kannada, but ALL CODE WORDS must be in ENGLISH CAPITAL LETTERS ONLY.
- NEVER write the code words in Kannada script — codes are always English letters.
- Use letter position shift (+2, -1, reverse, mirror) or a clear rule.
- Format: "ಒಂದು ಕೋಡ್‌ನಲ್ಲಿ MANGO ಅನ್ನು OCPIQ ಎಂದು ಬರೆಯಲಾಗುತ್ತದೆ. ಅದೇ ಕೋಡ್‌ನಲ್ಲಿ APPLE ಅನ್ನು ಹೇಗೆ ಬರೆಯಲಾಗುತ್ತದೆ?"
- Options must be English coded words (4-5 letters, all caps).
- The student must identify the encoding rule from the first pair, then apply it to the new word.
- Wrong options: use the correct letters but in wrong order, or apply wrong shift by ±1.

TYPE 3 — ದಿಕ್ಕು ತಿಳಿವು (Direction Sense)
- Movement steps in Kannada. Use: ಉತ್ತರ(N), ದಕ್ಷಿಣ(S), ಪೂರ್ವ(E), ಪಶ್ಚಿಮ(W)
- Must involve at least 3 turns so the answer requires tracking direction changes.
- Example: "ರಾಮ ಉತ್ತರಕ್ಕೆ 5 ಕಿಮೀ, ಪೂರ್ವಕ್ಕೆ 3 ಕಿಮೀ, ದಕ್ಷಿಣಕ್ಕೆ 2 ಕಿಮೀ ನಡೆದ. ಆತ ಆರಂಭ ಬಿಂದುವಿನಿಂದ ಯಾವ ದಿಕ್ಕಿನಲ್ಲಿದ್ದಾನೆ?"
- Ask for final direction OR which direction to walk to reach starting point.

TYPE 4 — ರಕ್ತ ಸಂಬಂಧ (Blood Relations)
- Use Kannada relationship terms: ತಂದೆ, ತಾಯಿ, ಅಣ್ಣ, ತಂಗಿ, ಮಗ, ಮಗಳು, ಅಜ್ಜ, ಅಜ್ಜಿ, ಚಿಕ್ಕಪ್ಪ etc.
- Must require 2–3 deduction steps. One clue must involve gender inference.
- Example: "A ನ ತಾಯಿ B ನ ಒಬ್ಬನೇ ಮಗಳು. B ನ ಗಂಡ C. A ಗೆ C ಏನಾಗುತ್ತಾನೆ?"

TYPE 5 — ವಿಭಿನ್ನ ಆಯ್ಕೆ (Odd One Out)
- 4 items in Kannada — one doesn't belong.
- The unifying rule for the 3 matching items must be non-obvious (e.g. all are prime numbers, all are capitals, all are mammals, all can fly).
- The odd one out must look similar to the others on the surface but differ on the hidden rule.
- Example: "ಕೆಳಗಿನವುಗಳಲ್ಲಿ ಬೇರೆಯಾದದ್ದು ಯಾವುದು? 17, 23, 37, 27" (27 is not prime — others are prime)

TYPE 6 — ಶ್ರೇಣಿ / ಕ್ರಮ (Ranking / Arrangement)
- 3–4 Kannada names with comparison statements — find the specific rank.
- Must require at least 2 statements to be combined to find the answer.
- Trap: include a statement that seems to answer directly but doesn't — student must combine all clues.

TYPE 7 — ಸಾದೃಶ್ಯ (Analogy)
- Format: ಕನ್ನಡ ಪದ1 : ಕನ್ನಡ ಪದ2 :: ಕನ್ನಡ ಪದ3 : ?
- Relationship must be non-obvious (not just synonyms). Use: tool:purpose, part:whole, cause:effect, animal:sound, field:instrument.
- Example: "ವೈದ್ಯ : ಆಸ್ಪತ್ರೆ :: ನ್ಯಾಯಾಧೀಶ : ?" (ನ್ಯಾಯಾಲಯ)

GLOBAL RULES FOR ALL TYPES:
- Question sentences must be in Kannada script.
- Numbers, math symbols, and English code words (Type 2 ONLY) stay in English — do NOT convert to Kannada script.
- BANNED: Any question that tests pure memory (unit conversions, definitions, facts a student memorised).
- BANNED: Number series with constant difference (multiples of 2, 3, 5 etc.) — these are too easy.
- BANNED: Writing code words (MANGO, APPLE etc.) in Kannada script — they must stay in English capital letters.
- Simple vocabulary for Karnataka 10th state board.
- JSON keys must remain in English.
`;
  }

  if (subject === "Analytical Thinking") {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━
SUBJECT & LANGUAGE: ವಿಶ್ಲೇಷಣಾತ್ಮಕ ಚಿಂತನೆ — ಕನ್ನಡ ಮಾಧ್ಯಮ
━━━━━━━━━━━━━━━━━━━━━━━━━
Generate a question using ONE of these types (rotate — never repeat same type twice):

TYPE 1 — ವೆನ್ ರೇಖಾಚಿತ್ರ (Venn Diagram Word Problem)
- Give totals and overlaps as a Kannada sentence.
- Use realistic Karnataka context (students, sports, subjects etc.)
- The student must use the formula: A + B - Both + Neither = Total to find the answer.
- Do NOT ask for "how many are in both" directly — ask for "neither" or one group only.
- Example: "ಒಂದು ತರಗತಿಯಲ್ಲಿ 50 ವಿದ್ಯಾರ್ಥಿಗಳಿದ್ದಾರೆ. 30 ಕ್ರಿಕೆಟ್ ಇಷ್ಟಪಡುತ್ತಾರೆ, 25 ಫುಟ್‌ಬಾಲ್ ಇಷ್ಟಪಡುತ್ತಾರೆ, 15 ಎರಡನ್ನೂ ಇಷ್ಟಪಡುತ್ತಾರೆ. ಯಾವುದನ್ನೂ ಇಷ್ಟಪಡದವರು ಎಷ್ಟು?"

TYPE 2 — ಹೇಳಿಕೆ-ತೀರ್ಮಾನ (Statement-Conclusion)
- 2 short Kannada statements → which conclusion logically MUST follow (not just possibly).
- Wrong options must include: a conclusion that is POSSIBLY true but not necessarily, and one that contradicts.
- Student must identify what is 100% guaranteed from the two statements combined.

TYPE 3 — ಕಾರಣ-ಪರಿಣಾಮ (Cause and Effect)
- Two events described in Kannada — ask which is the cause and which is the effect.
- Both events must be clearly related but the causal direction must require thinking.
- Wrong options: swap cause/effect, or claim they are independent.

TYPE 4 — ಸಾದೃಶ್ಯ ತರ್ಕ (Analogy Reasoning)
- Format: ಕನ್ನಡ ಪದ1 : ಕನ್ನಡ ಪದ2 :: ಕನ್ನಡ ಪದ3 : ?
- Use meaningful relationship pairs: field:medium, tool:use, animal:home, part:whole, cause:effect.
- Trap wrong option: a word that is associated with ಪದ3 but doesn't follow the same relationship.

⚠️ STRICTLY BANNED QUESTION TYPES (these test memory, not reasoning):
- Unit conversions: "60 minutes = ? seconds", "1 km = ? metres", "1 litre = ? ml" — NEVER generate these.
- Definitions: "What is photosynthesis?", "What is the capital of...?" — NEVER.
- Direct formula recall: "Area of circle = ?" — NEVER.
- Any question answerable without thinking — if a student who never studied could answer it, REWRITE IT.

LANGUAGE RULES:
- Full question, options, explanation in Kannada script.
- Numbers and math symbols stay as-is.
- JSON keys must remain in English.
`;
  }

  // Mathematics — Kannada medium
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━
SUBJECT & LANGUAGE: ಗಣಿತ — ಕನ್ನಡ ಮಾಧ್ಯಮ
━━━━━━━━━━━━━━━━━━━━━━━━━
Generate a mathematics WORD PROBLEM in KANNADA on ONE of these topics (rotate — never repeat same topic twice):
- ಶೇಕಡಾವಾರು (Percentages)
- ಲಾಭ ಮತ್ತು ನಷ್ಟ (Profit & Loss)
- ಅನುಪಾತ ಮತ್ತು ಪ್ರಮಾಣ (Ratio & Proportion)
- ವೇಗ ಮತ್ತು ದೂರ (Time, Speed & Distance)
- ಕೆಲಸ ಮತ್ತು ಸಮಯ (Time & Work)
- ಸರಳ ಬಡ್ಡಿ / ಸಂಯುಕ್ತ ಬಡ್ಡಿ (Simple & Compound Interest)
- ಸರಾಸರಿ (Averages)
- ಸಂಖ್ಯಾ ಪದ್ಧತಿ — LCM, HCF, ಉಳಿಕೆ (Number System)

STRICT RULES:
- Write the entire word problem in Kannada script.
- Numbers, ₹ symbol, %, and math operators stay as-is.
- Use Karnataka context: names like Ramu, Priya, Shivanna; places like Mysuru, Bengaluru.
- Student must perform exactly 2 calculation steps.
- Problem stated in 2–3 lines only.
- One distractor option = result of a common single-step mistake.
- Options can be numbers or ₹ amounts.
- JSON keys must remain in English.
⚠️ BANNED: "1 hour = ? minutes", "1 km = ? m", or any unit-conversion question. These test memory, not math.
`;
}


// ============================================================
// MASTER PROMPT BUILDER
// ============================================================
function buildPrompt(level, subject, previousQuestions = [], medium = "English") {
  const meta = levelMeta[level] || levelMeta["UG"];
  const isKannada = (medium === "Kannada" && level === "10th");

  const subjectInstruction = isKannada
    ? getSubjectInstruction_Kannada(subject)
    : getSubjectInstruction_English(subject, level);

  const exclusionBlock = previousQuestions.length > 0
    ? `\n⛔ DO NOT repeat, rephrase, or closely resemble ANY of these already-asked questions in this session:\n${previousQuestions.slice(-15).map((q, i) => `${i + 1}. ${q}`).join("\n")}\n`
    : "";

  const varietyRule = `
⛔ VARIETY RULE: Look at the exclusion list above. Identify what question TYPE the last 2 questions were. Do NOT generate the same question type again. Rotate to a different type from the list above.
`;

  return `You are an expert Indian competitive exam question setter with 20 years of experience designing assessments for CBSE, Karnataka State Board, CUET, CAT, SSC, and campus placement drives.

━━━━━━━━━━━━━━━━━━━━━━━━━
STUDENT PROFILE
━━━━━━━━━━━━━━━━━━━━━━━━━
Level        : ${level} — ${meta.description}
Medium       : ${medium}
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
- Question must be 2–3 lines long — short enough to read in 10 seconds, deep enough to require 20 seconds of thinking.
- DO NOT write long paragraphs or story-style setups.
- Every word must serve a purpose — no filler sentences.

━━━━━━━━━━━━━━━━━━━━━━━━━
QUESTION QUALITY RULES (mandatory)
━━━━━━━━━━━━━━━━━━━━━━━━━
- The correct answer must NEVER appear — even partially — in the question text.
- The student must go at least ONE logical step beyond what is written to reach the answer.
- A student who skims and picks the most familiar-sounding option must get it WRONG.
- A student who reads carefully and thinks must get it RIGHT.
- BANNED patterns:
  → Answer is stated directly in the question
  → Circular reasoning (X happens because Y. Why does X happen?)
  → Any option is a direct copy of a phrase from the question
  → Pure memory / fact recall (unit conversions, definitions, formulas)
  → Trivially simple series like 3,6,9,12 or 2,4,6,8 (constant +n patterns)

━━━━━━━━━━━━━━━━━━━━━━━━━
DISTRACTOR DESIGN RULES (mandatory)
━━━━━━━━━━━━━━━━━━━━━━━━━
- One wrong option MUST use words/numbers directly from the question to trap careless readers.
- One wrong option must represent the most common reasoning mistake for this question type.
- Correct answer must use different phrasing from the question.
- All 4 options must look equally plausible at first glance.

━━━━━━━━━━━━━━━━━━━━━━━━━
SELF-CHECK BEFORE OUTPUTTING (mandatory)
━━━━━━━━━━━━━━━━━━━━━━━━━
1. Can a student answer by just re-reading the question? → If YES, rewrite.
2. Does the answer require at least one logical/calculation step not stated in the question? → Must be YES.
3. Would a careless student get it wrong? → Must be YES.
4. Is the question 2–3 lines only? → Must be YES.
5. For number series: is the pattern non-trivial (NOT simple +n or ×n)? → Must be YES.
6. For coding-decoding in Kannada: are the code words in English capital letters (NOT Kannada script)? → Must be YES.
7. Is this a memory/fact-recall question (unit conversions, definitions)? → If YES, rewrite as reasoning question.

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
${varietyRule}
${exclusionBlock}`;
}


// ============================================================
// MAIN ROUTE
// ============================================================
app.post("/generate", async (req, res) => {
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

  const finalLevel = levelMeta[level] ? level : "UG";

  const isUGPG = ["UG", "PG"].includes(finalLevel);
  const allowedSubjects = isUGPG ? ugpgSubjects : schoolSubjects;
  const finalSubject = allowedSubjects.includes(subject) ? subject : allowedSubjects[0];

  // Kannada only valid for 10th
  const finalMedium = (medium === "Kannada" && finalLevel === "10th") ? "Kannada" : "English";

  const safePrevious = Array.isArray(previousQuestions)
    ? previousQuestions.filter(q => typeof q === "string" && q.trim().length > 0)
    : [];

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
        temperature: finalMedium === "Kannada" ? 1.0 : 0.85,
        max_tokens: 800
      })
    });

    const data = await response.json();
    let rawText = data.choices?.[0]?.message?.content || "";

    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI did not return valid JSON");

    const question = JSON.parse(match[0]);

    if (!question.question || !question.options || question.options.length < 4 || !question.correct) {
      throw new Error("Incomplete question structure from AI");
    }

    // Kannada validation — check question text only (options may be English for coding-decoding)
    if (finalMedium === "Kannada") {
      const hasKannadaScript = /[\u0C80-\u0CFF]/.test(question.question);
      if (!hasKannadaScript) {
        console.warn("Kannada requested but AI returned English. Flagging as fallback.");
        return res.json({
          level: finalLevel,
          subject: finalSubject,
          medium: "English",
          kannadaFallback: true,
          question: question.question,
          options: question.options,
          correct: question.correct,
          explanation: question.explanation || "No explanation provided."
        });
      }
    }

    res.json({
      level: finalLevel,
      subject: finalSubject,
      medium: finalMedium,
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