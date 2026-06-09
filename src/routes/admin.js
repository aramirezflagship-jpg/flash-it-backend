const express = require('express');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const adminAuth = require('../middleware/adminAuth');

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
  const { name, logo, themes, deliveryChannels } = req.body;

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

module.exports = router;
module.exports.readEvents = readEvents;
module.exports.writeEvents = writeEvents;
