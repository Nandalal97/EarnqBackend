// utils/scheduler.js
const cron = require('node-cron')
const { fetchAndSaveNews } = require('./fetcher');

cron.schedule('0 */12 * * *', async () => {
    console.log('🕒 Scheduled news fetch started...');
    try {
        const count = await fetchAndSaveNews();
        console.log(`✅ Scheduled fetch completed: ${count} news + MCQs inserted`);
    } catch (err) {
        console.error('❌ Error in scheduled fetch:', err);
    }
});
