// Declarações JSON Schema de Ferramentas de Produtos e Estoque para o Assistente Lizandro (ERP & Mobile)

export const sharedProductToolDeclarations = [
  {
    name: 'buscarProdutos',
    description:
      'Pesquisa produtos e variações no catálogo/estoque por termo (nome, código de 6 dígitos ou SKU), categoria, status de ativação ou itens na lixeira.',
    parameters: {
      type: 'OBJECT',
      properties: {
        termo: {
          type: 'STRING',
          description:
            'Termo de busca pelo nome do produto, descrição, código oficial de 6 dígitos ou SKU da variação.',
        },
        categoria: {
          type: 'STRING',
          description: 'Nome da categoria para filtrar produtos (ex: "Sofás", "Mesas", "Colchões").',
        },
        apenasAtivos: {
          type: 'BOOLEAN',
          description: 'Se verdadeiro, filtra apenas produtos ativos em linha. Padrão: true.',
        },
        naLixeira: {
          type: 'BOOLEAN',
          description: 'Se verdadeiro, lista apenas produtos que estão na Lixeira (deleted = true).',
        },
        limite: {
          type: 'NUMBER',
          description: 'Quantidade máxima de produtos a retornar (padrão 10, máximo 30).',
        },
      },
      required: [],
    },
  },
  {
    name: 'obterDetalhesProduto',
    description:
      'Obtém a ficha técnica completa de um produto e suas variações: nome, descrição, dimensões, fotos, preços (venda, promocional, custo e frete), estoque (atual e mínimo), materiais, características técnicas, NCM e variações. Use o código oficial de 6 dígitos ou SKU.',
    parameters: {
      type: 'OBJECT',
      properties: {
        codigoOuSku: {
          type: 'STRING',
          description:
            'Código oficial de 6 dígitos (ex: "100010") ou SKU de uma variação (ex: "100010-01") do produto.',
        },
      },
      required: ['codigoOuSku'],
    },
  },
  {
    name: 'listarCategoriasECaracteristicasProduto',
    description:
      'Lista todas as categorias, ambientes e características técnicas cadastradas para produtos no sistema.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: [],
    },
  },
  {
    name: 'criarProduto',
    description:
      'Cria um novo produto no catálogo/estoque com preços, estoque, dimensões, características técnicas e variações, respeitando as permissões do perfil do usuário.',
    parameters: {
      type: 'OBJECT',
      properties: {
        nome: { type: 'STRING', description: 'Nome do produto.' },
        codigo: {
          type: 'STRING',
          description: 'Código opcional de 6 dígitos (se omitido, gera o próximo código sequencial).',
        },
        titulo: { type: 'STRING', description: 'Título para catálogo/marketplace.' },
        descricao: { type: 'STRING', description: 'Descrição detalhada do produto.' },
        categoria: { type: 'STRING', description: 'Categoria do produto (ex: "Sofás", "Guarda-Roupas").' },
        ambiente: { type: 'STRING', description: 'Ambiente do produto (ex: "Sala de Estar", "Quarto").' },
        marca: { type: 'STRING', description: 'Marca ou fabricante.' },
        linha: { type: 'STRING', description: 'Modelo ou linha do produto.' },
        condicao: {
          type: 'STRING',
          enum: ['novo', 'usado', 'salvado'],
          description: 'Condição do produto (padrão "novo").',
        },
        precoVenda: { type: 'NUMBER', description: 'Preço de venda unitário em reais.' },
        precoPromocional: { type: 'NUMBER', description: 'Preço promocional opcional em reais.' },
        precoCusto: { type: 'NUMBER', description: 'Preço de custo em reais.' },
        custoFrete: { type: 'NUMBER', description: 'Custo de frete em reais.' },
        estoque: { type: 'NUMBER', description: 'Saldo de estoque inicial.' },
        estoqueMinimo: { type: 'NUMBER', description: 'Estoque mínimo de segurança.' },
        unidade: { type: 'STRING', description: 'Unidade de medida (padrão "UN").' },
        alturaCm: { type: 'NUMBER', description: 'Altura total em centímetros.' },
        larguraCm: { type: 'NUMBER', description: 'Largura total em centímetros.' },
        profundidadeCm: { type: 'NUMBER', description: 'Profundidade/comprimento total em centímetros.' },
        pesoKg: { type: 'NUMBER', description: 'Peso em quilogramas.' },
        material: { type: 'STRING', description: 'Material principal.' },
        cores: { type: 'STRING', description: 'Cores disponíveis.' },
        diferencialPrincipal: { type: 'STRING', description: 'Diferencial principal do produto.' },
        naoIncluso: { type: 'STRING', description: 'Itens não inclusos.' },
        ncm: { type: 'STRING', description: 'Código NCM fiscal.' },
        caracteristicasTecnicas: {
          type: 'OBJECT',
          description: 'Mapa chave-valor com características técnicas do produto.',
        },
        ativo: { type: 'BOOLEAN', description: 'Se o produto inicia ativo (padrão true).' },
        rascunho: { type: 'BOOLEAN', description: 'Se deve ser salvo como rascunho.' },
        variacoes: {
          type: 'ARRAY',
          description: 'Lista opcional de variações do produto.',
          items: {
            type: 'OBJECT',
            properties: {
              sku: { type: 'STRING' },
              nome: { type: 'STRING' },
              precoVenda: { type: 'NUMBER' },
              precoPromocional: { type: 'NUMBER' },
              precoCusto: { type: 'NUMBER' },
              estoque: { type: 'NUMBER' },
              ativo: { type: 'BOOLEAN' },
              atributos: { type: 'OBJECT' },
            },
          },
        },
      },
      required: ['nome'],
    },
  },
  {
    name: 'editarProduto',
    description:
      'Edita qualquer informação de um produto existente pelo código de 6 dígitos ou SKU: nome, categoria, marca, linha, preços, estoque, dimensões, características técnicas, NCM, variações, ativação/desativação ou envio/restauração da Lixeira.',
    parameters: {
      type: 'OBJECT',
      properties: {
        codigoOuSku: {
          type: 'STRING',
          description: 'Código oficial de 6 dígitos ou SKU do produto que será editado.',
        },
        nome: { type: 'STRING', description: 'Novo nome do produto.' },
        titulo: { type: 'STRING', description: 'Novo título de catálogo.' },
        descricao: { type: 'STRING', description: 'Nova descrição.' },
        categoria: { type: 'STRING', description: 'Nova categoria.' },
        ambiente: { type: 'STRING', description: 'Novo ambiente.' },
        marca: { type: 'STRING', description: 'Nova marca.' },
        linha: { type: 'STRING', description: 'Nova linha/modelo.' },
        condicao: {
          type: 'STRING',
          enum: ['novo', 'usado', 'salvado'],
          description: 'Nova condição.',
        },
        precoVenda: { type: 'NUMBER', description: 'Novo preço de venda.' },
        precoPromocional: { type: 'NUMBER', description: 'Novo preço promocional.' },
        precoCusto: { type: 'NUMBER', description: 'Novo preço de custo.' },
        custoFrete: { type: 'NUMBER', description: 'Novo custo de frete.' },
        estoque: { type: 'NUMBER', description: 'Novo saldo de estoque.' },
        estoqueMinimo: { type: 'NUMBER', description: 'Novo estoque mínimo.' },
        unidade: { type: 'STRING', description: 'Nova unidade.' },
        alturaCm: { type: 'NUMBER', description: 'Nova altura em cm.' },
        larguraCm: { type: 'NUMBER', description: 'Nova largura em cm.' },
        profundidadeCm: { type: 'NUMBER', description: 'Nova profundidade em cm.' },
        pesoKg: { type: 'NUMBER', description: 'Novo peso em kg.' },
        material: { type: 'STRING', description: 'Novo material.' },
        cores: { type: 'STRING', description: 'Novas cores.' },
        diferencialPrincipal: { type: 'STRING', description: 'Novo diferencial principal.' },
        naoIncluso: { type: 'STRING', description: ' Novos itens não inclusos.' },
        ncm: { type: 'STRING', description: 'Novo NCM.' },
        caracteristicasTecnicas: {
          type: 'OBJECT',
          description: 'Características técnicas a atualizar ou mesclar.',
        },
        ativo: { type: 'BOOLEAN', description: 'Ativar (true) ou desativar (false) o produto.' },
        moverParaLixeira: {
          type: 'BOOLEAN',
          description: 'Se verdadeiro, envia o produto para a Lixeira (deleted = true).',
        },
        restaurarDaLixeira: {
          type: 'BOOLEAN',
          description: 'Se verdadeiro, restaura o produto da Lixeira (deleted = false).',
        },
        variacoes: {
          type: 'ARRAY',
          description: 'Variações a atualizar ou adicionar.',
          items: {
            type: 'OBJECT',
            properties: {
              sku: { type: 'STRING' },
              nome: { type: 'STRING' },
              precoVenda: { type: 'NUMBER' },
              precoPromocional: { type: 'NUMBER' },
              precoCusto: { type: 'NUMBER' },
              estoque: { type: 'NUMBER' },
              ativo: { type: 'BOOLEAN' },
              atributos: { type: 'OBJECT' },
            },
          },
        },
      },
      required: ['codigoOuSku'],
    },
  },
];
