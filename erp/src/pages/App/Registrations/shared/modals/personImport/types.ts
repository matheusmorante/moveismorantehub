import Person from '../../../../types/person.type';
import type { PersonCsvColumnMapping } from '../../../../../../../shared-utils/personImportFormSchemas';

export interface PersonImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  collectionName: string;
  title: string;
}

export interface ImportRow {
  status: 'pending' | 'processing' | 'success' | 'error' | 'uncertain';
  error?: string;
  data: Partial<Person>;
  csvRow: string[];
}

export type ImportStep = 'upload' | 'mapping' | 'preview';
export type ImportBusyState = 'read' | 'preview' | 'import' | null;

export const emptyMapping: PersonCsvColumnMapping = {
  id: null,
  fullName: null,
  nickname: null,
  personType: null,
  cpfCnpj: null,
  rgIe: null,
  email: null,
  phone: null,
  zipCode: null,
  street: null,
  number: null,
  complement: null,
  neighborhood: null,
  city: null,
  state: null,
  observation: null,
  marketingOrigin: null,
  noPhone: null,
  noAddress: null,
};
