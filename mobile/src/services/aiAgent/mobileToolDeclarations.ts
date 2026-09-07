// Declarações JSON Schema oficiais das ferramentas disponíveis para o Gemini no App Mobile

export const mobileAgentTools = [
  {
    functionDeclarations: [
      {
        name: 'buscarCategoriasFinanceiras',
        description:
          'Consulta as categorias financeiras oficiais cadastradas no ERP Móveis Morante. Use SEMPRE antes de criar uma movimentação quando precisar descobrir ou validar o categoriaId correspondente à despesa ou receita informada pelo usuário (ex: Combustível, Energia, Fornecedores, Salários, Vendas).',
        parameters: {
          type: 'OBJECT',
          properties: {
            tipo: {
              type: 'STRING',
              description: 'Filtrar por tipo de categoria: "expense" para despesas/saídas ou "income" para receitas/entradas.',
              enum: ['income', 'expense'],
            },
          },
        },
      },
      {
        name: 'buscarContasAPagar',
        description:
          'Consulta títulos e contas a pagar pendentes ou agendadas no ERP Móveis Morante por fornecedor, descrição ou período. Use quando o usuário perguntar sobre boletos de fornecedores (ex: Copel, Sanepar, Bechara, Kappesberg) ou quando relatar o pagamento de uma conta pré-existente.',
        parameters: {
          type: 'OBJECT',
          properties: {
            fornecedor: {
              type: 'STRING',
              description: 'Nome ou razão social do fornecedor (ex: Copel, Sanepar, Bechara, Móveis Estrela).',
            },
            dataVencimentoInicio: {
              type: 'STRING',
              description: 'Data inicial de vencimento no formato AAAA-MM-DD.',
            },
            dataVencimentoFim: {
              type: 'STRING',
              description: 'Data final de vencimento no formato AAAA-MM-DD.',
            },
            apenasPendentes: {
              type: 'BOOLEAN',
              description: 'Se verdadeiro, traz apenas títulos em aberto/pendentes.',
            },
          },
        },
      },
      {
        name: 'buscarMovimentacoesFinanceiras',
        description:
          'Consulta movimentações financeiras já registradas no ERP Móveis Morante. Permite buscar por termo de busca, intervalo de datas, tipo (income/expense) e limitar quantidade de resultados.',
        parameters: {
          type: 'OBJECT',
          properties: {
            termo: {
              type: 'STRING',
              description: 'Palavra-chave para busca no texto da descrição, observações ou nome da categoria.',
            },
            dataInicio: {
              type: 'STRING',
              description: 'Data inicial do período no formato AAAA-MM-DD.',
            },
            dataFim: {
              type: 'STRING',
              description: 'Data final do período no formato AAAA-MM-DD.',
            },
            tipo: {
              type: 'STRING',
              description: 'Tipo de movimentação: "income" para entradas ou "expense" para saídas.',
              enum: ['income', 'expense'],
            },
            categoriaId: {
              type: 'STRING',
              description: 'ID da categoria para filtrar.',
            },
            limite: {
              type: 'NUMBER',
              description: 'Quantidade máxima de resultados a retornar (padrão: 10, máximo: 30).',
            },
          },
        },
      },
      {
        name: 'obterResumoFinanceiro',
        description:
          'Calcula o total de entradas (receitas), saídas (despesas) e o saldo financeiro consolidado do ERP em um determinado período de datas.',
        parameters: {
          type: 'OBJECT',
          properties: {
            dataInicio: {
              type: 'STRING',
              description: 'Data de início no formato AAAA-MM-DD.',
            },
            dataFim: {
              type: 'STRING',
              description: 'Data de término no formato AAAA-MM-DD.',
            },
          },
        },
      },
      {
        name: 'criarMovimentacaoFinanceira',
        description:
          'Registra uma nova movimentação financeira oficial de entrada (income) ou saída (expense) no ERP Móveis Morante. Deve ser utilizada após o usuário fornecer ou confirmar valor e descrição.',
        parameters: {
          type: 'OBJECT',
          properties: {
            tipo: {
              type: 'STRING',
              description: 'Tipo da movimentação: "income" para receita/entrada ou "expense" para despesa/saída.',
              enum: ['income', 'expense'],
            },
            valor: {
              type: 'NUMBER',
              description: 'Valor monetário numérico positivo da movimentação (ex: 230.50).',
            },
            descricao: {
              type: 'STRING',
              description: 'Descrição clara da movimentação (ex: "Gasolina da Fiorino", "Venda de Sofá").',
            },
            finalidade: {
              type: 'STRING',
              description:
                'Finalidade oficial da despesa no ERP (apenas para tipo="expense"): "BUSINESS" para Operação da Empresa ou "PERSONAL_PARTNER" para Uso Particular do sócio (Pró-labore).',
              enum: ['BUSINESS', 'PERSONAL_PARTNER'],
            },
            categoriaId: {
              type: 'STRING',
              description: 'ID real da categoria financeira obtido previamente via buscarCategoriasFinanceiras.',
            },
            data: {
              type: 'STRING',
              description: 'Data da movimentação no formato AAAA-MM-DD (padrão: data de hoje).',
            },
            formaPagamento: {
              type: 'STRING',
              description:
                'Forma de pagamento oficial do formulário de transações: "PIX", "Cartão de Crédito", "Cartão de Débito", "Boleto", "Dinheiro" ou "TED".',
              enum: ['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Dinheiro', 'TED'],
            },
            veiculo: {
              type: 'STRING',
              description:
                'Veículo da empresa (apenas para categorias de combustível/veículos): "Strada", "HR", "Outro" ou "Não informado".',
              enum: ['Strada', 'HR', 'Outro', 'Não informado'],
            },
            observacoes: {
              type: 'STRING',
              description: 'Notas ou observações adicionais sobre o lançamento.',
            },
          },
          required: ['tipo', 'valor', 'descricao'],
        },
      },
      {
        name: 'cancelarOuExcluirMovimentacaoFinanceira',
        description:
          'Exclui ou cancela um lançamento financeiro existente no ERP a partir do seu ID. Utilize quando o usuário solicitar desfazer ou apagar uma movimentação específica.',
        parameters: {
          type: 'OBJECT',
          properties: {
            movimentacaoId: {
              type: 'STRING',
              description: 'ID único da movimentação financeira no ERP a ser removida.',
            },
            justificativa: {
              type: 'STRING',
              description: 'Motivo do cancelamento ou exclusão.',
            },
          },
          required: ['movimentacaoId'],
        },
      },
      {
        name: 'registrarFeedbackAgente',
        description:
          'Registra uma retificação, divergência, reclamação ou correção apontada pelo usuário sobre o comportamento anterior do assistente de IA (ex: "Você entendeu errado", "Eu disse ontem", "Era dinheiro e não Pix", "Categoria errada", "Por que está perguntando de novo?"). Use esta ferramenta IMEDIATAMENTE sempre que o usuário indicar que o agente cometeu um engano ou entendeu algo incorreto.',
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
              description: 'Nome do campo ou dado que gerou a divergência (ex: "data", "formaPagamento", "categoria", "valor", "tipo").',
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
    ],
  },
];
