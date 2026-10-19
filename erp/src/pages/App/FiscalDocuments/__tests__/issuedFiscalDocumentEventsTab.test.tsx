// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { IssuedFiscalDocumentEventsTab } from '../components/tabs/IssuedFiscalDocumentEventsTab';
import type { FiscalOperationDraftSummary } from '../types/fiscalDocuments.types';
afterEach(cleanup);
describe('histórico do rascunho por finalidade e situação próprias', () => {
  it.each(['return', 'estorno'] as const)('não manda emitir estorno de NFC-e para rascunho %s cancelado', operation_kind => {
    render(<IssuedFiscalDocumentEventsTab operationDrafts={[{ id: 'draft', operation_kind, status: 'cancelled', environment: 2, created_at: '2026-10-18T12:00:00Z' } as FiscalOperationDraftSummary]} />);
    expect(screen.getByText('Cancelado')).toBeTruthy();
    expect(screen.getByText(new RegExp(`rascunho de ${operation_kind === 'return' ? 'devolução fiscal' : 'estorno fiscal'} está cancelado`))).toBeTruthy();
    expect(screen.queryByText(/30 minutos|ultrapassou o prazo legal/)).toBeNull();
  });
  it.each(['transmitting', 'unknown'])('exige consulta da mesma chave em situação %s', status => {
    render(<IssuedFiscalDocumentEventsTab operationDrafts={[{ id: 'draft', operation_kind: 'return', status, environment: 2, created_at: '2026-10-18T12:00:00Z' } as FiscalOperationDraftSummary]} />);
    expect(screen.getByText(/Consulte a mesma chave antes/)).toBeTruthy();
    expect(screen.queryByText(/deve ser concluída emitindo/)).toBeNull();
  });
  it('identifica uma devolução autorizada sem pressupor janela da NFC-e', () => {
    render(<IssuedFiscalDocumentEventsTab operationDrafts={[{ id: 'draft', operation_kind: 'return', status: 'authorized', environment: 2, created_at: '2026-10-18T12:00:00Z' } as FiscalOperationDraftSummary]} />);
    expect(screen.getByText(/NF-e de devolução fiscal.*foi autorizada/)).toBeTruthy();
    expect(screen.queryByText(/NFC-e/)).toBeNull();
  });
});
