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

// ✅ Level config — difficulty + topics per subject per level
const levelConfig = {
  "10th": {
    difficulty: "easy to moderate",
    description: "Class 10 student (age 15-16)",
    subjects: {
      "Mathematics": "basic algebra, geometry, trigonometry basics, mensuration, statistics",
      "Aptitude / Reasoning": "basic arithmetic, simple logical reasoning, number series, easy puzzles",
      "English / Verbal": "basic grammar, simple comprehension, common vocabulary, fill in the blanks",
      "Physics": "basic motion, force, light, electricity concepts from Class 10",
      "Chemistry": "basic atoms, molecules, acids, bases, metals from Class 10"
    }
  },
  "11th": {
    difficulty: "moderate to hard",
    description: "Class 11 student (age 16-17)",
    subjects: {
      "Mathematics": "sets, functions, trigonometry, limits, permutations and combinations",
      "Aptitude / Reasoning": "arithmetic reasoning, logical deduction, basic data interpretation",
      "English / Verbal": "grammar, reading comprehension, vocabulary, sentence correction",
      "Physics": "mechanics, thermodynamics, waves, kinematics from Class 11",
      "Chemistry": "atomic structure, periodic table, organic chemistry basics from Class 11"
    }
  },
  "12th": {
    difficulty: "hard",
    description: "Class 12 student (age 17-18)",
    subjects: {
      "Mathematics": "calculus, matrices, vectors, probability, integration",
      "Aptitude / Reasoning": "advanced arithmetic, analytical reasoning, data sufficiency, syllogisms",
      "English / Verbal": "advanced grammar, comprehension, para jumbles, vocabulary",
      "Physics": "electrostatics, optics, modern physics, semiconductors from Class 12",
      "Chemistry": "electrochemistry, coordination compounds, polymers from Class 12"
    }
  },
   "UG": {
    difficulty: "very difficult",
    description: "Undergraduate college student",
    subjects: {
      "Mathematics": "calculus, linear algebra, differential equations, probability and statistics",
      "Aptitude / Reasoning": "CAT/GRE level quantitative aptitude, logical reasoning, data interpretation",
      "English / Verbal": "advanced verbal ability, critical reasoning, reading comprehension, vocabulary"
    }
  },
  "PG": {
    difficulty: "extremely difficult",
    description: "Postgraduate/Masters level student",
    subjects: {
      "Mathematics": "abstract algebra, real analysis, topology, advanced probability theory",
      "Aptitude / Reasoning": "GMAT/GRE level advanced quantitative reasoning, complex analytical ability",
      "English / Verbal": "critical analysis, advanced verbal reasoning, inference-based comprehension"
    }
  }
};

// ✅ Build prompt
function buildPrompt(level, subject) {
  const config = levelConfig[level] || levelConfig["UG"];
  const topicHint = config.subjects[subject] || `${subject} at ${config.description} level`;

  return `You are an expert question paper setter for Indian students.
Generate a ${config.difficulty} ${subject} MCQ question for a ${config.description}.
Topic areas to pick from: ${topicHint}

Strict Rules:
- Difficulty must be exactly "${config.difficulty}" — match the student's level
- All 4 options must be plausible and clearly distinct
- Only one option must be correct
- No hints should be given in the question text
- Question must be from the mentioned topic areas only

Return ONLY a valid JSON object with no extra text, no markdown, no code block:
{
  "question": "Full question text here",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct": "The correct option exactly as written in options array"
}`;
}

// ✅ Main route
app.post("/generate", async (req, res) => {
  const level = req.body.level || "UG";
  const subject = req.body.subject || "Mathematics";

  // 1. Validation Logic (Keep your existing validation)
  const validSubjects = {
    "10th": ["Mathematics", "Aptitude / Reasoning", "English / Verbal", "Physics", "Chemistry"],
    "11th": ["Mathematics", "Aptitude / Reasoning", "English / Verbal", "Physics", "Chemistry"],
    "12th": ["Mathematics", "Aptitude / Reasoning", "English / Verbal", "Physics", "Chemistry"],
    "UG": ["Mathematics", "Aptitude / Reasoning", "English / Verbal"],
    "PG": ["Mathematics", "Aptitude / Reasoning", "English / Verbal"]
  };

  if (!levelConfig[level] || !validSubjects[level].includes(subject)) {
    return res.status(400).json({ error: "Invalid level or subject" });
  }

  const prompt = buildPrompt(level, subject);
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
        temperature: 0.6, // Lowered temperature for more stable JSON
        max_tokens: 512
      })
    });

    const data = await response.json();
    let rawText = data.choices?.[0]?.message?.content || "";

    // --- NEW ROBUST PARSING LOGIC ---
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found in response");

    let cleanJson = match[0]
      .replace(/\\(?!"|\\|\/|b|f|n|r|t|u[0-9a-fA-F]{4})/g, "\\\\") // Fixes "Bad Escaped Character"
      .replace(/[\u0000-\u001F]+/g, " "); // Removes hidden control characters

    let question;
    try {
      question = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error("JSON Parse failed after cleaning. Sending fallback.");
      // FALLBACK: If JSON is still broken, send a safe grammar question
      return res.json({
        level,
        subject,
        question: "Choose the correct word: 'The team _____ practicing for the tournament.'",
        options: ["is", "are", "be", "am"],
        correct: "is"
      });
    }

    // Final check for required fields
    if (!question.question || !question.options || !question.correct) {
      throw new Error("Incomplete question fields");
    }

    res.json({
      level,
      subject,
      ...question
    });

  } catch (err) {
    console.error("Critical Error:", err.message);
    res.status(500).json({ error: "Server error", message: err.message });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
