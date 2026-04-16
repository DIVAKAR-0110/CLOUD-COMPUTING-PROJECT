const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const Alert = require('../models/Alert');

// @route GET /api/alerts
router.get('/', protect, async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route POST /api/alerts
router.post('/', protect, async (req, res) => {
  try {
    const { type, message, value, threshold } = req.body;
    const alert = await Alert.create({ type, message, value, threshold });
    res.status(201).json({ success: true, alert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route PATCH /api/alerts/:id/resolve
router.patch('/:id/resolve', protect, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { resolved: true, resolvedAt: new Date() },
      { new: true }
    );
    res.json({ success: true, alert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
