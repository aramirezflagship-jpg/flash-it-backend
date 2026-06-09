const { removeBackground: imglyRemoveBg } = require('@imgly/background-removal-node');

async function removeBackground(imageBuffer) {
  const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
  const resultBlob = await imglyRemoveBg(blob, { output: { format: 'image/png' } });
  const arrayBuffer = await resultBlob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

module.exports = { removeBackground };
