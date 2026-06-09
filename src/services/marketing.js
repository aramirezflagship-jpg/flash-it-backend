const fs = require('fs');
const path = require('path');
const twilio = require('twilio');

const CONTACTS_FILE = path.resolve(__dirname, '../../config/contacts.json');
const MONDAY_BOARD_ID = '18416958691';

// Column IDs from Monday.com board
const MONDAY_COLS = {
  phone:    'phone_mm45s7y6',
  email:    'email_mm45mpv7',
  event:    'text_mm45bexv',
  theme:    'text_mm45q9wd',
  photoUrl: 'link_mm45p1zj',
  delivery: 'color_mm45a7dw',
  promoDate:'date_mm45h89h',
  notes:    'long_text_mm45fhh8',
};

// Kanban group IDs
const GROUPS = {
  new:       'group_mm455kvx',
  delivered: 'group_mm45f9qg',
  captured:  'group_mm45hvav',
  promoSent: 'group_mm45tgff',
  converted: 'group_mm457xg7',
  optedOut:  'group_mm45vpwz',
};

function readContacts() {
  try { return JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8')); }
  catch { return []; }
}

function writeContacts(contacts) {
  fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2), 'utf8');
}

// Save contact + push to Monday.com Kanban
async function captureContact({ eventId, eventName, theme, phone, email, photoUrl, deliveryMethod }) {
  const contacts = readContacts();
  const existing = contacts.find(c => c.phone === phone || (email && c.email === email));

  const contact = {
    id: existing?.id || `${eventId}-${Date.now()}`,
    eventId,
    eventName: eventName || eventId,
    theme: theme || '',
    phone: phone || '',
    email: email || '',
    photoUrl: photoUrl || '',
    deliveryMethod: deliveryMethod || 'qr',
    capturedAt: new Date().toISOString(),
    promoSentAt: null,
    mondayItemId: existing?.mondayItemId || null,
    optedOut: false,
  };

  if (existing) {
    Object.assign(existing, contact);
  } else {
    contacts.push(contact);
  }
  writeContacts(contacts);

  // Push to Monday.com asynchronously (non-blocking)
  pushToMonday(contact).catch(err =>
    console.warn('[marketing] Monday.com push failed:', err.message)
  );

  return contact;
}

async function pushToMonday(contact) {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) return;

  const columnValues = JSON.stringify({
    [MONDAY_COLS.phone]:    contact.phone,
    [MONDAY_COLS.email]:    { email: contact.email, text: contact.email },
    [MONDAY_COLS.event]:    contact.eventName,
    [MONDAY_COLS.theme]:    contact.theme,
    [MONDAY_COLS.photoUrl]: { url: contact.photoUrl, text: 'View Photo' },
    [MONDAY_COLS.delivery]: { label: contact.deliveryMethod.toUpperCase() },
  });

  const groupId = contact.phone && contact.email ? GROUPS.captured : GROUPS.delivered;
  const guestLabel = contact.phone || contact.email || `Guest-${Date.now()}`;

  const query = `
    mutation {
      create_item(
        board_id: ${MONDAY_BOARD_ID},
        group_id: "${groupId}",
        item_name: "${guestLabel}",
        column_values: ${JSON.stringify(columnValues)}
      ) { id }
    }
  `;

  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: apiKey },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();

  if (data?.data?.create_item?.id) {
    const contacts = readContacts();
    const c = contacts.find(x => x.id === contact.id);
    if (c) {
      c.mondayItemId = data.data.create_item.id;
      writeContacts(contacts);
    }
  }
}

// Send marketing promo message 24h after contact capture
// Call this from a scheduled job or manually via admin API
async function sendPromo(contactId) {
  const contacts = readContacts();
  const contact = contacts.find(c => c.id === contactId);
  if (!contact) throw new Error(`Contact ${contactId} not found`);
  if (contact.optedOut) throw new Error('Contact has opted out');
  if (contact.promoSentAt) throw new Error('Promo already sent');

  const promoMsg = buildPromoMessage(contact);

  if (contact.phone) {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const channel = contact.deliveryMethod === 'whatsapp' ? 'whatsapp' : 'sms';

    if (channel === 'whatsapp') {
      const to = contact.phone.startsWith('whatsapp:') ? contact.phone : `whatsapp:${contact.phone}`;
      await client.messages.create({ body: promoMsg, from: process.env.TWILIO_WHATSAPP_FROM, to });
    } else {
      await client.messages.create({ body: promoMsg, from: process.env.TWILIO_PHONE_NUMBER, to: contact.phone });
    }
  }

  contact.promoSentAt = new Date().toISOString();
  writeContacts(contacts);

  // Move to "Promo Sent" in Monday.com
  if (contact.mondayItemId) {
    updateMondayGroup(contact.mondayItemId, GROUPS.promoSent, contact.promoSentAt)
      .catch(err => console.warn('[marketing] Monday.com update failed:', err.message));
  }

  return { success: true, promoSentAt: contact.promoSentAt };
}

function buildPromoMessage(contact) {
  const name = contact.eventName || 'tu evento';
  const es = `¡Hola! 🎉 Gracias por usar Flash-It en ${name}. ¿Listo para la próxima? Reserva ahora y obtén 10% de descuento: https://flash-it.app/booking — Flash-It by ValuConnect Solutions`;
  return es;
}

async function updateMondayGroup(itemId, groupId, promoDate) {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) return;

  const query = `
    mutation {
      move_item_to_group(item_id: ${itemId}, group_id: "${groupId}") { id }
      change_column_value(
        board_id: ${MONDAY_BOARD_ID},
        item_id: ${itemId},
        column_id: "${MONDAY_COLS.promoDate}",
        value: "${JSON.stringify({ date: promoDate.split('T')[0] })}"
      ) { id }
    }
  `;

  await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: apiKey },
    body: JSON.stringify({ query }),
  });
}

function getContacts() { return readContacts(); }

function optOut(phone) {
  const contacts = readContacts();
  const c = contacts.find(x => x.phone === phone);
  if (c) { c.optedOut = true; writeContacts(contacts); }
}

module.exports = { captureContact, sendPromo, getContacts, optOut };
