const express = require('express');
const { readEvents, writeEvents } = require('./admin');
const delivery = require('../services/delivery');
const marketing = require('../services/marketing');

const router = express.Router();

router.get('/:eventId', (req, res) => {
  const events = readEvents();
  const event = events.find((e) => e.id === req.params.eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  const { usage, ...publicConfig } = event;
  res.json(publicConfig);
});

router.post('/:eventId/deliver', async (req, res) => {
  try {
    const { photoUrl, phone, channel } = req.body;

    if (!photoUrl || !phone || !channel) {
      return res.status(400).json({ error: 'photoUrl, phone, and channel are required' });
    }
    if (!['sms', 'whatsapp'].includes(channel)) {
      return res.status(400).json({ error: "channel must be 'sms' or 'whatsapp'" });
    }

    const events = readEvents();
    const event = events.find((e) => e.id === req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (!event.deliveryChannels.includes(channel)) {
      return res.status(400).json({ error: `Channel '${channel}' is not enabled for this event` });
    }

    let result;
    if (channel === 'sms') {
      result = await delivery.sendSMS(phone, photoUrl);
    } else {
      result = await delivery.sendWhatsApp(phone, photoUrl);
    }

    res.json({ success: true, sid: result.sid });
  } catch (err) {
    console.error('Delivery error:', err);
    res.status(500).json({ error: err.message || 'Delivery failed' });
  }
});

// Capture guest contact info + optional marketing opt-in
// POST /events/:eventId/contact
router.post('/:eventId/contact', async (req, res) => {
  try {
    const { phone, email, photoUrl, theme, deliveryMethod, optIn } = req.body;
    if (!phone && !email) {
      return res.status(400).json({ error: 'phone or email required' });
    }

    const events = readEvents();
    const event = events.find((e) => e.id === req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const contact = await marketing.captureContact({
      eventId: event.id,
      eventName: event.name,
      theme: theme || '',
      phone: phone || '',
      email: email || '',
      photoUrl: photoUrl || '',
      deliveryMethod: deliveryMethod || 'qr',
    });

    res.json({ success: true, contactId: contact.id, optIn: !!optIn });
  } catch (err) {
    console.error('Contact capture error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
