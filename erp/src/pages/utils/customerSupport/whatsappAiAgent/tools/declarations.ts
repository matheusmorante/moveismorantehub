// Declarações oficiais das ferramentas seguras para Function Calling da OpenAI.
export const whatsappAgentToolDeclarations = [
  {
    name: 'buscarProdutos',
    description:
      'Pesquisa móveis disponíveis no catálogo comercial da Móveis Morante por termo/nome, categoria ou ordenação de preço.',
    parameters: {
      type: 'OBJECT',
      properties: {
        termo: {
          type: 'STRING',
          description: 'Termo de busca (ex: "sofá retrátil", "mesa de jantar", "guarda-roupa").',
        },
        categoria: {
          type: 'STRING',
          description: 'Categoria do produto (ex: "Sala de Estar", "Quarto", "Cozinha").',
        },
        apenasEmEstoque: {
          type: 'BOOLEAN',
          description: 'Se verdadeiro (padrão), retorna apenas itens com estoque disponível.',
        },
        limite: {
          type: 'INTEGER',
          description: 'Quantidade máxima de produtos a retornar (padrão 5, máximo 10).',
        },
      },
      required: [],
    },
  },
  {
    name: 'obterDetalhesProduto',
    description:
      'Obtém detalhes completos de um produto específico (medidas de altura/largura/profundidade, cores, fotos e preços de venda).',
    parameters: {
      type: 'OBJECT',
      properties: {
        codigoOuSku: {
          type: 'STRING',
          description: 'Código de 6 dígitos ou SKU da variação do produto.',
        },
      },
      required: ['codigoOuSku'],
    },
  },
  {
    name: 'listarCategoriasECaracteristicasProduto',
    description:
      'Consulta as categorias e ambientes de móveis cadastrados na loja (Sala, Quarto, Sala de Jantar, Cozinha, etc.).',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: [],
    },
  },
  {
    name: 'obterInformacoesComerciaisLoja',
    description:
      'Consulta informações comerciais oficiais da Móveis Morante (endereço físico, horário de funcionamento, condições de frete/montagem, formas de pagamento e links úteis).',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: [],
    },
  },
  {
    name: 'consultarMeusPedidos',
    description:
      'Consulta o status e previsão de entrega dos pedidos do cliente que está conversando no WhatsApp.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: [],
    },
  },
  {
    name: 'calcularFreteOuDistancia',
    description:
      'Calcula a distância e verifica a condição de frete da loja física (Rua Cascavel, 306 - Colombo/PR) até o endereço do cliente. Frete 100% grátis para endereços a menos de 5 km. Para distâncias maiores, orienta a pedir o endereço completo. Se o endereço não for localizado na consulta, aciona intervenção humana silenciosa.',
    parameters: {
      type: 'OBJECT',
      properties: {
        enderecoOuCep: {
          type: 'STRING',
          description: 'Endereço completo (rua, número, bairro) ou CEP informado pelo cliente para cálculo.',
        },
      },
      required: ['enderecoOuCep'],
    },
  },
  {
    name: 'encaminharParaAtendimentoHumano',
    description:
      'Aciona intervenção humana silenciosa na Central de Atendimento quando a IA não souber responder com segurança, faltarem regras/endereço ou se o cliente solicitar atendente.',
    parameters: {
      type: 'OBJECT',
      properties: {
        motivo: {
          type: 'STRING',
          description: 'Motivo detalhado do escalonamento (o que foi solicitado e o que faltou).',
        },
        silencioso: {
          type: 'BOOLEAN',
          description: 'Se verdadeiro (padrão), não envia mensagem de aviso no chat do cliente.',
        },
      },
      required: ['motivo'],
    },
  },
];
