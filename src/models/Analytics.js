import mongoose from 'mongoose';

const AnalyticsSchema = new mongoose.Schema({
  urlId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Url',
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  device: {
    type: String,
    enum: ['Desktop', 'Mobile', 'Tablet', 'Other'],
    default: 'Other'
  },
  browser: {
    type: String,
    default: 'Unknown'
  },
  os: {
    type: String,
    default: 'Unknown'
  },
  country: {
    type: String,
    default: 'Unknown',
    index: true
  },
  countryCode: {
    type: String,
    default: 'Unknown'
  },
  stateRegion: {
    type: String,
    default: 'Unknown'
  },
  city: {
    type: String,
    default: 'Unknown'
  },
  timezone: {
    type: String,
    default: 'Unknown'
  },
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  },
  referrer: {
    type: String,
    default: 'Direct',
    index: true
  },
  ipAddress: {
    type: String,
    default: 'Unknown'
  },
  isp: {
    type: String,
    default: 'Unknown'
  },
  isUnique: {
    type: Boolean,
    default: true
  }
});

export default mongoose.model('Analytics', AnalyticsSchema);
