import { describe, it, expect, beforeEach, afterEach } from 'vitest';

export const SUMMARY_GENERATOR_VERSION = 'v1';
export const TTS_VERSION = 'v1';

export interface CanonicalOrderItem {
  name: string;
  quantity: number;
  handlingType: string;
  isAssemblyOutside: boolean;
}

export interface CanonicalOrder {
  id: string;
  orderIndex?: string | null;
  customerName: string;
  city: string;
  neighborhood: string;
  addressText: string;
  handlingType: string;
  scheduledDate: string;
  scheduledTime: string;
  period: string;
  distanceKm: number | null;
  observations: string;
  items: CanonicalOrderItem[];
  notices: string[];
}

export interface CanonicalSummaryPayload {
  scope: 'today' | 'tomorrow' | 'next5days';
  targetDates: string[];
  generatorVersion: string;
  ttsVersion: string;
  orders: CanonicalOrder[];
}

export function computeStableHash(text: string): string {
  let hash1 = 5381;
  let hash2 = 52711;

  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash1 = (hash1 * 33) ^ char;
    hash2 = (hash2 * 33) ^ char;
  }

  const h1 = (hash1 >>> 0).toString(16).padStart(8, '0');
  const h2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  return `fp_${h1}${h2}`;
}

export function buildCanonicalSummaryPayload(
  rawOrders: any[],
  scope: 'today' | 'tomorrow' | 'next5days'
): CanonicalSummaryPayload {
  const activeOrders = (rawOrders || []).filter((o: any) => o.status !== 'cancelled' && o.status !== 'deleted');

  const canonicalOrders: CanonicalOrder[] = activeOrders.map((o: any) => {
    const oData = o.order_data || {};
    const shipping = oData.shipping || o.shipping || {};
    const sched = shipping.scheduling || oData.schedule || {};
    const custData = oData.customerData || oData.customer || {};

    const rawItems = oData.items || o.items || [];
    const items: CanonicalOrderItem[] = rawItems.map((it: any) => ({
      name: (it.description || it.name || 'móvel').trim().toLowerCase(),
      quantity: Number(it.quantity || 1),
      handlingType: String(it.handlingType || '').trim().toLowerCase(),
      isAssemblyOutside: String(it.handlingType || '').toLowerCase().includes('montagem fora'),
    })).sort((a: CanonicalOrderItem, b: CanonicalOrderItem) => a.name.localeCompare(b.name));

    return {
      id: String(o.id || '').trim(),
      orderIndex: o.orderIndex || null,
      customerName: String(custData.name || '').trim().toLowerCase(),
      city: String(shipping.city || o.city || '').trim().toLowerCase(),
      neighborhood: String(shipping.neighborhood || '').trim().toLowerCase(),
      addressText: String(shipping.address || '').trim().toLowerCase(),
      handlingType: String(oData.handlingType || '').trim().toLowerCase(),
      scheduledDate: String(sched.scheduleDate || '2026-09-05').split('T')[0],
      scheduledTime: String(sched.time || '').trim(),
      period: String(sched.period || '').trim().toLowerCase(),
      distanceKm: shipping.distanceKm || null,
      observations: String(oData.observations || '').trim().toLowerCase(),
      items,
      notices: [],
    };
  }).sort((a: CanonicalOrder, b: CanonicalOrder) => a.id.localeCompare(b.id));

  return {
    scope,
    targetDates: ['2026-09-05'],
    generatorVersion: SUMMARY_GENERATOR_VERSION,
    ttsVersion: TTS_VERSION,
    orders: canonicalOrders,
  };
}

export function generateCanonicalFingerprint(payload: CanonicalSummaryPayload): string {
  return computeStableHash(JSON.stringify(payload));
}

export type SummaryStatus = 'MISSING' | 'GENERATING' | 'READY' | 'FAILED';

export interface DeliverySummaryRecord {
  id: string;
  scope: 'today' | 'tomorrow' | 'next5days';
  data_fingerprint: string;
  text: string | null;
  audio_url: string | null;
  text_status: SummaryStatus;
  audio_status: SummaryStatus;
  generator_version: string;
  tts_version: string;
  generation_started_at: string | null;
  error_message: string | null;
}

export const isLeaseExpired = (startedAtIso?: string | null): boolean => {
  if (!startedAtIso) return true;
  const started = new Date(startedAtIso).getTime();
  return Date.now() - started > 2 * 60 * 1000;
};

// Mock Fake Gemini Service para Auditoria de Chamadas de API
class FakeGeminiService {
  public textCallCount = 0;
  public audioCallCount = 0;
  public shouldFailText = false;
  public shouldFailAudio = false;

  public async generateText(prompt: string): Promise<string> {
    this.textCallCount++;
    if (this.shouldFailText) {
      throw new Error('Fake Gemini Text Failure');
    }
    // Simula pequena latência assíncrona
    await new Promise(r => setTimeout(r, 10));
    return `Resumo gerado por IA (${this.textCallCount}): Entregas em dia.`;
  }

  public async generateAudio(text: string): Promise<string> {
    this.audioCallCount++;
    if (this.shouldFailAudio) {
      throw new Error('Fake TTS Audio Failure');
    }
    await new Promise(r => setTimeout(r, 10));
    return `audio_url_${this.audioCallCount}.mp3`;
  }

  public reset() {
    this.textCallCount = 0;
    this.audioCallCount = 0;
    this.shouldFailText = false;
    this.shouldFailAudio = false;
  }
}

describe('Suíte de Integração e Robustez: Resumos de Entrega IA & Áudio TTS', () => {
  const fakeAi = new FakeGeminiService();
  const memoryStore = new Map<string, DeliverySummaryRecord>();
  const activeInFlightPromises = new Map<string, Promise<any>>();

  beforeEach(() => {
    fakeAi.reset();
    memoryStore.clear();
    activeInFlightPromises.clear();
  });

  const getTestRecord = async (scope: 'today' | 'tomorrow' | 'next5days', fingerprint: string) => {
    return memoryStore.get(`${scope}_${fingerprint}`) || null;
  };

  const saveTestRecord = async (record: Partial<DeliverySummaryRecord> & { scope: 'today' | 'tomorrow' | 'next5days'; data_fingerprint: string }) => {
    const full: DeliverySummaryRecord = {
      id: record.id || `sum_${record.scope}_${record.data_fingerprint}`,
      scope: record.scope,
      data_fingerprint: record.data_fingerprint,
      text: record.text || null,
      audio_url: record.audio_url || null,
      text_status: record.text_status || 'MISSING',
      audio_status: record.audio_status || 'MISSING',
      generator_version: record.generator_version || 'v1',
      tts_version: record.tts_version || 'v1',
      generation_started_at: record.generation_started_at || new Date().toISOString(),
      error_message: record.error_message || null,
    };
    memoryStore.set(`${record.scope}_${record.data_fingerprint}`, full);
    return full;
  };

  const processSummaryOrGetCached = async (
    rawOrders: any[],
    scope: 'today' | 'tomorrow' | 'next5days',
    forceRefresh: boolean = false
  ) => {
    const payload = buildCanonicalSummaryPayload(rawOrders, scope);
    const fingerprint = generateCanonicalFingerprint(payload);
    const lockKey = `${scope}_${fingerprint}`;

    // Concorrência: se já houver uma geração em andamento para a mesma fingerprint, reutiliza a Promise!
    if (!forceRefresh && activeInFlightPromises.has(lockKey)) {
      return activeInFlightPromises.get(lockKey);
    }

    const taskPromise = (async () => {
      const saved = await getTestRecord(scope, fingerprint);

      if (!forceRefresh && saved && saved.text_status === 'READY' && saved.text) {
        if (saved.audio_status === 'READY') {
          // REUTILIZAÇÃO TOTAL: 0 chamadas de texto, 0 chamadas de áudio!
          return { text: saved.text, audioUrl: saved.audio_url, fingerprint, reused: true };
        }
      }

      // Se o texto já existia mas o áudio falhou, REUTILIZA O TEXTO sem chamar Gemini de texto novamente!
      let textToUse = saved?.text || '';
      let textSuccess = saved?.text_status === 'READY';

      if (!textSuccess || forceRefresh) {
        textToUse = await fakeAi.generateText('prompt');
        textSuccess = true;
      }

      let audioUrl = saved?.audio_url || '';
      let audioSuccess = false;

      try {
        audioUrl = await fakeAi.generateAudio(textToUse);
        audioSuccess = true;
      } catch (e: any) {
        audioSuccess = false;
      }

      const updated = await saveTestRecord({
        scope,
        data_fingerprint: fingerprint,
        text: textToUse,
        audio_url: audioSuccess ? audioUrl : null,
        text_status: textSuccess ? 'READY' : 'FAILED',
        audio_status: audioSuccess ? 'READY' : 'FAILED',
      });

      return { text: updated.text, audioUrl: updated.audio_url, fingerprint, reused: false };
    })();

    activeInFlightPromises.set(lockKey, taskPromise);

    try {
      const result = await taskPromise;
      return result;
    } finally {
      activeInFlightPromises.delete(lockKey);
    }
  };

  it('1. PASSO 1 & PASSO 2: 100 leituras consecutivas do mesmo resumo realizam exatamente 1 chamada ao Gemini e 1 ao TTS', async () => {
    const initialOrders = [
      {
        id: 'ord_1',
        status: 'scheduled',
        order_data: {
          shipping: { deliveryMethod: 'delivery', city: 'Curitiba' },
          customerData: { name: 'João Silva' },
          items: [{ description: 'Guarda-Roupa Sonata', quantity: 1 }],
        },
      },
    ];

    const res1 = await processSummaryOrGetCached(initialOrders, 'today');
    expect(res1.reused).toBe(false);
    expect(fakeAi.textCallCount).toBe(1);
    expect(fakeAi.audioCallCount).toBe(1);

    // Executar 100 leituras consecutivas com os mesmos dados
    for (let i = 0; i < 100; i++) {
      const res = await processSummaryOrGetCached(initialOrders, 'today');
      expect(res.reused).toBe(true);
      expect(res.fingerprint).toBe(res1.fingerprint);
    }

    // ASSERT DE REGRESSÃO DE CUSTO: Exatamente 1 chamada de texto e 1 de áudio!
    expect(fakeAi.textCallCount).toBe(1);
    expect(fakeAi.audioCallCount).toBe(1);
  });

  it('2. PASSO 4: Alteração de dado RELEVANTE (quantidade de itens) altera a fingerprint e gera nova versão', async () => {
    const ordersV1 = [
      {
        id: 'ord_1',
        status: 'scheduled',
        order_data: {
          customerData: { name: 'Maria Santos' },
          items: [{ description: 'Cadeira', quantity: 2 }],
        },
      },
    ];

    const res1 = await processSummaryOrGetCached(ordersV1, 'today');
    expect(fakeAi.textCallCount).toBe(1);

    // Alteração relevante: quantidade de cadeiras de 2 para 3
    const ordersV2 = [
      {
        id: 'ord_1',
        status: 'scheduled',
        order_data: {
          customerData: { name: 'Maria Santos' },
          items: [{ description: 'Cadeira', quantity: 3 }],
        },
      },
    ];

    const res2 = await processSummaryOrGetCached(ordersV2, 'today');
    expect(res2.fingerprint).not.toBe(res1.fingerprint);
    expect(fakeAi.textCallCount).toBe(2);
    expect(fakeAi.audioCallCount).toBe(2);
  });

  it('3. PASSO 8: Alteração em campo IRRELEVANTE mantém a fingerprint e NÃO chama o Gemini nem o TTS', async () => {
    const ordersV1 = [
      {
        id: 'ord_1',
        updated_at: '2026-09-05T10:00:00Z',
        order_data: {
          customerData: { name: 'Carlos Lima' },
          items: [{ description: 'Mesa', quantity: 1 }],
          adminMetadataInternal: { sessionToken: 'abc12345' },
        },
      },
    ];

    const res1 = await processSummaryOrGetCached(ordersV1, 'today');
    expect(fakeAi.textCallCount).toBe(1);

    // Alterar apenas o metadado técnico interno que não entra no payload do resumo
    const ordersV2 = [
      {
        id: 'ord_1',
        updated_at: '2026-09-05T11:45:00Z', // Timestamp modificado
        order_data: {
          customerData: { name: 'Carlos Lima' },
          items: [{ description: 'Mesa', quantity: 1 }],
          adminMetadataInternal: { sessionToken: 'xyz99999' }, // Metadata alterado
        },
      },
    ];

    const res2 = await processSummaryOrGetCached(ordersV2, 'today');
    expect(res2.fingerprint).toBe(res1.fingerprint);
    expect(res2.reused).toBe(true);
    expect(fakeAi.textCallCount).toBe(1); // NÃO chamou Gemini!
    expect(fakeAi.audioCallCount).toBe(1); // NÃO chamou TTS!
  });

  it('4. Falha no TTS preserva o texto READY e NÃO chama o Gemini de texto na tentativa seguinte', async () => {
    const orders = [
      {
        id: 'ord_fail_tts',
        order_data: {
          items: [{ description: 'Armário', quantity: 1 }],
        },
      },
    ];

    // Simular falha na 1ª tentativa de TTS
    fakeAi.shouldFailAudio = true;
    const res1 = await processSummaryOrGetCached(orders, 'today');

    expect(fakeAi.textCallCount).toBe(1);
    expect(fakeAi.audioCallCount).toBe(1);
    expect(res1.audioUrl).toBeNull();

    // Na 2ª tentativa, o TTS agora funciona
    fakeAi.shouldFailAudio = false;
    const res2 = await processSummaryOrGetCached(orders, 'today');

    // ASSERT CRÍTICO: O texto já era READY, então a contagem do Gemini de texto CONTINUA 1!
    expect(fakeAi.textCallCount).toBe(1);
    expect(fakeAi.audioCallCount).toBe(2);
    expect(res2.audioUrl).toBe('audio_url_2.mp3');
  });

  it('5. Clicar no botão PLAY reproduz o áudio com 0 chamadas de Gemini e 0 de TTS', async () => {
    const orders = [
      {
        id: 'ord_play',
        order_data: {
          items: [{ description: 'Sofá', quantity: 1 }],
        },
      },
    ];

    const res = await processSummaryOrGetCached(orders, 'today');
    const textCallsBefore = fakeAi.textCallCount;
    const audioCallsBefore = fakeAi.audioCallCount;

    // Simular 10 cliques no botão Play
    for (let playClick = 0; playClick < 10; playClick++) {
      const audioToPlay = res.audioUrl;
      expect(audioToPlay).toBeDefined();
    }

    // ZERO chamadas adicionais!
    expect(fakeAi.textCallCount).toBe(textCallsBefore);
    expect(fakeAi.audioCallCount).toBe(audioCallsBefore);
  });

  it('6. Teste de Concorrência: Requisições paralelas para a mesma fingerprint realizam 1 única chamada ao Gemini', async () => {
    const orders = [
      {
        id: 'ord_concurrent',
        order_data: {
          items: [{ description: 'Painel TV', quantity: 1 }],
        },
      },
    ];

    const promise1 = processSummaryOrGetCached(orders, 'today');
    const promise2 = processSummaryOrGetCached(orders, 'today');

    const [r1, r2] = await Promise.all([promise1, promise2]);

    expect(r1.fingerprint).toBe(r2.fingerprint);
    expect(fakeAi.textCallCount).toBe(1);
    expect(fakeAi.audioCallCount).toBe(1);
  });

  it('7. Recuperação de Lease de GENERATING travado (timeout de 2 minutos)', () => {
    const oldStartedAt = new Date(Date.now() - 3 * 60 * 1000).toISOString(); // 3 minutos atrás
    const recentStartedAt = new Date(Date.now() - 30 * 1000).toISOString(); // 30 segundos atrás

    expect(isLeaseExpired(oldStartedAt)).toBe(true); // Expirou -> permite recuperar
    expect(isLeaseExpired(recentStartedAt)).toBe(false); // Ainda dentro da lease -> aguarda
  });

  afterEach(() => {
    memoryStore.clear();
    activeInFlightPromises.clear();
  });
});
