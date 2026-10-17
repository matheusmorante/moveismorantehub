export interface SupplierAddress {
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  complement: string;
  city: string;
  state: string;
  [key: string]: unknown;
}

export interface SupplierFormData {
  id?: string;
  personType: 'PF' | 'PJ';
  fullName: string;
  tradeName: string;
  cpfCnpj: string;
  leadTime: string;
  email: string;
  phone: string;
  active: boolean;
  observation: string;
  fullAddress: SupplierAddress;
  [key: string]: unknown;
}

export interface FieldOptions {
  addressKey?: keyof SupplierAddress;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
  format?: (value: string) => string;
}

export interface SupplierFormItem extends Partial<SupplierFormData> {
  id?: string;
  full_name?: string;
  trade_name?: string;
  nickname?: string;
  name?: string;
  person_type_pf_pj?: 'PF' | 'PJ';
  cpf_cnpj?: string;
  documentNumber?: string;
  lead_time?: number;
  observations?: string;
  full_address?: Partial<SupplierAddress>;
  address?: Partial<SupplierAddress>;
}
