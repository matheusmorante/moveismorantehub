import { supabase } from '../supabaseClient';
import { FinancialCategory, ResultNature } from './mobileFinanceTypes';

/**
 * Ordena categorias alfabeticamente garantindo que qualquer categoria
 * de fallback genérico (ex: "Outras", "Outras Despesas", "Outras Receitas")
 * fique posicionada estritamente no final da lista.
 */
export const sortCategoriesWithOthersAtEnd = (categories: FinancialCategory[]): FinancialCategory[] => {
  return [...categories].sort((a, b) => {
    const isAOther = a.name.trim().toLowerCase().startsWith('outra');
    const isBOther = b.name.trim().toLowerCase().startsWith('outra');
    if (isAOther && !isBOther) return 1;
    if (!isAOther && isBOther) return -1;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
};

export const DEFAULT_FINANCIAL_CATEGORIES: FinancialCategory[] = [
  // ENTRADAS
  { id: 'cat_vendas', name: 'Vendas de Produtos', type: 'income', result_nature: 'RECEITA' },
  { id: 'cat_servicos', name: 'Serviços e Montagem', type: 'income', result_nature: 'RECEITA' },
  { id: 'cat_juros_rec', name: 'Juros e Rendimentos Recebidos', type: 'income', result_nature: 'RECEITA' },
  { id: 'cat_restituicao', name: 'Restituição / Recuperação Tributária', type: 'income', result_nature: 'RECEITA' },
  { id: 'cat_aluguel_rec', name: 'Aluguel Recebido', type: 'income', result_nature: 'RECEITA' },
  { id: 'cat_aporte', name: 'Aporte de Sócio', type: 'income', result_nature: 'NAO_AFETA_RESULTADO' },
  { id: 'cat_emprestimo_rec', name: 'Empréstimo Recebido', type: 'income', result_nature: 'NAO_AFETA_RESULTADO' },
  { id: 'cat_devolucao_rec', name: 'Devolução / Recuperação de Valor', type: 'income', result_nature: 'NAO_AFETA_RESULTADO' },
  { id: 'cat_saldo_inicial', name: 'Saldo Inicial de Implantação', type: 'income', result_nature: 'NAO_AFETA_RESULTADO' },
  { id: 'cat_outras_rec', name: 'Outras Receitas', type: 'income', result_nature: 'RECEITA' },

  // SAÍDAS
  { id: 'cat_aluguel_pag', name: 'Aluguel', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_combustivel', name: 'Combustível', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_compra_merc', name: 'Compra de Mercadorias (Boletos, PIXs de compra de móveis e frete de fornecedores)', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_energia', name: 'Energia', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_impostos', name: 'Impostos e Taxas', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_internet', name: 'Internet e Telefone', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_limpeza', name: 'Materiais de Limpeza', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_carro_manut', name: 'Manutenção do Carro', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_imovel_manut', name: 'Manutenção do Imóvel', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_marketing', name: 'Marketing e Publicidade', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_escritorio', name: 'Materiais de Escritório', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_prolabore', name: 'Pró-labore', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_salarios', name: 'Salários e Encargos', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_seguros', name: 'Seguros', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_tarifas', name: 'Taxas Bancárias', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_emprestimos_financ', name: 'Empréstimos e Financiamentos', type: 'expense', result_nature: 'NAO_AFETA_RESULTADO' },
  { id: 'cat_outras', name: 'Outras', type: 'expense', result_nature: 'DESPESA' },
];

export const determineResultNature = (categoryName?: string | null, type?: 'income' | 'expense'): ResultNature => {
  if (!categoryName) return type === 'income' ? 'RECEITA' : 'DESPESA';
  const nameLower = categoryName.toLowerCase();

  if (
    nameLower.includes('aporte') ||
    nameLower.includes('empréstimo') ||
    nameLower.includes('emprestimo') ||
    nameLower.includes('financiamento') ||
    nameLower.includes('saldo inicial') ||
    nameLower.includes('devolução') ||
    nameLower.includes('devolucao') ||
    nameLower.includes('retirada de sócio') ||
    nameLower.includes('distribuição de lucros') ||
    nameLower.includes('amortização') ||
    nameLower.includes('compra de estoque') ||
    nameLower.includes('compra de mercadoria')
  ) {
    return 'NAO_AFETA_RESULTADO';
  }

  return type === 'income' ? 'RECEITA' : 'DESPESA';
};

export const fetchFinancialCategories = async (): Promise<FinancialCategory[]> => {
  try {
    const { data, error } = await supabase
      .from('financial_categories')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data && data.length > 0) {
      const mapped = data.map(c => ({
        ...c,
        result_nature: c.result_nature || determineResultNature(c.name, c.type),
      }));
      return sortCategoriesWithOthersAtEnd(mapped);
    }
  } catch {}

  return sortCategoriesWithOthersAtEnd(DEFAULT_FINANCIAL_CATEGORIES);
};
