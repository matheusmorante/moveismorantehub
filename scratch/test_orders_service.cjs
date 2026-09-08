const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchOrdersDirect({ page = 1, pageSize = 30, search = '', status = 'all' }) {
  const firstRow = (page - 1) * pageSize;
  const lastRow = firstRow + pageSize - 1;

  let query = supabase
    .from('orders')
    .select('id, order_number, status, customer_name, total_amount, created_at, updated_at, order_data', { count: 'exact' })
    .order('created_at', { ascending: false });

  const term = search.trim().replace(/[,%()]/g, '');
  if (term) {
    query = query.or(`customer_name.ilike.%${term}%,order_number.ilike.%${term}%`);
  }

  if (status === 'agendados') {
    query = query.or('status.ilike.%scheduled%,status.ilike.%agendad%');
  } else if (status === 'concluidos') {
    query = query.or('status.ilike.%fulfilled%,status.ilike.%atendid%,status.ilike.%concluid%,status.ilike.%entreg%,status.ilike.%finaliz%');
  } else if (status === 'rascunhos') {
    query = query.or('status.ilike.%draft%,status.ilike.%rascunh%');
  }

  query = query.range(firstRow, lastRow);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    items: data || [],
    total: count || 0,
  };
}

async function run() {
  console.log('--- Testando página 1 (sem filtro) ---');
  const r1 = await fetchOrdersDirect({ page: 1, pageSize: 30 });
  console.log('Total:', r1.total, 'Itens retornados:', r1.items.length);
  console.log('Exemplo 1:', r1.items[0].customer_name, '| Status:', r1.items[0].status);

  console.log('\n--- Testando busca por "Ivo" ---');
  const r2 = await fetchOrdersDirect({ page: 1, pageSize: 30, search: 'Ivo' });
  console.log('Total:', r2.total, 'Itens retornados:', r2.items.length);
  console.log('Exemplo 2:', r2.items[0]?.customer_name);

  console.log('\n--- Testando filtro "agendados" ---');
  const r3 = await fetchOrdersDirect({ page: 1, pageSize: 30, status: 'agendados' });
  console.log('Total agendados:', r3.total, 'Itens retornados:', r3.items.length);
  if (r3.items[0]) console.log('Exemplo agendado:', r3.items[0].customer_name, '| Status:', r3.items[0].status);
}

run().catch(console.error);
