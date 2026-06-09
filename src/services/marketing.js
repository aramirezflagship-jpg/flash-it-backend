const axios = require('axios');
const twilio = require('twilio');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const BOARD_ID = '18417105361';
const CONTACTS_KEY = 'flash-it/config/contacts.json';

const GROUPS = {
  new_guest:        'group_mm45taj1',
  photo_delivered:  'group_mm45etks',
  contact_captured: 'group_mm453cf9',
  promo_sent:       'group_mm45msgy',
  converted:        'group_mm45kjfn',
  opted_out:        'group_mm45ctrb',
};

const COLS = {
  phone:    'phone_mm45ehtg',
  email:    'email_mm459bev',
  event:    'text_mm45bwbr',
  theme:    'text_mm45kw3c',
  photoUrl: 'link_mm45sgjm',
  delivery: 'color_mm45a7k0',
  date:     'date_mm45t150',
};

// ─── R2 persistence ───────────────────────────────────────────────────────────

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function loadContacts() {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: CONTACTS_KEY }));
    const chunks = [];
    for await (const chunk of res.Body) chunks.push(chunk);
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) return [];
    throw err;
  }
}

async function saveContacts(contacts) {
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: CONTACTS_KEY,
    Body: JSON.stringify(contacts, null, 2),
    ContentType: 'application/json',
  }));
}

// ─── Monday.com ───────────────────────────────────────────────────────────────

async function mondayRequest(query, variables = {}) {
  const key = process.env.MONDAY_API_KEY;
  if (!key) return null;
  try {
    const res = await axios.post(
      'https://api.monday.com/v2',
      { query, variables },
      { headers: { Authorization: key, 'Content-Type': 'application/json', 'API-Version': '2024-01' } }
    );
    return res.data;
  } catch (err) {
    console.warn('[marketing] Monday.com error:', err.message);
    return null;
  }
}

async function createMondayItem(contact) {
  const today = new Date().toISOString().split('T')[0];
  const columnValues = JSON.stringify({
    [COLS.phone]:    contact.phone    || '',
    [COLS.email]:    contact.email    || '',
    [COLS.event]:    contact.eventId  || '',
    [COLS.theme]:    contact.theme    || '',
    [COLS.photoUrl]: contact.photoUrl ? { url: contact.photoUrl, text: 'View Photo' } : '',
    [COLS.delivery]: contact.method   ? { label: contact.method.toUpperCase() } : '',
    [COLS.date]:     { date: today },
  });

  const result = await mondayRequest(
    `mutation ($boardId: ID!, $groupId: String!, $name: String!, $cols: JSON!) {
       create_item(board_id: $boardId, group_id: $groupId, item_name: $name, column_values: $cols) { id }
     }`,
    { boardId: BOARD_ID, groupId: GROUPS.contact_captured, name: contact.phone || `Guest ${Date.now()}`, cols: columnValues }
  );
  return result?.data?.create_item?.id || null;
}

async function moveMondayItem(itemId, groupId) {
  await mondayRequest(
    `mutation ($itemId: ID!, $groupId: String!) {
       move_item_to_group(item_id: $itemId, group_id: $groupId) { id }
     }`,
    { itemId, groupId }
  );
}

// ─── Promo message ────────────────────────────────────────────────────────────

const promoText = (eventName) =>
  `🎉 ¡Gracias por usar Flash-It en ${eventName}! Obtén 20% de descuento en tu próxima reserva → https://flash-it.valuconnect.io/booking — Flash-It by ValuConnect Solutions`;

async function sendPromo(phone, method, eventName) {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  if (method === 'whatsapp') {
    const to = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
    return client.messages.create({ body: promoText(eventName), from: process.env.TWILIO_WHATSAPP_FROM, to });
  }
  return client.messages.create({ body: promoText(eventName), from: process.env.TWILIO_PHONE_NUMBER, to: phone });
}

// ─── Public API ───────────────────────────────────────────────────────────────

async function captureContact({ eventId, eventName, phone, email, photoUrl, theme, method }) {
  const contact = {
    id: `c_${Date.now()}`,
    eventId,
    eventName: eventName || eventId,
    phone:     phone    || null,
    email:     email    || null,
    photoUrl:  photoUrl || null,
    theme:     theme    || null,
    method:    method   || 'sms',
    capturedAt:   new Date().toISOString(),
    promoSentAt:  null,
    mondayItemId: null,
  };

  // Persist to R2
  try {
    const all = await loadContacts();
    all.push(contact);
    await saveContacts(all);
  } catch (err) {
    console.warn('[marketing] R2 save failed:', err.message);
  }

  // Monday.com card
  try {
    contact.mondayItemId = await createMondayItem(contact);
  } catch (err) {
    console.warn('[marketing] Monday card failed:', err.message);
  }

  // Send promo (move to Promo Sent on Monday when done)
  if (phone) {
    try {
      await sendPromo(phone, contact.method, contact.eventName);
      contact.promoSentAt = new Date().toISOString();
      if (contact.mondayItemId) await moveMondayItem(contact.mondayItemId, GROUPS.promo_sent);
      // Update R2
      const all = await loadContacts();
      const i = all.findIndex(c => c.id === contact.id);
      if (i !== -1) { all[i].promoSentAt = contact.promoSentAt; await saveContacts(all); }
    } catch (err) {
      console.warn('[marketing] Promo failed:', err.message);
    }
  }

  return contact;
}

async function getContacts() {
  return loadContacts();
}

module.exports = { captureContact, getContacts, GROUPS };
