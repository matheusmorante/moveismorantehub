import { supabase } from '../../../services/supabaseClient';
import type { Composition, CompositionVariation, CompositionVariationItem } from '../types/composition.type';

export const saveComposition = async (
    composition: Partial<Composition>,
    variations: Partial<CompositionVariation>[]
) => {
    // Upsert Composition
    const compData = {
        name: composition.name,
        sku: composition.sku,
        description: composition.description,
        active: composition.active,
        catalog_published: composition.catalog_published,
        pricing_mode: composition.pricing_mode,
        manual_price: composition.manual_price
    };

    let compId = composition.id;

    if (compId) {
        const { error } = await supabase.from('compositions').update(compData).eq('id', compId);
        if (error) throw error;
    } else {
        const { data, error } = await supabase.from('compositions').insert([compData]).select('id').single();
        if (error) throw error;
        compId = data.id;
    }

    // Upsert Variations (simplificado para uma variação padrão por enquanto)
    for (const v of variations) {
        let varId = v.id;
        const varData = {
            composition_id: compId,
            name: v.name || 'Padrão',
            sku: v.sku || composition.sku,
            active: v.active !== false
        };

        if (varId) {
            const { error } = await supabase.from('composition_variations').update(varData).eq('id', varId);
            if (error) throw error;
        } else {
            const { data, error } = await supabase.from('composition_variations').insert([varData]).select('id').single();
            if (error) throw error;
            varId = data.id;
        }

        // Delete old items
        if (varId) {
            await supabase.from('composition_variation_items').delete().eq('composition_variation_id', varId);
        }

        // Insert new items
        if (v.items && v.items.length > 0) {
            const itemsData = v.items.map(item => ({
                composition_variation_id: varId,
                product_id: item.product_id,
                variation_id: item.variation_id || null,
                quantity: item.quantity
            }));
            const { error } = await supabase.from('composition_variation_items').insert(itemsData);
            if (error) throw error;
        }
    }

    return compId;
};
