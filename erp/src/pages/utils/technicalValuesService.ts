export interface TechnicalFieldDefinition {
    id: string;
    name: string; // Ex: "Cor", "Quantidade de portas"
    dataType: 'list' | 'integer' | 'decimal' | 'text' | 'boolean' | 'measure';
    unit?: string; // Ex: "cm", "kg", "lugares"
    active?: boolean;
    isRequired?: boolean;
    displayOrder?: number;
    includeInName?: boolean;
    nameOrder?: number;
    options: Array<{ id: string; value: string }>;
    categoryIds?: string[];
}

export type TechnicalValuesMap = Record<string, any>;

export const getMissingRequiredTechnicalFields = (
    requiredFieldNames: readonly string[],
    values: TechnicalValuesMap = {}
): string[] => requiredFieldNames.filter(name => !String(values[name] ?? '').trim());

/**
 * Retorna se um valor é semanticamente definido (não é undefined ou null).
 * Preserva 0, false e strings vazias intencionais.
 */
export const isDefined = (val: any): boolean => {
    return val !== undefined && val !== null;
};

/**
 * Resolve o valor efetivo de uma Especificação Técnica para uma variação.
 * Regra:
 * valor efetivo = override da variação ?? valor do produto pai
 * 
 * Respeita estritamente valores como 0, false e "".
 */
export const getEffectiveTechnicalValue = (
    parentValues: TechnicalValuesMap = {},
    variationOverrides: TechnicalValuesMap = {},
    fieldKeyOrName: string
): any => {
    if (!fieldKeyOrName) return undefined;
    
    // 1. Tentar override direto na variação
    if (Object.prototype.hasOwnProperty.call(variationOverrides, fieldKeyOrName)) {
        const overrideVal = variationOverrides[fieldKeyOrName];
        if (isDefined(overrideVal)) {
            return overrideVal;
        }
    }

    // 2. Fallback para valor padrão do produto pai
    if (Object.prototype.hasOwnProperty.call(parentValues, fieldKeyOrName)) {
        const parentVal = parentValues[fieldKeyOrName];
        if (isDefined(parentVal)) {
            return parentVal;
        }
    }

    return undefined;
};

/**
 * Verifica se a variação tem um override ativo para o campo.
 */
export const hasVariationOverride = (
    variationOverrides: TechnicalValuesMap = {},
    fieldKeyOrName: string
): boolean => {
    return Object.prototype.hasOwnProperty.call(variationOverrides, fieldKeyOrName) &&
        isDefined(variationOverrides[fieldKeyOrName]);
};

/**
 * Remove o override de uma variação, fazendo com que ela volte a herdar o valor do pai.
 */
export const removeVariationOverride = (
    variationOverrides: TechnicalValuesMap = {},
    fieldKeyOrName: string
): TechnicalValuesMap => {
    const updated = { ...variationOverrides };
    delete updated[fieldKeyOrName];
    return updated;
};

/**
 * Define um override específico na variação.
 */
export const setVariationOverride = (
    variationOverrides: TechnicalValuesMap = {},
    fieldKeyOrName: string,
    value: any
): TechnicalValuesMap => {
    return {
        ...variationOverrides,
        [fieldKeyOrName]: value
    };
};

/**
 * Compara se duas combinações de Especificações Técnicas são efetivamente idênticas.
 */
export const areEffectiveValuesEqual = (
    fields: TechnicalFieldDefinition[],
    valuesA: TechnicalValuesMap,
    valuesB: TechnicalValuesMap
): boolean => {
    for (const field of fields) {
        const valA = valuesA[field.name];
        const valB = valuesB[field.name];
        
        if (String(valA ?? '').trim().toLowerCase() !== String(valB ?? '').trim().toLowerCase()) {
            return false;
        }
    }
    return true;
};

/**
 * Valida se uma variação possui ao menos UMA informação técnica efetivamente diferente do pai.
 * Não basta possuir uma chave de override se o valor efetivo resultar idêntico ao do pai.
 */
export const hasEffectiveDifferenceFromParent = (
    fields: TechnicalFieldDefinition[],
    parentValues: TechnicalValuesMap = {},
    variationEffectiveValues: TechnicalValuesMap = {}
): boolean => {
    for (const field of fields) {
        const parentVal = parentValues[field.name];
        const varVal = variationEffectiveValues[field.name];
        
        // Se ambos são vazios/indefinidos, são iguais
        const normParent = String(parentVal ?? '').trim().toLowerCase();
        const normVar = String(varVal ?? '').trim().toLowerCase();
        
        if (normParent !== normVar) {
            return true;
        }
    }
    return false;
};

/**
 * Formata um valor de campo técnico para exibição no nome do produto/variação.
 * Trata booleanos (ex: "Com Espelho"), números com unidade (ex: "6 Portas", "2.10m").
 */
export const formatValueForName = (field: TechnicalFieldDefinition, value: any): string => {
    if (!isDefined(value)) return '';
    
    if (field.dataType === 'boolean') {
        if (value === true || String(value) === 'true') {
            return `Com ${field.name}`;
        }
        return '';
    }

    const strVal = String(value).trim();
    if (!strVal) return '';

    if (field.unit) {
        return `${strVal} ${field.unit}`;
    }

    return strVal;
};

/**
 * Gera automaticamente o nome da variação combinando o nome do produto pai com as
 * Especificações Técnicas configuradas para compor o nome.
 */
export const computeEffectiveVariationName = (
    parentName: string,
    fields: TechnicalFieldDefinition[],
    effectiveValues: TechnicalValuesMap
): string => {
    const cleanParent = parentName ? parentName.trim() : '';

    // Filtrar campos marcados para inclusão no nome e ordenar
    const nameFields = fields
        .filter(f => f.includeInName !== false)
        .sort((a, b) => (a.nameOrder ?? 10) - (b.nameOrder ?? 10));

    const parts: string[] = [];
    if (cleanParent) {
        parts.push(cleanParent);
    }

    for (const field of nameFields) {
        const val = effectiveValues[field.name];
        const formatted = formatValueForName(field, val);
        if (formatted) {
            parts.push(formatted);
        }
    }

    return parts.join(' ').replace(/\s+/g, ' ').trim();
};

/**
 * Determina a lista de campos técnicos que devem ser exibidos no formulário do produto.
 * 
 * Regras:
 * 1. Especificações globais obrigatórias e campos vinculados a qualquer categoria atual são incluídos automaticamente.
 * 2. Qualquer campo que já tenha valor cadastrado/ativo no produto (mesmo vazio intencional ou manual)
 *    é preservado e incluído, garantindo que dados nunca se percam ao mudar categorias.
 * 3. Campos adicionados manualmente pelo usuário no produto atual são incluídos.
 * 4. Por padrão, NENHUM campo que não pertença às categorias do produto entra automaticamente.
 */
export const getApplicableTechnicalFields = (
    allFields: readonly TechnicalFieldDefinition[],
    productCategoryIds: readonly string[] = [],
    productTechnicalValues: TechnicalValuesMap = {},
    manuallyAddedFieldNames: readonly string[] = []
): TechnicalFieldDefinition[] => {
    const activeCategorySet = new Set(productCategoryIds);
    const manualSet = new Set(manuallyAddedFieldNames);

    return allFields.filter(field => {
        // Uma especificação global obrigatória sempre aparece, independentemente da categoria.
        if (field.isRequired) return true;

        // Se já está ativo ou preenchido no produto atual, SEMPRE inclui para preservar dados
        if (Object.prototype.hasOwnProperty.call(productTechnicalValues, field.name)) {
            return true;
        }

        // Se foi adicionado manualmente nesta sessão do formulário, inclui
        if (manualSet.has(field.name)) {
            return true;
        }

        // Se o campo tem categorias vinculadas, inclui se coincide com qualquer categoria do produto
        if (field.categoryIds && field.categoryIds.length > 0) {
            return field.categoryIds.some(catId => activeCategorySet.has(catId));
        }

        // Por padrão, se não possui categoria vinculada, NÃO entra automaticamente na lista
        return false;
    });
};

/**
 * Retorna as Especificações Técnicas que ainda NÃO foram adicionadas ao produto atual,
 * permitindo que sejam listadas no botão '+ Adicionar Especificação Técnica'.
 */
export const getAvailableAdditionalFields = (
    allFields: readonly TechnicalFieldDefinition[],
    currentlyVisibleFields: readonly TechnicalFieldDefinition[]
): TechnicalFieldDefinition[] => {
    const visibleNames = new Set(currentlyVisibleFields.map(f => f.name.toLowerCase().trim()));
    return allFields.filter(f => !visibleNames.has(f.name.toLowerCase().trim()));
};
