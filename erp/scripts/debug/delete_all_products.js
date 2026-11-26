import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Obtém a contagem de registros em uma determinada tabela.
 * @param {string} tableName Nome da tabela
 * @returns {Promise<number>} Quantidade de registros
 */
async function getCount(tableName) {
  const { count, error } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error(`Erro ao contar registros da tabela ${tableName}:`, error.message);
    throw error;
  }

  return count || 0;
}

async function run() {
  console.log('=== INICIANDO OPERAÇÃO DE EXCLUSÃO DE PRODUTOS ===');

  try {
    // 1. Contagem inicial
    console.log('Calculando estado atual das tabelas...');
    const initialProductsCount = await getCount('products');
    const initialVariationsCount = await getCount('product_variations');

    console.log(`Produtos encontrados antes da exclusão: ${initialProductsCount}`);
    console.log(`Variações encontradas antes da exclusão: ${initialVariationsCount}`);

    if (initialProductsCount === 0) {
      console.log('Nenhum produto encontrado para excluir.');
      process.exit(0);
    }

    // 2. Executar a exclusão de todos os produtos
    console.log('\nExecutando deleção de todos os produtos...');
    
    // Filtro id != -1 para aplicar o delete em lote
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .neq('id', -1);

    if (deleteError) {
      console.error('Erro ao deletar produtos:', deleteError.message);
      throw deleteError;
    }

    console.log('Operação de deleção concluída no banco de dados.');

    // 3. Contagem final para validação
    console.log('\nVerificando estado final das tabelas...');
    const finalProductsCount = await getCount('products');
    const finalVariationsCount = await getCount('product_variations');

    console.log(`Produtos restantes: ${finalProductsCount}`);
    console.log(`Variações restantes (devem ser 0 devido ao ON DELETE CASCADE): ${finalVariationsCount}`);

    if (finalProductsCount === 0 && finalVariationsCount === 0) {
      console.log('\n[SUCESSO] Todos os produtos e variações foram removidos com êxito!');
    } else {
      console.warn('\n[ALERTA] Alguns produtos ou variações ainda não foram removidos.');
    }

  } catch (error) {
    console.error('\n[ERRO CRÍTICO] Falha durante a execução do script:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

run();
