const cloudinary = require('cloudinary').v2;
const QRCode = require('qrcode');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadBuffer(buffer, folder, publicId, resourceType = 'image') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: resourceType, overwrite: false },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

async function uploadPhoto(photoBuffer, eventId) {
  const timestamp = Date.now();
  const photoPublicId = `photo_${timestamp}`;
  const folder = `flash-it/events/${eventId}`;

  const photoResult = await uploadBuffer(photoBuffer, folder, photoPublicId);
  const photoUrl = photoResult.secure_url;

  const qrBuffer = await QRCode.toBuffer(photoUrl, {
    type: 'png',
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });

  const qrPublicId = `qr_${timestamp}`;
  const qrResult = await uploadBuffer(qrBuffer, folder, qrPublicId);
  const qrUrl = qrResult.secure_url;

  return { photoUrl, qrUrl, publicId: photoResult.public_id };
}

module.exports = { uploadPhoto };
