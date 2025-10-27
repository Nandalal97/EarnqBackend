const RawNews = require('../models/RawNews');
const FormattedNews = require('../models/FormattedNews');
const MCQ = require('../models/CurrentAffairsMcq');
const mongoose = require('mongoose');
const { fetchAndSaveNews } = require('../utils/fetcher'); // updated path & optimized
// Trigger fetch & insert news manually
let isRunning = false;
const MAX_LIMIT = 20; // ✅ set max number of news to process in one API call

const fetchAndInsertNews = async (req, res) => {
    if (isRunning) {
        // console.log("⚠️ API blocked: already running");
        return res.json({ success: false, message: "API already running" });
    }

    isRunning = true;
    //   console.log("✅ API request started");

    try {
        let totalProcessed = 0;

        while (totalProcessed < MAX_LIMIT) {
            const count = await fetchAndSaveNews();
            totalProcessed += count;

            //   console.log(`📰 ${count} news + MCQs inserted successfully (Total: ${totalProcessed})`);

            if (totalProcessed >= MAX_LIMIT) {
                // console.log("🛑 Auto-stop reached max limit");
                break;
            }
        }

        // console.log("👉 Preparing response");
        return res.json({
            success: true,
            message: `${totalProcessed} news + MCQs inserted successfully`,
        });

    } catch (err) {
        console.error("❌ Error:", err);
        return res.status(500).json({ success: false, message: "Error fetching news" });
    } finally {
        // console.log("👉 API request finished, reset isRunning");
        isRunning = false;
    }
};


// Get all formatted news
const getAllNews = async (req, res) => {
    try {
        const news = await FormattedNews.find().sort({ createdAt: -1 });
        res.json({ success: true, data: news });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// fetch single mcw by language and id 
const getMCQByIdLang = async (req, res) => {
    try {
        const { id, lang } = req.params;
        const mcq = await MCQ.findById(id).lean();
        if (!mcq) {
            return res.status(404).json({ success: false, message: "MCQ not found" });
        }
        res.json({
            success: true,
            data: {
                mcqId: mcq._id,
                newsId: mcq.news,
                question: mcq.question?.[lang] || "",
                options: mcq.options?.[lang] || {},
                answer: mcq.answer?.[lang] || "",
                explanation: mcq.explanation?.[lang] || "",
                createdAt: mcq.createdAt,
            },
        });
    } catch (err) {
        console.error("Error in getMCQByIdLang:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// fetch mcq with formated news and news
const getAllMCQsByLang = async (req, res) => {
    try {
        const lang = req.query.lang || 'en';        // default English
        const page = parseInt(req.query.page) || 1; // default page 1
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        let filter = {};

        // Monthly filter
        if (req.query.month && req.query.year) {
            const month = parseInt(req.query.month); // 1-12
            const year = parseInt(req.query.year);

            const startDate = new Date(year, month - 1, 1); // first day of month
            const endDate = new Date(year, month, 0, 23, 59, 59, 999); // last day of month

            filter.createdAt = { $gte: startDate, $lte: endDate };
        } else if (req.query.startDate || req.query.endDate) {
            // fallback to custom date range
            if (req.query.startDate) {
                filter.createdAt = { ...filter.createdAt, $gte: new Date(req.query.startDate) };
            }
            if (req.query.endDate) {
                filter.createdAt = { ...filter.createdAt, $lte: new Date(new Date(req.query.endDate).setHours(23, 59, 59, 999)) };
            }
        }

        // Fetch MCQs with pagination
        const mcqs = await MCQ.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: 'news',
                select: 'heading shortDescription keyPoints rawNews',
                populate: {
                    path: 'rawNews',
                    select: 'source title link rawContent'
                }
            })
            .lean();

        const totalMCQs = await MCQ.countDocuments(filter);

        const response = mcqs.map(mcq => {
            const news = mcq.news;
            return {
                mcqId: mcq._id,
                question: mcq.question[lang] || mcq.question.en,
                options: mcq.options[lang] || mcq.options.en,
                answer: mcq.answer,
                explanation: mcq.explanation[lang] || mcq.explanation.en,
                news: news
                    ? {
                        heading: news.heading[lang] || news.heading.en,
                        shortDescription: news.shortDescription[lang] || news.shortDescription.en,
                        keyPoints: news.keyPoints[lang] || news.keyPoints.en,
                        rawNews: news.rawNews
                            ? {
                                source: news.rawNews.source,
                                title: news.rawNews.title,
                                link: news.rawNews.link,
                                rawContent: news.rawNews.rawContent
                            }
                            : null
                    }
                    : null
            };
        });

        res.json({
            success: true,
            page,
            limit,
            totalMCQs,
            totalPages: Math.ceil(totalMCQs / limit),
            data: response
        });

    } catch (err) {
        console.error('Error in getAllMCQsByLang:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// fetch all mcq only
const getAllMCQs = async (req, res) => {
    try {
        const lang = req.query.lang || 'en';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        let filter = {};

        // ✅ Highest priority: specific date range
        if (req.query.startDate && req.query.endDate) {
            const startDate = new Date(req.query.startDate);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(req.query.endDate);
            endDate.setHours(23, 59, 59, 999);

            filter.createdAt = { $gte: startDate, $lte: endDate };
        }
        else if (req.query.startDate) {
            const day = new Date(req.query.startDate);
            const startDate = new Date(day.setHours(0, 0, 0, 0));
            const endDate = new Date(day.setHours(23, 59, 59, 999));

            filter.createdAt = { $gte: startDate, $lte: endDate };
        }
        // ✅ Fallback: filter by year and/or month
        else if (req.query.year) {
            const year = parseInt(req.query.year);

            if (req.query.month) {
                const month = parseInt(req.query.month); // 1-12
                const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
                const endDate = new Date(year, month, 0, 23, 59, 59, 999);

                filter.createdAt = { $gte: startDate, $lte: endDate };
            } else {
                // If month not selected, fetch entire year
                const startDate = new Date(year, 0, 1, 0, 0, 0, 0);
                const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

                filter.createdAt = { $gte: startDate, $lte: endDate };
            }
        }

        // Fetch only necessary fields
        const mcqs = await MCQ.find(filter, {
            question: 1,
            options: 1,
            answer: 1,
            explanation: 1,
            createdAt: 1,
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const totalMCQs = await MCQ.countDocuments(filter);

        const response = mcqs.map((mcq) => ({
            mcqId: mcq._id,
            newsId: mcq.news,
            question: mcq.question?.[lang] || mcq.question?.en || '',
            options: mcq.options?.[lang] || mcq.options?.en || {},
            answer: mcq.answer?.[lang] || mcq.answer?.en || '',
            explanation: mcq.explanation?.[lang] || mcq.explanation?.en || '',
            createdAt: mcq.createdAt,
        }));

        res.json({
            success: true,
            page,
            limit,
            totalMCQs,
            totalPages: Math.ceil(totalMCQs / limit),
            data: response,
        });

    } catch (err) {
        console.error('Error in getAllMCQs:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get news by ID
const getNewsById = async (req, res) => {
    try {
        const news = await FormattedNews.findById(req.params.id)
            .populate('rawNews', 'source title link rawContent');
        if (!news) return res.status(404).json({ success: false, message: 'News not found' });
        res.json({ success: true, data: news });
    } catch (err) {
        console.error('Error in getNewsById:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Fetch MCQ by ID
const getMCQById = async (req, res) => {
    try {
        const mcq = await MCQ.findById(req.params.id)
            .populate({
                path: 'news',
                select: 'heading shortDescription keyPoints rawNews',
                populate: {
                    path: 'rawNews',
                    select: 'source title link rawContent'
                }
            });

        if (!mcq) return res.status(404).json({ success: false, message: 'MCQ not found' });

        res.json({ success: true, data: mcq });
    } catch (err) {
        console.error('Error in getMCQById:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Update MCQ
const updateMCQByLang = async (req, res) => {
    try {
        const { id, lang } = req.params; // mcqId + language
        const { question, options, answer, explanation } = req.body;

        // build dynamic update object for the selected language
        let updateData = {};

        if (question) updateData[`question.${lang}`] = question;
        if (options?.a) updateData[`options.${lang}.a`] = options.a;
        if (options?.b) updateData[`options.${lang}.b`] = options.b;
        if (options?.c) updateData[`options.${lang}.c`] = options.c;
        if (options?.d) updateData[`options.${lang}.d`] = options.d;
        if (answer) updateData[`answer.${lang}`] = answer;
        if (explanation) updateData[`explanation.${lang}`] = explanation;

        const mcq = await MCQ.findByIdAndUpdate(id, { $set: updateData }, { new: true });

        if (!mcq) {
            return res.status(404).json({ success: false, message: "MCQ not found" });
        }

        res.json({
            success: true,
            message: `MCQ updated successfully for ${lang}`,
            data: mcq,
        });
    } catch (err) {
        console.error("Error in updateMCQByLang:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// delete mcw

const deleteMcq = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid MCQ ID' });
        }

        const deletedMcq = await MCQ.findByIdAndDelete(id);

        if (!deletedMcq) {
            return res.status(404).json({ success: false, message: 'MCQ not found' });
        }

        res.json({ success: true, message: 'MCQ deleted successfully', data: deletedMcq });
    } catch (error) {
        console.error('❌ Error deleting MCQ:', error);
        res.status(500).json({ success: false, message: 'Server error while deleting MCQ', error: error.message });
    }
};

// fetch data form formattednews 
const getFormattedNewsByLang = async (req, res) => {
    try {
        const lang = req.query.lang || 'en';        // default language
        const page = parseInt(req.query.page) || 1; // default page 1
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        let filter = {};

        if (req.query.month && req.query.year) {
            const month = parseInt(req.query.month); // 1-12
            const year = parseInt(req.query.year);

            const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
            const endDate = new Date(year, month, 0, 23, 59, 59, 999);

            filter.createdAt = { $gte: startDate, $lte: endDate };
        } else if (req.query.startDate && req.query.endDate) {
            const startDate = new Date(req.query.startDate);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(req.query.endDate);
            endDate.setHours(23, 59, 59, 999);

            filter.createdAt = { $gte: startDate, $lte: endDate };
        } else if (req.query.startDate) {
            const day = new Date(req.query.startDate);
            const startDate = new Date(day.setHours(0, 0, 0, 0));
            const endDate = new Date(day.setHours(23, 59, 59, 999));

            filter.createdAt = { $gte: startDate, $lte: endDate };
        }

        // Fetch formatted news with pagination and populate raw news
        const newsList = await FormattedNews.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: 'rawNews',
                select: 'source title link rawContent'
            })
            .lean();

        const totalNews = await FormattedNews.countDocuments(filter);

        // Map for requested language safely
        const response = newsList.map(news => ({
            newsId: news._id,
            heading: news.heading?.[lang] || news.heading?.en || '',
            shortDescription: news.shortDescription?.[lang] || news.shortDescription?.en || '',
            keyPoints: news.keyPoints?.[lang] || news.keyPoints?.en || '',
            rawNews: news.rawNews ? {
                source: news.rawNews.source || '',
                title: news.rawNews.title || '',
                link: news.rawNews.link || '',
                rawContent: news.rawNews.rawContent || ''
            } : null,
            createdAt: news.createdAt
        }));

        res.json({
            success: true,
            page,
            limit,
            totalNews,
            totalPages: Math.ceil(totalNews / limit),
            data: response
        });

    } catch (err) {
        console.error('Error in getFormattedNewsByLang:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// date-month-years
const getNewsByDateMonthYear = async (req, res) => {
    try {
        const now = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setUTCDate(now.getUTCDate() - 7);

        // 1️⃣ Fetch last 7 days news for dateWise
        const recentNews = await FormattedNews.find({ createdAt: { $gte: sevenDaysAgo } })
            .sort({ createdAt: -1 })
            .select("createdAt heading")
            .lean();

        const dateWise = recentNews.map(news => {
            const dateObj = new Date(news.createdAt);
            const year = dateObj.getUTCFullYear();
            const month = dateObj.getUTCMonth(); // 0-11
            const day = dateObj.getUTCDate();

            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

            const formatedate = new Intl.DateTimeFormat("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: "UTC"
            }).format(dateObj);

            return { date: dateStr, formatedate, icon: "bi-alarm" };
        });

        // Remove duplicates in dateWise (if multiple news per day)
        const uniqueDateWise = [];
        const dateSet = new Set();
        dateWise.forEach(d => {
            if (!dateSet.has(d.date)) {
                uniqueDateWise.push(d);
                dateSet.add(d.date);
            }
        });

        // 2️⃣ Fetch all news dates for monthWise & yearWise
        const allNewsDates = await FormattedNews.find({})
            .select("createdAt")
            .lean();

        const monthMap = new Map();
        const yearMap = new Map();

        allNewsDates.forEach(news => {
            const dateObj = new Date(news.createdAt);
            const year = dateObj.getUTCFullYear();
            const month = dateObj.getUTCMonth(); // 0-11

            // Month string
            const monthStr = new Intl.DateTimeFormat("en-GB", {
                month: "long",
                year: "numeric",
                timeZone: "UTC"
            }).format(dateObj);

            const monthNumber = month + 1; // 1-12
            if (!monthMap.has(monthStr)) {
                monthMap.set(monthStr, {
                    month: monthStr,
                    monthNumber,
                    icon: "bi-calendar-week"
                });
            }

            // Year string
            if (!yearMap.has(year)) {
                yearMap.set(year, { year: year.toString(), icon: "bi-calendar-check" });
            }
        });

        // 3️⃣ Sort monthWise and yearWise descending
        const monthWise = Array.from(monthMap.values()).sort((a, b) => b.monthNumber - a.monthNumber);
        const yearWise = Array.from(yearMap.values()).sort((a, b) => b.year - a.year);

        // 4️⃣ Respond
        res.json({
            success: true,
            data: {
                dateWise: uniqueDateWise,
                monthWise,
                yearWise,
            },
        });

    } catch (err) {
        console.error("Error in getNewsByDateMonthYear:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};




module.exports = {
    fetchAndInsertNews,
    getAllNews,
    getNewsById,
    getAllMCQs,
    getMCQById,
    getAllMCQsByLang,
    getFormattedNewsByLang,
    getNewsByDateMonthYear,
    updateMCQByLang,
    getMCQByIdLang,
    deleteMcq
};
