const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['CPU_SPIKE', 'MEMORY_HIGH', 'SYSTEM_CRITICAL'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    threshold: {
      type: Number,
      default: 80,
    },
    resolved: {
      type: Boolean,
      default: false,
    },
    resolvedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Alert', AlertSchema);
