import { supabase } from './supabaseConfig';
import type { Composition, CompositionVariation, CompositionVariationItem } from '../types/composition.type';

export const getCompositions = async (options?: { includeInactive?: boolean }) => {
    let query = supabase.from('compositions').select(`
        *,
        variations:composition_variations(
            *,
            items:composition_variation_items(
                *,
                product:products(*),
                variation:product_variations(*)
            )
        )
    `).order('created_at', { ascending: false });

    if (!options?.includeInactive) {
        query = query.eq('active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Composition[];
};

export const getCompositionById = async (id: string) => {
    const { data, error } = await supabase.from('compositions').select(`
        *,
        variations:composition_variations(
            *,
            items:composition_variation_items(
                *,
                product:products(*),
                variation:product_variations(*)
            )
        )
    `).eq('id', id).single();

    if (error) throw error;
    return data as Composition;
};

export const getCompositionAvailability = async (variationId: string): Promise<number> => {
    const { data, error } = await supabase.rpc('get_composition_availability', {
        p_composition_variation_id: variationId
    });
    
    if (error) throw error;
    return data as number;
};

export const saveComposition = async (
    composition: Partial<Composition>,
    variations: Partial<CompositionVariation>[]
) => {
    const compData = {
        name: composition.name,
        sku: composition.sku,
        description: composition.description,
        active: composition.active,
        catalog_published: composition.catalog_published,
        pricing_mode: composition.pricing_mode,
        manual_price: composition.manual_price
    };

    const { data, error } = await supabase.rpc('save_composition_transaction', {
        p_composition_id: composition.id || null,
        p_composition: compData,
        p_variations: variations,
    });

    if (error) throw error;
    return data as string;
};
