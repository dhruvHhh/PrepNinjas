// info.js — Gemini + Compile proxy with Topic-Specific Generation + Code Evaluation
// Run: npm install express cors node-fetch@2

const express = require("express");
const fetchModule = require("node-fetch");
const fetch = fetchModule.default || fetchModule;
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ---------- CONFIG ----------
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("ERROR: GEMINI_API_KEY not found in environment variables!");
  console.error("Please add GEMINI_API_KEY to your .env file");
}

// Use multiple Piston endpoints for fallback
const PISTON_ENDPOINTS = [
  "https://emkc.org/api/v2/piston/execute",
  "https://piston.rocks/api/v2/execute"
];
// ----------------------------

const TOPIC_GUIDES = {
  'arrays': 'Focus on array manipulation, searching, sorting, subarray problems (max sum), two-pointer technique, sliding window, prefix sums, matrix problems, and array rotation.',
  'linked-lists': 'Focus on linked list operations, node manipulation, reversal (iterative and recursive), cycle detection (Floyd\'s algorithm), merge operations, deletion, finding middle, and slow-fast pointer technique.',
  'stacks': 'Focus on stack operations, expression evaluation, parentheses matching, next greater element, monotonic stacks, postfix notation, and stack-based DFS problems.',
  'queues': 'Focus on queue operations, BFS algorithms, sliding window maximum, circular queues, deque problems, and level-order traversal.',
  'trees': 'Focus on binary tree traversal (inorder, preorder, postorder), BST operations, tree balancing, LCA (Lowest Common Ancestor), diameter, height problems, and recursive tree manipulation.',
  'graphs': 'Focus on graph algorithms, DFS and BFS, shortest path (Dijkstra, Bellman-Ford), topological sort, cycles detection, connected components, and strongly connected components.',
  'hash-tables': 'Focus on hashing, collision resolution, hash map/dictionary problems, duplicate detection, anagrams, frequency counting, and two-sum variants.',
  'heaps': 'Focus on min/max heaps, heap operations (insert, delete, heapify), heap sort, k largest/smallest elements, median finding, and priority queue problems.',
  'sorting': 'Focus on sorting algorithms (QuickSort, MergeSort, TimSort, HeapSort), time/space complexity analysis, partition schemes, and handling edge cases like duplicates.',
  'recursion': 'Focus on recursive problems, backtracking with pruning, base cases and recursive relations, memoization, permutations, combinations, and N-Queens type problems.',
  'dynamic-programming': 'Focus on DP problems with overlapping subproblems, memoization vs tabulation, optimal substructure identification, coin change, knapsack, and DP on strings.',
  'strings': 'Focus on string manipulation, pattern matching (KMP, Rabin-Karp), anagrams, palindromes, substring problems, string compression, and character frequency problems.'
};

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

/**
 * POST /api/generate
 * Body: { role: string, topics?: string }
 */
app.post("/api/generate", async (req, res) => {
  const { role = "software engineer", topics = "data structures" } = req.body || {};
  const topicGuide = TOPIC_GUIDES[topics.toLowerCase()] || 'general relevant data structure and algorithm concepts';

  const prompt = `You are an expert technical interview assistant specializing in Data Structures & Algorithms.

TOPIC: ${topics.toUpperCase()}
ROLE: ${role}

Generate 2 DISTINCT and SPECIFIC technical interview questions for a ${role} candidate.

FOCUS AREAS for ${topics.toUpperCase()}:
${topicGuide}

REQUIREMENTS:
- Each question must be UNIQUE and test DIFFERENT concepts within the topic
- Include specific problem statements with clear requirements
- Mention expected Time and Space complexity requirements
- Questions should be progressively harder (Q1 medium, Q2 hard)
- Use realistic coding scenarios
- AVOID generic or vague questions
- Add constraints and edge cases to make questions specific

RESPONSE FORMAT (JSON ONLY, NO MARKDOWN):
{
  "questions": [
    {"id": 1, "text": "Question 1: [Specific problem statement with clear requirements, constraints, and complexity hints]"},
    {"id": 2, "text": "Question 2: [Specific problem statement with clear requirements, constraints, and complexity hints]"}
  ]
}

Generate ONLY valid JSON. Do NOT include markdown code blocks or any other text.`;

  try {
    console.log(`🔍 Generating questions for Topic: ${topics}, Role: ${role}`);
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 1.0,
          topP: 0.95,
          topK: 40,
        }
      }),
    });

    if (!r.ok) {
      const text = await r.text();
      console.error("❌ Gemini API error:", r.status, text);
      return res.status(r.status).json({ error: "Gemini API request failed", details: text });
    }

    const data = await r.json();
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("📝 Raw Gemini response:", responseText);

    const match = responseText.match(/\{[\s\S]*\}/);
    
    if (!match) {
      console.error("❌ No JSON found in Gemini response");
      return res.status(400).json({ 
        error: "Invalid response format from Gemini", 
        details: "Could not extract JSON from response",
        rawResponse: responseText 
      });
    }

    const parsed = JSON.parse(match[0]);

    if (!parsed.questions || parsed.questions.length === 0) {
      console.error("❌ No questions in Gemini response");
      return res.status(400).json({ 
        error: "No questions generated",
        details: parsed 
      });
    }

    console.log(`✅ Successfully generated ${parsed.questions.length} questions for ${topics}`);
    
    return res.json(parsed);

  } catch (err) {
    console.error("❌ Gemini API Error:", err && err.message ? err.message : err);
    return res.status(500).json({ 
      error: "Gemini API request failed", 
      details: String(err) 
    });
  }
});

/**
 * POST /api/evaluate
 * Body: { question: string, code: string, language: string, topic: string }
 */
app.post("/api/evaluate", async (req, res) => {
  const { question, code, language, topic } = req.body || {};

  if (!question || !code || !language) {
    return res.status(400).json({ error: "Missing required fields: question, code, language" });
  }

  const prompt = `You are an expert code reviewer and technical interviewer. Evaluate the following code solution.

QUESTION:
${question}

LANGUAGE: ${language}
TOPIC: ${topic || "Data Structures & Algorithms"}

CODE SOLUTION:
\`\`\`${language}
${code}
\`\`\`

EVALUATION CRITERIA:
1. **Correctness** (2 points): Does the code solve the problem correctly?
2. **Code Quality** (2 points): Is the code clean, readable, and well-structured?
3. **Efficiency** (2 points): Time and space complexity optimization
4. **Edge Cases** (2 points): Does it handle edge cases properly?
5. **Best Practices** (2 points): Follows language conventions and coding standards

Provide a detailed evaluation with:
- Overall score out of 10
- Breakdown of scores for each criterion
- Strengths of the solution
- Areas for improvement
- Suggestions for optimization

RESPONSE FORMAT (JSON ONLY, NO MARKDOWN):
{
  "score": 8.5,
  "breakdown": {
    "correctness": 2,
    "codeQuality": 1.5,
    "efficiency": 2,
    "edgeCases": 1.5,
    "bestPractices": 1.5
  },
  "strengths": ["Strength 1", "Strength 2"],
  "improvements": ["Improvement 1", "Improvement 2"],
  "suggestions": "Detailed suggestions for optimization",
  "summary": "Brief summary of the evaluation"
}

Generate ONLY valid JSON. Do NOT include markdown code blocks.`;

  try {
    console.log(`🔍 Evaluating code for question in ${language}...`);
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
        }
      }),
    });

    if (!r.ok) {
      const text = await r.text();
      console.error("❌ Gemini evaluation error:", r.status, text);
      return res.status(r.status).json({ error: "Gemini evaluation failed", details: text });
    }

    const data = await r.json();
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("📝 Raw evaluation response:", responseText);

    const match = responseText.match(/\{[\s\S]*\}/);
    
    if (!match) {
      console.error("❌ No JSON found in evaluation response");
      return res.status(400).json({ 
        error: "Invalid evaluation format", 
        details: "Could not extract JSON",
        rawResponse: responseText 
      });
    }

    const evaluation = JSON.parse(match[0]);

    console.log(`✅ Code evaluated - Score: ${evaluation.score}/10`);
    
    return res.json(evaluation);

  } catch (err) {
    console.error("❌ Evaluation Error:", err && err.message ? err.message : err);
    return res.status(500).json({ 
      error: "Code evaluation failed", 
      details: String(err) 
    });
  }
});

/**
 * POST /api/compile
 * Body: { language: "python"|"java"|"cpp", code: string, stdin?: string }
 * ✅ FIXED: Better error handling & timeout
 */
app.post("/api/compile", async (req, res) => {
  try {
    const { language, code, stdin } = req.body || {};
    
    if (!language || !code) {
      return res.status(400).json({ error: "Missing language or code" });
    }

   const langMap = {
  python: { language: "python", version: "3.10.0", filename: "main.py" },
  java: { language: "java", version: "15.0.2", filename: "Main.java" },
  cpp: { language: "cpp", version: "10.2.0", filename: "main.cpp" },
  "c++": { language: "cpp", version: "10.2.0", filename: "main.cpp" },
  javascript: { language: "javascript", version: "15.10.6", filename: "main.js" }
};


    const runtime = langMap[language.toLowerCase()] || { 
      language: language.toLowerCase(), 
      version: "*", 
      filename: "main.txt" 
    };

    const payload = {
      language: runtime.language,
      version: runtime.version,
      files: [{ name: runtime.filename, content: code }],
      stdin: stdin || "",
    };

    console.log(`⚙️ Compiling ${runtime.language}...`);

    // ✅ Try with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const r = await fetch(PISTON_ENDPOINTS[0], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!r.ok) {
      const text = await r.text();
      console.error("❌ Piston runner error:", r.status, text);
      return res.status(r.status).json({ error: "Execution failed", details: `Piston API error: ${r.status}` });
    }

    const out = await r.json();
    
    console.log(`✅ Execution completed:`, {
      language: out.language,
      exitCode: out.run?.code,
      hasStdout: !!out.run?.stdout,
      hasStderr: !!out.run?.stderr
    });

    return res.json(out);

  } catch (err) {
    console.error("❌ Compile error:", err && err.message ? err.message : err);
    return res.status(500).json({ 
      error: "Compile failed", 
      details: String(err) 
    });
  }
});

/**
 * GET /api/health
 */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  res.status(500).json({ 
    error: "Internal server error", 
    details: err.message 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n✅ Interview Proctoring Server running on port ${PORT}`);
  console.log(`   🔗 API Base: http://localhost:${PORT}`);
  console.log(`   📝 Generate Questions: POST /api/generate`);
  console.log(`   ⚙️  Compile Code: POST /api/compile`);
  console.log(`   🎯 Evaluate Code: POST /api/evaluate`);
  console.log(`   🏥 Health Check: GET /api/health\n`);
});
