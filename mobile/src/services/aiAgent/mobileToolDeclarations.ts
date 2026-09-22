// Declarações JSON Schema oficiais das ferramentas disponíveis para o Gemini no App Mobile

export const mobileFinancialTools = [
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
          'Prepara uma nova movimentação financeira oficial de entrada (income) ou saída (expense) para confirmação no ERP Móveis Morante. Antes de chamar, consulte buscarCategoriasFinanceiras e use o categoriaId real. Para uma mensagem com vários fatos, faça uma chamada por grupo de mesma categoria, tipo, finalidade, forma de pagamento e data; some valores somente dentro desse mesmo grupo. Nunca misture categorias diferentes em uma única chamada.',
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
          required: ['tipo', 'valor', 'descricao', 'categoriaId'],
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
];

const mobileOrderDeliveryTools = [
  {
    name: 'buscarOperacoes',
    description: 'Consulta operações do ERP: pedidos de venda, entregas, retiradas, assistências, devoluções e montagens. Pesquise pelo nome do cliente ou código e use datas/status quando disponíveis. Retorna resumo e IDs reais para abrir detalhes. Somente leitura.',
    parameters: { type: 'OBJECT', properties: {
      tipo: { type: 'STRING', enum: ['todas', 'venda', 'entrega', 'retirada', 'assistencia', 'devolucao', 'montagem'], description: 'Qual operação pesquisar. Use todas quando o pedido não especificar.' },
      termo: { type: 'STRING', description: 'Nome do cliente ou número do pedido.' },
      dataInicio: { type: 'STRING', description: 'Início da agenda no formato AAAA-MM-DD.' },
      dataFim: { type: 'STRING', description: 'Fim da agenda no formato AAAA-MM-DD.' },
      status: { type: 'STRING', description: 'Status desejado: agendado, concluído/entregue, cancelado ou pendente.' },
      limite: { type: 'NUMBER', description: 'Quantidade de resultados (1 a 20, padrão 10).' },
    } },
  },
  {
    name: 'obterDetalhesOperacao',
    description: 'Consulta os detalhes de uma operação/pedido encontrado por buscarOperacoes: cliente, itens, agendamento, entrega, pagamento, observações e dados de devolução. Use apenas o ID real retornado pela busca. Somente leitura.',
    parameters: { type: 'OBJECT', properties: {
      operacaoId: { type: 'STRING', description: 'ID real da operação retornado por buscarOperacoes.' },
    }, required: ['operacaoId'] },
  },
  {
    name: 'buscarPedidosEntregas',
    description: 'Compatibilidade: pesquisa pedidos de venda e entregas. Para assistência, devolução, retirada ou montagem, use buscarOperacoes.',
    parameters: { type: 'OBJECT', properties: {
      termo: { type: 'STRING', description: 'Nome do cliente ou código do pedido.' },
      dataInicio: { type: 'STRING', description: 'Data inicial de agendamento/entrega AAAA-MM-DD, e não data de criação do pedido.' },
      dataFim: { type: 'STRING', description: 'Data final de agendamento/entrega AAAA-MM-DD, e não data de criação do pedido.' },
      status: { type: 'STRING', description: 'Status do pedido ou entrega.' },
      limite: { type: 'NUMBER', description: 'Máximo de resultados, entre 1 e 20; padrão 10.' },
    }},
  },
  {
    name: 'obterDetalhesPedidoEntrega',
    description: 'Obtém todas as informações persistidas de um pedido e sua entrega: itens, cliente, endereço, agendamento, pagamentos, observações e estados operacionais. Use somente após obter o pedidoId pela busca; nunca invente IDs.',
    parameters: { type: 'OBJECT', properties: { pedidoId: { type: 'STRING', description: 'ID real retornado por buscarPedidosEntregas.' } }, required: ['pedidoId'] },
  },
];

const mobilePeopleTools = [
  {
    name: 'buscarClientes',
    description: 'Pesquisa cadastro de clientes por nome, telefone ou e-mail. Retorna apenas os dados de contato necessários; não use para fornecedores ou colaboradores. Somente leitura.',
    parameters: { type: 'OBJECT', properties: {
      termo: { type: 'STRING', description: 'Nome, telefone ou e-mail do cliente.' },
      limite: { type: 'NUMBER', description: 'Quantidade de resultados (1 a 20, padrão 10).' },
    }, required: ['termo'] },
  },
  {
    name: 'buscarColaboradores',
    description: 'Pesquisa colaboradores/usuários por nome, e-mail ou cargo e informa cargos e função cadastrados. Use quando perguntarem quem exerce uma função ou quais cargos uma pessoa tem. Somente leitura.',
    parameters: { type: 'OBJECT', properties: {
      termo: { type: 'STRING', description: 'Nome, e-mail ou cargo/função.' },
      limite: { type: 'NUMBER', description: 'Quantidade de resultados (1 a 20, padrão 10).' },
    }, required: ['termo'] },
  },
];

export const mobileProductTools = [
  {
    name: 'buscarProdutos',
    description:
      'Pesquisa produtos e variações no catálogo/estoque do ERP por termo (nome, código ou SKU), categoria ou status de ativação. Use para encontrar códigos de produtos, verificar saldos de estoque resumidos e preços. O agente NÃO deve e não pode criar, editar ou excluir produtos.',
    parameters: {
      type: 'OBJECT',
      properties: {
        termo: {
          type: 'STRING',
          description: 'Termo de busca pelo nome do produto, descrição, código oficial de 6 dígitos ou SKU da variação.',
        },
        categoria: {
          type: 'STRING',
          description: 'Nome da categoria para filtrar produtos (ex: "Sofás", "Mesas", "Colchões").',
        },
        apenasAtivos: {
          type: 'BOOLEAN',
          description: 'Se verdadeiro, filtra apenas produtos ativos em linha. Padrão: true.',
        },
        limite: {
          type: 'NUMBER',
          description: 'Quantidade máxima de produtos a retornar (padrão 10, máximo 30).',
        },
      },
    },
  },
  {
    name: 'obterDetalhesProduto',
    description:
      'Obtém a ficha técnica completa e todas as informações persistidas de um produto e suas variações: nome, descrição, dimensões (altura, largura, profundidade, peso), fotos, preços (venda, promocional e custo), estoque (atual e mínimo), materiais e atributos de cada variação. Use o código oficial de 6 dígitos (ex: "100010") ou SKU (ex: "100010-01") obtido na busca.',
    parameters: {
      type: 'OBJECT',
      properties: {
        codigoOuSku: {
          type: 'STRING',
          description: 'Código oficial de 6 dígitos (ex: "100010") ou SKU de uma variação (ex: "100010-01") do produto.',
        },
      },
      required: ['codigoOuSku'],
    },
  },
];

// Registro de ferramentas do Agente no App Mobile modularizado por domínios
export const mobileDomainTools = {
  finance: mobileFinancialTools,
  ordersAndDeliveries: mobileOrderDeliveryTools,
  people: mobilePeopleTools,
  products: mobileProductTools,
};

export const mobileAgentTools = [
  {
    functionDeclarations: Object.values(mobileDomainTools).flat(),
  },
];
