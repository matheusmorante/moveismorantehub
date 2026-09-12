const path = require('path');
const { Client } = require(path.resolve(__dirname, '../erp/node_modules/pg'));

const client = new Client({
  connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function check() {
  await client.connect();

  console.log('--- USUÁRIOS EM AUTH.USERS ---');
  const resUsers = await client.query(`
    SELECT id, email, phone, raw_user_meta_data, raw_app_meta_data, created_at 
    FROM auth.users
  `);
  console.log(JSON.stringify(resUsers.rows, null, 2));

  console.log('\n--- PERFIS EM PROFILES ---');
  const resProfiles = await client.query(`
    SELECT id, email, full_name, role, phone, created_at 
    FROM public.profiles
  `);
  console.log(JSON.stringify(resProfiles.rows, null, 2));

  console.log('\n--- VENDEDORES NOS PEDIDOS (DISTINCT) ---');
  const resOrders = await client.query(`
    SELECT DISTINCT 
      seller_id,
      order_data->>'seller' as json_seller, 
      order_data->>'sellerName' as json_seller_name, 
      order_data->>'sellerPhone' as json_seller_phone,
      order_data->'sellerData' as json_seller_data
    FROM public.orders
    LIMIT 20
  `);
  console.log(JSON.stringify(resOrders.rows, null, 2));

  await client.end();
}

check().catch(console.error);
