const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const QRCode = require('qrcode');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function uploadBuffer(buffer, key, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

async function uploadPhoto(photoBuffer, eventId) {
  const timestamp = Date.now();
  const folder = `flash-it/events/${eventId}`;

  const photoKey = `${folder}/photo_${timestamp}.jpg`;
  const photoUrl = await uploadBuffer(photoBuffer, photoKey, 'image/jpeg');

  const qrBuffer = await QRCode.toBuffer(photoUrl, {
    type: 'png',
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });

  const qrKey = `${folder}/qr_${timestamp}.png`;
  const qrUrl = await uploadBuffer(qrBuffer, qrKey, 'image/png');

  return { photoUrl, qrUrl };
}

module.exports = { uploadPhoto };
