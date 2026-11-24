
const url = 'https://wzpdfmihnwcrgkyagwkd.supabase.co/rest/v1/orders?select=*&order=id.desc&limit=5';
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
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}
fetchLastOrders();
