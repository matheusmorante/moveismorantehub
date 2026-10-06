import { describe, it, expect } from 'vitest';
import { getCancellationDeadlineLabel, makeFiscalIssueFeedback } from '../utils/fiscalFormatters';
import type { NfeDocumentRecord } from '../types/fiscalDocuments.types';

describe('FiscalDocuments - fiscalFormatters', () => {
  const baseDoc: NfeDocumentRecord = {
    id: 'doc-123',
    order_id: 'order-123',
    numero_nfe: 701,
    serie: '1',
    chave_acesso: '41261044512248000107550010000007011234567890',
    modelo: '55',
    ambiente: 2,
    status: 'autorizada',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('retorna null para documento não autorizado ou cancelado', () => {
    const canceladoDoc = { ...baseDoc, status: 'cancelada' as const };
    expect(getCancellationDeadlineLabel(canceladoDoc)).toBeNull();
  });

  it('indica prazo indisponível se não houver deadline', () => {
    expect(getCancellationDeadlineLabel(baseDoc, { canProceed: true, action: 'cancel' })).toBe(
      'Prazo de cancelamento indisponível'
    );
  });

  it('indica prazo expirado se deadline estiver no passado', () => {
    const pastDeadline = new Date(Date.now() - 3600000).toISOString();
    const label = getCancellationDeadlineLabel(baseDoc, {
      canProceed: false,
      action: 'cancel',
      deadline: pastDeadline,
    });
    expect(label).toContain('Prazo normal expirado');
  });

  it('formata tempo restante se deadline estiver no futuro', () => {
    const futureDeadline = new Date(Date.now() + 3600000 * 2).toISOString();
    const label = getCancellationDeadlineLabel(baseDoc, {
      canProceed: true,
      action: 'cancel',
      deadline: futureDeadline,
    });
    expect(label).toContain('Cancelamento até');
    expect(label).toContain('restam');
  });

  it('monta feedback de emissão fiscal enriquecido', () => {
    const feedback = makeFiscalIssueFeedback(
      {
        state: 'rejected',
        cStat: '204',
        xMotivo: 'Rejeição: Duplicidade de NF-e',
      },
      baseDoc
    );

    expect(feedback.document).toBe(baseDoc);
    expect(feedback.presentation).toBeDefined();
  });
});
