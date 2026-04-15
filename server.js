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

// ✅ Configuration
const levelConfig = {
  "10th": { difficulty: "easy to moderate", description: "Class 10 (Secondary School)", subjects: { "Mathematics": "algebra, geometry", "Aptitude / Reasoning": "basic arithmetic", "English / Verbal": "grammar", "Physics": "motion", "Chemistry": "atoms" } },
  "11th": { difficulty: "moderate to hard", description: "Class 11 (Higher Secondary)", subjects: { "Mathematics": "sets, trig", "Aptitude / Reasoning": "arithmetic reasoning", "English / Verbal": "vocabulary", "Physics": "mechanics", "Chemistry": "organic" } },
  "12th": { difficulty: "hard", description: "Class 12 (Board Level)", subjects: { "Mathematics": "calculus", "Aptitude / Reasoning": "advanced reasoning", "English / Verbal": "para jumbles", "Physics": "optics", "Chemistry": "polymers" } },
  "UG": { difficulty: "very difficult", description: "Undergraduate (College)", subjects: { "Mathematics": "linear algebra", "Aptitude / Reasoning": "CAT level", "English / Verbal": "verbal ability" } },
  "PG": { difficulty: "extremely difficult", description: "Postgraduate (Masters)", subjects: { "Mathematics": "topology", "Aptitude / Reasoning": "GMAT level", "English / Verbal": "critical analysis" } }
};

// ✅ Updated Prompt: Indian Context Focus
function buildPrompt(level, subject) {
  const config = levelConfig[level] || levelConfig["UG"];
  const topicHint = config.subjects[subject] || `${subject} level`;

  return `You are an expert question paper setter for Indian competitive exams (like JEE, NEET, SSC, and CBSE Boards).
Generate a ${config.difficulty} MCQ for ${subject} tailored for a ${config.description}.

Strict Rules:
- The question must follow the Indian educational context and curriculum standards.
- Use Indian English and terminology.
- Difficulty must be exactly "${config.difficulty}".
- Return ONLY a valid JSON object. No intro, no outro, no markdown.

JSON Structure:
{
  "question": "Full question text here",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct": "The exact string of the correct option"
}`;
}

// ✅ MAIN ROUTE
app.post("/generate", async (req, res) => {
  let { level, subject } = req.body;

  // --- STEP 1: ROBUST NORMALIZATION (Fixes the "10th" issue) ---
  // Ensure level matches our keys even if the frontend sends "10" or "Class 10"
  if (level) {
    if (level.includes("10")) level = "10th";
    else if (level.includes("11")) level = "11th";
    else if (level.includes("12")) level = "12th";
  }

  // Map common subject names to config keys
  if (subject === "Aptitude" || subject === "Reasoning") subject = "Aptitude / Reasoning";
  if (subject === "Verbal" || subject === "English") subject = "English / Verbal";
  
  // Set Defaults if values are still missing or invalid
  const finalLevel = levelConfig[level] ? level : "UG";
  const finalSubject = (levelConfig[finalLevel].subjects[subject]) ? subject : "Mathematics";

  const prompt = buildPrompt(finalLevel, finalSubject);
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
        temperature: 0.5, // Lower temperature = more stable Indian context
        max_tokens: 600
      })
    });

    const data = await response.json();
    let rawText = data.choices?.[0]?.message?.content || "";

    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI failed to return JSON");

    const question = JSON.parse(match[0]);

    // Final check: Ensure 4 options exist
    if (!question.options || question.options.length < 4) {
        throw new Error("Insufficient options");
    }

    res.json({ level: finalLevel, subject: finalSubject, ...question });

  } catch (err) {
    console.error("Fetch Error:", err.message);
    // Safety Fallback: Guaranteed 4-option question if AI glitches
    res.json({
      level: finalLevel,
      subject: finalSubject,
      question: "Which Indian city is known as the 'Silicon Valley of India'?",
      options: ["Bengaluru", "Hyderabad", "Pune", "Mumbai"],
      correct: "Bengaluru"
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Indian-Context Server running on port ${PORT}`));