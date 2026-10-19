// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '@/context/AuthContext';
import NfeOperationDraftModal from '../modals/NfeOperationDraftModal';

const mocks = vi.hoisted(() => ({
  hook: vi.fn(),
  handlePreviewXml: vi.fn(),
  closeXmlPreview: vi.fn(),
  transmitOrReconcile: vi.fn(),
}));

vi.mock('../hooks/useNfeOperationDraft', () => ({ useNfeOperationDraft: mocks.hook }));
vi.mock('../components/NfeOperationDraftReview', () => ({ NfeOperationDraftReview: () => null }));
vi.mock('../components/NfeOperationDraftSetup', () => ({ NfeOperationDraftSetup: () => null }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const defaultSourceDoc = {
  id: 'source-1',
  order_id: 'order-1',
  modelo: '55' as const,
  ambiente: 2 as const,
  numero_nfe: 100,
  serie: '1',
  chave_acesso: '41261000000000000000550010000001001000000001',
};

function renderWithAuth(
  ui: React.ReactElement,
  authValues?: { isRealAdministrator?: boolean; activeRoleMode?: null | string }
) {
  const contextValue = authValues
    ? ({
        isRealAdministrator: authValues.isRealAdministrator ?? false,
        activeRoleMode: authValues.activeRoleMode ?? null,
      } as any)
    : undefined;

  return render(
    contextValue ? (
      <AuthContext.Provider value={contextValue}>{ui}</AuthContext.Provider>
    ) : (
      ui
    )
  );
}

describe('NfeOperationDraftModal - Prévia do XML e determinação de CFOP', () => {
  it('não exibe botão de prévia para usuários não administradores', () => {
    mocks.hook.mockReturnValue({
      kind: 'estorno',
      returnOrders: [],
      reviewedLines: [{ draft_line_id: '1', cfop: '1202' }],
      payload: { draft: { status: 'draft' } },
      review: { reason: 'Teste' },
      productionConfirmed: false,
      retryAllowed: false,
      transmitting: false,
      savingReview: false,
      loadingPreview: false,
      isXmlPreviewOpen: false,
      xmlPreview: null,
      hasUnresolvedCfop: false,
      prepareDraft: vi.fn(),
      saveFiscalReview: vi.fn(),
      handlePreviewXml: mocks.handlePreviewXml,
      closeXmlPreview: mocks.closeXmlPreview,
      transmitOrReconcile: mocks.transmitOrReconcile,
    });

    renderWithAuth(
      <NfeOperationDraftModal
        sourceDocument={defaultSourceDoc}
        onClose={vi.fn()}
        onAuthorized={vi.fn()}
      />,
      { isRealAdministrator: false }
    );

    expect(screen.queryByTestId('nfe-preview-xml-button')).toBeNull();
  });

  it('exibe botão de prévia para administrador real e dispara handlePreviewXml ao clicar', () => {
    mocks.hook.mockReturnValue({
      kind: 'estorno',
      returnOrders: [],
      reviewedLines: [{ draft_line_id: '1', cfop: '1202' }],
      payload: { draft: { status: 'draft' } },
      review: { reason: 'Teste' },
      productionConfirmed: false,
      retryAllowed: false,
      transmitting: false,
      savingReview: false,
      loadingPreview: false,
      isXmlPreviewOpen: false,
      xmlPreview: null,
      hasUnresolvedCfop: false,
      prepareDraft: vi.fn(),
      saveFiscalReview: vi.fn(),
      handlePreviewXml: mocks.handlePreviewXml,
      closeXmlPreview: mocks.closeXmlPreview,
      transmitOrReconcile: mocks.transmitOrReconcile,
    });

    renderWithAuth(
      <NfeOperationDraftModal
        sourceDocument={defaultSourceDoc}
        onClose={vi.fn()}
        onAuthorized={vi.fn()}
      />,
      { isRealAdministrator: true, activeRoleMode: null }
    );

    const previewButton = screen.getByTestId('nfe-preview-xml-button');
    expect(previewButton).toBeTruthy();
    expect(previewButton.textContent).toContain('Prévia do XML');
    fireEvent.click(previewButton);
    expect(mocks.handlePreviewXml).toHaveBeenCalledTimes(1);
  });

  it('renderiza o modal de diálogo de prévia do XML idêntico à emissão normal quando aberto', () => {
    const mockSignedXml = '<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe4126..."><ide><tpNF>0</tpNF></ide></infNFe></NFe>';

    mocks.hook.mockReturnValue({
      kind: 'estorno',
      returnOrders: [],
      reviewedLines: [{ draft_line_id: '1', cfop: '1202' }],
      payload: { draft: { status: 'ready' } },
      review: { reason: 'Teste' },
      productionConfirmed: false,
      retryAllowed: false,
      transmitting: false,
      savingReview: false,
      loadingPreview: false,
      isXmlPreviewOpen: true,
      xmlPreview: { success: true, preview: true, xml: mockSignedXml },
      hasUnresolvedCfop: false,
      prepareDraft: vi.fn(),
      saveFiscalReview: vi.fn(),
      handlePreviewXml: mocks.handlePreviewXml,
      closeXmlPreview: mocks.closeXmlPreview,
      transmitOrReconcile: mocks.transmitOrReconcile,
    });

    renderWithAuth(
      <NfeOperationDraftModal
        sourceDocument={defaultSourceDoc}
        onClose={vi.fn()}
        onAuthorized={vi.fn()}
      />,
      { isRealAdministrator: true, activeRoleMode: null }
    );

    const dialog = screen.getByTestId('nfe-xml-preview-dialog');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-label')).toBe('Prévia do XML fiscal');

    const content = screen.getByTestId('nfe-xml-preview-content');
    expect(content.textContent).toBe(mockSignedXml);

    const closeBtn = screen.getByTestId('nfe-xml-preview-close');
    fireEvent.click(closeBtn);
    expect(mocks.closeXmlPreview).toHaveBeenCalledTimes(1);
  });

  it('desabilita botão de prévia e transmissão quando CFOP não estiver determinado', () => {
    mocks.hook.mockReturnValue({
      kind: 'estorno',
      returnOrders: [],
      reviewedLines: [{ draft_line_id: '1', cfop: '' }],
      payload: { draft: { status: 'draft' } },
      review: { reason: 'Teste' },
      productionConfirmed: false,
      retryAllowed: false,
      transmitting: false,
      savingReview: false,
      loadingPreview: false,
      isXmlPreviewOpen: false,
      xmlPreview: null,
      hasUnresolvedCfop: true,
      prepareDraft: vi.fn(),
      saveFiscalReview: vi.fn(),
      handlePreviewXml: mocks.handlePreviewXml,
      closeXmlPreview: mocks.closeXmlPreview,
      transmitOrReconcile: mocks.transmitOrReconcile,
    });

    renderWithAuth(
      <NfeOperationDraftModal
        sourceDocument={defaultSourceDoc}
        onClose={vi.fn()}
        onAuthorized={vi.fn()}
      />,
      { isRealAdministrator: true, activeRoleMode: null }
    );

    const previewButton = screen.getByTestId('nfe-preview-xml-button') as HTMLButtonElement;
    expect(previewButton.disabled).toBe(true);

    const transmitButton = screen.getByRole('button', { name: /Transmitir NF-e/i }) as HTMLButtonElement;
    expect(transmitButton.disabled).toBe(true);
  });
});
