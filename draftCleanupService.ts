import { supabase } from '@/pages/utils/supabaseConfig';

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
        await supabase.from('products')
            .update({ deleted: true, active: false })
            .eq('is_draft', true)
            .lt('updated_at', isoDate);

        // Limpar Pessoas
        await supabase.from('people')
            .update({ deleted: true, active: false })
            .eq('is_draft', true)
            .lt('updated_at', isoDate);

        // Limpar Serviços (Somente se as colunas existirem na raiz, senão deletamos o rascunho antigo)
        // Nota: Serviços usam service_data para deleted/active
        await supabase.from('services')
            .delete()
            .eq('is_draft', true)
            .lt('updated_at', isoDate);

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

        console.log("Cleanup de rascunhos antigos finalizado com sucesso.");
    } catch (err) {
        console.error("Erro ao limpar rascunhos antigos:", err);
    }
};
