export type VariationOption = {
    id: string;
    value: string; // Ex: "Azul"
};

export type VariationType = {
    id?: string;
    name: string; // Ex: "Cor"
    options: VariationOption[];
    active: boolean;
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
