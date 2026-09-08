/**
 * Definição oficial de Function Calling / Tools para o Assistente Financeiro IA do Morante Hub.
 * O Gemini 3.7 Flash seleciona deterministicamente a ferramenta e argumentos estruturados.
 */

export const FINANCIAL_ASSISTANT_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'propor_movimentacao_financeira',
        description:
          'Registra ou propõe uma movimentação financeira realizada (entrada ou saída) para confirmação do operador.',
        parameters: {
          type: 'OBJECT',
          properties: {
            tipo: {
              type: 'STRING',
              enum: ['income', 'expense'],
              description: 'income para ENTRADA de dinheiro, expense para SAÍDA / pagamento / gasto.',
            },
            valor: {
              type: 'NUMBER',
              description: 'Valor monetário numérico em Reais (R$). Ex: 230.50. Deve ser maior que zero.',
            },
            descricao: {
              type: 'STRING',
              description: 'Descrição objetiva e clara do fato financeiro.',
            },
            categoria_nome: {
              type: 'STRING',
              description: 'Nome da categoria correspondente no ERP (ex: Combustível, Manutenção de Veículos, Salários, etc.).',
            },
            categoria_id: {
              type: 'STRING',
              description: 'ID da categoria se já conhecido.',
            },
            data: {
              type: 'STRING',
              description: 'Data do fato no formato ISO YYYY-MM-DD. Converta "hoje", "ontem" para a data correspondente.',
            },
            forma_pagamento: {
              type: 'STRING',
              enum: ['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Dinheiro', 'TED', 'UNKNOWN'],
              description: 'Forma de pagamento utilizada. Se o usuário disse apenas "cartão" sem especificar débito ou crédito, use UNKNOWN.',
            },
            finalidade: {
              type: 'STRING',
              enum: ['BUSINESS', 'PERSONAL', 'UNKNOWN'],
              description: 'Destino do gasto: BUSINESS (Empresa/Loja), PERSONAL (Uso Particular/Pró-labore), UNKNOWN (quando for compra ambígua de eletrônicos/consumo e não foi informada). Combustível e Manutenção de frota são sempre BUSINESS.',
            },
            veiculo: {
              type: 'STRING',
              description: 'Nome ou modelo do veículo se aplicável (ex: Strada, HR, Fiorino).',
            },
            fornecedor_ou_contraparte: {
              type: 'STRING',
              description: 'Nome do fornecedor, cliente ou favorecido da movimentação.',
            },
            pergunta_ao_usuario: {
              type: 'STRING',
              description: 'Pergunta orientativa ao operador caso falte informação essencial (ex: forma de pagamento ou finalidade).',
            },
            is_pronto_para_confirmacao: {
              type: 'BOOLEAN',
              description: 'True se todos os dados obrigatórios estiverem completos e puder ser confirmado.',
            },
          },
          required: ['tipo', 'valor', 'descricao'],
        },
      },
      {
        name: 'propor_lote_movimentacoes',
        description:
          'Utilize quando a fala do operador contiver 2 ou mais fatos financeiros realizados distintos (ex: "Paguei 200 de luz e 150 de internet").',
        parameters: {
          type: 'OBJECT',
          properties: {
            itens: {
              type: 'ARRAY',
              description: 'Lista de movimentações independentes que compõem o lote.',
              items: {
                type: 'OBJECT',
                properties: {
                  tipo: { type: 'STRING', enum: ['income', 'expense'] },
                  valor: { type: 'NUMBER' },
                  descricao: { type: 'STRING' },
                  categoria_nome: { type: 'STRING' },
                  data: { type: 'STRING' },
                  forma_pagamento: {
                    type: 'STRING',
                    enum: ['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Dinheiro', 'TED', 'UNKNOWN'],
                  },
                  finalidade: { type: 'STRING', enum: ['BUSINESS', 'PERSONAL', 'UNKNOWN'] },
                  veiculo: { type: 'STRING' },
                  fornecedor_ou_contraparte: { type: 'STRING' },
                  pergunta_ao_usuario: { type: 'STRING' },
                  is_pronto_para_confirmacao: { type: 'BOOLEAN' },
                },
                required: ['tipo', 'valor', 'descricao'],
              },
            },
          },
          required: ['itens'],
        },
      },
      {
        name: 'consultar_ou_alterar_conta',
        description:
          'Utilize quando o operador solicitar busca, verificação, edição, correção ou pagamento de conta a pagar existente.',
        parameters: {
          type: 'OBJECT',
          properties: {
            acao: {
              type: 'STRING',
              enum: ['CONSULTAR', 'PAGAR_BAIXA', 'EDITAR_VALOR', 'EDITAR_VENCIMENTO'],
              description: 'Ação que o usuário deseja executar sobre a conta.',
            },
            fornecedor: {
              type: 'STRING',
              description: 'Nome da empresa/fornecedor citada (ex: Bechara, Copel, Sanepar, Kappesberg).',
            },
            valor: {
              type: 'NUMBER',
              description: 'Valor informado se houver.',
            },
            forma_pagamento: {
              type: 'STRING',
              description: 'Forma de pagamento utilizada caso seja quitação/baixa.',
            },
            mensagem_ao_usuario: {
              type: 'STRING',
              description: 'Resposta ou pergunta amigável para o operador.',
            },
          },
          required: ['acao'],
        },
      },
    ],
  },
];
