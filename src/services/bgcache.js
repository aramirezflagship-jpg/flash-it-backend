const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const CACHE_KEY = 'flash-it/config/bgcache.json';

async function loadBgCache() {
  try {
    const res = await s3.send(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: CACHE_KEY,
    }));
    const chunks = [];
    for await (const chunk of res.Body) {
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return {};
    }
    throw err;
  }
}

async function saveBgCache(cache) {
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: CACHE_KEY,
    Body: JSON.stringify(cache, null, 2),
    ContentType: 'application/json',
  }));
}

module.exports = { loadBgCache, saveBgCache };
