import { financialToday, financialTransactionWriteSchema } from '../../../../../../shared-utils/financialFormSchemas';
import type { FinancialTransaction } from '../../../types/finance.type';
import { z } from 'zod';

export const paymentMethods = ['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Dinheiro', 'TED', 'Não informado'];
export const accounts = ['Caixa Geral', 'Banco do Brasil', 'Itaú', 'Bradesco', 'Outro'];
export const vehicles = ['Strada', 'HR', 'Outro', 'Não informado'];

const normalizeCategoryName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const requiresVehicle = (name = '') => ['combustivel', 'gasolina', 'veiculo', 'pedagio', 'manutencao de veiculos', 'manutencao do carro'].some((term) => normalizeCategoryName(name).includes(term));
export const requiresCollaborator = (name = '') => ['salario', 'adiantamento', 'comissao', 'beneficio', 'reembolso'].some((term) => normalizeCategoryName(name).includes(term));
export const isProLabore = (name = '') => ['pro-labore', 'prolabore', 'pro labore', 'retirada', 'socio', 'particular'].some((term) => normalizeCategoryName(name).includes(term));

export const directTransactionFormSchema = financialTransactionWriteSchema.extend({
  category_id: z.string().trim().min(1, 'Selecione uma categoria.'),
  category_name: z.string().trim().min(1, 'Selecione uma categoria.'),
  payment_method: z.string().trim().min(1, 'Informe a forma de pagamento.'),
  purpose: z.enum(['BUSINESS', 'PERSONAL', 'PERSONAL_PARTNER']).nullish(),
}).superRefine((values, context) => {
  if (values.type === 'expense' && !values.purpose) {
    context.addIssue({ code: 'custom', path: ['purpose'], message: 'Informe a finalidade da saída.' });
  }
});

export type TransactionFormData = {
  type: 'income' | 'expense';
  amount: number;
  date: string;
  description: string;
  payment_method: string;
  category_id: string;
  category_name: string;
  purpose: 'BUSINESS' | 'PERSONAL_PARTNER';
  vehicle_id: string;
  collaborator_id: string;
  collaborator_name: string;
  account_id: string;
  origin: NonNullable<FinancialTransaction['origin']>;
  notes: string;
};

export const createInitialTransactionFormData = (): TransactionFormData => ({
  type: 'expense',
  amount: 0,
  date: financialToday(),
  description: '',
  payment_method: '',
  category_id: '',
  category_name: '',
  purpose: 'BUSINESS',
  vehicle_id: '',
  collaborator_id: '',
  collaborator_name: '',
  account_id: 'Caixa Geral',
  origin: 'MANUAL',
  notes: '',
});

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const formatToBRDate = (dateString: string) => {
  if (!dateString) return '-';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
};
