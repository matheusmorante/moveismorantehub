// Declarações JSON Schema de Ferramentas Financeiras para o Assistente Lizandro (ERP & Mobile)

export const sharedExtendedFinanceToolDeclarations = [
  {
    name: 'buscarContasAReceber',
    description:
      'Consulta títulos e contas a receber (pendentes ou baixados) por cliente, descrição, categoria ou período de vencimento. A busca ignora acentos e a ordem das palavras.',
    parameters: {
      type: 'OBJECT',
      properties: {
        cliente: {
          type: 'STRING',
          description: 'Nome do cliente ou termo da descrição da conta a receber.',
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
          description: 'Se verdadeiro (padrão), retorna apenas contas a receber pendentes/em aberto.',
        },
      },
      required: [],
    },
  },
  {
    name: 'editarMovimentacaoFinanceira',
    description:
      'Edita uma movimentação financeira existente no fluxo de caixa a partir do movimentacaoId obtido em buscarMovimentacoesFinanceiras.',
    parameters: {
      type: 'OBJECT',
      properties: {
        movimentacaoId: {
          type: 'STRING',
          description: 'ID real da movimentação financeira.',
        },
        tipo: {
          type: 'STRING',
          enum: ['income', 'expense'],
          description: 'Novo tipo da movimentação ("income" ou "expense").',
        },
        valor: {
          type: 'NUMBER',
          description: 'Novo valor monetário positivo.',
        },
        descricao: {
          type: 'STRING',
          description: 'Nova descrição da movimentação.',
        },
        categoriaId: {
          type: 'STRING',
          description: 'Novo ID de categoria financeira.',
        },
        finalidade: {
          type: 'STRING',
          enum: ['BUSINESS', 'PERSONAL', 'PERSONAL_PARTNER'],
          description: 'Nova finalidade (empresa ou pessoal/sócio).',
        },
        data: {
          type: 'STRING',
          description: 'Nova data no formato YYYY-MM-DD.',
        },
        formaPagamento: {
          type: 'STRING',
          description: 'Nova forma de pagamento.',
        },
        observacoes: {
          type: 'STRING',
          description: 'Novas observações da movimentação.',
        },
      },
      required: ['movimentacaoId'],
    },
  },
  {
    name: 'criarContaAPagar',
    description:
      'Cria um novo título de Conta a Pagar no Financeiro (boleto de fornecedor, despesa agendada, etc.).',
    parameters: {
      type: 'OBJECT',
      properties: {
        descricao: {
          type: 'STRING',
          description: 'Descrição da conta a pagar (ex: "Boleto Fornecedor Kappesberg", "Energia Copel").',
        },
        valor: {
          type: 'NUMBER',
          description: 'Valor total em reais (maior que zero).',
        },
        dataVencimento: {
          type: 'STRING',
          description: 'Data de vencimento no formato YYYY-MM-DD.',
        },
        fornecedorNome: {
          type: 'STRING',
          description: 'Nome do fornecedor vinculado.',
        },
        categoriaId: {
          type: 'STRING',
          description: 'ID da categoria financeira de despesa.',
        },
        formaPagamento: {
          type: 'STRING',
          description: 'Forma de pagamento prevista (Boleto, PIX, Dinheiro, etc.).',
        },
        observacoes: {
          type: 'STRING',
          description: 'Observações adicionais.',
        },
      },
      required: ['descricao', 'valor', 'dataVencimento'],
    },
  },
  {
    name: 'editarContaAPagar',
    description:
      'Edita os dados de uma Conta a Pagar existente a partir do contaId obtido em buscarContasAPagar.',
    parameters: {
      type: 'OBJECT',
      properties: {
        contaId: {
          type: 'STRING',
          description: 'ID real da conta a pagar.',
        },
        descricao: { type: 'STRING', description: 'Nova descrição.' },
        valor: { type: 'NUMBER', description: 'Novo valor em reais.' },
        dataVencimento: { type: 'STRING', description: 'Nova data de vencimento YYYY-MM-DD.' },
        fornecedorNome: { type: 'STRING', description: 'Nome atualizado do fornecedor.' },
        categoriaId: { type: 'STRING', description: 'Novo ID de categoria.' },
        formaPagamento: { type: 'STRING', description: 'Nova forma de pagamento.' },
        status: {
          type: 'STRING',
          enum: ['pending', 'paid', 'overdue', 'cancelled'],
          description: 'Novo status da conta.',
        },
        observacoes: { type: 'STRING', description: 'Observações atualizadas.' },
      },
      required: ['contaId'],
    },
  },
  {
    name: 'criarContaAReceber',
    description:
      'Cria um novo título de Conta a Receber no Financeiro (parcela de cliente, cobrança agendada, etc.).',
    parameters: {
      type: 'OBJECT',
      properties: {
        descricao: {
          type: 'STRING',
          description: 'Descrição da conta a receber (ex: "Parcela 1/3 Pedido #120 - João").',
        },
        valor: {
          type: 'NUMBER',
          description: 'Valor a receber em reais (maior que zero).',
        },
        dataVencimento: {
          type: 'STRING',
          description: 'Data de vencimento no formato YYYY-MM-DD.',
        },
        clienteNome: {
          type: 'STRING',
          description: 'Nome do cliente.',
        },
        pedidoId: {
          type: 'STRING',
          description: 'ID opcional do pedido vinculado.',
        },
        categoriaId: {
          type: 'STRING',
          description: 'ID da categoria financeira de receita.',
        },
        formaPagamento: {
          type: 'STRING',
          description: 'Forma de pagamento prevista (PIX, Boleto, Cartão de Crédito, Promissória, etc.).',
        },
        observacoes: {
          type: 'STRING',
          description: 'Observações adicionais.',
        },
      },
      required: ['descricao', 'valor', 'dataVencimento'],
    },
  },
  {
    name: 'editarContaAReceber',
    description:
      'Edita os dados de uma Conta a Receber existente a partir do contaId obtido em buscarContasAReceber.',
    parameters: {
      type: 'OBJECT',
      properties: {
        contaId: {
          type: 'STRING',
          description: 'ID real da conta a receber.',
        },
        descricao: { type: 'STRING', description: 'Nova descrição.' },
        valor: { type: 'NUMBER', description: 'Novo valor em reais.' },
        dataVencimento: { type: 'STRING', description: 'Nova data de vencimento YYYY-MM-DD.' },
        clienteNome: { type: 'STRING', description: 'Nome atualizado do cliente.' },
        categoriaId: { type: 'STRING', description: 'Novo ID de categoria.' },
        formaPagamento: { type: 'STRING', description: 'Nova forma de pagamento.' },
        status: {
          type: 'STRING',
          enum: ['pending', 'received', 'overdue', 'cancelled'],
          description: 'Novo status da conta a receber.',
        },
        observacoes: { type: 'STRING', description: 'Observações atualizadas.' },
      },
      required: ['contaId'],
    },
  },
  {
    name: 'baixarContaFinanceira',
    description:
      'Dá baixa (quita/liquida) em uma Conta a Pagar (tipoConta="pagar") ou Conta a Receber (tipoConta="receber") e, por padrão, registra a movimentação correspondente no fluxo de caixa.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tipoConta: {
          type: 'STRING',
          enum: ['pagar', 'receber', 'payable', 'receivable'],
          description: '"pagar" (ou "payable") para Conta a Pagar, "receber" (ou "receivable") para Conta a Receber.',
        },
        contaId: {
          type: 'STRING',
          description: 'ID real da conta obtido em buscarContasAPagar ou buscarContasAReceber.',
        },
        dataBaixa: {
          type: 'STRING',
          description: 'Data do pagamento/recebimento no formato YYYY-MM-DD (padrão hoje).',
        },
        formaPagamento: {
          type: 'STRING',
          description: 'Forma de pagamento utilizada na baixa.',
        },
        valorPago: {
          type: 'NUMBER',
          description: 'Valor efetivamente pago/recebido.',
        },
        gerarMovimentacaoCaixa: {
          type: 'BOOLEAN',
          description: 'Se verdadeiro (padrão), gera também o lançamento no fluxo de caixa.',
        },
        observacoes: {
          type: 'STRING',
          description: 'Observações da baixa.',
        },
      },
      required: ['tipoConta', 'contaId'],
    },
  },
];
