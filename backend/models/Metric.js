const mongoose = require('mongoose');

const MetricSchema = new mongoose.Schema(
  {
    cpuLoad: {
      type: Number,
      required: true,
    },
    memoryUsed: {
      type: Number,
      required: true,
    },
    isSpiking: {
      type: Boolean,
      default: false,
    },
    topProcesses: [
      {
        name: String,
        cpu: Number,
        mem: Number,
      },
    ],
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for fast time-range queries
MetricSchema.index({ recordedAt: -1 });

module.exports = mongoose.model('Metric', MetricSchema);
