import { GeminiFunctionDeclaration, GeminiTool } from './geminiAgentTypes';
import {
  sharedExtendedFinanceToolDeclarations,
  sharedOrderAndPeopleToolDeclarations,
  sharedProductToolDeclarations,
} from '../../../../shared-utils/agentToolDeclarations';

// Declarações formais das ferramentas expostas ao Gemini para o ERP

export const financialToolDeclarations: GeminiFunctionDeclaration[] = [
  {
    name: 'buscarCategoriasFinanceiras',
    description:
      'Consulta as categorias financeiras de receitas e despesas cadastradas no ERP. Use esta ferramenta ANTES de criar ou buscar movimentações para obter o ID ou nome correto da categoria (ex: Combustível, Alimentação, Venda de Móveis, Salários).',
    parameters: {
      type: 'OBJECT',
      properties: {
        tipo: {
          type: 'STRING',
          enum: ['income', 'expense'],
          description:
            'Filtrar por tipo: "income" para receitas/entradas ou "expense" para despesas/saídas.',
        },
      },
      required: [],
    },
  },
  {
    name: 'buscarContasAPagar',
    description:
      'Consulta títulos e contas a pagar pendentes ou baixados no ERP por fornecedor, descrição ou período de vencimento.',
    parameters: {
      type: 'OBJECT',
      properties: {
        fornecedor: {
          type: 'STRING',
          description: 'Nome ou razão social do fornecedor (ex: Copel, Sanepar, Bechara, Kappesberg).',
        },
        dataVencimentoInicio: {
          type: 'STRING',
          description: 'Data inicial de vencimento no formato YYYY-MM-DD.',
        },
        dataVencimentoFim: {
          type: 'STRING',
          description: 'Data final de vencimento no formato YYYY-MM-DD.',
        },
        apenasPendentes: {
          type: 'BOOLEAN',
          description: 'Se verdadeiro, traz apenas títulos em aberto/pendentes.',
        },
      },
      required: [],
    },
  },
  {
    name: 'buscarMovimentacoesFinanceiras',
    description:
      'Consulta lançamentos do fluxo de caixa/extrato no ERP por período, tipo, categoria ou palavras na descrição, observações, contraparte e categoria. A busca ignora acentos e aceita palavras em qualquer ordem. Use para responder dúvidas sobre lançamentos existentes ou localizar uma movimentação específica.',
    parameters: {
      type: 'OBJECT',
      properties: {
        termo: {
          type: 'STRING',
          description:
            'Palavras para buscar na descrição, observações, contraparte ou categoria. A busca ignora acentos e aceita palavras em qualquer ordem (ex: "gasolina", "fiorino", "aluguel").',
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
    description:
      'Calcula o resumo consolidado de fluxo de caixa (total de entradas, total de saídas, saldo final e quantidade de transações) para um período de datas específico.',
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
    description:
      'Registra uma nova movimentação financeira (despesa/saída ou receita/entrada) diretamente no caixa do ERP. NUNCA invente categoriaId; se souber o contexto (ex: combustível), consulte primeiro com buscarCategoriasFinanceiras.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tipo: {
          type: 'STRING',
          enum: ['income', 'expense'],
          description:
            'Tipo da transação: "expense" para saída/gasto/pagamento ou "income" para entrada/recebimento.',
        },
        valor: {
          type: 'NUMBER',
          description: 'Valor monetário em reais (deve ser maior que zero).',
        },
        descricao: {
          type: 'STRING',
          description:
            'Descrição clara e objetiva do lançamento (ex: "Gasolina Fiorino Posto Shell", "Recebimento cliente João").',
        },
        categoriaId: {
          type: 'STRING',
          description: 'ID real da categoria retornada por buscarCategoriasFinanceiras.',
        },
        finalidade: {
          type: 'STRING',
          enum: ['BUSINESS', 'PERSONAL', 'PERSONAL_PARTNER'],
          description:
            'Finalidade da movimentação: "BUSINESS" para loja/empresa ou "PERSONAL"/"PERSONAL_PARTNER" para despesa pessoal/sócio.',
        },
        data: {
          type: 'STRING',
          description: 'Data da movimentação no formato YYYY-MM-DD (padrão hoje se omitido).',
        },
        formaPagamento: {
          type: 'STRING',
          enum: [
            'Pix',
            'PIX',
            'Dinheiro',
            'Cartão de Crédito',
            'Cartão de Débito',
            'Boleto',
            'Promissória',
            'TED',
            'Manual',
          ],
          description: 'Forma de pagamento utilizada.',
        },
        observacoes: {
          type: 'STRING',
          description: 'Detalhes adicionais ou observações do lançamento.',
        },
        confirmado: {
          type: 'BOOLEAN',
          description:
            'Se verdadeiro, efetiva a gravação imediata no fluxo de caixa. Se falso, prepara os dados para confirmação do operador.',
        },
      },
      required: ['tipo', 'valor', 'descricao'],
    },
  },
  {
    name: 'cancelarOuExcluirMovimentacaoFinanceira',
    description:
      'Exclui ou cancela um lançamento do fluxo de caixa que foi registrado incorretamente. Use após localizar a movimentação via buscarMovimentacoesFinanceiras.',
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
  ...(sharedExtendedFinanceToolDeclarations as unknown as GeminiFunctionDeclaration[]),
  {
    name: 'registrarFeedbackAgente',
    description:
      'Registra uma retificação, divergência, reclamação ou correção apontada pelo usuário sobre o comportamento anterior do assistente de IA. Use esta ferramenta IMEDIATAMENTE sempre que o usuário indicar que o agente cometeu um engano ou entendeu algo incorreto.',
    parameters: {
      type: 'OBJECT',
      properties: {
        categoria: {
          type: 'STRING',
          enum: [
            'misunderstanding',
            'wrong_tool',
            'wrong_arguments',
            'wrong_result',
            'unnecessary_question',
            'missing_context',
            'permission_disagreement',
            'other',
          ],
          description: 'Categoria do problema apontado pelo operador.',
        },
        queixaUsuario: {
          type: 'STRING',
          description: 'Resumo conciso da reclamação ou correção expressa pelo usuário.',
        },
        campoDivergente: {
          type: 'STRING',
          description:
            'Nome do campo ou dado que gerou a divergência (ex: "data", "formaPagamento", "categoria", "valor", "tipo").',
        },
        severidade: {
          type: 'STRING',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Nível de impacto percebido (padrão "medium").',
        },
      },
      required: ['categoria', 'queixaUsuario'],
    },
  },
];

export const orderAndPeopleToolDeclarations: GeminiFunctionDeclaration[] =
  sharedOrderAndPeopleToolDeclarations as unknown as GeminiFunctionDeclaration[];

export const productToolDeclarations: GeminiFunctionDeclaration[] =
  sharedProductToolDeclarations as unknown as GeminiFunctionDeclaration[];

// Registro de ferramentas do Agente por domínio de negócio do ERP
export const erpDomainTools: Record<string, GeminiFunctionDeclaration[]> = {
  finance: financialToolDeclarations,
  ordersAndPeople: orderAndPeopleToolDeclarations,
  products: productToolDeclarations,
};

export const erpAgentTools: GeminiTool[] = [
  {
    functionDeclarations: Object.values(erpDomainTools).flat(),
  },
];
