
const url = 'https://wzpdfmihnwcrgkyagwkd.supabase.co/rest/v1/orders?select=*';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to run this archived script.');

async function fetchMarcus() {
  try {
    const resp = await fetch(url, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    const data = await resp.json();
    const filtered = data.filter(d => JSON.stringify(d).toLowerCase().includes('marcus'));
    
    if (filtered.length === 0) {
      console.log('No Marcus found');
      return;
    }

    filtered.forEach(row => {
      const o = row.order_data;
      console.log(`Order ID: ${row.id}`);
      console.log(`Type: ${o?.orderType}`);
      console.log(`Items:`, JSON.stringify(o?.items || [], null, 2));
      console.log(`Assistance Items:`, JSON.stringify(o?.assistanceItems || [], null, 2));
    });
  } catch (e) {
    console.error(e);
  }
}
fetchMarcus();
