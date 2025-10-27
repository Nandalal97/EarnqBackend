const Parser = require('rss-parser')
const RawNews = require('../models/RawNews');
const FormattedNews = require('../models/FormattedNews');
const MCQ = require('../models/CurrentAffairsMcq');
const { generateFormattedNews, generateMCQs } = require('./generator');
const parser = new Parser();
const RSS_FEEDS = [
    { source: 'PIB', url: 'https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3' },
    { source: 'The Hindu', url: 'https://www.thehindu.com/news/national/feeder/default.rss' },
    { source: 'Indian Express', url: 'https://indianexpress.com/section/india/feed/' },
    { source: 'Economic Times', url: 'https://economictimes.indiatimes.com/rssfeeds/1977021501.cms' },
    { source: 'BBC', url: 'http://feeds.bbci.co.uk/news/world/asia/india/rss.xml' }
];
const EXAM_KEYWORDS = [
    "government schemes", "policies", "economy", "defence", "DRDO", "ISRO", "SEBI", "budget", "WHO", 'health', 'space',
    "RBI", "education", "treaty", "parliament", 'IMF', 'judgment', 'GDP', 'employment', 'unemployment', 'UN',
    "law", "amendment", "act", 'agriculture', "cabinet", 'environment', "international", 'national', 'awards', 'election',
    "NITI Aayog", "World Bank", "Supreme Court", "High Court", "award ceremony", "sports (national importance)", "finance",
    "technology", 'cybersecurity', "foreign policy", "MoU", "national security", "satellite", "border", 'nuclear', 'climate',
    'GST', "Indian army", "exercise", "appointment", "summit", "cultural", "important events"
];

const MAX_PER_CALL = 20; // max news per API call
function isRelevant(content) {
    if (!content) return false;
    content = content.toLowerCase();
    return EXAM_KEYWORDS.some(keyword => content.includes(keyword.toLowerCase()));
}
// Truncate question/options for real exam
function truncateForExam(text, maxChars = 120) {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= maxChars) return text;
    const cutPoint = Math.max(text.lastIndexOf('.', maxChars), text.lastIndexOf(',', maxChars));
    return cutPoint > 0 ? text.slice(0, cutPoint + 1) : text.slice(0, maxChars);
}

// Keep full sentences for explanation
function keepFullSentences(text, maxChars = 1500) {
    if (!text || typeof text !== 'string') return '';
    return text.length > maxChars ? text.slice(0, maxChars) : text;
}

// Shuffle options for all languages and map correct answers safely
function shuffleAllLanguagesOptions(mcq) {
    const letters = ['a', 'b', 'c', 'd'];
    const shuffledOptions = {};
    const answerLetters = {};

    Object.keys(mcq.options).forEach(lang => {
        if (!mcq.options[lang]) return;

        const arr = letters.map(l => ({ letter: l, text: mcq.options[lang][l] }));
        // fallback: use English answer if language answer missing
        const correctLetter = mcq.answer?.[lang] || mcq.answer?.en || 'a';
        const correctText = mcq.options[lang][correctLetter] || mcq.options.en[correctLetter];

        const shuffled = [...arr].sort(() => Math.random() - 0.5);
        shuffledOptions[lang] = {};
        shuffled.forEach((o, idx) => shuffledOptions[lang][letters[idx]] = o.text);

        const answerIndex = shuffled.findIndex(o => o.text === correctText);
        answerLetters[lang] = letters[answerIndex] || 'a';
    });

    return { shuffledOptions, answerLetters };
}

async function fetchAndSaveNews() {
    try {
        let newsCount = 0;

        for (const feed of RSS_FEEDS) {
            if (newsCount >= MAX_PER_CALL) break;

            const rss = await parser.parseURL(feed.url);

            for (const item of rss.items) {
                if (newsCount >= MAX_PER_CALL) break;

                const title = item.title || '';
                const link = item.link || '';
                const contentSnippet = item.contentSnippet || item.content || '';

                if (!title || !isRelevant(contentSnippet)) continue;

                // Skip duplicates
                const exists = await RawNews.findOne({ $or: [{ link }, { title }] });
                if (exists) continue;

                // Insert RawNews
                const rawNews = await RawNews.create({
                    source: feed.source,
                    title,
                    link,
                    rawContent: contentSnippet
                });

                // Generate formatted news via ChatGPT
                const formattedData = await generateFormattedNews(contentSnippet, title);
                if (!formattedData) continue;

                const formattedNews = await FormattedNews.create({
                    rawNews: rawNews._id,
                    heading: formattedData.heading,
                    shortDescription: formattedData.shortDescription,
                    keyPoints: formattedData.keyPoints
                });

                // Generate 1 MCQ per news
                const mcqs = await generateMCQs(formattedNews);
                if (!mcqs || mcqs.length === 0) continue;

                const mcq = mcqs[0];
                const { shuffledOptions, answerLetters } = shuffleAllLanguagesOptions(mcq);

                // Only insert if answerLetters exist
                if (!answerLetters || Object.keys(answerLetters).length === 0) continue;

                await MCQ.create({
                    news: formattedNews._id,
                    question: Object.fromEntries(Object.entries(mcq.question).map(([lang, val]) => [lang, truncateForExam(val || '')])),
                    options: Object.fromEntries(Object.entries(shuffledOptions).map(([lang, opts]) => [
                        lang, Object.fromEntries(Object.entries(opts).map(([key, val]) => [key, truncateForExam(val || '', 50)]))
                    ])),
                    answer: {
                        en: answerLetters.en || 'a',
                        hi: answerLetters.hi || 'a',
                        bn: answerLetters.bn || 'a',
                        mr: answerLetters.mr || 'a',
                        gu: answerLetters.gu || 'a',
                        pa: answerLetters.pa || 'a',
                        ta: answerLetters.ta || 'a',
                        te: answerLetters.te || 'a',
                        or: answerLetters.or || 'a',
                        kn: answerLetters.kn || 'a'
                    },
                    explanation: {
                        en: keepFullSentences(mcq.explanation?.en || ''),
                        hi: keepFullSentences(mcq.explanation?.hi || ''),
                        bn: keepFullSentences(mcq.explanation?.bn || ''),
                        mr: keepFullSentences(mcq.explanation?.mr || ''),
                        gu: keepFullSentences(mcq.explanation?.gu || ''),
                        pa: keepFullSentences(mcq.explanation?.pa || ''),
                        ta: keepFullSentences(mcq.explanation?.ta || ''),
                        te: keepFullSentences(mcq.explanation?.te || ''),
                        or: keepFullSentences(mcq.explanation?.or || ''),
                        kn: keepFullSentences(mcq.explanation?.kn || '')
                    }
                });

                newsCount++;
            }
        }

        console.log(`✅ ${newsCount} news + MCQs inserted successfully`);
        return newsCount;

    } catch (err) {
        console.error('Error in fetchAndSaveNews:', err);
        return 0;
    }
}

module.exports = { fetchAndSaveNews };
