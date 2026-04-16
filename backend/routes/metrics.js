const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const Metric = require('../models/Metric');

// @route GET /api/metrics
// Get historical metrics with optional time filter
router.get('/', protect, async (req, res) => {
  try {
    const { hours = 1 } = req.query;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const metrics = await Metric.find({ recordedAt: { $gte: since } })
      .sort({ recordedAt: -1 })
      .limit(500);
    res.json({ success: true, count: metrics.length, metrics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route GET /api/metrics/summary
// Get spike summary stats
router.get('/summary', protect, async (req, res) => {
  try {
    const total = await Metric.countDocuments();
    const spikes = await Metric.countDocuments({ isSpiking: true });
    const avgCpu = await Metric.aggregate([
      { $group: { _id: null, avg: { $avg: '$cpuLoad' }, max: { $max: '$cpuLoad' } } },
    ]);
    res.json({
      success: true,
      summary: {
        totalRecords: total,
        totalSpikes: spikes,
        avgCpuLoad: avgCpu[0]?.avg?.toFixed(2) || 0,
        maxCpuLoad: avgCpu[0]?.max?.toFixed(2) || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route DELETE /api/metrics
// Clear all metrics
router.delete('/', protect, async (req, res) => {
  try {
    await Metric.deleteMany({});
    res.json({ success: true, message: 'All metrics cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
