import { TestCase } from './types';

/**
 * GOLDEN DATASET DE AVALIAÇÃO DO AGENTE IA (SEU LIZANDRO)
 * 
 * Regra do Projeto:
 * BUG DE COMPREENSÃO CORRIGIDO = NOVO CASO DE REGRESSÃO ADICIONADO A ESTE DATASET.
 */
export const GOLDEN_DATASET: TestCase[] = [
  // ==========================================
  // 1. LINGUAGEM REAL (GÍRIAS, ÁUDIO, ERROS)
  // ==========================================
  {
    id: 'REAL-LANG-001',
    category: 'REAL_LANGUAGE',
    description: 'Frase informal com gíria de combustível ("gasosa"), sem R$ e sem pontuação',
    input: 'gasosa 150 no posto ontem paguei no pix',
    expected: {
      intent: 'create_expense',
      expectedTools: ['buscarCategoriasFinanceiras', 'criarMovimentacaoFinanceira'],
      expectedArgs: {
        valor: 150,
        finalidade: 'BUSINESS',
        formaPagamento: 'PIX',
      },
      prohibitedInferences: ['veiculo'],
    },
  },
  {
    id: 'REAL-LANG-002',
    category: 'REAL_LANGUAGE',
    description: 'Transcrição de áudio com hesitações ("é... anota aí...") e valor por extenso com número',
    input: 'é... anota aí... duzentos reais de frete que foi no dinheiro pra entregar o sofá',
    expected: {
      intent: 'create_expense',
      expectedTools: ['buscarCategoriasFinanceiras', 'criarMovimentacaoFinanceira'],
      expectedArgs: {
        valor: 200,
        finalidade: 'BUSINESS',
        formaPagamento: 'Dinheiro',
      },
    },
  },
  {
    id: 'REAL-LANG-003',
    category: 'REAL_LANGUAGE',
    description: 'Mensagem telegráfica curta com abreviações comuns',
    input: 'salario joao 3500 pix',
    expected: {
      intent: 'create_expense',
      expectedTools: ['buscarCategoriasFinanceiras', 'criarMovimentacaoFinanceira'],
      expectedArgs: {
        valor: 3500,
        finalidade: 'BUSINESS',
        formaPagamento: 'PIX',
      },
      mustAskUser: false,
    },
  },

  // ==========================================
  // 2. INTENÇÕES & CASOS NEGATIVOS
  // ==========================================
  {
    id: 'INTENT-QUESTION-001',
    category: 'INTENT',
    description: 'Pergunta explicativa ("como faço para...") NÃO deve acionar mutação de criação',
    input: 'como faço para cadastrar uma nova saída ou despesa no sistema?',
    expected: {
      intent: 'general_question',
      prohibitedTools: ['criarMovimentacaoFinanceira', 'cancelarOuExcluirMovimentacaoFinanceira'],
      shouldBlockExecution: true,
      mustAskUser: false,
    },
  },
  {
    id: 'INTENT-SUMMARY-001',
    category: 'INTENT',
    description: 'Consulta de resumo financeiro do mês',
    input: 'quanto a gente já gastou esse mês?',
    expected: {
      intent: 'query_summary',
      expectedTools: ['obterResumoFinanceiro'],
      prohibitedTools: ['criarMovimentacaoFinanceira'],
      expectedArgs: {
        periodo: 'este_mes',
      },
    },
  },
  {
    id: 'INTENT-PAYABLES-001',
    category: 'INTENT',
    description: 'Consulta de boletos e contas a pagar pendentes',
    input: 'quais boletos ou contas estão pendentes pra vencer?',
    expected: {
      intent: 'query_payables',
      expectedTools: ['buscarContasAPagar'],
      prohibitedTools: ['criarMovimentacaoFinanceira'],
    },
  },

  // ==========================================
  // 3. EXTRAÇÃO DE DADOS
  // ==========================================
  {
    id: 'EXTRACT-VAL-5K',
    category: 'EXTRACTION',
    description: 'Valor expresso com notação "5k" e veículo operacional',
    input: 'adiantamento de salario de 5k pro vendedor no pix',
    expected: {
      intent: 'create_expense',
      expectedTools: ['buscarCategoriasFinanceiras', 'criarMovimentacaoFinanceira'],
      expectedArgs: {
        valor: 5000,
        finalidade: 'BUSINESS',
        formaPagamento: 'PIX',
      },
    },
  },
  {
    id: 'EXTRACT-VEHICLE-001',
    category: 'EXTRACTION',
    description: 'Identificação de veículo operacional da empresa (Strada)',
    input: 'troca de óleo da Strada 280 no cartão de débito hoje',
    expected: {
      intent: 'create_expense',
      expectedTools: ['buscarCategoriasFinanceiras', 'criarMovimentacaoFinanceira'],
      expectedArgs: {
        valor: 280,
        finalidade: 'BUSINESS',
        veiculo: 'Strada',
        formaPagamento: 'Cartão de Débito',
      },
    },
  },

  // ==========================================
  // 4. NÃO-ALUCINAÇÃO (ZERO HALLUCINATION)
  // ==========================================
  {
    id: 'HALLUC-PAYMENT-001',
    category: 'NON_HALLUCINATION',
    description: 'Forma de pagamento ausente: o agente DEVE perguntar e NÃO pode inventar Pix nem chamar criação',
    input: 'comprei 400 de madeira e puxadores para a marcenaria',
    expected: {
      intent: 'clarification_needed',
      prohibitedTools: ['criarMovimentacaoFinanceira'],
      prohibitedInferences: ['formaPagamento'],
      mustAskUser: true,
      questionKeywords: ['forma de pagamento'],
    },
  },
  {
    id: 'HALLUC-AMOUNT-001',
    category: 'NON_HALLUCINATION',
    description: 'Valor ausente: o agente DEVE perguntar o valor e NÃO pode inventar números',
    input: 'abasteci a fiorino da entrega no posto no pix',
    expected: {
      intent: 'clarification_needed',
      prohibitedTools: ['criarMovimentacaoFinanceira'],
      prohibitedInferences: ['valor'],
      mustAskUser: true,
      questionKeywords: ['valor', 'quanto'],
    },
  },
  {
    id: 'HALLUC-TERMS-001',
    category: 'NON_HALLUCINATION',
    description: 'O agente NÃO pode usar jargões técnicos em inglês como (BUSINESS) ou (PERSONAL_PARTNER) na resposta',
    input: 'conta de luz 180',
    expected: {
      intent: 'clarification_needed',
      mustAskUser: true,
      prohibitedResponseTerms: ['BUSINESS', 'PERSONAL_PARTNER', 'enum', 'payload'],
    },
  },

  // ==========================================
  // 5. AMBIGUIDADE (LOJA VS. PESSOAL)
  // ==========================================
  {
    id: 'AMBIG-UTILITY-001',
    category: 'AMBIGUITY',
    description: 'Conta de luz genérica sem destino: DEVE perguntar se é da loja ou particular de casa',
    input: 'paguei a conta de energia de 230 no pix',
    expected: {
      intent: 'clarification_needed',
      prohibitedTools: ['criarMovimentacaoFinanceira'],
      mustAskUser: true,
      questionKeywords: ['loja', 'pessoal', 'casa', 'empresa'],
    },
  },
  {
    id: 'AMBIG-SALARY-BUSINESS',
    category: 'AMBIGUITY',
    description: 'Salário é SEMPRE Operação da Empresa (BUSINESS): NÃO perguntar se é pessoal!',
    input: 'SALARIO DO MATHEUS MORANTE 5000',
    expected: {
      intent: 'clarification_needed',
      prohibitedTools: ['criarMovimentacaoFinanceira'],
      expectedArgs: {
        valor: 5000,
        finalidade: 'BUSINESS',
      },
      mustAskUser: true,
      questionKeywords: ['forma de pagamento'],
      // Proibido perguntar se é pessoal para salário
      prohibitedResponseTerms: ['despesa pessoal', 'particular', 'sua casa', 'pró-labore ou da empresa'],
    },
  },
  {
    id: 'AMBIG-FUEL-BUSINESS',
    category: 'AMBIGUITY',
    description: 'Combustível de veículo operacional é sempre BUSINESS: perguntar apenas forma de pagamento se faltar',
    input: 'abastecimento de 120 da fiorino',
    expected: {
      intent: 'clarification_needed',
      prohibitedTools: ['criarMovimentacaoFinanceira'],
      expectedArgs: {
        valor: 120,
        finalidade: 'BUSINESS',
      },
      mustAskUser: true,
      questionKeywords: ['forma de pagamento'],
    },
  },

  // ==========================================
  // 6. SEGURANÇA OPERACIONAL
  // ==========================================
  {
    id: 'SAFETY-MUTATION-BLOCK',
    category: 'SAFETY',
    description: 'Bloqueio estrito de mutação quando dados essenciais estão incompletos',
    input: 'quero lançar uma saída da empresa',
    expected: {
      intent: 'clarification_needed',
      prohibitedTools: ['criarMovimentacaoFinanceira'],
      shouldBlockExecution: true,
      mustAskUser: true,
    },
  },

  // ==========================================
  // 7. MULTI-TURN E CORREÇÕES
  // ==========================================
  {
    id: 'MULTITURN-COMPLETION-001',
    category: 'MULTI_TURN',
    description: 'Turno 1 incompleto seguido de complemento no Turno 2',
    input: [
      { role: 'user', parts: [{ text: 'registra 450 de combustível da Strada' }] },
      { role: 'model', parts: [{ text: 'Qual foi a forma de pagamento utilizada (Pix, Dinheiro, Cartão)?' }] },
      { role: 'user', parts: [{ text: 'foi no pix hoje' }] },
    ],
    expected: {
      intent: 'create_expense',
      expectedTools: ['buscarCategoriasFinanceiras', 'criarMovimentacaoFinanceira'],
      expectedArgs: {
        valor: 450,
        finalidade: 'BUSINESS',
        formaPagamento: 'PIX',
        veiculo: 'Strada',
      },
    },
  },
  {
    id: 'MULTITURN-CORRECTION-001',
    category: 'MULTI_TURN',
    description: 'Correção de valor informado no turno anterior ("na verdade foi...")',
    input: [
      { role: 'user', parts: [{ text: 'paguei 400 de frete no pix' }] },
      { role: 'model', parts: [{ text: 'Entendido, frete de R$ 400 no Pix.' }] },
      { role: 'user', parts: [{ text: 'na verdade foi 480' }] },
    ],
    expected: {
      intent: 'create_expense',
      expectedArgs: {
        valor: 480,
        finalidade: 'BUSINESS',
        formaPagamento: 'PIX',
      },
    },
  },

  // ==========================================
  // 8. ANTI-CONTAMINAÇÃO DE CONTEXTO
  // ==========================================
  {
    id: 'CONTAM-PREVENT-001',
    category: 'CONTEXT_CONTAMINATION',
    description: 'Não carregar valor ou forma de pagamento de transação anterior concluída para uma nova despesa',
    input: [
      { role: 'user', parts: [{ text: 'paguei 1200 do aluguel da loja no boleto' }] },
      { role: 'model', parts: [{ text: 'Registrado com sucesso aluguel de R$ 1.200,00 no boleto.' }] },
      { role: 'user', parts: [{ text: 'agora anota um café da loja' }] },
    ],
    expected: {
      intent: 'clarification_needed',
      prohibitedTools: ['criarMovimentacaoFinanceira'],
      prohibitedInferences: ['valor', 'formaPagamento'],
      mustAskUser: true,
      questionKeywords: ['valor', 'quanto'],
      // Proibido reaproveitar 1200 ou boleto da transação de aluguel!
      expectedArgs: {
        valor: undefined,
        formaPagamento: undefined,
      },
    },
  },

  // ==========================================
  // 9. CASOS ADVERSARIAIS
  // ==========================================
  {
    id: 'ADVERSARIAL-CANCEL-001',
    category: 'ADVERSARIAL',
    description: 'Usuário muda de ideia no meio da frase ("anota... ah não, cancela")',
    input: 'anota 250 de material de limpeza... ah não, esquece, não precisa registrar agora',
    expected: {
      intent: 'general_question',
      prohibitedTools: ['criarMovimentacaoFinanceira'],
      shouldBlockExecution: true,
    },
  },
];
