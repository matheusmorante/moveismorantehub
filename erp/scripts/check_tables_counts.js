import { createClient } from '@supabase/supabase-js';

const ERP_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const ERP_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';
const AUDIT_USER = 'matheusmorante002@gmail.com';
const AUDIT_PASS = 'Morantenho@12345';

const tables = [
  'products',
  'product_variations',
  'attributes',
  'attribute_values',
  'attendance_logs',
  'showroom_assemblies',
  'rede_config',
  'rede_transactions',
  'recurring_expenses',
  'product_materials',
  'payment_methods_config',
  'order_status_history',
  'product_price_history',
  'inventory_moves',
  'financial_categories',
  'accounts_payable',
  'accounts_receivable',
  'financial_transactions',
  'desire_matches',
  'customer_desires',
  'sales_orders',
  'sales_order_items',
  'customers',
  'label_layouts'
];

async function checkERP() {
  console.log('\n--- CONTAGEM DE TODAS AS TABELAS NO ERP ---');
  const supabase = createClient(ERP_URL, ERP_KEY);

  // Autenticar no ERP
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: AUDIT_USER,
    password: AUDIT_PASS
  });

  if (authError) {
    console.error('Erro na autenticação do ERP:', authError.message);
    return;
  }

  const client = createClient(ERP_URL, ERP_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  await client.auth.setSession(authData.session);

  for (const table of tables) {
    try {
      const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`Tabela '${table}': Erro (${error.message})`);
      } else {
        if (count > 0) {
          console.log(`Tabela '${table}': ${count} registros`);
        } else {
          console.log(`Tabela '${table}': vazia`);
        }
      }
    } catch (err) {
      console.log(`Tabela '${table}': Falha de conexão (${err.message})`);
    }
  }
}

async function run() {
  await checkERP();
}

run();
