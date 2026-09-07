import { supabase } from '../supabaseClient';
import { FinancialCategory, ResultNature } from './mobileFinanceTypes';

export const DEFAULT_FINANCIAL_CATEGORIES: FinancialCategory[] = [
  // ENTRADAS
  { id: 'cat_juros_rec', name: 'Juros e Rendimentos Recebidos', type: 'income', result_nature: 'RECEITA' },
  { id: 'cat_restituicao', name: 'Restituição / Recuperação Tributária', type: 'income', result_nature: 'RECEITA' },
  { id: 'cat_aluguel_rec', name: 'Aluguel Recebido', type: 'income', result_nature: 'RECEITA' },
  { id: 'cat_outras_rec', name: 'Outras Receitas', type: 'income', result_nature: 'RECEITA' },
  { id: 'cat_aporte', name: 'Aporte de Sócio', type: 'income', result_nature: 'NAO_AFETA_RESULTADO' },
  { id: 'cat_emprestimo_rec', name: 'Empréstimo Recebido', type: 'income', result_nature: 'NAO_AFETA_RESULTADO' },
  { id: 'cat_devolucao_rec', name: 'Devolução / Recuperação de Valor', type: 'income', result_nature: 'NAO_AFETA_RESULTADO' },
  { id: 'cat_saldo_inicial', name: 'Saldo Inicial de Implantação', type: 'income', result_nature: 'NAO_AFETA_RESULTADO' },

  // SAÍDAS
  { id: 'cat_combustivel', name: 'Combustível', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_veiculo_manut', name: 'Manutenção de Veículos', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_salarios', name: 'Salários', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_comissao', name: 'Comissão', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_adiantamento', name: 'Adiantamento Salarial', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_beneficios', name: 'Benefícios / VR / VT', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_aluguel_pag', name: 'Aluguel do Galpão / Loja', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_energia', name: 'Energia Elétrica', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_agua_internet', name: 'Água e Internet', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_impostos', name: 'Impostos e Tributos', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_tarifas', name: 'Tarifas Bancárias e Taxas de Cartão', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_juros_pag', name: 'Juros e Multas Pagos', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_despesa_geral', name: 'Despesa não classificada', type: 'expense', result_nature: 'DESPESA' },
  { id: 'cat_emprestimo_pag', name: 'Pagamento de Empréstimo (Amortização de Principal)', type: 'expense', result_nature: 'NAO_AFETA_RESULTADO' },
  { id: 'cat_prolabore_retirada', name: 'Retirada de Sócio / Distribuição de Lucros', type: 'expense', result_nature: 'NAO_AFETA_RESULTADO' },
  { id: 'cat_estoque_compra', name: 'Compra de Estoque / Mercadorias', type: 'expense', result_nature: 'NAO_AFETA_RESULTADO' },
];

export const determineResultNature = (categoryName?: string | null, type?: 'income' | 'expense'): ResultNature => {
  if (!categoryName) return type === 'income' ? 'RECEITA' : 'DESPESA';
  const nameLower = categoryName.toLowerCase();

  if (
    nameLower.includes('aporte') ||
    nameLower.includes('empréstimo recebido') ||
    nameLower.includes('emprestimo recebido') ||
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
      return data.map(c => ({
        ...c,
        result_nature: c.result_nature || determineResultNature(c.name, c.type),
      }));
    }
  } catch {}

  return DEFAULT_FINANCIAL_CATEGORIES;
};
