import mongoose from 'mongoose';

const UrlSchema = new mongoose.Schema({
  originalUrl: {
    type: String,
    required: true,
    trim: true
  },
  shortCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  title: {
    type: String,
    trim: true,
    default: ''
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    default: null,
    index: true
  },
  folder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
    index: true
  },
  clicks: {
    type: Number,
    default: 0
  },
  tags: {
    type: [String],
    default: []
  },
  password: {
    type: String,
    default: null
  },
  isPasswordProtected: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: null
  },
  maxClicks: {
    type: Number,
    default: null
  },
  isOneTimeUse: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isABTest: {
    type: Boolean,
    default: false
  },
  abDestinations: [
    {
      url: { type: String, required: true, trim: true },
      weight: { type: Number, required: true, min: 1, max: 100 }
    }
  ],
  isGeoRouting: {
    type: Boolean,
    default: false
  },
  geoTargets: [
    {
      countryCode: { type: String, required: true, trim: true, uppercase: true },
      url: { type: String, required: true, trim: true }
    }
  ],
  isDeviceRouting: {
    type: Boolean,
    default: false
  },
  deviceTargets: [
    {
      deviceType: { type: String, required: true, enum: ['Mobile', 'Tablet', 'Desktop'] },
      url: { type: String, required: true, trim: true }
    }
  ],
  isScheduledRedirect: {
    type: Boolean,
    default: false
  },
  scheduledTargets: [
    {
      startAt: { type: Date, required: true },
      endAt: { type: Date, required: true },
      url: { type: String, required: true, trim: true }
    }
  ],
  milestone100Sent: { type: Boolean, default: false },
  milestone500Sent: { type: Boolean, default: false },
  milestone1000Sent: { type: Boolean, default: false },
  category: { type: String, default: 'Uncategorized' },
  aiTags: { type: [String], default: [] },
  safetyScore: { type: Number, default: 100 },
  safetyDetails: { type: String, default: '' },
  healthScore: { type: Number, default: 100 },
  healthDetails: { type: String, default: '' },
  metadata: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    favicon: { type: String, default: '' },
    ogImage: { type: String, default: '' },
    canonicalUrl: { type: String, default: '' },
    readingTime: { type: Number, default: 0 },
    language: { type: String, default: 'en' },
    summary: { type: String, default: '' }
  }
});

export default mongoose.model('Url', UrlSchema);
