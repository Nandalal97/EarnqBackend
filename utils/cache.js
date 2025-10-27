const NodeCache = require('node-cache');

// 90 minutes cache (5400 seconds)
const cache = new NodeCache({ stdTTL: 5400, checkperiod: 120 });

module.exports = cache;
