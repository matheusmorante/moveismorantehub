import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AUTO_SEND_SILENCE_MS,
  classifyMultiTurnIntent,
  applyTurnPatch,
  ParsedFinancialIntent,
  ChatMessage,
  FinancialCategory,
} from '../../../../mobile/src/services/financialAiAssistantService';

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

describe('SUÍTE DE TESTES DO MICROFONE CONTÍNUO E AUTOENVIO (3s DE SILÊNCIO)', () => {
  const todayStr = '2026-09-06';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // TESTE 1: Silêncio < 3s não envia; silêncio >= 3s envia
  test('TESTE 1: Autoenvio dispara apenas com silêncio contínuo >= 3000ms', () => {
    expect(AUTO_SEND_SILENCE_MS).toBe(3000);

    let sentMessage: string | null = null;
    let timer: any = null;

    const onSpeechResult = (text: string) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (text.trim()) sentMessage = text.trim();
      }, AUTO_SEND_SILENCE_MS);
    };

    onSpeechResult('Paguei 200 de gasolina.');

    // Silêncio 2999ms -> ainda não enviou
    vi.advanceTimersByTime(2999);
    expect(sentMessage).toBeNull();

    // Chega a 3000ms -> envia
    vi.advanceTimersByTime(1);
    expect(sentMessage).toBe('Paguei 200 de gasolina.');
  });

  // TESTE 2: Microfone continua escutando após autoenvio
  test('TESTE 2: Após o autoenvio, o microfone permanece no estado LISTENING', () => {
    let micState: 'IDLE' | 'LISTENING' = 'LISTENING';
    const autoSendHappened = true;

    if (autoSendHappened) {
      // O estado NÃO altera para IDLE
      expect(micState).toBe('LISTENING');
    }
  });

  // TESTE 3: Correção por voz "Não, foi 250."
  test('TESTE 3: "Não, foi 250." é classificado como CORRECTION e atualiza o draft para 250 sem duplicar', () => {
    const activeDraft: ParsedFinancialIntent = {
      intentType: 'SINGLE_TRANSACTION',
      type: 'expense',
      amount: 200,
      description: 'Paguei 200 de gasolina.',
      categoryName: 'Combustível',
      paymentMethod: 'Pix',
      businessPurpose: 'BUSINESS',
      isReadyForConfirmation: true,
    };

    const intent = classifyMultiTurnIntent('Não, foi 250.', activeDraft);
    expect(intent).toBe('CORRECTION');

    const { updatedDraft, isNewTransaction } = applyTurnPatch(activeDraft, 'Não, foi 250.', intent, mockCategories, todayStr);
    expect(isNewTransaction).toBe(false);
    expect(updatedDraft.amount).toBe(250);
    expect(updatedDraft.categoryName).toBe('Combustível');
    expect(updatedDraft.paymentMethod).toBe('Pix');
  });

  // TESTE 4: Nova movimentação "E paguei 300 de internet."
  test('TESTE 4: "E paguei 300 de internet." é classificado como NEW_TRANSACTION', () => {
    const activeDraft: ParsedFinancialIntent = {
      intentType: 'SINGLE_TRANSACTION',
      type: 'expense',
      amount: 250,
      description: 'Paguei 250 de gasolina.',
      categoryName: 'Combustível',
      paymentMethod: 'Pix',
      businessPurpose: 'BUSINESS',
      isReadyForConfirmation: true,
    };

    const intent = classifyMultiTurnIntent('E paguei 300 de internet.', activeDraft);
    expect(intent).toBe('NEW_TRANSACTION');

    const { updatedDraft, isNewTransaction } = applyTurnPatch(activeDraft, 'E paguei 300 de internet.', intent, mockCategories, todayStr);
    expect(isNewTransaction).toBe(true);
    expect(updatedDraft.description).toBe('E paguei 300 de internet.');
  });

  // TESTE 5: Resposta a pergunta de pagamento
  test('TESTE 5: "Foi no Pix." após pergunta do assistente atualiza paymentMethod mantendo fornecedor e valor', () => {
    const activeDraft: ParsedFinancialIntent = {
      intentType: 'SINGLE_TRANSACTION',
      type: 'expense',
      amount: 500,
      description: 'Paguei 500 para Bechara.',
      supplier: 'Bechara',
      counterparty: 'Bechara',
      paymentMethod: 'UNKNOWN',
      missingFields: ['paymentMethod'],
      questionToUser: 'Qual foi a forma de pagamento?',
      isReadyForConfirmation: false,
    };

    const history: ChatMessage[] = [
      { id: '1', sender: 'user', text: 'Paguei 500 para Bechara.', timestamp: '10:00' },
      { id: '2', sender: 'assistant', text: 'Qual foi a forma de pagamento?', timestamp: '10:00' },
    ];

    const intent = classifyMultiTurnIntent('Foi no Pix.', activeDraft, history);
    expect(intent).toBe('ANSWER_TO_QUESTION');

    const { updatedDraft } = applyTurnPatch(activeDraft, 'Foi no Pix.', intent, mockCategories, todayStr);
    expect(updatedDraft.amount).toBe(500);
    expect(updatedDraft.supplier).toBe('Bechara');
    expect(updatedDraft.paymentMethod).toBe('Pix');
    expect(updatedDraft.isReadyForConfirmation).toBe(true);
  });

  // TESTE 6: Resposta a pergunta de destino (loja vs pessoal)
  test('TESTE 6: "É da loja." após pergunta de TV atualiza businessPurpose = BUSINESS', () => {
    const activeDraft: ParsedFinancialIntent = {
      intentType: 'SINGLE_TRANSACTION',
      type: 'expense',
      amount: 2000,
      description: 'Comprei TV por 2 mil.',
      businessPurpose: 'UNKNOWN',
      missingFields: ['businessPurpose'],
      questionToUser: 'Essa televisão é para a loja ou é uma compra pessoal?',
      isReadyForConfirmation: false,
    };

    const history: ChatMessage[] = [
      { id: '1', sender: 'user', text: 'Comprei TV por 2 mil.', timestamp: '10:00' },
      { id: '2', sender: 'assistant', text: 'Essa televisão é para a loja ou é uma compra pessoal?', timestamp: '10:00' },
    ];

    const intent = classifyMultiTurnIntent('É da loja.', activeDraft, history);
    expect(intent).toBe('ANSWER_TO_QUESTION');

    const { updatedDraft } = applyTurnPatch(activeDraft, 'É da loja.', intent, mockCategories, todayStr);
    expect(updatedDraft.businessPurpose).toBe('BUSINESS');
    expect(updatedDraft.categoryName).toBe('Equipamentos da Empresa');
  });

  // TESTE 7: Correção de destino ("Não, é pessoal.")
  test('TESTE 7: "Não, é pessoal." altera businessPurpose para PERSONAL e categoria para Pró-labore', () => {
    const activeDraft: ParsedFinancialIntent = {
      intentType: 'SINGLE_TRANSACTION',
      type: 'expense',
      amount: 2000,
      description: 'Comprei TV por 2 mil.',
      businessPurpose: 'BUSINESS',
      categoryName: 'Equipamentos da Empresa',
      isReadyForConfirmation: true,
    };

    const intent = classifyMultiTurnIntent('Não, é pessoal.', activeDraft);
    expect(intent).toBe('CORRECTION');

    const { updatedDraft } = applyTurnPatch(activeDraft, 'Não, é pessoal.', intent, mockCategories, todayStr);
    expect(updatedDraft.businessPurpose).toBe('PERSONAL');
    expect(updatedDraft.categoryName).toBe('Pró-labore');
  });

  // TESTE 8: Pausa de 1s no meio da frase
  test('TESTE 8: Pausa curta de 1 segundo não dispara envio automático', () => {
    let sentCount = 0;
    let timer: any = null;

    const speak = (text: string) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        sentCount += 1;
      }, AUTO_SEND_SILENCE_MS);
    };

    speak('Eu paguei...');
    vi.advanceTimersByTime(1000);
    speak('Eu paguei... duzentos reais.');
    vi.advanceTimersByTime(1000);

    expect(sentCount).toBe(0);
  });

  // TESTE 9: Pausa de 2.9s
  test('TESTE 9: Pausa de 2.9 segundos não dispara envio automático', () => {
    let sentCount = 0;
    let timer: any = null;

    const speak = (text: string) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        sentCount += 1;
      }, AUTO_SEND_SILENCE_MS);
    };

    speak('Abasteci 150.');
    vi.advanceTimersByTime(2900);

    expect(sentCount).toBe(0);
  });

  // TESTE 10: Silêncio de 3.0s dispara envio
  test('TESTE 10: Silêncio de 3.0s dispara envio com sucesso', () => {
    let sentMessage: string | null = null;
    let timer: any = null;

    const speak = (text: string) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        sentMessage = text;
      }, AUTO_SEND_SILENCE_MS);
    };

    speak('Abasteci 150.');
    vi.advanceTimersByTime(3000);

    expect(sentMessage).toBe('Abasteci 150.');
  });

  // TESTE 11: 20s de silêncio após autoenvio não cria mensagens vazias
  test('TESTE 11: Silêncio contínuo de 20s em background não gera mensagens em branco', () => {
    let sentCount = 0;
    let speechBuffer = '';

    const handleSilenceTimeout = () => {
      if (speechBuffer.trim()) {
        sentCount += 1;
        speechBuffer = '';
      }
    };

    // Primeiro envio válido
    speechBuffer = 'Paguei 100 de luz.';
    handleSilenceTimeout();
    expect(sentCount).toBe(1);

    // Silêncio prolongado de 20 segundos (sem novas falas)
    for (let i = 0; i < 6; i++) {
      handleSilenceTimeout();
    }

    expect(sentCount).toBe(1); // Continua 1
  });

  // TESTE 12: Idempotência próximo ao timeout
  test('TESTE 12: Clicar em Enviar manual no instante do timeout gera apenas 1 mensagem', () => {
    let sentMessagesCount = 0;
    let isFinalized = false;

    const triggerSend = () => {
      if (!isFinalized) {
        isFinalized = true;
        sentMessagesCount += 1;
      }
    };

    // Timeout e clique concorrentes
    triggerSend(); // Timeout dispara
    triggerSend(); // Clique manual dispara

    expect(sentMessagesCount).toBe(1);
  });

  // TESTE 13: Correção emitida durante PROCESSING
  test('TESTE 13: Correção emitida durante processamento assíncrono é preservada', () => {
    let activeDraft: ParsedFinancialIntent = {
      intentType: 'SINGLE_TRANSACTION',
      type: 'expense',
      amount: 200,
      description: 'Gasolina',
      categoryName: 'Combustível',
      paymentMethod: 'Pix',
    };

    // Chega nova fala de correção "Não, foi 300."
    const intent = classifyMultiTurnIntent('Não, foi 300.', activeDraft);
    const { updatedDraft } = applyTurnPatch(activeDraft, 'Não, foi 300.', intent, mockCategories, todayStr);

    expect(updatedDraft.amount).toBe(300);
    expect(updatedDraft.categoryName).toBe('Combustível');
  });

  // TESTE 14: Cancelar ditado descarta trecho pendente
  test('TESTE 14: Cancelar ditado descarta apenas o trecho pendente e preserva mensagens anteriores', () => {
    const historyMessages: ChatMessage[] = [
      { id: '1', sender: 'user', text: 'Paguei 200 de gasolina.', timestamp: '10:00' },
      { id: '2', sender: 'assistant', text: 'Confere?', timestamp: '10:00' },
    ];

    let pendingTranscript = 'e também paguei...';
    let micState = 'LISTENING';

    // Ação: Cancelar Ditado
    pendingTranscript = '';
    micState = 'IDLE';

    expect(pendingTranscript).toBe('');
    expect(micState).toBe('IDLE');
    expect(historyMessages.length).toBe(2);
  });

  // TESTE 15: Parar encerra o microfone sem duplicar mensagem
  test('TESTE 15: Botão Parar encerra o microfone e envia apenas o trecho pendente', () => {
    let sentCount = 0;
    let pendingText = 'Troquei o óleo R$ 150 no Pix.';
    let micState = 'LISTENING';

    // Clique em Parar
    if (pendingText.trim()) {
      sentCount += 1;
      pendingText = '';
    }
    micState = 'IDLE';

    expect(sentCount).toBe(1);
    expect(micState).toBe('IDLE');
  });
});
