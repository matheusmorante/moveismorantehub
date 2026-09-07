import { FinancialCategory } from '../../../services/mobileFinanceService';

export const PAYMENT_METHODS = ['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Dinheiro', 'TED'];
export const VEHICLES = ['Strada', 'HR', 'Outro', 'Não informado'];

export const toLocalIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDateBr = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

export const isProLaboreCat = (name: string): boolean => {
  const norm = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return (
    norm.includes('pro-labore') ||
    norm.includes('prolabore') ||
    norm.includes('pro labore') ||
    norm.includes('retirada') ||
    norm.includes('socio') ||
    norm.includes('particular')
  );
};

export const normalizeCategoryName = (name: string): string =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const buildIncomeCategories = (categories: FinancialCategory[]): FinancialCategory[] => {
  const incomeCategories = categories.filter(category => category.type === 'income');
  const other = incomeCategories.find(category => normalizeCategoryName(category.name).includes('outra'));
  const loan = incomeCategories.find(category => normalizeCategoryName(category.name).includes('emprestimo'));

  return [
    other
      ? { ...other, name: 'Outras' }
      : { id: 'cat_income_other_default', name: 'Outras', type: 'income', result_nature: 'RECEITA' },
    loan
      ? { ...loan, name: 'Empréstimos' }
      : { id: 'cat_income_loan_default', name: 'Empréstimos', type: 'income', result_nature: 'NAO_AFETA_RESULTADO' },
  ];
};
