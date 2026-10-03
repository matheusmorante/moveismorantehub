import FullAddress from './fullAddress.type';

type CustomerData = {
  id?: string;
  personType?: 'PF' | 'PJ';
  fullName: string;
  phone: string;
  email?: string;
  cpfCnpj?: string;
  document?: string; // Campo legado ainda presente em pedidos antigos.
  noPhone?: boolean;
  noAddress?: boolean;
  fullAddress: FullAddress;
  additionalContacts?: { name: string; phone: string }[];
  observations?: string;
};

export default CustomerData;
