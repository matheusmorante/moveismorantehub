// Declarações oficiais das ferramentas seguras para Function Calling da OpenAI.
export const whatsappAgentToolDeclarations = [
  {
    name: 'buscarProdutos',
    description:
      'Pesquisa móveis disponíveis no catálogo comercial da Móveis Morante por termo/nome, categoria ou ordenação de preço.',
    parameters: {
      type: 'object',
      properties: {
        termo: {
          type: ['string', 'null'],
          description: 'Termo de busca (ex: "sofá retrátil", "mesa de jantar", "guarda-roupa").',
        },
        categoria: {
          type: ['string', 'null'],
          description: 'Categoria do produto (ex: "Sala de Estar", "Quarto", "Cozinha").',
        },
        apenasEmEstoque: {
          type: ['boolean', 'null'],
          description: 'Se verdadeiro (padrão), retorna apenas itens com estoque disponível.',
        },
        limite: {
          type: ['integer', 'null'],
          description: 'Quantidade máxima de produtos a retornar (padrão 5, máximo 10).',
        },
      },
      required: ['termo', 'categoria', 'apenasEmEstoque', 'limite'],
      additionalProperties: false,
    },
  },
  {
    name: 'obterDetalhesProduto',
    description:
      'Obtém detalhes completos de um produto específico (medidas de altura/largura/profundidade, cores, fotos e preços de venda).',
    parameters: {
      type: 'object',
      properties: {
        codigoOuSku: {
          type: 'string',
          description: 'Código de 6 dígitos ou SKU da variação do produto.',
        },
      },
      required: ['codigoOuSku'],
      additionalProperties: false,
    },
  },
  {
    name: 'listarCategoriasECaracteristicasProduto',
    description:
      'Consulta as categorias e ambientes de móveis cadastrados na loja (Sala, Quarto, Sala de Jantar, Cozinha, etc.).',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: 'obterInformacoesComerciaisLoja',
    description:
      'Consulta informações comerciais oficiais da Móveis Morante (endereço físico, horário de funcionamento, condições de frete/montagem, formas de pagamento e links úteis).',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: 'consultarMeusPedidos',
    description:
      'Consulta o status e previsão de entrega dos pedidos do cliente que está conversando no WhatsApp.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: 'calcularFreteOuDistancia',
    description:
      'Recebe o CEP ou endereço para encaminhar a confirmação de distância e valor do frete à equipe. Não prometa frete grátis nem informe quilômetros sem uma consulta real de rota; esta ferramenta aciona a intervenção humana silenciosa.',
    parameters: {
      type: 'object',
      properties: {
        enderecoOuCep: {
          type: 'string',
          description: 'Endereço completo (rua, número, bairro) ou CEP informado pelo cliente para cálculo.',
        },
      },
      required: ['enderecoOuCep'],
      additionalProperties: false,
    },
  },
  {
    name: 'encaminharParaAtendimentoHumano',
    description:
      'Aciona intervenção humana silenciosa na Central de Atendimento quando a IA não souber responder com segurança, faltarem regras/endereço ou se o cliente solicitar atendente.',
    parameters: {
      type: 'object',
      properties: {
        motivo: {
          type: 'string',
          description: 'Motivo detalhado do escalonamento (o que foi solicitado e o que faltou).',
        },
        silencioso: {
          type: ['boolean', 'null'],
          description: 'Se verdadeiro (padrão), não envia mensagem de aviso no chat do cliente.',
        },
      },
      required: ['motivo', 'silencioso'],
      additionalProperties: false,
    },
  },
];
