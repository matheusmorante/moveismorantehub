const sharp = require('sharp');
const fs = require('fs');
(async () => {
  const src = 'erp/src/assets/pickup-hands-parcel-filled.png';
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const luminance = Math.round((data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722));
    data[i] = data[i + 1] = data[i + 2] = 255;
    data[i + 3] = Math.round(data[i + 3] * luminance / 255);
  }
  const out = 'erp/src/assets/pickup-hands-parcel-white.png';
  await sharp(data, { raw: info }).png().toFile(out);
  fs.copyFileSync(out, 'mobile/assets/pickup-hands-parcel-white.png');
})();
