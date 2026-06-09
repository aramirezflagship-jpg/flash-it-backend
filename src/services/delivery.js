const twilio = require('twilio');

function getClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

const MESSAGE_BODY = (url) =>
  `¡Tu foto está lista! / Your photo is ready: ${url} — Flash-It by ValuConnect Solutions`;

async function sendSMS(phone, photoUrl) {
  const client = getClient();
  const message = await client.messages.create({
    body: MESSAGE_BODY(photoUrl),
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
  });
  return { sid: message.sid };
}

async function sendWhatsApp(phone, photoUrl) {
  const client = getClient();
  const to = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
  const message = await client.messages.create({
    body: MESSAGE_BODY(photoUrl),
    from: process.env.TWILIO_WHATSAPP_FROM,
    to,
  });
  return { sid: message.sid };
}

module.exports = { sendSMS, sendWhatsApp };
