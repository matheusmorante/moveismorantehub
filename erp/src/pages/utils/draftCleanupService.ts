import { supabase } from '@/pages/utils/supabaseConfig';

type CleanupError = { code?: string | null };

const getCleanupErrorCode = (error: unknown): string | null => {
  if (typeof error !== 'object' || error === null || !('code' in error)) return null;
  const code = (error as CleanupError).code;
  return typeof code === 'string' ? code : null;
};

const failOnCleanupError = (table: string, error: unknown): void => {
  if (!error) return;
  console.error(`Erro retornado ao limpar rascunhos em ${table}:`, error);
  const code = getCleanupErrorCode(error);
  throw new Error(`Cleanup de rascunhos interrompido em ${table}${code ? ` (${code})` : ''}.`);
};

const isMissingOptionalServicesTable = (error: unknown): boolean =>
  ['PGRST205', '42P01'].includes(getCleanupErrorCode(error) || '');

/**
 * Varre todos os produtos, pessoas e serviços marcados como is_draft.
 * Se estiverem sem alterações por mais de 10 dias, move para a lixeira (deleted = true).
 */
export const runDraftCleanup = async () => {
  try {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const isoDate = tenDaysAgo.toISOString();

    // Limpar Produtos
    const productsResult = await supabase
      .from('products')
      .update({ deleted: true, active: false }, { count: 'exact' })
      .eq('is_draft', true)
      .lt('updated_at', isoDate)
      .or('technical_specs->testArtifact->>is_test.is.null,technical_specs->testArtifact->>is_test.neq.true');
    failOnCleanupError('products', productsResult.error);

    // Limpar Pessoas
    const peopleResult = await supabase
      .from('people')
      .update({ deleted: true, active: false }, { count: 'exact' })
      .eq('is_draft', true)
      .lt('updated_at', isoDate)
      .or('full_address->testArtifact->>is_test.is.null,full_address->testArtifact->>is_test.neq.true');
    failOnCleanupError('people', peopleResult.error);

    // Limpar Serviços (tabela opcional; só ignora códigos de tabela ausente)
    const servicesResult = await supabase
      .from('services')
      .delete({ count: 'exact' })
      .eq('is_draft', true)
      .lt('updated_at', isoDate);
    const servicesTableMissing = Boolean(
      servicesResult.error && isMissingOptionalServicesTable(servicesResult.error)
    );
    if (servicesResult.error && !servicesTableMissing) failOnCleanupError('services', servicesResult.error);

    /* 
        // Limpar Pedidos de Venda Rascunhos abandonados
        // ATENÇÃO: Desativado temporariamente. O campo 'status' está dentro de 'order_data' (JSONB).
        // Filtrar na raiz por 'updated_at' deletaria pedidos reias finalizados.
        try {
            // await supabase.from('orders').delete().eq('is_draft', true).lt('updated_at', isoDate);
        } catch (e) {
            console.warn("Limpador de pedidos ignorado.");
        }
        */

    console.log('Cleanup de rascunhos antigos finalizado.', {
      products: productsResult.count,
      people: peopleResult.count,
      services: servicesTableMissing ? null : servicesResult.count,
      servicesTableMissing,
    });
  } catch (err) {
    console.error('Erro ao limpar rascunhos antigos:', err);
  }
};
