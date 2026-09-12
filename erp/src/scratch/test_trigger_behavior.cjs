const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();

  console.log('Testando trigger em transação segura com ROLLBACK...');
  await client.query('BEGIN');

  // Selecionar um pedido de teste
  const sample = (await client.query('SELECT id, status, order_data->>\'status\' as json_status FROM public.orders LIMIT 1')).rows[0];
  console.log('Antes do update:', sample);

  // Atualizar apenas a coluna física status
  await client.query(`UPDATE public.orders SET status = 'scheduled' WHERE id = $1`, [sample.id]);

  const after = (await client.query('SELECT id, status, order_data->>\'status\' as json_status FROM public.orders WHERE id = $1', [sample.id])).rows[0];
  console.log('Depois do update (status alterado):', after);

  if (after.status !== 'scheduled' || after.json_status !== 'scheduled') {
    throw new Error('Falha na sincronização do trigger!');
  }

  console.log('Trigger sincronizou com sucesso a coluna Master e o JSONB legado!');

  // Rollback para não alterar dados de produção
  await client.query('ROLLBACK');
  console.log('Transação revertida (dados preservados perfeitamente).');

  await client.end();
}

run().catch(console.error);
