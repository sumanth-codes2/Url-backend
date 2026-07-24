import mongoose from 'mongoose';

const AiQueryLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  query: {
    type: String,
    required: true
  },
  response: {
    type: String,
    required: true
  },
  isEmulated: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index to quickly search/count logs in recent intervals
AiQueryLogSchema.index({ createdAt: -1 });

export default mongoose.model('AiQueryLog', AiQueryLogSchema);
