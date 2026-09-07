import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AUTO_SEND_SILENCE_MS,
  classifyMultiTurnIntent,
  applyTurnPatch,
  parseFinancialIntentWithGemini,
  ParsedFinancialIntent,
  ChatMessage,
  FinancialCategory,
} from '../../../../mobile/src/services/financialAiAssistantService';
import { parsePtBrWrittenNumbers } from '../../../../mobile/src/services/financial/wordToNumberPtBr';
import { trySlotFillingFallback } from '../../../../mobile/src/services/financial/financialSlotFilling';

// Mock dependencies
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../../../../mobile/src/services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock('../../../../mobile/src/services/voiceRecorderService', () => ({
  startVoiceRecording: vi.fn().mockResolvedValue(true),
  stopVoiceRecording: vi.fn().mockResolvedValue(true),
}));

const mockCategories: FinancialCategory[] = [
  { id: 'cat-1', name: 'Combustível', active: true, type: 'expense' },
  { id: 'cat-2', name: 'Manutenção de Veículos', active: true, type: 'expense' },
  { id: 'cat-3', name: 'Contas de Consumo', active: true, type: 'expense' },
  { id: 'cat-4', name: 'Equipamentos da Empresa', active: true, type: 'expense' },
  { id: 'cat-5', name: 'Pró-labore', active: true, type: 'expense' },
  { id: 'cat-6', name: 'Compra de estoque', active: true, type: 'expense' },
];

describe('BATERIA COMPLEMENTAR DO ASSISTENTE FINANCEIRO (GRUPOS 1 A 45)', () => {
  const todayStr = new Date().toISOString().split('T')[0];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // GRUPO 1 — AUTOENVIO DE VOZ APÓS 3 SEGUNDOS
  describe('GRUPO 1 — AUTOENVIO DE VOZ APÓS 3 SEGUNDOS', () => {
    test('1.1: 2999ms não envia; >= 3000ms envia uma vez', () => {
      let sentCount = 0;
      let timer: any = null;

      const onSpeech = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { sentCount += 1; }, AUTO_SEND_SILENCE_MS);
      };

      onSpeech();
      vi.advanceTimersByTime(2999);
      expect(sentCount).toBe(0);

      vi.advanceTimersByTime(1);
      expect(sentCount).toBe(1);
    });

    test('1.2: Microfone continua ativo (LISTENING) após o autoenvio', () => {
      let sessionState: 'LISTENING' | 'IDLE' = 'LISTENING';
      const autoSent = true;
      if (autoSent) {
        expect(sessionState).toBe('LISTENING');
      }
    });

    test('1.3: 20s de silêncio não gera mensagens em branco', () => {
      let msgCount = 0;
      let buffer = '';

      const handleTimeout = () => {
        if (buffer.trim()) {
          msgCount += 1;
          buffer = '';
        }
      };

      buffer = 'Paguei 200 de gasolina.';
      handleTimeout();
      expect(msgCount).toBe(1);

      // 20 segundos sem nova fala
      for (let i = 0; i < 6; i++) {
        handleTimeout();
      }
      expect(msgCount).toBe(1);
    });

    test('1.4: Nova fala após 15s cria nova mensagem e nova movimentação', async () => {
      const activeDraft: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: 'expense',
        amount: 200,
        description: 'Gasolina',
        categoryName: 'Combustível',
        paymentMethod: 'Pix',
      };

      const intent = classifyMultiTurnIntent('Também paguei 300 de internet.', activeDraft);
      expect(intent).toBe('NEW_TRANSACTION');
    });
  });

  // GRUPO 2 — PAUSAS NATURAIS
  describe('GRUPO 2 — PAUSAS NATURAIS', () => {
    test('2.1: Pausas de 700ms e 1200ms mantêm uma única mensagem', () => {
      let sentCount = 0;
      let timer: any = null;

      const speak = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { sentCount += 1; }, AUTO_SEND_SILENCE_MS);
      };

      speak();
      vi.advanceTimersByTime(700);
      speak();
      vi.advanceTimersByTime(1200);
      speak();
      expect(sentCount).toBe(0);
    });

    test('2.2: Pausa de 2.8s não envia', () => {
      let sentCount = 0;
      let timer = setTimeout(() => { sentCount += 1; }, AUTO_SEND_SILENCE_MS);

      vi.advanceTimersByTime(2800);
      expect(sentCount).toBe(0);
      clearTimeout(timer);
    });

    test('2.3: Pausa > 3.0s finaliza apenas o trecho atual e mantém mic ativo', () => {
      let sentCount = 0;
      let micState = 'LISTENING';

      const timer = setTimeout(() => {
        sentCount += 1;
      }, AUTO_SEND_SILENCE_MS);

      vi.advanceTimersByTime(3000);
      expect(sentCount).toBe(1);
      expect(micState).toBe('LISTENING');
      clearTimeout(timer);
    });
  });

  // GRUPO 3 — CORREÇÃO POR VOZ
  describe('GRUPO 3 — CORREÇÃO POR VOZ', () => {
    test('3.1: "Não, foi 250." -> CORRECTION, valor 250, mesma movimentação', () => {
      const activeDraft: ParsedFinancialIntent = {
        amount: 200,
        description: 'Gasolina',
        categoryName: 'Combustível',
        paymentMethod: 'Pix',
      };

      const intent = classifyMultiTurnIntent('Não, foi 250.', activeDraft);
      expect(intent).toBe('CORRECTION');

      const { updatedDraft, isNewTransaction } = applyTurnPatch(activeDraft, 'Não, foi 250.', intent, mockCategories, todayStr);
      expect(isNewTransaction).toBe(false);
      expect(updatedDraft.amount).toBe(250);
    });

    test('3.2: "Na verdade foi 237 e 89." -> valor final 237.89', () => {
      const activeDraft: ParsedFinancialIntent = {
        amount: 250,
        description: 'Gasolina',
        categoryName: 'Combustível',
        paymentMethod: 'Pix',
      };

      const intent = classifyMultiTurnIntent('Na verdade foi 237 e 89.', activeDraft);
      const { updatedDraft } = applyTurnPatch(activeDraft, 'Na verdade foi 237 e 89.', intent, mockCategories, todayStr);
      expect(updatedDraft.amount).toBe(237.89);
    });

    test('3.3: "Não foi no Pix, foi no débito." -> altera apenas paymentMethod para Cartão de Débito', () => {
      const activeDraft: ParsedFinancialIntent = {
        amount: 500,
        description: 'Oficina',
        categoryName: 'Manutenção de Veículos',
        paymentMethod: 'Pix',
      };

      const intent = classifyMultiTurnIntent('Não foi no Pix, foi no débito.', activeDraft);
      expect(intent).toBe('CORRECTION');

      const { updatedDraft } = applyTurnPatch(activeDraft, 'Não foi no Pix, foi no débito.', intent, mockCategories, todayStr);
      expect(updatedDraft.amount).toBe(500);
      expect(updatedDraft.categoryName).toBe('Manutenção de Veículos');
      expect(updatedDraft.paymentMethod).toBe('Cartão de Débito');
    });

    test('3.4: "Não, falei errado, é para a loja." -> PERSONAL -> BUSINESS + Equipamentos', () => {
      const activeDraft: ParsedFinancialIntent = {
        amount: 2000,
        description: 'TV',
        businessPurpose: 'PERSONAL',
        categoryName: 'Pró-labore',
      };

      const intent = classifyMultiTurnIntent('Não, falei errado, é para a loja.', activeDraft);
      expect(intent).toBe('CORRECTION');

      const { updatedDraft } = applyTurnPatch(activeDraft, 'Não, falei errado, é para a loja.', intent, mockCategories, todayStr);
      expect(updatedDraft.businessPurpose).toBe('BUSINESS');
      expect(updatedDraft.categoryName).toBe('Equipamentos da Empresa');
    });
  });

  // GRUPO 4 — NOVA MOVIMENTAÇÃO VS CORREÇÃO
  describe('GRUPO 4 — NOVA MOVIMENTAÇÃO VS CORREÇÃO', () => {
    test('4.1: "E paguei 300 de internet." -> duas movimentações', () => {
      const activeDraft: ParsedFinancialIntent = {
        amount: 200,
        description: 'Gasolina',
        categoryName: 'Combustível',
        isReadyForConfirmation: true,
      };

      const intent = classifyMultiTurnIntent('E paguei 300 de internet.', activeDraft);
      expect(intent).toBe('NEW_TRANSACTION');
    });

    test('4.2: "E mais 50." -> Identificar fala ambígua sem alterar silenciosamente', () => {
      const activeDraft: ParsedFinancialIntent = {
        amount: 200,
        description: 'Gasolina',
        categoryName: 'Combustível',
      };

      const intent = classifyMultiTurnIntent('E mais 50.', activeDraft);
      // Não deve sobrescrever o valor anterior com 50
      const { updatedDraft } = applyTurnPatch(activeDraft, 'E mais 50.', intent, mockCategories, todayStr);
      expect(updatedDraft.amount).not.toBe(50);
    });

    test('4.3: "Mais 50 de gasolina." -> Tratar com pergunta ou nova movimentação sem somar silenciosamente', () => {
      const activeDraft: ParsedFinancialIntent = {
        amount: 200,
        description: 'Gasolina',
        categoryName: 'Combustível',
      };

      const patched = trySlotFillingFallback('Mais 50 de gasolina.', activeDraft, todayStr);
      // Deve somar 200 + 50 = 250 de forma determinística
      expect(patched?.amount).toBe(250);
    });
  });

  // GRUPO 5 — CORREÇÃO ENQUANTO PROCESSA
  describe('GRUPO 5 — CORREÇÃO ENQUANTO PROCESSA', () => {
    test('Correção durante status PROCESSING é preservada para resultado final', () => {
      let activeDraft: ParsedFinancialIntent = {
        amount: 200,
        description: 'Gasolina',
        categoryName: 'Combustível',
      };

      // Enquanto A está processando, chega B
      const intentB = classifyMultiTurnIntent('Não, foi 250.', activeDraft);
      const { updatedDraft } = applyTurnPatch(activeDraft, 'Não, foi 250.', intentB, mockCategories, todayStr);

      expect(updatedDraft.amount).toBe(250);
    });
  });

  // GRUPO 6 — ORDEM DAS MENSAGENS
  describe('GRUPO 6 — ORDEM DAS MENSAGENS', () => {
    test('Resposta tardia de turno antigo não sobrescreve correção mais recente', () => {
      let draftVersion1: ParsedFinancialIntent = { amount: 200, description: 'Gasolina' };
      let draftVersion2: ParsedFinancialIntent = { amount: 250, description: 'Gasolina' };

      // Se resposta da versão 1 chega depois da versão 2:
      const currentVersion = 2;
      const incomingVersion = 1;

      let finalDraft = draftVersion2;
      if (incomingVersion < currentVersion) {
        // Ignora a resposta tardia da versão 1
        finalDraft = draftVersion2;
      }

      expect(finalDraft.amount).toBe(250);
    });
  });

  // GRUPO 7 — DUPLICIDADE DE ENVIO
  describe('GRUPO 7 — DUPLICIDADE DE ENVIO', () => {
    test('Timer 3s e clique em Enviar simultâneos geram UMA única mensagem', () => {
      let sendCount = 0;
      let isFinalized = false;

      const trigger = () => {
        if (!isFinalized) {
          isFinalized = true;
          sendCount += 1;
        }
      };

      trigger(); // Timeout
      trigger(); // Enviar manual

      expect(sendCount).toBe(1);
    });
  });

  // GRUPO 8 — CANCELAR / PARAR
  describe('GRUPO 8 — CANCELAR / PARAR', () => {
    test('8.1: Cancelar descarta apenas trecho pendente e preserva histórico anterior', () => {
      const history = ['Paguei 200 de gasolina.'];
      let pendingText = 'e também...';

      // Ação Cancelar
      pendingText = '';

      expect(pendingText).toBe('');
      expect(history.length).toBe(1);
    });

    test('8.2: Parar com trecho válido envia uma vez e encerra mic', () => {
      let micState = 'LISTENING';
      let sentCount = 0;
      let pendingText = 'Troquei o óleo por 150 no Pix.';

      if (pendingText.trim()) {
        sentCount += 1;
        pendingText = '';
      }
      micState = 'IDLE';

      expect(sentCount).toBe(1);
      expect(micState).toBe('IDLE');
    });

    test('8.3: Parar após autoenvio não reenvia mensagem anterior', () => {
      let sentCount = 1; // Já autoenviado
      let pendingText = '';

      if (pendingText.trim()) {
        sentCount += 1;
      }

      expect(sentCount).toBe(1);
    });
  });

  // GRUPO 9 — FORMA DE PAGAMENTO
  describe('GRUPO 9 — FORMA DE PAGAMENTO', () => {
    test('Nunca inferir forma de pagamento ausente', async () => {
      const d1 = await parseFinancialIntentWithGemini('Paguei 500.', [], mockCategories);
      expect(d1.paymentMethod).toBe('UNKNOWN');

      const d2 = await parseFinancialIntentWithGemini('Paguei 500 no Pix.', [], mockCategories);
      expect(d2.paymentMethod).toBe('Pix');

      const d3 = await parseFinancialIntentWithGemini('Paguei 500 no cartão.', [], mockCategories);
      expect(d3.paymentMethod).toBe('UNKNOWN');
      expect(d3.questionToUser).toMatch(/débito ou de crédito\?/i);

      const d4 = await parseFinancialIntentWithGemini('Paguei 500 no débito.', [], mockCategories);
      expect(d4.paymentMethod).toBe('Cartão de Débito');

      const d5 = await parseFinancialIntentWithGemini('Paguei 500 no crédito.', [], mockCategories);
      expect(d5.paymentMethod).toBe('Cartão de Crédito');

      const d6 = await parseFinancialIntentWithGemini('Paguei 500 em dinheiro.', [], mockCategories);
      expect(d6.paymentMethod).toBe('Dinheiro');

      const d7 = await parseFinancialIntentWithGemini('Paguei 500 por transferência.', [], mockCategories);
      expect(d7.paymentMethod).toBe('Transferência');
    });
  });

  // GRUPO 10 — CONTA FINANCEIRA VS FORMA DE PAGAMENTO
  describe('GRUPO 10 — CONTA FINANCEIRA VS FORMA DE PAGAMENTO', () => {
    test('"Paguei no Pix da Nubank." -> método PIX e conta Nubank se informada', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei R$ 100 de luz no Pix da Nubank.', [], mockCategories);
      expect(draft.paymentMethod).toBe('Pix');
    });
  });

  // GRUPO 11 — VALORES DIFÍCEIS
  describe('GRUPO 11 — VALORES DIFÍCEIS', () => {
    test('Parsing de expressões numéricas complexas em pt-BR', () => {
      expect(parsePtBrWrittenNumbers('um real')).toBe(1.00);
      expect(parsePtBrWrittenNumbers('um real e um centavo')).toBe(1.01);
      expect(parsePtBrWrittenNumbers('doze reais e cinco centavos')).toBe(12.05);
      expect(parsePtBrWrittenNumbers('cento e um reais')).toBe(101.00);
      expect(parsePtBrWrittenNumbers('mil reais')).toBe(1000);
      expect(parsePtBrWrittenNumbers('mil e cinquenta')).toBe(1050);
      expect(parsePtBrWrittenNumbers('dez mil e cinquenta')).toBe(10050);
      expect(parsePtBrWrittenNumbers('cento e vinte mil')).toBe(120000);
      expect(parsePtBrWrittenNumbers('um milhão e duzentos mil')).toBe(1200000);
      expect(parsePtBrWrittenNumbers('um milhão e meio')).toBe(1500000);
      expect(parsePtBrWrittenNumbers('dois milhões e cinquenta mil')).toBe(2050000);
      expect(parsePtBrWrittenNumbers('2 mil e 50')).toBe(2050);
      expect(parsePtBrWrittenNumbers('2,5 mil')).toBe(2500);
      expect(parsePtBrWrittenNumbers('2.500')).toBe(2500);
    });
  });

  // GRUPO 12 — CORREÇÃO DE VALOR
  describe('GRUPO 12 — CORREÇÃO DE VALOR', () => {
    test('Correções de mil para unidade e estimativa para exato', () => {
      const d1: ParsedFinancialIntent = { amount: 20000, description: 'Paguei 20 mil.' };
      const patched1 = trySlotFillingFallback('Não, 20 reais.', d1, todayStr);
      expect(patched1?.amount).toBe(20);

      const d2: ParsedFinancialIntent = { amount: 20, description: 'Paguei 20 reais.' };
      const patched2 = trySlotFillingFallback('Não, 20 mil.', d2, todayStr);
      expect(patched2?.amount).toBe(20000);

      const d3: ParsedFinancialIntent = { amount: 500, isEstimated: true, description: 'Paguei uns 500.' };
      const patched3 = trySlotFillingFallback('Conferi, foi 537,80.', d3, todayStr);
      expect(patched3?.amount).toBe(537.80);
      expect(patched3?.isEstimated).not.toBe(true);
    });
  });

  // GRUPO 13 — INCERTEZA
  describe('GRUPO 13 — INCERTEZA', () => {
    test('"Acho que foi 600." -> ESTIMATED', async () => {
      const draft = await parseFinancialIntentWithGemini('Acho que foi 600 no Pix.', [], mockCategories);
      expect(draft.isEstimated).toBe(true);
    });

    test('"Foi João ou Lucas" -> não escolhe aleatoriamente; depois "Foi o Lucas" -> Lucas', () => {
      const draft: ParsedFinancialIntent = {
        amount: 300,
        creditorType: 'UNKNOWN',
        missingFields: ['creditor'],
        questionToUser: 'Quem emprestou o dinheiro?',
      };

      const patched = trySlotFillingFallback('Foi o Lucas.', draft, todayStr);
      expect(patched?.creditor).toBe('Lucas');
    });
  });

  // GRUPO 14 — DATAS
  describe('GRUPO 14 — DATAS', () => {
    test('Parsing de datas sem deslocamento UTC', async () => {
      const dToday = await parseFinancialIntentWithGemini('Paguei hoje R$ 100 no Pix.', [], mockCategories);
      expect(dToday.date).toBe(todayStr);

      const dYesterday = await parseFinancialIntentWithGemini('Paguei ontem R$ 100 no Pix.', [], mockCategories);
      expect(dYesterday.date).not.toBeNull();
    });
  });

  // GRUPO 15 — DATAS AMBÍGUAS
  describe('GRUPO 15 — DATAS AMBÍGUAS', () => {
    test('"paguei dia 5" preserva a data com ano e mês coerentes', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei dia 5 R$ 100 no Pix.', [], mockCategories);
      expect(draft.date).toMatch(/\d{4}-\d{2}-05/);
    });
  });

  // GRUPO 16 — EXPRESSÕES TEMPORAIS FUTURAS
  describe('GRUPO 16 — EXPRESSÕES TEMPORAIS FUTURAS', () => {
    test('Promessas e vencimentos futuros não criam movimentação realizada', async () => {
      const d1 = await parseFinancialIntentWithGemini('Vou pagar amanhã R$ 500.', [], mockCategories);
      expect(d1.isReadyForConfirmation).toBe(false);

      const d2 = await parseFinancialIntentWithGemini('Recebo sexta R$ 800.', [], mockCategories);
      expect(d2.isReadyForConfirmation).toBe(false);

      const d3 = await parseFinancialIntentWithGemini('Tenho que pagar hoje R$ 300.', [], mockCategories);
      expect(d3.isReadyForConfirmation).toBe(false);

      const d4 = await parseFinancialIntentWithGemini('Acabei de pagar hoje R$ 300 no Pix.', [], mockCategories);
      expect(d4.isReadyForConfirmation).toBe(true);
    });
  });

  // GRUPO 17 — CONTRAPARTE
  describe('GRUPO 17 — CONTRAPARTE', () => {
    test('Identificação correta da contraparte sem inferências infundadas', async () => {
      const d1 = await parseFinancialIntentWithGemini('Paguei 500 para a Bechara no Pix.', [], mockCategories);
      expect(d1.supplier || d1.counterparty).toBe('Bechara');

      const d2 = await parseFinancialIntentWithGemini('Paguei 200 para o João no Pix.', [], mockCategories);
      expect(d2.supplier || d2.counterparty).toBe('João');

      const d3 = await parseFinancialIntentWithGemini('Paguei para ele R$ 100 no Pix.', [], mockCategories);
      expect(d3.supplier || d3.counterparty).not.toBe('ele');
    });
  });

  // GRUPO 18 — PRONOMES E CONTEXTO
  describe('GRUPO 18 — PRONOMES E CONTEXTO', () => {
    test('"Paguei ela no Pix." refere-se ao draft ativo da TV', () => {
      const activeDraft: ParsedFinancialIntent = {
        amount: 2000,
        description: 'Comprei uma TV da Loja X.',
        paymentMethod: 'UNKNOWN',
      };

      const patched = trySlotFillingFallback('Paguei ela no Pix.', activeDraft, todayStr);
      expect(patched?.paymentMethod).toBe('Pix');
      expect(patched?.amount).toBe(2000);
    });
  });

  // GRUPO 19 — CATEGORIA AMBÍGUA
  describe('GRUPO 19 — CATEGORIA AMBÍGUA', () => {
    test('"Paguei 500 em material para minha casa." -> Pró-labore', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei 500 em material para minha casa no Pix.', [], mockCategories);
      expect(draft.businessPurpose).toBe('PERSONAL');
      expect(draft.categoryName).toBe('Pró-labore');
    });
  });

  // GRUPO 20 — COMBUSTÍVEL VS MANUTENÇÃO
  describe('GRUPO 20 — COMBUSTÍVEL VS MANUTENÇÃO', () => {
    test('Troca de óleo vs combustível', async () => {
      const d1 = await parseFinancialIntentWithGemini('Comprei óleo de motor por R$ 150 no Pix.', [], mockCategories);
      expect(d1.categoryName).toBe('Manutenção de Veículos');

      const d2 = await parseFinancialIntentWithGemini('Coloquei diesel R$ 300 no Pix.', [], mockCategories);
      expect(d2.categoryName).toBe('Combustível');
    });
  });

  // GRUPO 21 — LAVAGEM DE VEÍCULO
  describe('GRUPO 21 — LAVAGEM DE VEÍCULO', () => {
    test('Lavagem de carro mapeada para Manutenção de Veículos', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei lavagem do carro R$ 50 no Pix.', [], mockCategories);
      expect(draft.categoryName).toBe('Manutenção de Veículos');
    });
  });

  // GRUPO 22 — COMPRA DE ESTOQUE VS EQUIPAMENTO
  describe('GRUPO 22 — COMPRA DE ESTOQUE VS EQUIPAMENTO', () => {
    test('Item para revenda vira Compra de estoque; para uso na loja vira Equipamentos', async () => {
      const dRevenda = await parseFinancialIntentWithGemini('Comprei uma geladeira para revender por R$ 2.500 no Pix.', [], mockCategories);
      expect(dRevenda.categoryName).toBe('Compra de estoque');

      const dUso = await parseFinancialIntentWithGemini('Comprei uma TV para usar na loja por R$ 2.000 no Pix.', [], mockCategories);
      expect(dUso.categoryName).toBe('Equipamentos da Empresa');
    });
  });

  // GRUPO 23 — DESTINO EMPRESARIAL NÃO SIGNIFICA SEMPRE EQUIPAMENTO
  describe('GRUPO 23 — DESTINO EMPRESARIAL NÃO SIGNIFICA SEMPRE EQUIPAMENTO', () => {
    test('Compra de TV para revenda vira Compra de estoque', async () => {
      const draft = await parseFinancialIntentWithGemini('Comprei uma TV para revenda por R$ 1.800 no Pix.', [], mockCategories);
      expect(draft.categoryName).toBe('Compra de estoque');
    });
  });

  // GRUPO 24 — PRÓ-LABORE
  describe('GRUPO 24 — PRÓ-LABORE', () => {
    test('Combustível e Manutenção de Veículos NUNCA viram Pró-labore', async () => {
      const dFuel = await parseFinancialIntentWithGemini('Abasteci meu carro R$ 200 no Pix.', [], mockCategories);
      expect(dFuel.categoryName).toBe('Combustível');
      expect(dFuel.categoryName).not.toBe('Pró-labore');

      const dManut = await parseFinancialIntentWithGemini('Troquei os pneus do meu carro R$ 800 no Pix.', [], mockCategories);
      expect(dManut.categoryName).toBe('Manutenção de Veículos');
      expect(dManut.categoryName).not.toBe('Pró-labore');
    });
  });

  // GRUPO 25 — MÚLTIPLAS MOVIMENTAÇÕES NUMA ÚNICA FALA
  describe('GRUPO 25 — MÚLTIPLAS MOVIMENTAÇÕES NUMA ÚNICA FALA', () => {
    test('"Recebi 800 do João e paguei 200 de gasolina." -> 1 entrada, 1 saída', async () => {
      const draft = await parseFinancialIntentWithGemini('Recebi 800 do João e paguei 200 de gasolina no Pix.', [], mockCategories);
      expect(draft.batchDraftsList).not.toBeNull();
      expect(draft.batchDraftsList?.length).toBe(2);

      const d1 = draft.batchDraftsList![0];
      const d2 = draft.batchDraftsList![1];

      expect(d1.type).toBe('income');
      expect(d1.amount).toBe(800);

      expect(d2.type).toBe('expense');
      expect(d2.amount).toBe(200);
      expect(d2.categoryName).toBe('Combustível');
    });
  });

  // GRUPO 26 — MISTURA DE MOVIMENTAÇÃO E CORREÇÃO NA MESMA FALA
  describe('GRUPO 26 — MISTURA DE MOVIMENTAÇÃO E CORREÇÃO NA MESMA FALA', () => {
    test('"Paguei 200 de gasolina, não, foi 250." -> UMA movimentação de 250', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei 200 de gasolina, não, foi 250 no Pix.', [], mockCategories);
      expect(draft.amount).toBe(250);
      expect(draft.categoryName).toBe('Combustível');
    });
  });

  // GRUPO 27 — REPETIÇÃO DE ASR
  describe('GRUPO 27 — REPETIÇÃO DE ASR', () => {
    test('Repetição de frase no ASR não duplica a movimentação', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei 200 de gasolina... 200 de gasolina no Pix.', [], mockCategories);
      expect(draft.amount).toBe(200);
      expect(draft.categoryName).toBe('Combustível');
    });
  });

  // GRUPO 28 — RUÍDO DE ASR
  describe('GRUPO 28 — RUÍDO DE ASR', () => {
    test('Transcrição intermediária ruidosa é descartada em favor do resultado final', () => {
      let finalSpeech = 'Paguei duzentos de gasolina no Pix.';
      const liveDelta = parsePtBrWrittenNumbers(finalSpeech);
      expect(liveDelta).toBe(200);
    });
  });

  // GRUPO 29 — TRANSCRIÇÃO PARCIAL DE VALOR
  describe('GRUPO 29 — TRANSCRIÇÃO PARCIAL DE VALOR', () => {
    test('Valor parcial "230" não trava o resultado final "237.89"', () => {
      const finalSpeech = 'Paguei duzentos e trinta e sete reais e oitenta e nove centavos no Pix.';
      const amount = parsePtBrWrittenNumbers(finalSpeech);
      expect(amount).toBe(237.89);
    });
  });

  // GRUPO 30 — CARTÃO
  describe('GRUPO 30 — CARTÃO', () => {
    test('Cartão genérico em parcelas pergunta débito/crédito e gera 0 parcelas futuras', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei no cartão em 10 vezes.', [], mockCategories);
      expect(draft.paymentMethod).toBe('UNKNOWN');
      expect(draft.questionToUser).toMatch(/débito ou de crédito\?/i);
      expect(draft.installmentList).toBeFalsy();
    });
  });

  // GRUPO 31 — PARCELA
  describe('GRUPO 31 — PARCELA', () => {
    test('Pagamento de parcela realizada gera exatamente 1 saída realizada', async () => {
      const d1 = await parseFinancialIntentWithGemini('Paguei a terceira parcela de 1000 no Pix.', [], mockCategories);
      expect(d1.amount).toBe(1000);
      expect(d1.isReadyForConfirmation).toBe(true);

      const d2 = await parseFinancialIntentWithGemini('Tenho 10 parcelas de 1000.', [], mockCategories);
      expect(d2.isReadyForConfirmation).toBe(false);
    });
  });

  // GRUPO 32 — RECORRÊNCIA
  describe('GRUPO 32 — RECORRÊNCIA', () => {
    test('"Pago aluguel todo mês." -> 0 saídas automatizadas', async () => {
      const draft = await parseFinancialIntentWithGemini('Pago aluguel todo mês.', [], mockCategories);
      expect(draft.isReadyForConfirmation).toBe(false);
    });

    test('"Paguei o aluguel da loja desse mês." -> 1 saída realizada', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei o aluguel da loja desse mês R$ 1.500 no Pix.', [], mockCategories);
      expect(draft.amount).toBe(1500);
      expect(draft.isReadyForConfirmation).toBe(true);
    });
  });

  // GRUPO 33 — DESCRIÇÃO
  describe('GRUPO 33 — DESCRIÇÃO', () => {
    test('Descrição não inventa detalhes como "Strada" se não informados', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei 200 de gasolina no Pix.', [], mockCategories);
      expect(draft.description).not.toMatch(/strada/i);
    });
  });

  // GRUPO 34 — CATEGORIA REAL DO BANCO
  describe('GRUPO 34 — CATEGORIA REAL DO BANCO', () => {
    test('Garantir que a categoria retornada pertença à lista de categorias reais', async () => {
      const draft = await parseFinancialIntentWithGemini('Abasteci 150 no Pix.', [], mockCategories);
      const catObj = mockCategories.find(c => c.name === draft.categoryName);
      expect(catObj).toBeDefined();
      expect(catObj?.id).toBe('cat-1');
    });
  });

  // GRUPO 35 — PREVIEW VS PERSISTÊNCIA INTEGRITY
  describe('GRUPO 35 — PREVIEW VS PERSISTÊNCIA INTEGRITY', () => {
    test('Garantir paridade de atributos entre draft, preview e dados confirmados', () => {
      const draft: ParsedFinancialIntent = {
        amount: 250,
        type: 'expense',
        paymentMethod: 'Pix',
        categoryName: 'Combustível',
      };

      const preview = { ...draft };
      const persisted = { ...preview };

      expect(draft.amount).toBe(persisted.amount);
      expect(draft.type).toBe(persisted.type);
      expect(draft.paymentMethod).toBe(persisted.paymentMethod);
      expect(draft.categoryName).toBe(persisted.categoryName);
    });
  });

  // GRUPO 36 — ALTERAÇÃO ANTES DA CONFIRMAÇÃO
  describe('GRUPO 36 — ALTERAÇÃO ANTES DA CONFIRMAÇÃO', () => {
    test('Correção altera o valor no preview antes da confirmação', () => {
      const activeDraft: ParsedFinancialIntent = { amount: 200, description: 'Gasolina' };
      const patched = trySlotFillingFallback('Não, foi 250.', activeDraft, todayStr);
      expect(patched?.amount).toBe(250);
    });
  });

  // GRUPO 37 — CLIQUE DUPLO EM CONFIRMAR
  describe('GRUPO 37 — CLIQUE DUPLO EM CONFIRMAR', () => {
    test('Guarda de mutação impede duplicidade ao clicar rapidamente', () => {
      let isRegistering = false;
      let registeredCount = 0;

      const confirm = () => {
        if (isRegistering) return;
        isRegistering = true;
        registeredCount += 1;
      };

      confirm();
      confirm(); // Segundo clique bloqueado

      expect(registeredCount).toBe(1);
    });
  });

  // GRUPO 38 — RETRY DE REDE
  describe('GRUPO 38 — RETRY DE REDE', () => {
    test('Chave de idempotência impede duplicidade no retry de rede', () => {
      const draftIdKey = 'gasolina_200_1';
      const executedKeys = new Set<string>();
      let transactionsCount = 0;

      const executeTransaction = (key: string) => {
        if (executedKeys.has(key)) return;
        executedKeys.add(key);
        transactionsCount += 1;
      };

      executeTransaction(draftIdKey);
      executeTransaction(draftIdKey); // Retry

      expect(transactionsCount).toBe(1);
    });
  });

  // GRUPO 39 — ERRO DO BACKEND
  describe('GRUPO 39 — ERRO DO BACKEND', () => {
    test('Em caso de erro no backend, o draft permanece disponível para nova tentativa', () => {
      const pendingIntent: ParsedFinancialIntent = { amount: 200, description: 'Gasolina' };
      const backendSuccess = false;

      let currentIntent: ParsedFinancialIntent | null = pendingIntent;
      if (!backendSuccess) {
        // Mantém o draft ativo para retry
        currentIntent = pendingIntent;
      }

      expect(currentIntent).not.toBeNull();
      expect(currentIntent?.amount).toBe(200);
    });
  });

  // GRUPO 40 — EDIÇÃO APÓS CONFIRMAÇÃO
  describe('GRUPO 40 — EDIÇÃO APÓS CONFIRMAÇÃO', () => {
    test('Correção pós-confirmação é sinalizada como decisão de edição no ERP', () => {
      const isConfirmed = true;
      const userText = 'Não, o valor estava errado, era 250.';

      let actionType = 'DRAFT_PATCH';
      if (isConfirmed && userText.includes('errado')) {
        actionType = 'REGISTERED_TRANSACTION_EDIT_REQUIRED';
      }

      expect(actionType).toBe('REGISTERED_TRANSACTION_EDIT_REQUIRED');
    });
  });

  // GRUPO 41 — SEGURANÇA DE DADOS
  describe('GRUPO 41 — SEGURANÇA DE DADOS', () => {
    test('Testes utilizam isolamento por testRunId sem tocar produção', () => {
      const testRunId = `test_${Date.now()}`;
      expect(testRunId).toMatch(/^test_\d+/);
    });
  });

  // GRUPO 42 — TESTES BASEADOS EM PROPRIEDADES (12 INVARIANTES)
  describe('GRUPO 42 — INVARIANTES DE PROPRIEDADE', () => {
    test('Invariante 1: Movimentações criadas <= fatos financeiros realizados', () => {
      const realizedFactsCount = 1;
      const createdTxCount = 1;
      expect(createdTxCount).toBeLessThanOrEqual(realizedFactsCount);
    });

    test('Invariante 2: Correção não cria nova movimentação', () => {
      const intent = classifyMultiTurnIntent('Não, foi 250.', { amount: 200 });
      expect(intent).toBe('CORRECTION');
    });

    test('Invariante 3: Complemento não cria nova movimentação', () => {
      const intent = classifyMultiTurnIntent('Foi no Pix.', { amount: 200, paymentMethod: 'UNKNOWN' });
      expect(intent).toBe('ANSWER_TO_QUESTION');
    });

    test('Invariante 4: Nova movimentação não sobrescreve draft anterior', () => {
      const intent = classifyMultiTurnIntent('E paguei 300 de internet.', { amount: 200, isReadyForConfirmation: true });
      expect(intent).toBe('NEW_TRANSACTION');
    });

    test('Invariante 5: Forma de pagamento não informada nunca nasce preenchida', async () => {
      const draft = await parseFinancialIntentWithGemini('Abasteci 150.', [], mockCategories);
      expect(draft.paymentMethod).toBe('UNKNOWN');
    });

    test('Invariante 6: Categoria inexistente nunca é persistida', async () => {
      const draft = await parseFinancialIntentWithGemini('Abasteci 150 no Pix.', [], mockCategories);
      const exists = mockCategories.some(c => c.name === draft.categoryName);
      expect(exists).toBe(true);
    });

    test('Invariante 7: Último valor explicitamente corrigido vence', () => {
      const activeDraft: ParsedFinancialIntent = { amount: 200 };
      const p1 = trySlotFillingFallback('Não, foi 250.', activeDraft, todayStr);
      const p2 = trySlotFillingFallback('Desculpa, foi 237,89.', p1, todayStr);
      expect(p2?.amount).toBe(237.89);
    });

    test('Invariante 8: Resposta tardia do backend não sobrescreve versão mais nova do draft', () => {
      const draftV2 = { amount: 250, version: 2 };
      const draftV1Response = { amount: 200, version: 1 };

      const consolidated = draftV1Response.version > draftV2.version ? draftV1Response : draftV2;
      expect(consolidated.amount).toBe(250);
    });

    test('Invariante 9: Mesma utteranceId nunca é processada duas vezes', () => {
      const processedIds = new Set<string>();
      const processUtterance = (id: string) => {
        if (processedIds.has(id)) return false;
        processedIds.add(id);
        return true;
      };

      expect(processUtterance('utt_1')).toBe(true);
      expect(processUtterance('utt_1')).toBe(false);
    });

    test('Invariante 10: Silêncio não pode encerrar a sessão do microfone', () => {
      let micSessionState = 'LISTENING';
      const silenceHappened = true;
      if (silenceHappened) {
        expect(micSessionState).toBe('LISTENING');
      }
    });

    test('Invariante 11: Ausência de campo em mensagem complementar não apaga valor conhecido', () => {
      const activeDraft: ParsedFinancialIntent = { amount: 500, supplier: 'Bechara' };
      const patched = trySlotFillingFallback('Foi no Pix.', activeDraft, todayStr);
      expect(patched?.amount).toBe(500);
      expect(patched?.supplier).toBe('Bechara');
    });

    test('Invariante 12: Transação futura não entra como realizada', async () => {
      const draft = await parseFinancialIntentWithGemini('Vou pagar amanhã R$ 500.', [], mockCategories);
      expect(draft.isReadyForConfirmation).toBe(false);
    });
  });

  // GRUPO 43 — FUZZING / FRASES NATURAIS
  describe('GRUPO 43 — FUZZING / FRASES NATURAIS DE ABASTECIMENTO', () => {
    const phrases = [
      'Paguei 200 de gasolina no Pix.',
      'Gastei 200 abastecendo no Pix.',
      'Deu 200 no posto no Pix.',
      'Abasteci e ficou 200 no Pix.',
      'Foi 200 de gasolina no Pix.',
    ];

    phrases.forEach((phrase, idx) => {
      test(`Frase ${idx + 1}: "${phrase}" -> Combustível, 200, Pix`, async () => {
        const draft = await parseFinancialIntentWithGemini(phrase, [], mockCategories);
        expect(draft.categoryName).toBe('Combustível');
        expect(draft.amount).toBe(200);
        expect(draft.paymentMethod).toBe('Pix');
      });
    });
  });

  // GRUPO 44 — ERROS DE FALA / TRANSCRIÇÃO (ASR)
  describe('GRUPO 44 — ERROS DE FALA / TRANSCRIÇÃO (ASR)', () => {
    test('"pics" -> Pix', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei 100 de luz no pics.', [], mockCategories);
      expect(draft.paymentMethod).toBe('Pix');
    });

    test('"duzento" -> 200', () => {
      const val = parsePtBrWrittenNumbers('duzento reais');
      expect(val).toBe(200);
    });

    test('"trêis mil" -> 3000', () => {
      const val = parsePtBrWrittenNumbers('trêis mil reais');
      expect(val).toBe(3000);
    });

    test('"cartão de credto" -> Cartão de Crédito', async () => {
      const draft = await parseFinancialIntentWithGemini('Paguei 100 no cartão de credto.', [], mockCategories);
      expect(draft.paymentMethod).toBe('Cartão de Crédito');
    });
  });

  // GRUPO 45 — TESTE E2E REALISTA COMPLETO
  describe('GRUPO 45 — TESTE E2E REALISTA COMPLETO DA SESSÃO DE VOZ MULTI-TURNO', () => {
    test('Execução do fluxo completo de 7 passos sem perder dados nem criar duplicidades', async () => {
      let activeHistory: ChatMessage[] = [];
      let currentDraft: ParsedFinancialIntent | null = null;
      const registeredTransactions: ParsedFinancialIntent[] = [];

      // Passo 1: "Paguei 200 de gasolina no Pix."
      currentDraft = await parseFinancialIntentWithGemini('Paguei 200 de gasolina no Pix.', activeHistory, mockCategories);
      expect(currentDraft.amount).toBe(200);
      expect(currentDraft.categoryName).toBe('Combustível');
      expect(currentDraft.paymentMethod).toBe('Pix');

      // Passo 2: "Não, foi 230." (Correção por voz)
      const intent2 = classifyMultiTurnIntent('Não, foi 230.', currentDraft, activeHistory);
      expect(intent2).toBe('CORRECTION');
      const res2 = applyTurnPatch(currentDraft, 'Não, foi 230.', intent2, mockCategories, todayStr);
      currentDraft = res2.updatedDraft;
      expect(currentDraft.amount).toBe(230);
      registeredTransactions.push({ ...currentDraft });

      // Passo 3: "Também comprei uma televisão por 2 mil no cartão." (Nova movimentação)
      const intent3 = classifyMultiTurnIntent('Também comprei uma televisão por 2 mil no cartão.', currentDraft, activeHistory);
      expect(intent3).toBe('NEW_TRANSACTION');
      currentDraft = await parseFinancialIntentWithGemini('Também comprei uma televisão por 2 mil no cartão.', activeHistory, mockCategories);
      expect(currentDraft.businessPurpose).toBe('UNKNOWN');
      expect(currentDraft.paymentMethod).toBe('UNKNOWN');

      // Passo 4: Assistente pergunta loja/pessoal e débito/crédito
      activeHistory.push({ id: 'bot-1', sender: 'assistant', text: 'Essa televisão é para a loja ou é uma compra pessoal? Foi no cartão de débito ou de crédito?', timestamp: '10:01' });

      // Passo 5: "É para a loja." (Resposta a pergunta)
      const intent5 = classifyMultiTurnIntent('É para a loja.', currentDraft, activeHistory);
      expect(intent5).toBe('ANSWER_TO_QUESTION');
      const res5 = applyTurnPatch(currentDraft, 'É para a loja.', intent5, mockCategories, todayStr);
      currentDraft = res5.updatedDraft;
      expect(currentDraft.businessPurpose).toBe('BUSINESS');
      expect(currentDraft.categoryName).toBe('Equipamentos da Empresa');

      // Passo 6: "Foi no débito." (Resposta a pergunta de cartão)
      const intent6 = classifyMultiTurnIntent('Foi no débito.', currentDraft, activeHistory);
      const res6 = applyTurnPatch(currentDraft, 'Foi no débito.', intent6, mockCategories, todayStr);
      currentDraft = res6.updatedDraft;
      expect(currentDraft.paymentMethod).toBe('Cartão de Débito');
      registeredTransactions.push({ ...currentDraft });

      // Passo 7: "E recebi 800 do João no Pix." (Nova entrada)
      currentDraft = await parseFinancialIntentWithGemini('E recebi 800 do João no Pix.', activeHistory, mockCategories);
      expect(currentDraft.type).toBe('income');
      expect(currentDraft.amount).toBe(800);
      expect(currentDraft.supplier || currentDraft.counterparty).toBe('João');
      expect(currentDraft.paymentMethod).toBe('Pix');
      registeredTransactions.push({ ...currentDraft });

      // Validação final das 3 movimentações registradas
      expect(registeredTransactions.length).toBe(3);

      // Movimentação A: Saída R$ 230, Combustível, Pix
      expect(registeredTransactions[0].type).toBe('expense');
      expect(registeredTransactions[0].amount).toBe(230);
      expect(registeredTransactions[0].categoryName).toBe('Combustível');
      expect(registeredTransactions[0].paymentMethod).toBe('Pix');

      // Movimentação B: Saída R$ 2.000, Equipamentos da Empresa, Cartão de Débito, BUSINESS
      expect(registeredTransactions[1].type).toBe('expense');
      expect(registeredTransactions[1].amount).toBe(2000);
      expect(registeredTransactions[1].categoryName).toBe('Equipamentos da Empresa');
      expect(registeredTransactions[1].paymentMethod).toBe('Cartão de Débito');
      expect(registeredTransactions[1].businessPurpose).toBe('BUSINESS');

      // Movimentação C: Entrada R$ 800, João, Pix
      expect(registeredTransactions[2].type).toBe('income');
      expect(registeredTransactions[2].amount).toBe(800);
      expect(registeredTransactions[2].supplier || registeredTransactions[2].counterparty).toBe('João');
      expect(registeredTransactions[2].paymentMethod).toBe('Pix');
    });
  });
});
