async function checkLiveCsv() {
  const r = await fetch('https://moveismorante.com.br/api/facebook-catalog.csv');
  const txt = await r.text();
  const lines = txt.split('\n');
  console.log('Total lines in CSV:', lines.length);
  console.log('Header:', lines[0]);
  let uuidCount = 0;
  let skuCount = 0;
  const sampleUuids = [];
  const sampleSkus = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    // CSV separator is comma
    const match = line.match(/^("([^"]*)"|[^,]*)/);
    const id = match ? (match[2] !== undefined ? match[2] : match[1]) : '';
    const cleanId = id.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
    if (isUuid) {
      uuidCount++;
      if (sampleUuids.length < 5) sampleUuids.push(cleanId);
    } else {
      skuCount++;
      if (sampleSkus.length < 5) sampleSkus.push(cleanId);
    }
  }
  console.log('CSV Summary: UUIDs =', uuidCount, ', SKUs =', skuCount);
  console.log('Sample UUIDs in CSV:', sampleUuids);
  console.log('Sample SKUs in CSV:', sampleSkus);
}

checkLiveCsv().catch(console.error);
