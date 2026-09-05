const fs = require('fs');

const env = fs.readFileSync('erp/.env', 'utf8');
let url = '', key = '';
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.replace('VITE_SUPABASE_URL=', '').trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.replace('VITE_SUPABASE_ANON_KEY=', '').trim();
});

async function run() {
  const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  const ordersRes = await fetch(`${url}/rest/v1/orders?id=eq.decc86fa-199f-4f7c-866e-13b9a53c1451`, { headers });
  const orders = await ordersRes.json();
  if (!orders.length) {
    console.log('Pedido não encontrado.');
    return;
  }

  const orderRow = orders[0];
  const orderData = orderRow.order_data;
  console.log('Pedido encontrado:', orderData.customerData?.fullName);
  console.log('Antes -> isPartialStockProcessed:', orderData.isPartialStockProcessed);

  orderData.isPartialStockProcessed = false;
  orderData.stockProcessed = true;

  const updateRes = await fetch(`${url}/rest/v1/orders?id=eq.decc86fa-199f-4f7c-866e-13b9a53c1451`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      order_data: orderData,
      updated_at: new Date().toISOString()
    })
  });

  const updated = await updateRes.json();
  console.log('Depois -> isPartialStockProcessed:', updated[0]?.order_data?.isPartialStockProcessed);
}

run();
