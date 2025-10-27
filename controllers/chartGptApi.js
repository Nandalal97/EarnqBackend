// controllers/chatController.js
const axios = require('axios');
require('dotenv').config();

const ChartGptApi = async (req, res) => {
  const { prompt, language } = req.body;

  const models = ['gpt-4o', 'gpt-3.5-turbo']; // fallback order
  const maxRetries = 3;
  const delay = ms => new Promise(r => setTimeout(r, ms));

  // Language map (add more if needed)
  const languageMap = {
    hi: 'Hindi',
    bn: 'Bengali',
    mr: 'Marathi',
    gu: 'Gujarati',
    ta: 'Tamil',
    te: 'Telugu',
    kn: 'Kannada',
    or: 'Odia',
    pa: 'Punjabi',
    en: 'English',
  };

  const userLang = language || 'en';
  const langName = languageMap[userLang] || 'English';

  for (const model of models) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model,
            messages: [
              {
                role: 'system',
                content: `You are a helpful assistant. Respond in ${langName}.`
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 2048,
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            }
          }
        );

        const aiMessage = response.data.choices[0].message.content;
        return res.status(200).json({
          modelUsed: model,
          tokensUsed: response.data.usage?.total_tokens,
          answer: aiMessage
        });
      } catch (err) {
        const status = err.response?.status;
        const message = err.response?.data?.error?.message || err.message;

        if (status === 429 && attempt < maxRetries) {
          console.warn(`Rate limited on ${model} attempt ${attempt}. Retrying...`);
          await delay(3000);
          continue;
        }

        console.error(`Error with ${model} (attempt ${attempt}): ${message}`);
        break;
      }
    }
    console.info(`Model ${model} failed. Trying next model...`);
  }

  return res.status(500).json({ msg: 'All OpenAI models failed or are rate-limited.' });
};

const AnalyzeAnswer = async (req, res) => {
  const { question, userAnswer, language = 'en' } = req.body;

  if (!question || !userAnswer) {
    return res.status(400).json({ error: 'Question and user answer are required.' });
  }

  const models = ['gpt-4o', 'gpt-3.5-turbo'];
  const maxRetries = 3;
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  const languageMap = {
    hi: 'Hindi',
    bn: 'Bengali',
    mr: 'Marathi',
    gu: 'Gujarati',
    ta: 'Tamil',
    te: 'Telugu',
    kn: 'Kannada',
    or: 'Odia',
    pa: 'Punjabi',
    en: 'English',
  };

  const langName = languageMap[language] || 'English';

  const prompt = `
Question: ${question}
Answer: ${userAnswer}

Analyze the your's answer in ${langName}.
- Mention if the answer is correct or incorrect.
- Provide brief feedback or improvement tips in ${langName}.
`;

  for (const model of models) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model,
            messages: [
              {
                role: 'system',
                content: `You are a helpful AI assistant. Respond in ${langName}.`
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 2048,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            }
          }
        );

        const analysis = response.data.choices[0].message.content;
        return res.status(200).json({
          modelUsed: model,
          analysis,
          tokensUsed: response.data.usage?.total_tokens || null
        });
      } catch (err) {
        const status = err.response?.status;
        const msg = err.response?.data?.error?.message || err.message;
        console.error(`Error with model ${model} on attempt ${attempt}:`, msg);

        if (status === 429 && attempt < maxRetries) {
          await delay(3000); // Wait and retry
          continue;
        }
        break;
      }
    }
    console.info(`Switching from model ${model} to fallback model...`);
  }

  return res.status(500).json({ error: 'OpenAI models failed or were rate-limited.' });
};

module.exports = { ChartGptApi, AnalyzeAnswer };
