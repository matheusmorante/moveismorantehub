// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { IssuedFiscalDocumentEventsTab } from '../components/tabs/IssuedFiscalDocumentEventsTab';
import type { FiscalDocumentEventSummary } from '../types/fiscalDocuments.types';

afterEach(cleanup);

describe('IssuedFiscalDocumentEventsTab', () => {
  it('exibe estado vazio quando não há eventos registrados', () => {
    render(<IssuedFiscalDocumentEventsTab events={[]} />);
    expect(screen.getByText('Nenhum evento registrado')).toBeTruthy();
    expect(
      screen.getByText('Este documento fiscal não possui eventos ou tentativas registrados.')
    ).toBeTruthy();
  });

  it('renderiza evento de cancelamento fiscal (110111) homologado pela SEFAZ', () => {
    const cancelEvent: FiscalDocumentEventSummary = {
      id: 'event-cancel-1',
      event_type: '110111',
      status: 'homologado',
      justification: 'Venda cancelada pelo cliente antes da saída',
      protocol_number: '135260000000001',
      requested_at: '2026-10-20T14:35:00Z',
    };

    render(<IssuedFiscalDocumentEventsTab events={[cancelEvent]} />);
    expect(screen.getByText(/Cancelamento/i)).toBeTruthy();
    expect(screen.getByText('135260000000001')).toBeTruthy();
    expect(screen.getByText(/Venda cancelada pelo cliente antes da saída/)).toBeTruthy();
  });

  it('renderiza tentativas e eventos fiscais ordenados por data decrescente', () => {
    const events: FiscalDocumentEventSummary[] = [
      {
        id: 'event-auth',
        event_type: '100',
        status: 'autorizada',
        protocol_number: '141260000000001',
        requested_at: '2026-10-19T10:00:00Z',
      },
      {
        id: 'event-cancel',
        event_type: '110111',
        status: 'homologado',
        justification: 'Erro no preenchimento',
        protocol_number: '141260000000002',
        requested_at: '2026-10-20T11:00:00Z',
      },
    ];

    render(<IssuedFiscalDocumentEventsTab events={events} />);
    expect(screen.getByText('141260000000002')).toBeTruthy();
    expect(screen.getByText('141260000000001')).toBeTruthy();
  });
});
