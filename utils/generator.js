const { OpenAI } = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Generate formatted news
async function generateFormattedNews(rawContent, title) {
  const prompt = `
You are an expert current affairs editor.
1. Take the news title and content below (English).
2. Generate:
   - Heading
   - Short description (~800-1000 chars)
   - 5 key points in bullets
3. Translate everything into Hindi and Bengali.
Return in JSON format:
{
  "heading": {"en": "...", "hi": "...", "bn": "...","mr":"...","gu":"...","pa":"...","ta":"...","te":"...","or":"...","kn":"..."},
  "shortDescription": {"en": "...", "hi": "...", "bn": "...","mr":"...","gu":"...","pa":"...","ta":"...","te":"...","or":"...","kn":"..."},
  "keyPoints": {"en":["..."], "hi":["..."], "bn":["..."], "mr":["..."],"gu":["..."],"pa":["..."],"ta":["..."],"te":["..."],"or":["..."],"kn":["..."]}
}

Title: ${title}
Content: ${rawContent}
`;

  const response = await client.chat.completions.create({
    model: "gpt-5-mini",
    messages: [{ role: "user", content: prompt }],
  });

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    console.error("ChatGPT parse error:", err);
    return null;
  }
}

// Generate 1 MCQ per news with exam-ready length
async function generateMCQs(formattedNews) {
  const prompt = `
You are a competitive exam question maker.
News Heading: ${formattedNews.heading.en}
Key Points: ${formattedNews.keyPoints.en.join("; ")}

Generate 1 multiple-choice question with 4 options (a,b,c,d). 
⚠️ Rules:
- Make question concise (≤2 lines) suitable for SSC, RRB, IBPS, UPSC, PSC exams.
- Options must be ≤50 characters.
- Randomly place the correct answer among a,b,c,d.
- Allowed topics: government schemes, policies, economy, defence, DRDO, ISRO, SEBI, budget, WHO, health, space, RBI, SEBI, education, treaty, parliament, IMF, judgment, GDP, employment, unemployment, UN, law, amendment, act, agriculture, cabinet, environment, international, national, awards, election, NITI Aayog, World Bank, Supreme Court, High Court, award ceremony, sports (national importance), finance, technology, cybersecurity, foreign policy, MoU, national security, satellite, border, nuclear, climate, GST, Indian army, exercise, appointment, summit, cultural, important events.
- Do NOT generate casual trivia (movies, celebrity gossip, etc).
- Provide detailed explanation (full, ≥250 characters) in exam style.
- Return answer and explanation in all language.

Return JSON format:
[
  {
    "question": {"en":"...","hi":"...","bn":"...","mr":"...","gu":"...","pa":"...","ta":"...","te":"...","or":"...","kn":"..."},
    "options": {
      "en":{"a":"...","b":"...","c":"...","d":"..."},
      "hi":{"a":"...","b":"...","c":"...","d":"..."},
      "bn":{"a":"...","b":"...","c":"...","d":"..."},
      "mr":{"a":"...","b":"...","c":"...","d":"..."},
      "gu":{"a":"...","b":"...","c":"...","d":"..."},
      "pa":{"a":"...","b":"...","c":"...","d":"..."},
      "ta":{"a":"...","b":"...","c":"...","d":"..."},
      "te":{"a":"...","b":"...","c":"...","d":"..."},
      "or":{"a":"...","b":"...","c":"...","d":"..."},
      "kn":{"a":"...","b":"...","c":"...","d":"..."}
    },
    "answer": { "en":"...","hi":"...","bn":"...", "mr":"...", "gu":"...", "pa":"...", "ta":"...", "te":"...", "or":"...", "kn":"..." },
    "explanation":{"en":"...","hi":"...","bn":"...","mr":"...","gu":"...","pa":"...","ta":"...","te":"...","or":"...","kn":"..."}
  }
]
`;

  const response = await client.chat.completions.create({
    model: "gpt-5-mini",
    messages: [{ role: "user", content: prompt }],
  });

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    console.error("ChatGPT MCQ parse error:", err);
    return [];
  }
}

module.exports = { generateFormattedNews, generateMCQs };
