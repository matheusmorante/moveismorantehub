import { ecommerceSupabase as supabase } from '@/pages/utils/supabaseConfig';
import VariationType, { VariationOption } from "../types/variation.type";

const capitalize = (str: string): string => {
    if (!str) return "";
    const trimmed = str.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

export const checkVariationUsage = async (attributeName: string, optionValue?: string): Promise<boolean> => {
    try {
        let query = supabase
            .from('product_variations')
            .select('id', { count: 'exact', head: true });

        if (optionValue) {
            query = query.eq(`attributes->>${attributeName}`, optionValue);
        } else {
            query = query.not(`attributes->>${attributeName}`, 'is', null);
        }

        const { count, error } = await query;
        if (error) throw error;
        
        return (count || 0) > 0;
    } catch (error) {
        console.error("Erro ao verificar uso da variação:", error);
        return false;
    }
};

export const subscribeToVariations = (callback: (variations: VariationType[]) => void) => {
    const fetchAll = async () => {
        try {
            // 1. Buscar atributos globais ordenados por nome
            const { data: attrData, error: attrErr } = await supabase
                .from("attributes")
                .select("*")
                .order("name", { ascending: true });
            if (attrErr) throw attrErr;

            // 2. Buscar todos os valores/opções vinculados
            const { data: valData, error: valErr } = await supabase
                .from("attribute_values")
                .select("*");
            if (valErr) throw valErr;

            // 3. Mapear para a estrutura VariationType usada no ERP
            const mapped: VariationType[] = (attrData || []).map((attr: any) => ({
                id: String(attr.id),
                name: attr.name,
                active: attr.active ?? true,
                options: (valData || [])
                    .filter((val: any) => val.attribute_id === attr.id)
                    .map((val: any) => ({
                        id: String(val.id),
                        value: val.value
                    })),
                deleted: false // Como deletamos fisicamente agora, sempre é falso
            }));

            callback(mapped);
        } catch (error) {
            console.error("Erro ao buscar variações iniciais:", error);
            callback([]);
        }
    };

    fetchAll();

    return () => {
        // Realtime desabilitado
    };
};

export const saveVariation = async (variation: VariationType): Promise<void> => {
    if (variation.id) {
        await updateVariation(variation.id, variation);
        return;
    }

    try {
        // 1. Inserir atributo principal (capitalizado)
        let { data: attr, error: attrErr } = await supabase
            .from("attributes")
            .insert([{
                name: capitalize(variation.name),
                active: variation.active ?? true
            }])
            .select()
            .single();

        if (attrErr && (attrErr.message?.includes("column") || attrErr.code === '42703')) {
            const { data: retryAttr, error: retryErr } = await supabase
                .from("attributes")
                .insert([{ name: capitalize(variation.name) }])
                .select()
                .single();
            attr = retryAttr;
            attrErr = retryErr;
        }

        if (attrErr) throw attrErr;

        // 2. Inserir valores vinculados (capitalizados)
        if (variation.options && variation.options.length > 0) {
            const recordsToInsert = variation.options.map(opt => ({
                attribute_id: attr.id,
                value: capitalize(opt.value)
            }));

            const { error: valErr } = await supabase
                .from("attribute_values")
                .insert(recordsToInsert);

            if (valErr) throw valErr;
        }
    } catch (error) {
        console.error("Erro ao salvar a variação: ", error);
        throw error;
    }
};

export const updateVariation = async (id: string, variationToUpdate: Partial<VariationType>): Promise<void> => {
    try {
        // 1. Atualizar campos da tabela attributes
        const attrUpdates: any = {};
        if (variationToUpdate.name !== undefined) attrUpdates.name = capitalize(variationToUpdate.name);
        if (variationToUpdate.active !== undefined) attrUpdates.active = variationToUpdate.active;

        if (Object.keys(attrUpdates).length > 0) {
            let { error: attrErr } = await supabase
                .from("attributes")
                .update(attrUpdates)
                .eq("id", id);
            if (attrErr && (attrErr.message?.includes("column") || attrErr.code === '42703')) {
                delete attrUpdates.active;
                if (Object.keys(attrUpdates).length > 0) {
                    const { error: retryErr } = await supabase
                        .from("attributes")
                        .update(attrUpdates)
                        .eq("id", id);
                    attrErr = retryErr;
                } else {
                    attrErr = null;
                }
            }
            if (attrErr) throw attrErr;
        }

        // 2. Sincronizar valores na tabela attribute_values
        if (variationToUpdate.options !== undefined) {
            // Buscar valores existentes para esse atributo
            const { data: existingVals, error: valErr } = await supabase
                .from("attribute_values")
                .select("id, value")
                .eq("attribute_id", id);
            if (valErr) throw valErr;

            const existingIds = (existingVals || []).map((v: any) => v.id);
            const currentOptions = variationToUpdate.options;
            const currentIds = currentOptions.map(o => o.id).filter(Boolean);

            // Deletar valores que foram removidos
            const idsToDelete = existingIds.filter((valId: any) => !currentIds.includes(valId));
            if (idsToDelete.length > 0) {
                const { error: delErr } = await supabase
                    .from("attribute_values")
                    .delete()
                    .in("id", idsToDelete);
                if (delErr) throw delErr;
            }

            // Inserir novos ou atualizar os modificados (capitalizados)
            const recordsToInsert = [];
            for (const opt of currentOptions) {
                const exists = (existingVals || []).find((v: any) => v.id === opt.id);
                const capitalizedVal = capitalize(opt.value);
                if (exists) {
                    if (exists.value !== capitalizedVal) {
                        const { error: upErr } = await supabase
                            .from("attribute_values")
                            .update({ value: capitalizedVal })
                            .eq("id", opt.id);
                        if (upErr) throw upErr;
                    }
                } else {
                    recordsToInsert.push({
                        attribute_id: id,
                        value: capitalizedVal
                    });
                }
            }

            if (recordsToInsert.length > 0) {
                const { error: insErr } = await supabase
                    .from("attribute_values")
                    .insert(recordsToInsert);
                if (insErr) throw insErr;
            }
        }
    } catch (error) {
        console.error("Erro ao atualizar a variação: ", error);
        throw error;
    }
};

export const moveToTrash = async (id: string): Promise<void> => {
    try {
        // Exclusão definitiva para alinhar com o fluxo do E-commerce
        const { error } = await supabase
            .from("attributes")
            .delete()
            .eq("id", id);

        if (error) throw error;
    } catch (error) {
        console.error("Erro ao excluir variação: ", error);
        throw error;
    }
};

export const restoreVariation = async (id: string): Promise<void> => {
    // Não suportado no novo modelo físico, mantido apenas para assinatura de tipo
    console.warn("Restauração de variação não suportada no modelo relacional físico.");
};

export const permanentDeleteVariation = async (id: string): Promise<void> => {
    await moveToTrash(id);
};
