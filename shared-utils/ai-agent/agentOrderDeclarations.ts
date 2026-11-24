// Declarações JSON Schema de Ferramentas de Pedidos, Operações e Pessoas para o Assistente Lizandro (ERP & Mobile)

export const sharedOrderAndPeopleToolDeclarations = [
  {
    name: 'buscarOperacoes',
    description:
      'Consulta operações do ERP e App: pedidos de venda ("venda"), orçamentos ("orcamento"), entregas ("entrega"), retiradas ("retirada"), assistências ("assistencia"), devoluções ("devolucao") e montagens ("montagem"). Pesquise pelo nome do cliente, código/número do pedido, datas ou status.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tipo: {
          type: 'STRING',
          enum: [
            'todas',
            'venda',
            'orcamento',
            'entrega',
            'retirada',
            'assistencia',
            'devolucao',
            'montagem',
          ],
          description:
            'Tipo da operação: "venda", "orcamento", "assistencia", "devolucao", "entrega", "retirada", "montagem" ou "todas".',
        },
        termo: { type: 'STRING', description: 'Nome do cliente ou número do pedido.' },
        dataInicio: { type: 'STRING', description: 'Início do período no formato YYYY-MM-DD.' },
        dataFim: { type: 'STRING', description: 'Fim do período no formato YYYY-MM-DD.' },
        status: {
          type: 'STRING',
          description:
            'Status desejado: agendado, concluído/entregue, cancelado, pendente, rascunho/orçamento.',
        },
        limite: { type: 'NUMBER', description: 'Quantidade de resultados (1 a 20, padrão 10).' },
      },
      required: [],
    },
  },
  {
    name: 'obterDetalhesOperacao',
    description:
      'Consulta os detalhes completos de um pedido de venda, orçamento, assistência ou devolução (cliente, itens, agendamento, entrega, pagamentos, observações). Aceita o ID real ou número do pedido.',
    parameters: {
      type: 'OBJECT',
      properties: {
        operacaoId: {
          type: 'STRING',
          description: 'ID real ou número da operação retornado por buscarOperacoes.',
        },
      },
      required: ['operacaoId'],
    },
  },
  {
    name: 'buscarPedidosEntregas',
    description:
      'Compatibilidade: pesquisa pedidos de venda e entregas. Para orçamentos, assistências, devoluções, retiradas ou montagens, use buscarOperacoes.',
    parameters: {
      type: 'OBJECT',
      properties: {
        termo: { type: 'STRING', description: 'Nome do cliente ou código do pedido.' },
        dataInicio: { type: 'STRING', description: 'Data inicial de agendamento/entrega YYYY-MM-DD.' },
        dataFim: { type: 'STRING', description: 'Data final de agendamento/entrega YYYY-MM-DD.' },
        status: { type: 'STRING', description: 'Status do pedido ou entrega.' },
        limite: { type: 'NUMBER', description: 'Máximo de resultados (1 a 20, padrão 10).' },
      },
      required: [],
    },
  },
  {
    name: 'obterDetalhesPedidoEntrega',
    description:
      'Obtém todas as informações persistidas de um pedido e sua entrega: itens, cliente, endereço, agendamento, pagamentos e observações.',
    parameters: {
      type: 'OBJECT',
      properties: {
        pedidoId: { type: 'STRING', description: 'ID real ou número do pedido.' },
      },
      required: ['pedidoId'],
    },
  },
  {
    name: 'criarPedidoOperacao',
    description:
      'Cria um novo Pedido de Venda ("venda"), Orçamento ("orcamento"), Pedido de Assistência ("assistencia") ou Devolução ("devolucao") no sistema, respeitando as permissões do perfil do usuário.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tipoOperacao: {
          type: 'STRING',
          enum: ['venda', 'orcamento', 'assistencia', 'devolucao'],
          description:
            'Tipo da operação a criar: "venda" (Pedido de Venda), "orcamento" (Orçamento), "assistencia" (Assistência Técnica) ou "devolucao" (Devolução).',
        },
        clienteNome: {
          type: 'STRING',
          description: 'Nome do cliente.',
        },
        clienteId: {
          type: 'STRING',
          description: 'ID opcional do cliente obtido via buscarClientes.',
        },
        clienteTelefone: {
          type: 'STRING',
          description: 'Telefone do cliente.',
        },
        vendedorNome: {
          type: 'STRING',
          description: 'Nome do vendedor responsável.',
        },
        status: {
          type: 'STRING',
          enum: ['draft', 'scheduled', 'fulfilled', 'cancelled'],
          description: 'Status inicial do pedido (para orçamento usa-se "draft" automaticamente).',
        },
        modalidadeEntrega: {
          type: 'STRING',
          enum: ['entrega', 'retirada', 'delivery', 'pickup'],
          description: '"entrega" (ou "delivery") em domicílio ou "retirada" (ou "pickup") na loja.',
        },
        dataAgendamento: {
          type: 'STRING',
          description: 'Data agendada de entrega/atendimento (YYYY-MM-DD).',
        },
        horarioAgendamento: {
          type: 'STRING',
          description: 'Horário ou turno agendado.',
        },
        valorFrete: {
          type: 'NUMBER',
          description: 'Valor do frete em reais.',
        },
        descontoTotal: {
          type: 'NUMBER',
          description: 'Desconto total aplicado em reais.',
        },
        desconto: {
          type: 'NUMBER',
          description: 'Desconto em reais (alias para descontoTotal).',
        },
        formaPagamento: {
          type: 'STRING',
          description: 'Forma de pagamento (PIX, Dinheiro, Cartão, Boleto, etc.).',
        },
        parcelas: {
          type: 'NUMBER',
          description: 'Quantidade de parcelas (padrão 1).',
        },
        observacoes: {
          type: 'STRING',
          description: 'Observações gerais do pedido/orçamento.',
        },
        descricaoAssistencia: {
          type: 'STRING',
          description: 'Descrição do defeito ou atendimento (para tipoOperacao="assistencia").',
        },
        motivoDevolucao: {
          type: 'STRING',
          description: 'Motivo da devolução (para tipoOperacao="devolucao").',
        },
        pedidoOrigemId: {
          type: 'STRING',
          description: 'ID do pedido de venda original (para assistência ou devolução vinculada).',
        },
        itens: {
          type: 'ARRAY',
          description: 'Lista de produtos/itens da operação.',
          items: {
            type: 'OBJECT',
            properties: {
              codigoOuSku: { type: 'STRING', description: 'Código de 6 dígitos ou SKU do produto.' },
              descricao: { type: 'STRING', description: 'Nome/descrição do item.' },
              quantidade: { type: 'NUMBER', description: 'Quantidade (padrão 1).' },
              precoUnitario: { type: 'NUMBER', description: 'Preço unitário em reais.' },
              descontoUnitario: { type: 'NUMBER', description: 'Desconto unitário em reais.' },
              tipoAcao: {
                type: 'STRING',
                enum: ['venda', 'troca', 'assistencia', 'devolucao'],
                description: 'Ação do item.',
              },
            },
          },
        },
        pagamentos: {
          type: 'ARRAY',
          description: 'Formas de pagamento previstas para a operação.',
          items: {
            type: 'OBJECT',
            properties: {
              metodo: { type: 'STRING', description: 'Método de pagamento (PIX, Dinheiro, Cartão, etc.).' },
              valor: { type: 'NUMBER', description: 'Valor em reais.' },
              parcelas: { type: 'NUMBER', description: 'Número de parcelas.' },
              dataVencimento: { type: 'STRING', description: 'Data de vencimento YYYY-MM-DD.' },
              status: { type: 'STRING', description: 'Status do pagamento (pending, paid).' },
            },
          },
        },
      },
      required: ['tipoOperacao', 'clienteNome'],
    },
  },
  {
    name: 'editarPedidoOperacao',
    description:
      'Edita um Pedido de Venda, Orçamento, Assistência ou Devolução existente (status, cliente, itens, pagamentos, agendamento, observações ou conversão de orçamento em venda) a partir do pedidoId ou número.',
    parameters: {
      type: 'OBJECT',
      properties: {
        pedidoId: {
          type: 'STRING',
          description: 'ID real ou número do pedido/operação a ser editado.',
        },
        tipoOperacao: {
          type: 'STRING',
          enum: ['venda', 'orcamento', 'assistencia', 'devolucao'],
          description: 'Tipo da operação (permite converter orçamento em venda definindo tipoOperacao="venda").',
        },
        status: {
          type: 'STRING',
          enum: ['draft', 'scheduled', 'fulfilled', 'cancelled'],
          description: 'Novo status da operação.',
        },
        clienteNome: { type: 'STRING', description: 'Novo nome do cliente.' },
        clienteTelefone: { type: 'STRING', description: 'Novo telefone do cliente.' },
        vendedorNome: { type: 'STRING', description: 'Novo vendedor responsável.' },
        modalidadeEntrega: {
          type: 'STRING',
          enum: ['entrega', 'retirada', 'delivery', 'pickup'],
          description: 'Modalidade de entrega ou retirada.',
        },
        dataAgendamento: { type: 'STRING', description: 'Nova data agendada YYYY-MM-DD.' },
        horarioAgendamento: { type: 'STRING', description: 'Novo horário agendado.' },
        valorFrete: { type: 'NUMBER', description: 'Novo valor de frete.' },
        descontoTotal: { type: 'NUMBER', description: 'Novo desconto total.' },
        desconto: { type: 'NUMBER', description: 'Desconto em reais (alias para descontoTotal).' },
        formaPagamento: { type: 'STRING', description: 'Nova forma de pagamento.' },
        parcelas: { type: 'NUMBER', description: 'Nova quantidade de parcelas.' },
        observacoes: { type: 'STRING', description: 'Novas observações.' },
        descricaoAssistencia: { type: 'STRING', description: 'Descrição atualizada da assistência.' },
        motivoDevolucao: { type: 'STRING', description: 'Motivo atualizado da devolução.' },
        itens: {
          type: 'ARRAY',
          description: 'Nova lista de itens (se informada, atualiza os itens e recalcula os totais).',
          items: {
            type: 'OBJECT',
            properties: {
              codigoOuSku: { type: 'STRING' },
              descricao: { type: 'STRING' },
              quantidade: { type: 'NUMBER' },
              precoUnitario: { type: 'NUMBER' },
              descontoUnitario: { type: 'NUMBER' },
            },
          },
        },
        pagamentos: {
          type: 'ARRAY',
          description: 'Nova lista de pagamentos.',
          items: {
            type: 'OBJECT',
            properties: {
              metodo: { type: 'STRING' },
              valor: { type: 'NUMBER' },
              parcelas: { type: 'NUMBER' },
              dataVencimento: { type: 'STRING' },
              status: { type: 'STRING' },
            },
          },
        },
      },
      required: ['pedidoId'],
    },
  },
  {
    name: 'buscarClientes',
    description:
      'Pesquisa cadastro de clientes por nome, telefone, CPF/CNPJ ou e-mail.',
    parameters: {
      type: 'OBJECT',
      properties: {
        termo: { type: 'STRING', description: 'Nome, telefone, CPF/CNPJ ou e-mail do cliente.' },
        limite: { type: 'NUMBER', description: 'Quantidade de resultados (1 a 20, padrão 10).' },
      },
      required: ['termo'],
    },
  },
  {
    name: 'criarOuEditarCliente',
    description:
      'Cria um novo cliente ou edita os dados de um cliente existente (quando clienteId é informado).',
    parameters: {
      type: 'OBJECT',
      properties: {
        clienteId: {
          type: 'STRING',
          description: 'ID do cliente existente para edição (omita para criar novo cliente).',
        },
        nome: { type: 'STRING', description: 'Nome completo ou razão social do cliente.' },
        cpfCnpj: { type: 'STRING', description: 'CPF ou CNPJ do cliente.' },
        telefone: { type: 'STRING', description: 'Telefone ou WhatsApp do cliente.' },
        email: { type: 'STRING', description: 'E-mail do cliente.' },
        cep: { type: 'STRING', description: 'CEP do endereço.' },
        rua: { type: 'STRING', description: 'Rua/Logradouro.' },
        numero: { type: 'STRING', description: 'Número do endereço.' },
        complemento: { type: 'STRING', description: 'Complemento.' },
        bairro: { type: 'STRING', description: 'Bairro.' },
        cidade: { type: 'STRING', description: 'Cidade.' },
        estado: { type: 'STRING', description: 'UF/Estado (ex: PR, SP).' },
        observacoes: { type: 'STRING', description: 'Observações do cadastro.' },
        ativo: { type: 'BOOLEAN', description: 'Se o cadastro está ativo.' },
      },
      required: ['nome'],
    },
  },
  {
    name: 'buscarColaboradores',
    description:
      'Pesquisa colaboradores/usuários por nome, e-mail ou cargo e informa cargos e funções cadastrados.',
    parameters: {
      type: 'OBJECT',
      properties: {
        termo: { type: 'STRING', description: 'Nome, e-mail ou cargo/função.' },
        limite: { type: 'NUMBER', description: 'Quantidade de resultados (1 a 20, padrão 10).' },
      },
      required: ['termo'],
    },
  },
];
