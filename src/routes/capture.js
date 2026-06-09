const express = require('express');
const multer = require('multer');
const removebg = require('../services/removebg');
const aiTransform = require('../services/ai-transform');
const branding = require('../services/branding');
const storage = require('../services/storage');
const { readEvents, writeEvents } = require('./admin');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { eventId, theme } = req.body;

    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    if (!eventId)  return res.status(400).json({ error: 'eventId is required' });
    if (!theme)    return res.status(400).json({ error: 'theme is required' });

    const events = readEvents();
    const event = events.find((e) => e.id === eventId);
    if (!event) return res.status(404).json({ error: `Event '${eventId}' not found` });

    const imageBuffer = req.file.buffer;

    // Run background removal and background generation in parallel — cuts total time ~50%
    let cutoutBuffer, backgroundBuffer;
    try {
      [cutoutBuffer, backgroundBuffer] = await Promise.all([
        removebg.removeBackground(imageBuffer),
        aiTransform.generateBackground(theme),
      ]);
    } catch (aiErr) {
      console.error('AI pipeline error:', aiErr);
      return res.status(502).json({ error: `AI processing failed: ${aiErr.message}` });
    }

    const themes = require('../../config/themes.json');
    const themeConfig = themes[theme] || null;
    const finalBuffer = await branding.composite(cutoutBuffer, backgroundBuffer, event, themeConfig);

    let photoUrl, qrUrl;
    try {
      ({ photoUrl, qrUrl } = await storage.uploadPhoto(finalBuffer, eventId));
    } catch (storageErr) {
      console.error('Storage error:', storageErr);
      return res.status(502).json({ error: `Storage failed: ${storageErr.message}` });
    }

    event.usage = event.usage || [];
    event.usage.push({ photoUrl, createdAt: new Date().toISOString() });
    writeEvents(events);

    res.json({ photoUrl, qrUrl });
  } catch (err) {
    console.error('Capture pipeline error:', err);
    res.status(500).json({ error: err.message || 'Photo capture pipeline failed' });
  }
});

module.exports = router;
