// @vitest-environment happy-dom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FiscalDocumentRowActions } from '../components/FiscalDocumentRowActions';
import type { NfeDocumentRecord } from '../types/fiscalDocuments.types';

afterEach(cleanup);

const makeDocument = (overrides: Partial<NfeDocumentRecord> = {}): NfeDocumentRecord => ({
  id: 'doc-details',
  order_id: 'order-1',
  numero_nfe: 100,
  serie: '1',
  chave_acesso: '123',
  modelo: '55',
  ambiente: 2,
  status: 'erro',
  document_type: 'outbound',
  fiscal_ruleset_version: 'HML_RETAIL_V1',
  created_at: '2026-10-05T12:00:00.000Z',
  updated_at: '2026-10-05T12:00:00.000Z',
  ...overrides,
});

const makeHandlers = () => ({
  onViewDetails: vi.fn(),
  onToggleDetails: vi.fn(),
  onPrintDanfe: vi.fn(),
  onDownloadXml: vi.fn(),
  onConsultSituation: vi.fn(),
  onOpenFiscalTreatment: vi.fn(),
  onPrepareLinkedOperation: vi.fn(),
  onRetryHml: vi.fn(),
});

const standardMenuActions = [
  { label: 'Ver detalhes', callback: 'onViewDetails' },
  { label: 'Detalhes fiscais', callback: 'onToggleDetails' },
  { label: 'Visualizar / imprimir DANFE', callback: 'onPrintDanfe' },
  { label: 'Baixar XML autorizado', callback: 'onDownloadXml' },
  { label: 'Consultar situação na SEFAZ', callback: 'onConsultSituation' },
  { label: 'Cancelamento fiscal da NF-e', callback: 'onOpenFiscalTreatment' },
  { label: 'Verificar e retomar HML', callback: 'onRetryHml' },
] as const;

describe('FiscalDocumentRowActions', () => {
  it.each(['return', 'estorno'])('oferece cancelamento fiscal individual do documento %s elegível', async document_type => {
    const handlers = makeHandlers();
    render(<FiscalDocumentRowActions document={makeDocument({ document_type, status: 'homologada', order_id: null })}
      isDetailsOpen={false} canOperateFiscal={true} cancellationEligibility={{ canProceed: true, action: 'cancel' }} {...handlers} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ações da NF-e 100' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Cancelamento fiscal da NF-e' }));
    expect(handlers.onOpenFiscalTreatment).toHaveBeenCalledTimes(1);
  });
  it.each([
    { modelo: '65', document_type: 'return', action: 'cancel' },
    { modelo: '55', document_type: 'return', action: 'estorno' },
    { modelo: '55', document_type: 'inbound', action: 'cancel' },
  ] as const)('não oferece cancelamento da operação sem suporte: %j', async ({ action, ...doc }) => {
    render(<FiscalDocumentRowActions document={makeDocument(doc)} isDetailsOpen={false} canOperateFiscal={true}
      cancellationEligibility={{ canProceed: true, action }} {...makeHandlers()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ações da NF-e 100' }));
    expect(screen.queryByRole('menuitem', { name: 'Cancelamento fiscal da NF-e' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: /Aplicar política/ })).toBeNull();
  });
  it.each([{ modelo: '55', ambiente: 1 }, { modelo: '55', ambiente: 2 }, { modelo: '65', ambiente: 1 }, { modelo: '65', ambiente: 2 }] as const)(
    'never offers CC-e for model $modelo environment $ambiente', async (context) => {
      render(<FiscalDocumentRowActions document={makeDocument({ ...context, status: 'autorizada' })} isDetailsOpen={false} canOperateFiscal={true} cancellationEligibility={{ canProceed: true, action: 'cancel' }} {...makeHandlers()} />);
      await userEvent.click(screen.getByRole('button', { name: 'Ações da NF-e 100' }));
      expect(screen.queryByRole('menuitem', { name: /CC-e|Carta de Correção/i })).toBeNull();
      expect(screen.getByRole('menuitem', { name: 'Cancelamento fiscal da NF-e' })).toBeTruthy();
    }
  );

  it.each(standardMenuActions)(
    '$label aciona seu handler e fecha o menu flutuante',
    async ({ label, callback }) => {
      const handlers = makeHandlers();

      render(
        <FiscalDocumentRowActions
          document={makeDocument()}
          isDetailsOpen={false}
          canOperateFiscal={true}
          cancellationEligibility={{ canProceed: true, action: 'cancel' }}
          retryingHmlDocumentId={null}
          {...handlers}
        />
      );

      const trigger = screen.getByRole('button', { name: 'Ações da NF-e 100' });
      await userEvent.click(trigger);

      const menu = screen.getByRole('menu', { name: 'Ações da NF-e 100' });
      expect(menu.parentElement).toBe(document.body);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');

      await userEvent.click(screen.getByRole('menuitem', { name: label }));

      expect(handlers[callback]).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('menu')).toBeNull();
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    }
  );

  it('mostra e aciona Preparar operação fiscal vinculada para documento sem pedido', async () => {
    const handlers = makeHandlers();

    render(
      <FiscalDocumentRowActions
        document={makeDocument({ order_id: null, status: 'autorizada' })}
        isDetailsOpen={false}
        canOperateFiscal={true}
        {...handlers}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Ações da NF-e 100' }));
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Preparar operação fiscal vinculada' })
    );

    expect(handlers.onPrepareLinkedOperation).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('fecha o menu com Escape e quando o usuário clica fora', async () => {
    render(
      <div>
        <FiscalDocumentRowActions
          document={makeDocument()}
          isDetailsOpen={false}
          canOperateFiscal={true}
          cancellationEligibility={{ canProceed: true, action: 'cancel' }}
          retryingHmlDocumentId={null}
          {...makeHandlers()}
        />
        <button type="button">Fora do menu</button>
      </div>
    );

    const trigger = screen.getByRole('button', { name: 'Ações da NF-e 100' });
    await userEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();

    await userEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeTruthy();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Fora do menu' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
