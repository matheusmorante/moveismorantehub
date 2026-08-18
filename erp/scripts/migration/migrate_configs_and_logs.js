import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
const { Client } = pg;

const OLD_DB_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const OLD_DB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';
const AUDIT_USER = 'matheusmorante002@gmail.com';
const AUDIT_PASS = 'Morantenho@12345';

const NEW_DB_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const NEW_DB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI'; 

async function getAuthenticatedClients() {
  const oldSupabase = createClient(OLD_DB_URL, OLD_DB_KEY);

  // Auth antigo
  const { data: authOld, error: errOld } = await oldSupabase.auth.signInWithPassword({
    email: AUDIT_USER,
    password: AUDIT_PASS
  });
  if (errOld) throw new Error(`Erro auth antigo: ${errOld.message}`);
  
  const oldClient = createClient(OLD_DB_URL, OLD_DB_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  await oldClient.auth.setSession(authOld.session);

  // Client pg do Postgres para o banco novo
  const pgClient = new Client({
    connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
  });
  await pgClient.connect();

  return { oldClient, pgClient };
}

// Sincroniza dinamicamente as colunas no Postgres do banco novo
async function syncColumns(pgClient, tableName, sampleRow) {
  console.log(`Sincronizando estrutura de colunas para a tabela ${tableName}...`);

  const res = await pgClient.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = $1 AND table_schema = 'public'
  `, [tableName]);
  
  const existingCols = new Set(res.rows.map(r => r.column_name));

  for (const [key, value] of Object.entries(sampleRow)) {
    if (!existingCols.has(key)) {
      let dbType = 'TEXT';
      
      if (typeof value === 'boolean') {
        dbType = 'BOOLEAN';
      } else if (typeof value === 'number') {
        dbType = 'NUMERIC';
      } else if (value && typeof value === 'object') {
        dbType = 'JSONB';
      } else if (key.endsWith('_id') && key !== 'order_id') {
        dbType = 'UUID';
      }

      console.log(`Adicionando coluna faltante: public.${tableName}.${key} (${dbType})`);
      await pgClient.query(`ALTER TABLE public.${tableName} ADD COLUMN "${key}" ${dbType}`);
    }
  }

  // Notificar o PostgREST para recarregar o schema cache
  await pgClient.query("NOTIFY pgrst, 'reload schema';");
}

async function insertPg(pgClient, tableName, rows, conflictKey = 'id') {
  if (!rows || rows.length === 0) return 0;

  const keys = Object.keys(rows[0]);
  const cols = keys.map(k => `"${k}"`).join(', ');

  const chunkSize = 200;
  let totalInserted = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const valuePlaceholders = [];
    const vals = [];

    let paramIdx = 1;
    for (const row of chunk) {
      const rowPlaceholders = [];
      for (const k of keys) {
        rowPlaceholders.push(`$${paramIdx++}`);
        const val = row[k];
        vals.push((val && typeof val === 'object') ? JSON.stringify(val) : val);
      }
      valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
    }

    let sql = `INSERT INTO public.${tableName} (${cols}) VALUES ${valuePlaceholders.join(', ')}`;
    if (conflictKey) {
      sql += ` ON CONFLICT (${conflictKey}) DO NOTHING`;
    }

    try {
      const result = await pgClient.query(sql, vals);
      totalInserted += result.rowCount || 0;
    } catch (err) {
      console.error(`Erro ao inserir lote na tabela ${tableName}:`, err.message);
    }
  }

  return totalInserted;
}

async function migrateTableDirect(oldClient, pgClient, tableName, keyField = 'id') {
  console.log(`\nMigrando tabela: ${tableName}...`);

  // Ler do antigo
  const { data: oldData, error: errOld } = await oldClient.from(tableName).select('*');
  if (errOld) {
    console.error(`Erro ao ler ${tableName} do banco antigo:`, errOld.message);
    return;
  }
  console.log(`Encontrados ${oldData.length} registros no banco antigo.`);

  if (oldData.length === 0) return;

  // Sincronizar colunas antes
  await syncColumns(pgClient, tableName, oldData[0]);

  // Inserir no novo
  const inserted = await insertPg(pgClient, tableName, oldData, keyField);
  console.log(`Inseridos com sucesso: ${inserted} novos registros em ${tableName}.`);
}

async function migrateFinancialCategories(oldClient, pgClient) {
  console.log('\nMigrando financial_categories...');
  const { data: oldCats, error: errOld } = await oldClient.from('financial_categories').select('*');
  if (errOld) {
    console.error('Erro ao ler categorias financeiras do antigo:', errOld.message);
    return;
  }

  console.log(`Encontradas ${oldCats.length} categorias no antigo.`);
  const inserted = await insertPg(pgClient, 'financial_categories', oldCats, 'name');
  console.log(`Inseridas com sucesso: ${inserted} novas categorias financeiras.`);
}

async function migrateOrderStatusHistory(oldClient, pgClient) {
  console.log('\nMigrando order_status_history...');
  
  const { count, error: countErr } = await oldClient.from('order_status_history').select('*', { count: 'exact', head: true });
  if (countErr) {
    console.error('Erro ao contar historico do antigo:', countErr.message);
    return;
  }
  console.log(`Total de logs de status no banco antigo: ${count}`);

  // Buscar IDs de pedidos válidos do banco novo
  console.log('Buscando IDs de pedidos existentes no banco novo...');
  const resOrders = await pgClient.query('SELECT id FROM public.orders');
  const validOrderIds = new Set(resOrders.rows.map(o => String(o.id)));
  console.log(`Encontrados ${validOrderIds.size} pedidos válidos.`);

  const limit = 1000;
  let offset = 0;
  let totalInserted = 0;
  let hasMore = true;

  while (hasMore) {
    console.log(`Lendo registros do antigo de ${offset} a ${offset + limit}...`);
    const { data: chunk, error: chunkErr } = await oldClient
      .from('order_status_history')
      .select('*')
      .range(offset, offset + limit - 1);

    if (chunkErr) {
      console.error(`Erro ao ler range ${offset}-${offset + limit}:`, chunkErr.message);
      break;
    }

    if (!chunk || chunk.length === 0) {
      hasMore = false;
      break;
    }

    // Filtrar para garantir que o pedido de destino existe
    const toInsert = chunk.filter(item => validOrderIds.has(String(item.order_id)));

    if (toInsert.length > 0) {
      const inserted = await insertPg(pgClient, 'order_status_history', toInsert, 'id');
      totalInserted += inserted;
    }

    if (chunk.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }

  console.log(`Migração de order_status_history concluída. Total de novos registros inseridos: ${totalInserted}`);
}

async function run() {
  console.log('=== INICIANDO SCRIPT DE MIGRAÇÃO GERAL (POSTGRES DIRECT) ===');
  const { oldClient, pgClient } = await getAuthenticatedClients();

  await migrateTableDirect(oldClient, pgClient, 'rede_config');
  await migrateTableDirect(oldClient, pgClient, 'label_layouts');
  await migrateTableDirect(oldClient, pgClient, 'product_materials');
  await migrateTableDirect(oldClient, pgClient, 'attendance_logs');
  await migrateFinancialCategories(oldClient, pgClient);
  await migrateOrderStatusHistory(oldClient, pgClient);

  await pgClient.end();
  console.log('\n=== MIGRAÇÃO FINALIZADA ===');
}

run().catch(console.error);
