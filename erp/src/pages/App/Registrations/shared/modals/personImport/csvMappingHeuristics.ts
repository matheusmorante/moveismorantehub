import type { PersonCsvColumnMapping } from '../../../../../../../shared-utils/personImportFormSchemas';
import { emptyMapping } from './types';

export const MAPPING_FIELDS: Array<{
  id: keyof PersonCsvColumnMapping;
  label: string;
  required?: boolean;
}> = [
  { id: 'fullName', label: 'Nome Completo / Razão Social', required: true },
  { id: 'nickname', label: 'Nome Fantasia / Apelido' },
  { id: 'cpfCnpj', label: 'CPF / CNPJ' },
  { id: 'email', label: 'E-mail' },
  { id: 'phone', label: 'Telefone' },
  { id: 'noPhone', label: 'Sem telefone (sim/não)' },
  { id: 'noAddress', label: 'Sem endereço (sim/não)' },
  { id: 'marketingOrigin', label: 'Origem (paid/organic)' },
  { id: 'zipCode', label: 'CEP' },
  { id: 'street', label: 'Logradouro / Rua' },
  { id: 'number', label: 'Número' },
  { id: 'complement', label: 'Complemento' },
  { id: 'neighborhood', label: 'Bairro' },
  { id: 'city', label: 'Cidade' },
  { id: 'state', label: 'UF / Estado' },
  { id: 'observation', label: 'Observações' },
];

export const autoMapCsvHeaders = (rawHeaders: string[]): PersonCsvColumnMapping => {
  const normalize = (text: string) =>
    text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
  const headers = rawHeaders.map(normalize);
  const newMapping: PersonCsvColumnMapping = { ...emptyMapping };

  const fieldKeywords: Partial<Record<keyof PersonCsvColumnMapping, string[]>> = {
    id: ['ID', 'UUID', 'PK'],
    fullName: ['NOME', 'RAZAO', 'FULL NAME', 'CLIENTE', 'FORNECEDOR'],
    nickname: ['FANTASIA', 'NICKNAME', 'APELIDO'],
    cpfCnpj: ['CPF', 'CNPJ', 'DOCUMENTO'],
    rgIe: ['RG', 'IE', 'INSCRICAO'],
    email: ['EMAIL', 'E-MAIL'],
    phone: ['FONE', 'TELEFONE', 'CELULAR', 'WHATSAPP'],
    noPhone: ['SEM TELEFONE', 'SEM FONE', 'NOPHONE'],
    noAddress: ['SEM ENDERECO', 'NOADDRESS'],
    marketingOrigin: ['ORIGEM', 'MARKETINGORIGIN'],
    zipCode: ['CEP', 'ZIP'],
    street: ['RUA', 'ENDERECO', 'LOGRADOURO'],
    number: ['NUMERO'],
    complement: ['COMPLEMENTO'],
    neighborhood: ['BAIRRO'],
    city: ['CIDADE', 'MUNICIPIO'],
    state: ['UF', 'ESTADO'],
    observation: ['OBS', 'OBSERVACAO'],
  };

  for (const field of Object.keys(fieldKeywords) as Array<keyof PersonCsvColumnMapping>) {
    const keywords = fieldKeywords[field]!;
    const allowed = (header: string) =>
      !(field === 'phone' && /SEM (TELEFONE|FONE)|NOPHONE/.test(header)) &&
      !(field === 'street' && /SEM ENDERECO|NOADDRESS/.test(header));

    let index = headers.findIndex((header) => allowed(header) && keywords.includes(header));
    if (index === -1 && field !== 'id') {
      index = headers.findIndex((header) => allowed(header) && keywords.some((keyword) => header.includes(keyword)));
    }
    if (index !== -1) {
      newMapping[field] = index;
    }
  }

  return newMapping;
};
