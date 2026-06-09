const express = require('express');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const adminAuth = require('../middleware/adminAuth');
const { prebakeTheme, getMemoryCache } = require('../services/ai-transform');

const EVENTS_FILE = path.resolve(__dirname, '../../config/events.json');

const router = express.Router();

function readEvents() {
  try {
    const raw = fs.readFileSync(EVENTS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeEvents(events) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8');
}

function generateId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
}

router.get('/events', adminAuth, (req, res) => {
  const events = readEvents();
  res.json(events.map(({ usage, ...e }) => ({ ...e, photoCount: (usage || []).length })));
});

router.post('/events', adminAuth, (req, res) => {
  const { name, logo, themes, deliveryChannels, textOverlays } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const events = readEvents();
  const newEvent = {
    id: generateId(name),
    name,
    logo: logo || null,
    themes: themes || [],
    deliveryChannels: deliveryChannels || ['sms'],
    textOverlays: Array.isArray(textOverlays) ? textOverlays : [],
    createdAt: new Date().toISOString(),
    usage: [],
  };

  events.push(newEvent);
  writeEvents(events);

  const { usage, ...response } = newEvent;
  res.status(201).json(response);
});

router.get('/events/:eventId/usage', (req, res) => {
  const events = readEvents();
  const event = events.find((e) => e.id === req.params.eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  res.json({
    eventId: event.id,
    eventName: event.name,
    photoCount: (event.usage || []).length,
    photos: event.usage || [],
  });
});

// Get text overlays for an event
// GET /admin/events/:eventId/overlays
router.get('/events/:eventId/overlays', adminAuth, (req, res) => {
  const events = readEvents();
  const event = events.find((e) => e.id === req.params.eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  res.json({ eventId: event.id, textOverlays: event.textOverlays || [] });
});

// Replace text overlays for an event
// PUT /admin/events/:eventId/overlays
router.put('/events/:eventId/overlays', adminAuth, (req, res) => {
  const { textOverlays } = req.body;

  if (!Array.isArray(textOverlays)) {
    return res.status(400).json({ error: 'textOverlays must be an array' });
  }

  const events = readEvents();
  const idx = events.findIndex((e) => e.id === req.params.eventId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Event not found' });
  }

  events[idx].textOverlays = textOverlays;
  writeEvents(events);

  const { usage, ...response } = events[idx];
  res.json(response);
});

// Return current in-memory background cache (themeId -> urls[])
// GET /admin/bgcache
router.get('/bgcache', adminAuth, (req, res) => {
  res.json(getMemoryCache());
});

// Pre-bake backgrounds for a theme (run once before an event for fastest results)
// POST /admin/prebake/:themeId?count=5
router.post('/prebake/:themeId', adminAuth, async (req, res) => {
  try {
    const count = Math.min(parseInt(req.query.count) || 5, 10);
    const bgCache = await prebakeTheme(req.params.themeId, count);
    res.json({ themeId: req.params.themeId, cached: bgCache.length, urls: bgCache });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pre-bake ALL themes at once
// POST /admin/prebake-all?count=3
router.post('/prebake-all', adminAuth, async (req, res) => {
  try {
    const count = Math.min(parseInt(req.query.count) || 3, 5);
    const themes = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../config/themes.json'), 'utf8'));
    const results = {};
    for (const themeId of Object.keys(themes)) {
      results[themeId] = await prebakeTheme(themeId, count);
    }
    res.json({ message: 'All themes pre-baked', results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.readEvents = readEvents;
module.exports.writeEvents = writeEvents;
