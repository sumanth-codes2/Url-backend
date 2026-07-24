import Analytics from '../models/Analytics.js';

export const analyticsRepository = {
  create: (analyticsData) => {
    const analytics = new Analytics(analyticsData);
    return analytics.save();
  },
  findByUrlId: (urlId, limit = 100) => Analytics.find({ urlId }).sort({ timestamp: -1 }).limit(limit),
  countByUrlId: (urlId) => Analytics.countDocuments({ urlId }),
  aggregateReferrers: (urlId) => {
    return Analytics.aggregate([
      { $match: { urlId } },
      { $group: { _id: '$referrer', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
  },
  aggregateDevices: (urlId) => {
    return Analytics.aggregate([
      { $match: { urlId } },
      { $group: { _id: '$device', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
  },
  aggregateBrowsers: (urlId) => {
    return Analytics.aggregate([
      { $match: { urlId } },
      { $group: { _id: '$browser', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
  },
  aggregateOS: (urlId) => {
    return Analytics.aggregate([
      { $match: { urlId } },
      { $group: { _id: '$os', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
  },
  aggregateCountries: (urlId) => {
    return Analytics.aggregate([
      { $match: { urlId } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
  },
  aggregateTimeline: (urlId) => {
    return Analytics.aggregate([
      { $match: { urlId } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  },
  findUniqueIps: (urlId, ipAddress) => Analytics.findOne({ urlId, ipAddress })
};
