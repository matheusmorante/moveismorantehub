export type AttributeDataType = 'list' | 'integer' | 'decimal' | 'text' | 'text_short' | 'text_long' | 'radio' | 'multi_select' | 'boolean' | 'measure' | 'number';

export type CategoryAttribute = {
    categoryId: string;
    isRequired: boolean;
};

export type VariationOption = {
    id: string;
    value: string; // Ex: "Azul"
};

export type VariationType = {
    id?: string;
    name: string; // Ex: "Cor"
    options: VariationOption[];
    active: boolean;
    dataType?: AttributeDataType;
    unit?: string;
    isGloballyRequired?: boolean;
    isCustom?: boolean;
    categoryAttributes?: CategoryAttribute[];
    deleted?: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export type VariationVisibilitySettings = {
    id: boolean;
    name: boolean;
    options: boolean;
    actions: boolean;
};

export default VariationType;
