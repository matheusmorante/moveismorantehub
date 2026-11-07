/**
 * Testes de regressão - batch como fonte de verdade (DIV-002).
 */
import { describe, it, expect } from 'vitest';

// Mirror do comportamento de batch (DIV-002)
function resolveRenderedDrafts(
  pendingIntent: {
    batchDraftsList?: any[];
    type?: string;
    amount?: number | null;
    description?: string | null;
  } | null
): any[] {
  if (!pendingIntent) return [];

  // INVARIANTE: se batchDraftsList existe, � a �nica fonte de verdade
  if (pendingIntent.batchDraftsList && pendingIntent.batchDraftsList.length > 0) {
    return pendingIntent.batchDraftsList;
  }

  // Fallback para intent �nico
  return [pendingIntent];
}

// Simula merge de resposta IA preservando batch (DIV-002)
function mergeIntentPreservingBatch(
  existingIntent: { batchDraftsList?: any[]; [key: string]: any } | null,
  newPartialIntent: { batchDraftsList?: any[]; questionToUser?: string | null; [key: string]: any }
): { batchDraftsList?: any[]; [key: string]: any } {
  if (!existingIntent) return newPartialIntent;

  // Se o existente tem batch e o novo n�o tem (ex: resposta de questionToUser)
  // o batch DEVE ser preservado
  const preservedBatch = newPartialIntent.batchDraftsList ?? existingIntent.batchDraftsList;

  return {
    ...existingIntent,
    ...newPartialIntent,
    batchDraftsList: preservedBatch,
  };
}

// Simula confirma��o individual de item do batch (DIV-002)
function confirmSingleFromBatch(
  pendingIntent: { batchDraftsList: any[] },
  index: number
): { batchDraftsList: any[] } | null {
  const nextBatch = pendingIntent.batchDraftsList.filter((_, i) => i !== index);
  if (nextBatch.length === 0) return null;
  return { ...pendingIntent, batchDraftsList: nextBatch };
}

// =============================================================
// DIV-002 � BATCH COMO FONTE DE VERDADE
// =============================================================
describe('DIV-002 � Batch como Fonte de Verdade (7 casos)', () => {
  it('1. "Paguei luz 100 e internet 300" ? exatamente 2 drafts no batchDraftsList', () => {
    const pendingIntent = {
      batchDraftsList: [
        {
          description: 'Pagamento de conta de luz',
          amount: 100,
          type: 'expense',
          isRealized: true,
        },
        { description: 'Pagamento de internet', amount: 300, type: 'expense', isRealized: true },
      ],
    };
    const rendered = resolveRenderedDrafts(pendingIntent);
    expect(rendered).toHaveLength(2);
    expect(rendered[0].description).toContain('luz');
    expect(rendered[1].description).toContain('internet');
  });

  it('2. questionToUser n�o apaga batch existente', () => {
    const existing = {
      batchDraftsList: [
        { description: 'Pagamento de conta de luz', amount: 100 },
        { description: 'Pagamento de internet', amount: 300 },
      ],
    };
    const newPartial = {
      questionToUser: 'Essa conta de luz � da loja ou pessoal?',
      // batchDraftsList ausente intencionalmente (resposta parcial do Gemini)
    };
    const merged = mergeIntentPreservingBatch(existing, newPartial);
    expect(merged.batchDraftsList).toHaveLength(2);
    expect(merged.questionToUser).toBeDefined();
  });

  it('3. Atualizar somente luz ? internet permanece intacta', () => {
    const pendingIntent = {
      batchDraftsList: [
        { description: 'Pagamento de conta de luz', amount: 100, businessPurpose: 'UNKNOWN' },
        { description: 'Pagamento de internet', amount: 300, businessPurpose: 'UNKNOWN' },
      ],
    };
    // Patch s� no item de luz (�ndice 0)
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

  it('4. Ignorar luz ? internet permanece', () => {
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

  it('5. Confirmar luz ? internet permanece pendente', () => {
    const pendingIntent = {
      batchDraftsList: [
        { description: 'Pagamento de conta de luz', amount: 100 },
        { description: 'Pagamento de internet', amount: 300 },
      ],
    };
    // Confirma �ndice 0 (luz)
    const afterConfirm = confirmSingleFromBatch(pendingIntent, 0);
    expect(afterConfirm).not.toBeNull();
    expect(afterConfirm!.batchDraftsList).toHaveLength(1);
    expect(afterConfirm!.batchDraftsList[0].description).toContain('internet');
  });

  it('6. Resposta coletiva "as duas foram no Pix" ? patch nas duas sem collapse', () => {
    const existing = {
      batchDraftsList: [
        { description: 'Pagamento de conta de luz', amount: 100, paymentMethod: 'UNKNOWN' },
        { description: 'Pagamento de internet', amount: 300, paymentMethod: 'UNKNOWN' },
      ],
    };
    // Resposta coletiva: patch em todos os itens do batch
    const patchedBatch = existing.batchDraftsList.map((d) => ({ ...d, paymentMethod: 'PIX' }));
    const merged = mergeIntentPreservingBatch(existing, { batchDraftsList: patchedBatch });
    expect(merged.batchDraftsList).toHaveLength(2);
    expect(merged.batchDraftsList![0].paymentMethod).toBe('PIX');
    expect(merged.batchDraftsList![1].paymentMethod).toBe('PIX');
  });

  it('7. 3 fatos ? nenhum wrapper reduz para 1 ou 2', () => {
    const pendingIntent = {
      batchDraftsList: [
        { description: 'Pagamento de conta de luz', amount: 100 },
        { description: 'Pagamento de internet', amount: 300 },
        { description: 'Pagamento de �gua', amount: 50 },
      ],
    };
    const rendered = resolveRenderedDrafts(pendingIntent);
    expect(rendered).toHaveLength(3);
    // Confirmar luz (�ndice 0) ? restam 2
    const after1 = confirmSingleFromBatch(pendingIntent, 0)!;
    expect(after1.batchDraftsList).toHaveLength(2);
    // Confirmar internet (agora �ndice 0 no batch reduzido) ? resta 1
    const after2 = confirmSingleFromBatch(after1, 0)!;
    expect(after2.batchDraftsList).toHaveLength(1);
    // Confirmar �ltimo ? null (batch encerrado)
    const after3 = confirmSingleFromBatch(after2, 0);
    expect(after3).toBeNull();
  });
});
