import { SupplierFormData } from '../types/supplierForm.types';

export const emptySupplierForm = (): SupplierFormData => ({
  personType: 'PF',
  fullName: '',
  tradeName: '',
  cpfCnpj: '',
  leadTime: '',
  email: '',
  phone: '',
  active: true,
  observation: '',
  fullAddress: {
    cep: '',
    street: '',
    number: '',
    neighborhood: '',
    complement: '',
    city: '',
    state: 'PR',
  },
});

export const formatDocument = (value: string, personType: string): string => {
  const digits = (
    personType === 'PJ'
      ? value.toUpperCase().replace(/[^0-9A-Z]/g, '')
      : value.replace(/\D/g, '')
  ).slice(0, personType === 'PJ' ? 14 : 11);

  if (personType === 'PJ') {
    return [
      digits.slice(0, 2),
      digits.slice(2, 5),
      digits.slice(5, 8),
      digits.slice(8, 12),
      digits.slice(12, 14),
    ]
      .filter(Boolean)
      .reduce(
        (result, part, index) =>
          result +
          (index === 1 || index === 2 ? '.' : index === 3 ? '/' : index === 4 ? '-' : '') +
          part,
        ''
      );
  }
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9), digits.slice(9, 11)]
    .filter(Boolean)
    .reduce(
      (result, part, index) =>
        result + (index === 1 || index === 2 ? '.' : index === 3 ? '-' : '') + part,
      ''
    );
};

export const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  const area = digits.slice(0, 2);
  const number = digits.slice(2);
  const prefixLength = digits.length > 10 ? 5 : 4;
  return `(${area}) ${number.slice(0, prefixLength)}${
    number.length > prefixLength ? `-${number.slice(prefixLength)}` : ''
  }`;
};
