import { AddressViaCep } from '../../types/fullAddress.type';

export const getAddressByCep = async (cep: string): Promise<AddressViaCep> => {
  const cleanCep = String(cep || '').replace(/\D/g, '');
  const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`);
  const data = await res.json();
  return data;
};
