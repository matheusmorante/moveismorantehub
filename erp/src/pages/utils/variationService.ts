import { ecommerceSupabase as supabase } from '@/pages/utils/supabaseConfig';
import VariationType, { VariationOption } from "../types/variation.type";
import { toTitleCase } from './textUtils';
import { sortAttributeValuesNaturally } from './attributeValueSorting';

export const normalizeAttributeDataType = (value?: VariationType['dataType']): NonNullable<VariationType['dataType']> => {
    if (value === 'text' || value === 'text_long') return 'text_short';
    if (value === 'number' || value === 'decimal') return value === 'decimal' ? 'measure' : 'integer';
    if (value === 'list') return 'radio';
    return value || 'text_short';
};

// Compatibilidade para instalações onde a coluna data_type ainda não existe
// ou perdeu os valores durante uma sincronização antiga.
const inferAttributeDataType = (name: string, value?: VariationType['dataType']) => {
    const normalizedName = name.trim().toLocaleLowerCase('pt-BR');
    if (['altura', 'largura', 'peso', 'profundidade'].includes(normalizedName)) return 'measure' as const;
    if ([
        'densidade da espuma', 'tecido', 'espelho', 'contém espelho', 'tipo de porta', 'tipo de portas',
        'sistema de deslizamento da gaveta', 'tipo de pés', 'material de pés', 'material dos pés', 'tipo de puxador', 'material dos puxadores',
        'acabamento', 'cor', 'estrutura', 'material da estrutura', 'quantidade de gavetas',
        'quantidade de portas'
    ].includes(normalizedName)) return 'radio' as const;
    return normalizeAttributeDataType(value);
};

const capitalize = (str: string): string => {
    return toTitleCase(str);
};

/** Garante um valor canônico para um atributo global sem criar atributos duplicados. */
export const ensureAttributeValue = async (attributeName: string, value: string): Promise<{ name: string; value: string }> => {
    const normalizedName = capitalize(attributeName);
    const normalizedValue = capitalize(value);
    const { data: attributes, error: attributeError } = await supabase
        .from('attributes').select('id,name').ilike('name', normalizedName).limit(1);
    if (attributeError) throw attributeError;

    let attribute = attributes?.[0];
    if (!attribute) {
        const { data, error } = await supabase.from('attributes')
            .insert({ name: normalizedName, active: true }).select('id,name').single();
        if (error) throw error;
        attribute = data;
    }

    const { data: values, error: valueError } = await supabase
        .from('attribute_values').select('value').eq('attribute_id', attribute.id).ilike('value', normalizedValue).limit(1);
    if (valueError) throw valueError;
    if (!values?.length) {
        const { error } = await supabase.from('attribute_values').insert({ attribute_id: attribute.id, value: normalizedValue });
        if (error) throw error;
    }
    return { name: attribute.name, value: values?.[0]?.value || normalizedValue };
};

/**
 * Salva um novo valor para um atributo existente, evitando duplicidades.
 */
export const saveAttributeValue = async (
    attributeId: string,
    value: string
): Promise<{ id: string; attribute_id: string; value: string }> => {
    const trimmed = value.trim();
    if (!trimmed) throw new Error("O valor do atributo não pode ser vazio.");

    const { data: existing, error: findError } = await supabase
        .from('attribute_values')
        .select('id, attribute_id, value')
        .eq('attribute_id', attributeId)
        .ilike('value', trimmed)
        .maybeSingle();

    if (findError) throw findError;
    if (existing) return existing;

    const { data, error } = await supabase
        .from('attribute_values')
        .insert({ attribute_id: attributeId, value: trimmed })
        .select('id, attribute_id, value')
        .single();

    if (error) throw error;
    return data;
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
            let attrData: any[] | null = null;
            const primaryQuery = await supabase
                .from("attributes")
                .select("id, name, active, data_type, unit, is_globally_required, is_custom")
                .order("name", { ascending: true });

            if (primaryQuery.error && (primaryQuery.error.message?.includes("column") || primaryQuery.error.code === '42703')) {
                const fallbackQuery = await supabase
                    .from("attributes")
                    .select("id, name, active, data_type, unit, is_globally_required")
                    .order("name", { ascending: true });
                if (fallbackQuery.error) throw fallbackQuery.error;
                attrData = fallbackQuery.data;
            } else if (primaryQuery.error) {
                throw primaryQuery.error;
            } else {
                attrData = primaryQuery.data;
            }

            // 2. Buscar todos os valores/opções vinculados
            const { data: valData, error: valErr } = await supabase
                .from("attribute_values")
                .select("*");
            if (valErr) throw valErr;

            // 2.5 Enriquecer com vínculos de categoria quando a migration já estiver disponível.
            // A ausência dessa tabela não pode ocultar os atributos globais existentes.
            const { data: catAttrData, error: catAttrErr } = await supabase
                .from("category_attributes")
                .select("attribute_id, category_id, is_required");
            if (catAttrErr) {
                console.warn(
                    "Aviso ao buscar vínculos de categorias dos atributos:",
                    catAttrErr
                );
            }

            // 3. Mapear para a estrutura VariationType usada no ERP
            const mapped: VariationType[] = (attrData || []).map((attr: any) => ({
                id: String(attr.id),
                name: attr.name,
                active: attr.active ?? true,
                dataType: inferAttributeDataType(attr.name, attr.data_type),
                unit: attr.unit || '',
                isGloballyRequired: Boolean(attr.is_globally_required),
                isCustom: Boolean(attr.is_custom),
                options: sortAttributeValuesNaturally((valData || [])
                    .filter((val: any) => val.attribute_id === attr.id)
                    .map((val: any) => ({
                        id: String(val.id),
                        value: val.value
                    }))),
                categoryAttributes: (catAttrErr ? [] : (catAttrData || []))
                    .filter((ca: any) => ca.attribute_id === attr.id)
                    .map((ca: any) => ({
                        categoryId: ca.category_id,
                        isRequired: ca.is_required
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
                active: variation.active ?? true,
                data_type: variation.dataType || 'list',
                unit: variation.unit || null,
                is_globally_required: variation.isGloballyRequired ?? false
                ,is_custom: variation.isCustom ?? true
            }])
            .select()
            .single();

        if (attrErr && (attrErr.message?.includes("column") || attrErr.code === '42703')) {
            const { data: retryAttr, error: retryErr } = await supabase
                .from("attributes")
                .insert([{
                    name: capitalize(variation.name),
                    active: variation.active ?? true,
                    data_type: normalizeAttributeDataType(variation.dataType),
                    unit: variation.unit || null,
                    is_globally_required: variation.isGloballyRequired ?? false
                }])
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

        // 3. Inserir category_attributes
        if (variation.categoryAttributes && variation.categoryAttributes.length > 0) {
            const catAttrRecords = variation.categoryAttributes.map(ca => ({
                attribute_id: attr.id,
                category_id: ca.categoryId,
                is_required: ca.isRequired
            }));

            const { error: catAttrErr } = await supabase
                .from("category_attributes")
                .insert(catAttrRecords);

            if (catAttrErr) throw catAttrErr;
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
        if (variationToUpdate.dataType !== undefined) attrUpdates.data_type = normalizeAttributeDataType(variationToUpdate.dataType);
        if (variationToUpdate.unit !== undefined) attrUpdates.unit = variationToUpdate.unit;
        if (variationToUpdate.isGloballyRequired !== undefined) attrUpdates.is_globally_required = variationToUpdate.isGloballyRequired;
        // is_custom existe apenas em instalações que aplicaram a migration opcional.
        // O cadastro deve continuar salvando nas instalações legadas.

        if (Object.keys(attrUpdates).length > 0) {
            let { error: attrErr } = await supabase
                .from("attributes")
                .update(attrUpdates)
                .eq("id", id);
            if (attrErr && (attrErr.message?.includes("column") || attrErr.code === '42703')) {
                delete attrUpdates.is_custom;
                const { error: retryErr } = await supabase
                    .from("attributes")
                    .update(attrUpdates)
                    .eq("id", id);
                attrErr = retryErr;
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

        // 3. Sincronizar category_attributes
        if (variationToUpdate.categoryAttributes !== undefined) {
            // Deletar associações existentes
            const { error: delCatErr } = await supabase
                .from("category_attributes")
                .delete()
                .eq("attribute_id", id);
            if (delCatErr) throw delCatErr;

            // Inserir as novas associações
            if (variationToUpdate.categoryAttributes.length > 0) {
                const catAttrRecords = variationToUpdate.categoryAttributes.map(ca => ({
                    attribute_id: id,
                    category_id: ca.categoryId,
                    is_required: ca.isRequired
                }));

                const { error: insCatErr } = await supabase
                    .from("category_attributes")
                    .insert(catAttrRecords);
                if (insCatErr) throw insCatErr;
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
