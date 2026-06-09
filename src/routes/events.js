const express = require('express');
const { readEvents, writeEvents } = require('./admin');
const delivery = require('../services/delivery');

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

module.exports = router;
