const sharp = require('sharp');
const fs = require('fs');
const file = 'erp/src/assets/pickup-hands-parcel-white.png';
(async () => {
  const m = await sharp(file).metadata();
  const cut = Buffer.from(`<svg width="${m.width}" height="${m.height}" xmlns="http://www.w3.org/2000/svg"><path d="M 500 900 Q 558 925 612 945 T 650 962" fill="none" stroke="black" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
  const out = 'tmp/pickup-hands-parcel-white-fixed.png';
  await sharp(file).composite([{ input: cut, blend: 'dest-out' }]).png().toFile(out);
  fs.copyFileSync(out, file);
  fs.copyFileSync(out, 'mobile/assets/pickup-hands-parcel-white.png');
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  let nonWhite = 0, opaque = 0;
  for (let i = 0; i < data.length; i += info.channels) if (data[i + 3]) { opaque++; if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) nonWhite++; }
  console.log(JSON.stringify({ width: info.width, height: info.height, opaque, nonWhite, separatorAlpha: [0,.2,.4,.6,.8,1].map(t => { const x = Math.round(500 + t * 150), y = Math.round(900 + t * 62); return [x,y,data[(y * info.width + x) * info.channels + 3]]; }) }));
})();
