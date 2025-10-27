require('dotenv').config();
require('./utils/scheduler');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require("xss-clean");
const connectdb = require('./config/db')
const authRoutes = require('./routes/auth');
const questionRoutes = require('./routes/questionRoutes');
const cookieParser = require('cookie-parser');
const categoryRoutes = require('./routes/categoryRoutes');
const subject = require('./routes/subjectRoutes');
const videoRoute = require('./routes/getSignedVideo');
const userRoutes = require('./routes/userRoutes');
const subscription = require('./routes/subscriptionRoutes');
const payment = require('./routes/payment');
const refer = require('./routes/referralRoute');
const contactRoutes = require('./routes/contactRoutes');
const contest = require('./routes/contestRoutes')
const quiz = require('./routes/quiz')
const userCoin = require('./routes/coinRoutes')
const chartGptApi = require('./routes/chartGptChartRoute');
const report =require('./routes/Report')
const books =require('./routes/bookRoute')
const adminBookOrders =require('./routes/adminOrderRoutes')
const coupon=require('./routes/couponRoutes');
const newsRoutes = require('./routes/newsRoutes');
const mockTestRoutes = require('./routes/mockTestRoutes');
const talentRoutes = require('./routes/talentRoutes');
const talentAdminRoutes = require('./routes/talentAdminRoutes');
const affiliateRoutes = require('./routes/affiliateRoutes');

// admin route

const adminRoute = require('./routes/admin/adminRoutes');

const app = express();
app.use(cookieParser());
app.set('trust proxy', 1);
// Disable caching for all responses
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

app.use(express.json());
connectdb();
// Basic security middleware
  // Initialize counter once at startup


app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://15.206.179.137',
    
    'https://earnq.in',
    'http://earnq.in',
    'https://admin.earnq.in',
    'http://admin.earnq.in',
    'https://uat.earnq.in',
    'http://uat.earnq.in',
  ],
  credentials: true
}));
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
   standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests! Try again later.",
  },
  keyGenerator: (req, res) => req.ip // Express give trusted proxy IP
});

app.use(limiter);

// Limit: Max 5 signup requests per 10 minutes per IP
// const signupLimiter = rateLimit({
//   windowMs: 10 * 60 * 1000, // 10 minutes
//   max: 5, // Limit each IP to 5 requests per windowMs
//   message: {
//     msg: 'Too many attemt. Try again later.',
//     status: 0,
//   },
// });

// Routes
app.get('/api/dashboard', (req, res) => {
  res.json({ msg: 'Welcome to your dashboard.......!' });
});
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes)
app.use('/api', categoryRoutes);
app.use('/api/subjects', subject);
app.use('/api', videoRoute);
app.use('/api', userRoutes);
app.use('/api/payment', payment);
app.use('/api/subscription', subscription);
app.use('/api/referral', refer);
app.use('/api/contacts', contactRoutes);
app.use('/api/contest', contest);
app.use('/api/quiz', quiz);
app.use('/api/user', userCoin);
app.use('/api/ai', chartGptApi);
app.use('/api/report', report);
app.use('/api/books', books);
app.use('/api/books/admin', adminBookOrders);
// app.use('/api/cart', addToCart);
app.use('/api/coupon', coupon);

app.use('/api/news', newsRoutes);
app.use('/api/mocktests', mockTestRoutes);
app.use('/api/talent', talentRoutes);
app.use('/api/admin/talent', talentAdminRoutes);
app.use('/api/affiliate', affiliateRoutes);

// admin
// app.use('/api/admin', (req, res, next) => {
//   const origin = req.headers.origin;
//   if (origin !== 'https://admin.earnq.in') {
//     return res.status(403).json({ status:0, msg: 'Login Fail! Contact To Administrator ' });
//   }
//   next();
// });

app.use('/api/admin', adminRoute);


// Hide tech stack
app.disable('x-powered-by');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Secure API running on port ${PORT}`);
});