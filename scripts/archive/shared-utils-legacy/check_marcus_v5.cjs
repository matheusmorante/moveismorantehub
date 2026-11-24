
const fs = require('fs');
const url = 'https://wzpdfmihnwcrgkyagwkd.supabase.co/rest/v1/orders?select=*&order=id.desc&limit=10';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to run this archived script.');

async function fetchLastOrders() {
  try {
    const resp = await fetch(url, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    const data = await resp.json();
    fs.writeFileSync('marcus_dump.json', JSON.stringify(data, null, 2));
    console.log('Success - marcus_dump.json created');
  } catch (e) {
    fs.writeFileSync('marcus_error.txt', e.toString());
    console.error(e);
  }
}
fetchLastOrders();
