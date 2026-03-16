export type Service = {
    id?: string;
    description: string;
    unitPrice: number;
    costPrice?: number;
    active: boolean;
    isDraft?: boolean;
    deleted?: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export type ServiceVisibilitySettings = {
    id: boolean;
    description: boolean;
    unitPrice: boolean;
    actions: boolean;
};

export default Service;
