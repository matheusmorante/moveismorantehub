import { supabase } from '../../../../utils/supabaseConfig';

export interface LabelBatchRequestItem {
    productId: string;
    variationId?: string;
    sku?: string;
    barcode?: string;
    quantity: number;
}

export interface InventoryLabelRecord {
    id: string;
    product_id: string;
    variation_id?: string | null;
    sku?: string | null;
    barcode?: string | null;
    status: 'active' | 'discarded' | 'archived';
    created_at: string;
    printed_at: string;
}

/**
 * Cria etiquetas em lote no Supabase com uma única operação HTTP (bulk insert),
 * garantindo que cada unidade física receba um label_id UUID nativo e exclusivo.
 *
 * @param items Lista de itens da fila de impressão com suas respectivas quantidades
 * @returns Array com os UUIDs correspondentes a cada unidade, agrupados pelo índice original do item
 */
export async function generateInventoryLabelsBatch(
    items: LabelBatchRequestItem[]
): Promise<string[][]> {
    const rowsToInsert: Array<{
        product_id: string;
        variation_id: string | null;
        sku: string | null;
        barcode: string | null;
        status: 'active';
    }> = [];

    // Mapeia a contagem de etiquetas por índice de item
    const itemSliceRanges: Array<{ itemIndex: number; count: number }> = [];

    for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        const qty = Math.max(1, Number(item.quantity) || 1);
        itemSliceRanges.push({ itemIndex: idx, count: qty });

        for (let q = 0; q < qty; q++) {
            rowsToInsert.push({
                product_id: item.productId,
                variation_id: item.variationId || null,
                sku: item.sku || null,
                barcode: item.barcode || null,
                status: 'active',
            });
        }
    }

    if (rowsToInsert.length === 0) {
        return items.map(() => []);
    }

    // 1 único bulk insert no Supabase para todo o lote
    const { data, error } = await supabase
        .from('inventory_labels')
        .insert(rowsToInsert)
        .select('id');

    if (error) {
        console.error('[inventoryLabelService] Erro ao criar etiquetas em lote:', error);
        throw new Error(error.message || 'Falha ao registrar etiquetas físicas no banco de dados.');
    }

    if (!data || data.length !== rowsToInsert.length) {
        throw new Error('A quantidade de identificadores retornados é inconsistente com o lote enviado.');
    }

    // Desmembra os IDs gerados de volta para cada item da fila
    const result: string[][] = [];
    let currentIndex = 0;

    for (const slice of itemSliceRanges) {
        const itemUuids: string[] = [];
        for (let i = 0; i < slice.count; i++) {
            itemUuids.push(data[currentIndex + i].id);
        }
        result.push(itemUuids);
        currentIndex += slice.count;
    }

    return result;
}

/**
 * Busca etiquetas ativas já emitidas para o produto/variação (para reimpressão da mesma unidade física sem gerar novo UUID).
 */
export async function getExistingInventoryLabels(
    productId: string,
    variationId?: string,
    limit: number = 50
): Promise<InventoryLabelRecord[]> {
    let query = supabase
        .from('inventory_labels')
        .select('id, product_id, variation_id, sku, barcode, status, created_at, printed_at')
        .eq('product_id', productId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (variationId) {
        query = query.eq('variation_id', variationId);
    }

    const { data, error } = await query;
    if (error) {
        console.error('[inventoryLabelService] Erro ao buscar etiquetas existentes:', error);
        return [];
    }

    return (data || []) as InventoryLabelRecord[];
}
