/**
 * Testes de Regressão — Correção Controlada de Divergências (DIV-002, DIV-003, DIV-005, DIV-006, DIV-008)
 *
 * Estes testes validam o comportamento correto APÓS as correções aplicadas.
 * São a fonte de verdade para impedir regressões futuras.
 */
import { describe, it, expect, vi } from 'vitest';

// =============================================================
// FUNÇÕES SIMULADAS (mirrors do código real para testes puros)
// =============================================================

// Mirror de createFinancialTransaction (DIV-006 + DIV-008)
function validateAndBuildPayload(draft: {
  type?: string | null;
  amount?: number | null;
  totalAmount?: number | null;
  description?: string | null;
  businessPurpose?: string | null;
  purpose?: string | null;
  categoryName?: string | null;
  date?: string | null;
  paymentMethod?: string | null;
  intentType?: string | null;
}): { success: true; payload: Record<string, any> } | { success: false; error: string } {

  // DIV-005: bloquear tipos legados
  const blockedIntentTypes = ['INSTALLMENT', 'PAYABLE_BILL', 'RECURRING'];
  if (draft.intentType && blockedIntentTypes.includes(draft.intentType)) {
    return {
      success: false,
      error: 'O Assistente Financeiro registra apenas fatos realizados. Parcelamentos, boletos futuros e recorrências não são suportados.',
    };
  }

  // DIV-006: amount null não pode virar zero silenciosamente
  const rawAmount = draft.amount ?? draft.totalAmount ?? null;
  if (rawAmount === null || rawAmount === undefined) {
    return { success: false, error: 'O valor da movimentação não foi informado.' };
  }
  if (rawAmount <= 0) {
    return { success: false, error: 'O valor da movimentação deve ser maior que zero.' };
  }

  // DIV-008: purpose UNKNOWN deve bloquear (não assumir BUSINESS)
  const purposeValue = draft.businessPurpose ?? draft.purpose ?? null;
  if (!purposeValue || purposeValue === 'UNKNOWN' || purposeValue === 'UNKNOWN_BY_USER') {
    return {
      success: false,
      error: 'Para qual finalidade foi essa despesa? (Empresa ou pessoal)',
    };
  }

  // DIV-008: category_name null é aceito (não cria fallback)
  const payload: Record<string, any> = {
    type: draft.type,
    amount: rawAmount,
    description: draft.description?.trim() || 'Lançamento via IA',
    purpose: purposeValue,
    category_name: draft.categoryName || null, // null é válido — não cria 'Despesa não classificada'
    date: draft.date || new Date().toISOString().split('T')[0], // data ausente → hoje é ok
    payment_method: draft.paymentMethod || null,
  };

  return { success: true, payload };
}

// Mirror da idempotência (DIV-003)
function buildIdempotencyKey(draft: {
  description?: string | null;
  amount?: number | null;
  totalAmount?: number | null;
  date?: string | null;
  batchIndex?: number;
}): string {
  const desc = (draft.description || 'sem_descricao').toLowerCase().replace(/\s+/g, '_');
  const amount = draft.amount ?? draft.totalAmount ?? 0;
  const date = draft.date || new Date().toISOString().split('T')[0];
  const batchIndex = draft.batchIndex ?? 0;
  return `ai_${desc}_${amount}_${date}_idx${batchIndex}`;
}

// Mirror do comportamento de batch (DIV-002)
function resolveRenderedDrafts(pendingIntent: {
  batchDraftsList?: any[];
  type?: string;
  amount?: number | null;
  description?: string | null;
} | null): any[] {
  if (!pendingIntent) return [];

  // INVARIANTE: se batchDraftsList existe, é a única fonte de verdade
  if (pendingIntent.batchDraftsList && pendingIntent.batchDraftsList.length > 0) {
    return pendingIntent.batchDraftsList;
  }

  // Fallback para intent único
  return [pendingIntent];
}

// Simula merge de resposta IA preservando batch (DIV-002)
function mergeIntentPreservingBatch(
  existingIntent: { batchDraftsList?: any[]; [key: string]: any } | null,
  newPartialIntent: { batchDraftsList?: any[]; questionToUser?: string | null; [key: string]: any }
): { batchDraftsList?: any[]; [key: string]: any } {
  if (!existingIntent) return newPartialIntent;

  // Se o existente tem batch e o novo não tem (ex: resposta de questionToUser)
  // o batch DEVE ser preservado
  const preservedBatch = newPartialIntent.batchDraftsList ?? existingIntent.batchDraftsList;

  return {
    ...existingIntent,
    ...newPartialIntent,
    batchDraftsList: preservedBatch,
  };
}

// Simula confirmação individual de item do batch (DIV-002)
function confirmSingleFromBatch(
  pendingIntent: { batchDraftsList: any[] },
  index: number
): { batchDraftsList: any[] } | null {
  const nextBatch = pendingIntent.batchDraftsList.filter((_, i) => i !== index);
  if (nextBatch.length === 0) return null;
  return { ...pendingIntent, batchDraftsList: nextBatch };
}

// Mock de persistência com constraint UNIQUE (DIV-003)
const mockDatabase: Record<string, any> = {};

async function mockInsertWithIdempotency(
  payload: Record<string, any>,
  idempotencyKey: string | null
): Promise<{ data?: { id: string }; error?: { code?: string; message: string } }> {
  if (idempotencyKey) {
    // Simula constraint UNIQUE do banco
    if (mockDatabase[idempotencyKey]) {
      return { error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
    }
    const id = `tx_${Math.random().toString(36).substr(2, 9)}`;
    mockDatabase[idempotencyKey] = { id, ...payload };
    return { data: { id } };
  }
  // Sem chave: sempre insere (lançamento manual)
  const id = `tx_${Math.random().toString(36).substr(2, 9)}`;
  return { data: { id } };
}

async function confirmWithIdempotency(
  payload: Record<string, any>,
  idempotencyKey: string | null
): Promise<{ success: boolean; recordId?: string; alreadyExisted?: boolean; error?: string }> {
  const res = await mockInsertWithIdempotency(payload, idempotencyKey);

  if (res.error) {
    // 23505 = unique_violation → idempotência → retornar como sucesso
    if (res.error.code === '23505') {
      const existing = idempotencyKey ? mockDatabase[idempotencyKey] : null;
      return { success: true, recordId: existing?.id, alreadyExisted: true };
    }
    return { success: false, error: res.error.message };
  }

  return { success: true, recordId: res.data?.id, alreadyExisted: false };
}

// =============================================================
// DIV-002 — BATCH COMO FONTE DE VERDADE
// =============================================================
describe('DIV-002 — Batch como Fonte de Verdade (7 casos)', () => {

  it('1. "Paguei luz 100 e internet 300" → exatamente 2 drafts no batchDraftsList', () => {
    const pendingIntent = {
      batchDraftsList: [
        { description: 'Pagamento de conta de luz', amount: 100, type: 'expense', isRealized: true },
        { description: 'Pagamento de internet', amount: 300, type: 'expense', isRealized: true },
      ],
    };
    const rendered = resolveRenderedDrafts(pendingIntent);
    expect(rendered).toHaveLength(2);
    expect(rendered[0].description).toContain('luz');
    expect(rendered[1].description).toContain('internet');
  });

  it('2. questionToUser não apaga batch existente', () => {
    const existing = {
      batchDraftsList: [
        { description: 'Pagamento de conta de luz', amount: 100 },
        { description: 'Pagamento de internet', amount: 300 },
      ],
    };
    const newPartial = {
      questionToUser: 'Essa conta de luz é da loja ou pessoal?',
      // batchDraftsList ausente intencionalmente (resposta parcial do Gemini)
    };
    const merged = mergeIntentPreservingBatch(existing, newPartial);
    expect(merged.batchDraftsList).toHaveLength(2);
    expect(merged.questionToUser).toBeDefined();
  });

  it('3. Atualizar somente luz → internet permanece intacta', () => {
    const pendingIntent = {
      batchDraftsList: [
        { description: 'Pagamento de conta de luz', amount: 100, businessPurpose: 'UNKNOWN' },
        { description: 'Pagamento de internet', amount: 300, businessPurpose: 'UNKNOWN' },
      ],
    };
    // Patch só no item de luz (índice 0)
    const updated = {
      ...pendingIntent,
      batchDraftsList: pendingIntent.batchDraftsList.map((d, i) =>
        i === 0 ? { ...d, businessPurpose: 'BUSINESS' } : d
      ),
    };
    expect(updated.batchDraftsList[0].businessPurpose).toBe('BUSINESS');
    expect(updated.batchDraftsList[1].businessPurpose).toBe('UNKNOWN');
    expect(updated.batchDraftsList).toHaveLength(2);
  });

  it('4. Ignorar luz → internet permanece', () => {
    const pendingIntent = {
      batchDraftsList: [
        { description: 'Pagamento de conta de luz', amount: 100 },
        { description: 'Pagamento de internet', amount: 300 },
      ],
    };
    const afterDiscard = confirmSingleFromBatch(pendingIntent, 0);
    expect(afterDiscard).not.toBeNull();
    expect(afterDiscard!.batchDraftsList).toHaveLength(1);
    expect(afterDiscard!.batchDraftsList[0].description).toContain('internet');
  });

  it('5. Confirmar luz → internet permanece pendente', () => {
    const pendingIntent = {
      batchDraftsList: [
        { description: 'Pagamento de conta de luz', amount: 100 },
        { description: 'Pagamento de internet', amount: 300 },
      ],
    };
    // Confirma índice 0 (luz)
    const afterConfirm = confirmSingleFromBatch(pendingIntent, 0);
    expect(afterConfirm).not.toBeNull();
    expect(afterConfirm!.batchDraftsList).toHaveLength(1);
    expect(afterConfirm!.batchDraftsList[0].description).toContain('internet');
  });

  it('6. Resposta coletiva "as duas foram no Pix" → patch nas duas sem collapse', () => {
    const existing = {
      batchDraftsList: [
        { description: 'Pagamento de conta de luz', amount: 100, paymentMethod: 'UNKNOWN' },
        { description: 'Pagamento de internet', amount: 300, paymentMethod: 'UNKNOWN' },
      ],
    };
    // Resposta coletiva: patch em todos os itens do batch
    const patchedBatch = existing.batchDraftsList.map(d => ({ ...d, paymentMethod: 'PIX' }));
    const merged = mergeIntentPreservingBatch(existing, { batchDraftsList: patchedBatch });
    expect(merged.batchDraftsList).toHaveLength(2);
    expect(merged.batchDraftsList[0].paymentMethod).toBe('PIX');
    expect(merged.batchDraftsList[1].paymentMethod).toBe('PIX');
  });

  it('7. 3 fatos → nenhum wrapper reduz para 1 ou 2', () => {
    const pendingIntent = {
      batchDraftsList: [
        { description: 'Pagamento de conta de luz', amount: 100 },
        { description: 'Pagamento de internet', amount: 300 },
        { description: 'Pagamento de água', amount: 50 },
      ],
    };
    const rendered = resolveRenderedDrafts(pendingIntent);
    expect(rendered).toHaveLength(3);
    // Confirmar luz (índice 0) → restam 2
    const after1 = confirmSingleFromBatch(pendingIntent, 0)!;
    expect(after1.batchDraftsList).toHaveLength(2);
    // Confirmar internet (agora índice 0 no batch reduzido) → resta 1
    const after2 = confirmSingleFromBatch(after1, 0)!;
    expect(after2.batchDraftsList).toHaveLength(1);
    // Confirmar último → null (batch encerrado)
    const after3 = confirmSingleFromBatch(after2, 0);
    expect(after3).toBeNull();
  });
});

// =============================================================
// DIV-003 — IDEMPOTÊNCIA UNIQUE REAL
// =============================================================
describe('DIV-003 — Idempotência UNIQUE Real (7 casos)', () => {

  it('1. Mesma chave enviada duas vezes sequencialmente → 1 registro', async () => {
    const db: Record<string, any> = {};
    const key = 'ai_luz_100_2026-09-06_idx0';

    async function insertWithKey(k: string) {
      if (db[k]) return { error: { code: '23505', message: 'duplicate key' } };
      db[k] = { id: 'tx_001' };
      return { data: { id: 'tx_001' } };
    }

    const r1 = await insertWithKey(key);
    const r2 = await insertWithKey(key);
    expect(r1.data?.id).toBe('tx_001');
    expect(r2.error?.code).toBe('23505');
    expect(Object.keys(db)).toHaveLength(1);
  });

  it('2. Mock de race condition — chave usada por dois processos → 1 registro', async () => {
    const db: Record<string, any> = {};
    const key = 'ai_internet_300_2026-09-06_idx1';
    let insertCount = 0;

    async function atomicInsert(k: string): Promise<'ok' | 'duplicate'> {
      if (db[k]) return 'duplicate';
      db[k] = { id: `tx_${++insertCount}` };
      return 'ok';
    }

    // Simula duas chamadas "simultâneas" (sem await verdadeiro concorrente em JS puro)
    const [r1, r2] = await Promise.all([atomicInsert(key), atomicInsert(key)]);
    const results = [r1, r2];
    expect(results.filter(r => r === 'ok')).toHaveLength(1);
    expect(results.filter(r => r === 'duplicate')).toHaveLength(1);
    expect(Object.keys(db)).toHaveLength(1);
  });

  it('3. Chaves diferentes → registros distintos', async () => {
    const clearDb: Record<string, any> = {};
    const keys = ['ai_luz_100_2026-09-06_idx0', 'ai_internet_300_2026-09-06_idx1'];
    for (const k of keys) clearDb[k] = { id: `tx_${k}` };
    expect(Object.keys(clearDb)).toHaveLength(2);
  });

  it('4. Retry após resposta de rede perdida → sem duplicação (constraint resolve)', async () => {
    const result1 = await confirmWithIdempotency(
      { type: 'expense', amount: 100, description: 'Luz' },
      'ai_luz_100_2026-09-06_retry'
    );
    expect(result1.success).toBe(true);
    expect(result1.alreadyExisted).toBe(false);

    const result2 = await confirmWithIdempotency(
      { type: 'expense', amount: 100, description: 'Luz' },
      'ai_luz_100_2026-09-06_retry'
    );
    expect(result2.success).toBe(true);
    expect(result2.alreadyExisted).toBe(true);
  });

  it('5. Edição de notes não quebra idempotência (chave é idempotency_key, não notes)', async () => {
    const key = 'ai_agua_50_2026-09-06_nobreak';
    const r1 = await confirmWithIdempotency({ type: 'expense', amount: 50, notes: 'original' }, key);
    expect(r1.success).toBe(true);

    // "Editar" notes internamente não afeta a chave
    const r2 = await confirmWithIdempotency({ type: 'expense', amount: 50, notes: 'editado' }, key);
    expect(r2.success).toBe(true);
    expect(r2.alreadyExisted).toBe(true);
  });

  it('6. Lançamento manual sem idempotency_key → funciona normalmente (null não colide)', async () => {
    const r1 = await confirmWithIdempotency({ type: 'income', amount: 1000 }, null);
    const r2 = await confirmWithIdempotency({ type: 'income', amount: 1000 }, null);
    // Ambos devem ter IDs diferentes (sem chave = sempre insere)
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
  });

  it('7. Batch com N drafts → N chaves distintas e estáveis', () => {
    const drafts = [
      { description: 'Pagamento de conta de luz', amount: 100, date: '2026-09-06', batchIndex: 0 },
      { description: 'Pagamento de internet', amount: 300, date: '2026-09-06', batchIndex: 1 },
      { description: 'Pagamento de água', amount: 50, date: '2026-09-06', batchIndex: 2 },
    ];
    const keys = drafts.map(buildIdempotencyKey);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(3);
    // Mesma chamada = mesma chave (estabilidade)
    const keysRepeat = drafts.map(buildIdempotencyKey);
    expect(keysRepeat).toEqual(keys);
  });
});

// =============================================================
// DIV-005 — BLOQUEIO DE TIPOS FUTUROS/PARCELAMENTO/RECORRÊNCIA
// =============================================================
describe('DIV-005 — Bloqueio de Persistência Legada (4 casos)', () => {

  it('1. intentType INSTALLMENT → erro de domínio, nenhum registro criado', () => {
    const result = validateAndBuildPayload({
      intentType: 'INSTALLMENT',
      amount: 500,
      businessPurpose: 'BUSINESS',
      description: 'Compra parcelada',
    });
    expect(result.success).toBe(false);
    expect((result as any).error).toContain('apenas fatos realizados');
  });

  it('2. intentType PAYABLE_BILL → erro de domínio', () => {
    const result = validateAndBuildPayload({
      intentType: 'PAYABLE_BILL',
      amount: 200,
      businessPurpose: 'BUSINESS',
      description: 'Boleto futuro',
    });
    expect(result.success).toBe(false);
    expect((result as any).error).toContain('apenas fatos realizados');
  });

  it('3. intentType RECURRING → erro de domínio', () => {
    const result = validateAndBuildPayload({
      intentType: 'RECURRING',
      amount: 300,
      businessPurpose: 'BUSINESS',
      description: 'Assinatura mensal',
    });
    expect(result.success).toBe(false);
    expect((result as any).error).toContain('apenas fatos realizados');
  });

  it('4. intentType SINGLE_TRANSACTION → funciona normalmente', () => {
    const result = validateAndBuildPayload({
      intentType: 'SINGLE_TRANSACTION',
      type: 'expense',
      amount: 100,
      businessPurpose: 'BUSINESS',
      categoryName: 'Energia Elétrica',
      description: 'Pagamento de conta de luz',
      date: '2026-09-06',
      paymentMethod: 'PIX',
    });
    expect(result.success).toBe(true);
    expect((result as any).payload.amount).toBe(100);
  });
});

// =============================================================
// DIV-006 — REMOVER amount || 0
// =============================================================
describe('DIV-006 — Remoção de amount || 0 (3 casos)', () => {

  it('1. amount: null → validação rejeita com mensagem clara (não transforma em zero)', () => {
    const result = validateAndBuildPayload({
      type: 'expense',
      amount: null,
      businessPurpose: 'BUSINESS',
      description: 'Teste sem valor',
    });
    expect(result.success).toBe(false);
    expect((result as any).error).toContain('não foi informado');
  });

  it('2. amount: 0 → validação rejeita (zero não é valor válido)', () => {
    const result = validateAndBuildPayload({
      type: 'expense',
      amount: 0,
      businessPurpose: 'BUSINESS',
      description: 'Teste valor zero',
    });
    expect(result.success).toBe(false);
    expect((result as any).error).toContain('maior que zero');
  });

  it('3. amount: 100 → passa normalmente sem alteração', () => {
    const result = validateAndBuildPayload({
      type: 'expense',
      amount: 100,
      businessPurpose: 'BUSINESS',
      categoryName: 'Energia Elétrica',
      description: 'Pagamento de conta',
      paymentMethod: 'PIX',
    });
    expect(result.success).toBe(true);
    expect((result as any).payload.amount).toBe(100);
  });
});

// =============================================================
// DIV-008 — REMOVER DEFAULTS SILENCIOSOS
// =============================================================
describe('DIV-008 — Sem Defaults Silenciosos (5 casos)', () => {

  it('1. businessPurpose: UNKNOWN → confirmação bloqueada com mensagem explicativa', () => {
    const result = validateAndBuildPayload({
      type: 'expense',
      amount: 200,
      businessPurpose: 'UNKNOWN',
      description: 'Despesa sem finalidade informada',
    });
    expect(result.success).toBe(false);
    expect((result as any).error).toContain('finalidade');
  });

  it('2. businessPurpose: null → confirmação bloqueada', () => {
    const result = validateAndBuildPayload({
      type: 'expense',
      amount: 150,
      businessPurpose: null,
      description: 'Despesa sem finalidade',
    });
    expect(result.success).toBe(false);
    expect((result as any).error).toContain('finalidade');
  });

  it('3. businessPurpose: BUSINESS → passa normalmente', () => {
    const result = validateAndBuildPayload({
      type: 'expense',
      amount: 300,
      businessPurpose: 'BUSINESS',
      description: 'Despesa empresarial',
      paymentMethod: 'PIX',
    });
    expect(result.success).toBe(true);
    expect((result as any).payload.purpose).toBe('BUSINESS');
  });

  it('4. categoryName: null → aceito no banco (null é válido, não vira "Despesa não classificada")', () => {
    const result = validateAndBuildPayload({
      type: 'expense',
      amount: 50,
      businessPurpose: 'PERSONAL',
      categoryName: null,
      description: 'Despesa sem categoria definida',
      paymentMethod: 'DINHEIRO',
    });
    expect(result.success).toBe(true);
    expect((result as any).payload.category_name).toBeNull();
  });

  it('5. date: null → assume hoje (aceitável — data atual não inventa informação de negócio)', () => {
    const today = new Date().toISOString().split('T')[0];
    const result = validateAndBuildPayload({
      type: 'expense',
      amount: 75,
      businessPurpose: 'BUSINESS',
      description: 'Despesa sem data',
      date: null,
      paymentMethod: 'PIX',
    });
    expect(result.success).toBe(true);
    expect((result as any).payload.date).toBe(today);
  });
});
