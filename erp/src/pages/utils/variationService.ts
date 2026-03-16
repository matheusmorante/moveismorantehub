import { supabase } from '@/pages/utils/supabaseConfig';
import VariationType from "../types/variation.type";

const TABLE_NAME = "variations";

const mapFromDB = (data: any): VariationType => ({
    id: String(data.id),
    ...data.variation_data,
    createdAt: data.created_at,
    updatedAt: data.updated_at
});

export const checkVariationUsage = async (attributeName: string, optionValue?: string): Promise<boolean> => {
    try {
        // Query products that have variations with the given attribute and optionally value
        // The variations are stored in a JSONB column 'variations' which is an array of objects
        // Each object in 'variations' has an 'attributes' array
        
        const { data, error } = await supabase
            .from('products')
            .select('id, description')
            .not('variations', 'is', null);

        if (error) throw error;
        if (!data) return false;

        return data.some((product: any) => {
            if (!product.variations || !Array.isArray(product.variations)) return false;
            
            return product.variations.some((v: any) => {
                if (!v.attributes || !Array.isArray(v.attributes)) return false;
                
                return v.attributes.some((attr: any) => {
                    if (optionValue) {
                        return attr.name === attributeName && attr.value === optionValue;
                    }
                    return attr.name === attributeName;
                });
            });
        });
    } catch (error) {
        console.error("Erro ao verificar uso da variação:", error);
        return false;
    }
};

export const subscribeToVariations = (callback: (variations: VariationType[]) => void) => {
    // Initial fetch
    supabase.from(TABLE_NAME)
        .select('*')
        .order('id', { ascending: false })
        .then(({ data, error }: { data: any, error: any }) => {
            if (data && !error) {
                callback(data.map(mapFromDB));
            } else if (error) {
                console.error("Erro ao buscar variações iniciais:", error);
                callback([]);
            }
        });

    const channel = supabase.channel('variations_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, () => {
            supabase.from(TABLE_NAME)
                .select('*')
                .order('id', { ascending: false })
                .then(({ data }: { data: any }) => {
                    if (data) callback(data.map(mapFromDB));
                });
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

export const saveVariation = async (variation: VariationType): Promise<void> => {
    if (variation.id) {
        await updateVariation(variation.id, variation);
        return;
    }

    try {
        const variationToSave = { ...variation };
        delete variationToSave.id;

        const { error } = await supabase
            .from(TABLE_NAME)
            .insert([{
                variation_data: variationToSave,
                updated_at: new Date().toISOString()
            }]);

        if (error) throw error;
    } catch (error) {
        console.error("Erro ao salvar a variação: ", error);
        throw error;
    }
};

export const updateVariation = async (id: string, variationToUpdate: Partial<VariationType>): Promise<void> => {
    try {
        const { data: current } = await supabase
            .from(TABLE_NAME)
            .select('variation_data')
            .eq('id', id)
            .single();

        const merged = { ...(current?.variation_data || {}), ...variationToUpdate };
        delete merged.id;

        const { error } = await supabase
            .from(TABLE_NAME)
            .update({
                variation_data: merged,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Erro ao atualizar a variação: ", error);
        throw error;
    }
};

export const moveToTrash = async (id: string): Promise<void> => {
    try {
        await updateVariation(id, {
            deleted: true,
            active: false
        });
    } catch (error) {
        console.error("Erro ao mover variação para lixeira: ", error);
        throw error;
    }
};

export const restoreVariation = async (id: string): Promise<void> => {
    try {
        await updateVariation(id, {
            deleted: false,
            active: true
        });
    } catch (error) {
        console.error("Erro ao restaurar a variação: ", error);
        throw error;
    }
};

export const permanentDeleteVariation = async (id: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Erro ao deletar permanentemente a variação: ", error);
        throw error;
    }
};
