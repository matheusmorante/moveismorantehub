import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase ERP
const ERP_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const ERP_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';
const AUDIT_USER = 'matheusmorante002@gmail.com';
const AUDIT_PASS = 'Morantenho@12345';

// Configurações do Supabase E-commerce
const ECOM_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const ECOM_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

async function checkERP() {
  console.log('\n--- VERIFICANDO BANCO DE DADOS DO ERP ---');
  const supabase = createClient(ERP_URL, ERP_KEY);

  // 1. Tentar anônimo
  const { count: anonCount, error: anonError } = await supabase.from('products').select('*', { count: 'exact', head: true });
  console.log(`Anon: Contagem de produtos na tabela 'products': ${anonError ? 'Erro: ' + anonError.message : anonCount}`);

  // 2. Tentar autenticado
  console.log(`Tentando autenticar como ${AUDIT_USER}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: AUDIT_USER,
    password: AUDIT_PASS
  });

  if (authError) {
    console.error('Erro na autenticação do ERP:', authError.message);
    return;
  }

  console.log('Autenticação no ERP realizada com sucesso!');
  const authenticatedSupabase = createClient(ERP_URL, ERP_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  // Definindo a sessão no cliente
  await authenticatedSupabase.auth.setSession(authData.session);

  const { count: authCount, error: authProdError } = await authenticatedSupabase.from('products').select('*', { count: 'exact', head: true });
  console.log(`Autenticado: Contagem de produtos: ${authProdError ? 'Erro: ' + authProdError.message : authCount}`);

  const { count: authVarCount, error: authVarError } = await authenticatedSupabase.from('product_variations').select('*', { count: 'exact', head: true });
  console.log(`Autenticado: Contagem de variações: ${authVarError ? 'Erro: ' + authVarError.message : authVarCount}`);
}

async function checkEcom() {
  console.log('\n--- VERIFICANDO BANCO DE DADOS DO E-COMMERCE ---');
  const supabase = createClient(ECOM_URL, ECOM_KEY);

  // No e-commerce geralmente os produtos são públicos, vamos ver a contagem anônima
  const { count: prodCount, error: prodError } = await supabase.from('products').select('*', { count: 'exact', head: true });
  console.log(`Contagem de produtos: ${prodError ? 'Erro: ' + prodError.message : prodCount}`);

  const { count: varCount, error: varError } = await supabase.from('product_variations').select('*', { count: 'exact', head: true });
  console.log(`Contagem de variações: ${varError ? 'Erro: ' + varError.message : varCount}`);
}

async function run() {
  try {
    await checkERP();
  } catch (err) {
    console.error('Falha ao verificar ERP:', err.message);
  }

  try {
    await checkEcom();
  } catch (err) {
    console.error('Falha ao verificar E-commerce:', err.message);
  }
}

run();
