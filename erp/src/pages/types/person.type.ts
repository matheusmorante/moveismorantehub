import FullAddress from "./fullAddress.type";

export type Person = {
    id?: string;
    personType: 'PF' | 'PJ'; // Pessoa Física ou Jurídica
    fullName: string; // Nome ou Razão Social
    companyName?: string; // Razão Social (específico PJ)
    tradeName?: string; // Nome Fantasia (específico PJ)
    cpfCnpj?: string;
    email?: string;
    phone?: string;
    noPhone?: boolean;
    fullAddress?: FullAddress;
    type: 'customers' | 'suppliers' | 'employees';
    marketingOrigin?: 'organic' | 'paid' | ''; // Origem de marketing (organic = loja física, paid = tráfego pago)
    active: boolean;
    isDraft?: boolean;
    leadTime?: number;
    position?: string; // Cargo do funcionário
    deleted?: boolean;
    deletedAt?: string;
    createdAt?: string;
    updatedAt?: string;
};

export type PersonVisibilitySettings = {
    id: boolean;
    fullName: boolean;
    cpfCnpj: boolean;
    email: boolean;
    phone: boolean;
    address: boolean;
    actions: boolean;
};

export default Person;
