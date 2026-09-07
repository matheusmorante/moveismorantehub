import { GeminiFunctionDeclaration, GeminiTool } from './geminiAgentTypes';

// Declarações formais das ferramentas expostas ao Gemini para o ERP e Financeiro

export const financialToolDeclarations: GeminiFunctionDeclaration[] = [
  {
    name: 'buscarCategoriasFinanceiras',
    description: 'Consulta as categorias financeiras de receitas e despesas cadastradas no ERP. Use esta ferramenta ANTES de criar ou buscar movimentações para obter o ID ou nome correto da categoria (ex: Combustível, Alimentação, Venda de Móveis, Salários).',
    parameters: {
      type: 'OBJECT',
      properties: {
        tipo: {
          type: 'STRING',
          enum: ['income', 'expense'],
          description: 'Filtrar por tipo: "income" para receitas/entradas ou "expense" para despesas/saídas.',
        },
      },
      required: [],
    },
  },
  {
    name: 'buscarMovimentacoesFinanceiras',
    description: 'Consulta lançamentos do fluxo de caixa/extrato no ERP com filtros por período, tipo, descrição ou categoria. Use para responder dúvidas sobre lançamentos existentes ou localizar uma movimentação específica.',
    parameters: {
      type: 'OBJECT',
      properties: {
        termo: {
          type: 'STRING',
          description: 'Termo de busca na descrição ou notas (ex: "gasolina", "fiorino", "aluguel").',
        },
        dataInicio: {
          type: 'STRING',
          description: 'Data inicial no formato YYYY-MM-DD.',
        },
        dataFim: {
          type: 'STRING',
          description: 'Data final no formato YYYY-MM-DD.',
        },
        tipo: {
          type: 'STRING',
          enum: ['income', 'expense'],
          description: 'Tipo de movimentação: "income" (entrada) ou "expense" (saída).',
        },
        categoriaId: {
          type: 'STRING',
          description: 'ID da categoria cadastrada no ERP.',
        },
        limite: {
          type: 'INTEGER',
          description: 'Quantidade máxima de resultados a retornar (padrão 10, máximo 30).',
        },
      },
      required: [],
    },
  },
  {
    name: 'obterResumoFinanceiro',
    description: 'Calcula o resumo consolidado de fluxo de caixa (total de entradas, total de saídas, saldo final e quantidade de transações) para um período de datas específico.',
    parameters: {
      type: 'OBJECT',
      properties: {
        dataInicio: {
          type: 'STRING',
          description: 'Data de início do período no formato YYYY-MM-DD.',
        },
        dataFim: {
          type: 'STRING',
          description: 'Data de fim do período no formato YYYY-MM-DD.',
        },
      },
      required: [],
    },
  },
  {
    name: 'criarMovimentacaoFinanceira',
    description: 'Registra uma nova movimentação financeira (despesa/saída ou receita/entrada) diretamente no caixa do ERP. NUNCA invente categoriaId; se souber o contexto (ex: combustível), consulte primeiro com buscarCategoriasFinanceiras.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tipo: {
          type: 'STRING',
          enum: ['income', 'expense'],
          description: 'Tipo da transação: "expense" para saída/gasto/pagamento ou "income" para entrada/recebimento.',
        },
        valor: {
          type: 'NUMBER',
          description: 'Valor monetário em reais (deve ser maior que zero).',
        },
        descricao: {
          type: 'STRING',
          description: 'Descrição clara e objetiva do lançamento (ex: "Gasolina Fiorino Posto Shell", "Recebimento cliente João").',
        },
        categoriaId: {
          type: 'STRING',
          description: 'ID real da categoria retornada por buscarCategoriasFinanceiras.',
        },
        finalidade: {
          type: 'STRING',
          enum: ['BUSINESS', 'PERSONAL'],
          description: 'Finalidade da movimentação: "BUSINESS" para loja/empresa ou "PERSONAL" para despesa pessoal/sócio.',
        },
        data: {
          type: 'STRING',
          description: 'Data da movimentação no formato YYYY-MM-DD (padrão hoje se omitido).',
        },
        formaPagamento: {
          type: 'STRING',
          enum: ['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Promissória', 'Manual'],
          description: 'Forma de pagamento utilizada.',
        },
        observacoes: {
          type: 'STRING',
          description: 'Detalhes adicionais ou observações do lançamento.',
        },
      },
      required: ['tipo', 'valor', 'descricao'],
    },
  },
  {
    name: 'cancelarOuExcluirMovimentacaoFinanceira',
    description: 'Exclui ou cancela um lançamento do fluxo de caixa que foi registrado incorretamente. Use após localizar a movimentação via buscarMovimentacoesFinanceiras.',
    parameters: {
      type: 'OBJECT',
      properties: {
        movimentacaoId: {
          type: 'STRING',
          description: 'ID único da movimentação a ser removida.',
        },
        justificativa: {
          type: 'STRING',
          description: 'Motivo da exclusão/cancelamento informado pelo usuário.',
        },
      },
      required: ['movimentacaoId'],
    },
  },
];

export const erpAgentTools: GeminiTool[] = [
  {
    functionDeclarations: financialToolDeclarations,
  },
];
