export type CommercialRequiredFields = {
  customer?: Partial<Record<'phone' | 'cpfCnpj' | 'email' | 'rgIe' | 'position' | 'address', boolean>>;
  assistanceOrder?: Partial<Record<'customer' | 'seller', boolean>>;
  salesOrder?: Partial<Record<'customer' | 'seller', boolean>>;
};
