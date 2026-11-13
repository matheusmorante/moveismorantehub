// Declarações oficiais das ferramentas seguras para Function Calling da OpenAI.
export const whatsappAgentToolDeclarations = [
  {
    name: 'buscarProdutos',
    description:
      'Pesquisa produtos da Móveis Morante no catálogo real por categoria, nome e características. A categoria restringe os resultados mesmo quando há termo. Preserve a categoria que o cliente pediu; itens relacionados são categorias diferentes. Exemplo: "pia" significa a categoria Pias; "balcão para pia" significa Balcões para Pia. Use listarCategoriasECaracteristicasProduto se precisar confirmar o nome exato. Use sempre enviarCartoes=true quando apresentar opções de móveis para enviar cards nativos do WhatsApp. Não mencione estoque nem filtre por saldo; todos os produtos cadastrados são ofertados como disponíveis.',
    parameters: {
      type: 'object',
      properties: {
        termo: {
          type: ['string', 'null'],
          description: 'Nome/modelo e qualificadores da busca (medida, cor, material ou linha), por exemplo "1,20 branco" ou "Florença". Não troque o termo por uma categoria relacionada.',
        },
        categoria: {
          type: ['string', 'null'],
          description: 'Nome exato da categoria retornada por listarCategoriasECaracteristicasProduto. É um filtro obrigatório junto com termo. Ex.: "Pias" e "Balcões para Pia" são categorias distintas.',
        },
        apenasEmEstoque: {
          type: ['boolean', 'null'],
          description: 'Não utilizado no atendimento comercial. Mantenha false ou null.',
        },
        limite: {
          type: ['integer', 'null'],
          description: 'Quantidade máxima a retornar (padrão 5, máximo 30 quando enviarCartoes=true).',
        },
        enviarCartoes: {
          type: ['boolean', 'null'],
          description: 'Use true quando o cliente pedir ou demonstrar interesse em ver opções de móveis. O sistema envia os cards de produtos correspondentes junto com a resposta.',
        },
      },
      required: ['termo', 'categoria', 'apenasEmEstoque', 'limite', 'enviarCartoes'],
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
      'Lista as categorias e ambientes cadastrados no ERP. Consulte para resolver o nome exato de uma categoria antes da busca quando houver dúvida; não trate categorias relacionadas como sinônimos.',
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
      'Recebe o endereço para a equipe confirmar distância, valor e prazo somente dentro de Curitiba e da Região Metropolitana. Para destinos claramente fora da área de entrega, informe que a loja não atende o local e não solicite cotação. Esta ferramenta aciona a intervenção humana silenciosa; não prometa frete grátis nem informe quilômetros.',
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
