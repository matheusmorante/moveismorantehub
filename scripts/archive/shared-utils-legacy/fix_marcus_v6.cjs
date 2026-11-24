
const fs = require('fs');

const url = 'https://wzpdfmihnwcrgkyagwkd.supabase.co/rest/v1';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to run this archived script.');

async function fix() {
  try {
    // 1. Create the missing product
    console.log('Creating missing product...');
    const prodResp = await fetch(`${url}/products`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        description: 'BALCÃO PARA PIA 3G 1,00M',
        title: 'BALCÃO PARA PIA 3G 1,00M',
        unit_price: 349.00,
        cost_price: 189.00,
        category: 'Móveis',
        deleted: false
      })
    });
    const newProd = await prodResp.json();
    const newProdId = newProd[0]?.id;
    console.log('New product ID:', newProdId);

    // 2. Fetch order 1533
    console.log('Fetching order 1533...');
    const orderResp = await fetch(`${url}/orders?id=eq.1533`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    const orders = await orderResp.json();
    if (orders.length === 0) throw new Error('Order 1533 not found');
    
    const order = orders[0];
    const orderData = order.order_data;

    // 3. Update items with correct IDs
    const replacements = {
      'GUARDA ROUPA MOSCOU': 233,
      'SOFÁ POP ADEMIR': 349,
      'PIA DE MARMORITE 1,00': 243,
      'COMODA SAPATEIRA': 235,
      'BALCÃO PARA PIA 3G 1,00M': newProdId
    };

    orderData.items = orderData.items.map(item => {
      for (const [key, id] of Object.entries(replacements)) {
        if (item.description.includes(key)) {
          return { ...item, productId: id };
        }
      }
      return item;
    });

    // 4. Save back
    console.log('Updating order 1533...');
    const updateResp = await fetch(`${url}/orders?id=eq.1533`, {
      method: 'PATCH',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        order_data: orderData,
        updated_at: new Date().toISOString()
      })
    });
    
    if (updateResp.ok) {
      console.log('SUCCESS: Order 1533 fixed and Balcão registered!');
    } else {
      console.log('Update failed:', await updateResp.text());
    }

  } catch (e) {
    console.error(e);
  }
}
fix();
