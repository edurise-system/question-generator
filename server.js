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

// ✅ Configuration remains the same
const levelConfig = {
  "10th": { difficulty: "easy to moderate", description: "Class 10 student", subjects: { "Mathematics": "algebra, geometry", "Aptitude / Reasoning": "basic arithmetic", "English / Verbal": "grammar", "Physics": "motion", "Chemistry": "atoms" } },
  "11th": { difficulty: "moderate to hard", description: "Class 11 student", subjects: { "Mathematics": "sets, trig", "Aptitude / Reasoning": "arithmetic reasoning", "English / Verbal": "vocabulary", "Physics": "mechanics", "Chemistry": "organic" } },
  "12th": { difficulty: "hard", description: "Class 12 student", subjects: { "Mathematics": "calculus", "Aptitude / Reasoning": "advanced reasoning", "English / Verbal": "para jumbles", "Physics": "optics", "Chemistry": "polymers" } },
  "UG": { difficulty: "very difficult", description: "Undergraduate", subjects: { "Mathematics": "linear algebra", "Aptitude / Reasoning": "CAT level", "English / Verbal": "verbal ability" } },
  "PG": { difficulty: "extremely difficult", description: "Postgraduate", subjects: { "Mathematics": "topology", "Aptitude / Reasoning": "GMAT level", "English / Verbal": "critical analysis" } }
};

// ✅ Prompt builder remains same
function buildPrompt(level, subject) {
  const config = levelConfig[level] || levelConfig["UG"];
  const topicHint = config.subjects[subject] || `${subject} level`;

  return `You are an expert question paper setter. Generate a ${config.difficulty} MCQ for ${subject}. 
  Return ONLY JSON: {"question": "text", "options": ["A", "B", "C", "D"], "correct": "exact string"}`;
}

// ✅ FIXED Main route
app.post("/generate", async (req, res) => {
  let { level, subject } = req.body;

  // --- STEP 1: FIX STRING MISMATCHES (The 400 Error Fix) ---
  // This maps what the frontend sends to what the server-config expects
  if (subject === "Aptitude") subject = "Aptitude / Reasoning";
  if (subject === "Verbal") subject = "English / Verbal";
  
  // Default values if missing
  level = level || "UG";
  subject = subject || "Mathematics";

  // --- STEP 2: VALIDATION LOGIC ---
  const validSubjects = {
    "10th": ["Mathematics", "Aptitude / Reasoning", "English / Verbal", "Physics", "Chemistry"],
    "11th": ["Mathematics", "Aptitude / Reasoning", "English / Verbal", "Physics", "Chemistry"],
    "12th": ["Mathematics", "Aptitude / Reasoning", "English / Verbal", "Physics", "Chemistry"],
    "UG": ["Mathematics", "Aptitude / Reasoning", "English / Verbal"],
    "PG": ["Mathematics", "Aptitude / Reasoning", "English / Verbal"]
  };

  // Fixed check: now 'subject' will match the keys above after the STEP 1 mapping
  if (!levelConfig[level] || !validSubjects[level].includes(subject)) {
    console.error(`400 REJECTION: User sent Level: ${level}, Subject: ${subject}`);
    return res.status(400).json({ error: "Invalid level or subject combination" });
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
        temperature: 0.6,
        max_tokens: 512
      })
    });

    const data = await response.json();
    let rawText = data.choices?.[0]?.message?.content || "";

    // Robust parsing
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found");

    const question = JSON.parse(match[0]);
    res.json({ level, subject, ...question });

  } catch (err) {
    console.error("AI Error:", err.message);
    res.status(500).json({ error: "Server error", message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Fixed Server running on port ${PORT}`));