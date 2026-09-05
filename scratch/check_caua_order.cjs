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
    'Authorization': `Bearer ${key}`
  };

  const ordersRes = await fetch(`${url}/rest/v1/orders?order=updated_at.desc&limit=25`, { headers });
  const orders = await ordersRes.json();

  for (const o of orders) {
    const cust = o.order_data?.customerData?.fullName || '';
    if (cust.toLowerCase().includes('cau')) {
      console.log('=== ENCONTRADO ===');
      console.log('ID:', o.id);
      console.log('OrderNumber:', o.order_number);
      console.log('Customer:', cust);
      console.log('Status:', o.order_data.status);
      console.log('stockProcessed:', o.order_data.stockProcessed);
      console.log('isPartialStockProcessed:', o.order_data.isPartialStockProcessed);
      console.log('movedProductIds:', o.order_data.movedProductIds);
      console.log('Items:');
      (o.order_data.items || []).forEach((it, idx) => {
        console.log(` [${idx}] ${it.description} | prodId: ${it.productId} | isTemp: ${it.isTemporaryProduct} | moveId: ${it.inventoryMovementId}`);
      });

      const movesRes = await fetch(`${url}/rest/v1/inventory_moves?order_id=eq.${o.id}`, { headers });
      const moves = await movesRes.json();

      console.log('inventory_moves encontradas para este order_id:', moves ? moves.length : 0);
      if (Array.isArray(moves)) {
        moves.forEach(m => {
          console.log(`  -> Move ${m.id} | prodId: ${m.product_id} | type: ${m.type} | status: ${m.status} | qty: ${m.quantity} | desc: ${m.description}`);
        });
      }
    }
  }
}

run();
