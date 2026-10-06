// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { FiscalDocumentStatusBadge } from '../components/FiscalDocumentStatusBadge';
import { FiscalDocumentsHeader } from '../components/FiscalDocumentsHeader';
import { FiscalDocumentsPagination } from '../components/FiscalDocumentsPagination';
import { FiscalCceModal } from '../modals/FiscalCceModal';
import { FiscalCancelModal } from '../modals/FiscalCancelModal';
import type { NfeDocumentRecord } from '../types/fiscalDocuments.types';

afterEach(cleanup);

describe('FiscalDocuments - Components', () => {
  it('renderiza FiscalDocumentStatusBadge corretamente para status variados', () => {
    const { rerender } = render(<FiscalDocumentStatusBadge status="autorizada" />);
    expect(screen.getByText('Autorizada')).toBeDefined();

    rerender(<FiscalDocumentStatusBadge status="cancelada" />);
    expect(screen.getByText('Cancelada')).toBeDefined();

    rerender(<FiscalDocumentStatusBadge status="rejeitada" />);
    expect(screen.getByText('Rejeitada')).toBeDefined();

    rerender(<FiscalDocumentStatusBadge status="abandoned" />);
    expect(screen.getByText('Tentativa encerrada')).toBeDefined();
  });

  it('renderiza o cabeçalho fiscal compacto sem subtítulo ou botão Atualizar', () => {
    render(<FiscalDocumentsHeader />);

    expect(screen.getByText('Notas Fiscais de Saída')).toBeDefined();
    expect(screen.queryByText(/Consulta e acompanhamento dos documentos/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Atualizar/i })).toBeNull();
  });

  it('renderiza FiscalDocumentsPagination e permite trocar página', async () => {
    const onPageChange = vi.fn();
    render(
      <FiscalDocumentsPagination
        documentCount={75}
        pageIndex={0}
        onPageChange={onPageChange}
      />
    );

    expect(screen.getByText(/75 documento\(s\)/)).toBeDefined();
    expect(screen.getByText(/Página 1 de 3/)).toBeDefined();

    const nextBtn = screen.getByRole('button', { name: /Próxima/i });
    await userEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('renderiza FiscalCceModal e valida limites e botões', () => {
    const mockDoc: NfeDocumentRecord = {
      id: 'doc-1',
      order_id: 'ord-1',
      numero_nfe: 100,
      serie: '1',
      chave_acesso: '123',
      modelo: '55',
      ambiente: 2,
      status: 'autorizada',
      created_at: '',
      updated_at: '',
    };

    render(
      <FiscalCceModal
        isOpen={true}
        document={mockDoc}
        cceText="Correção de endereço no complemento do cliente Morante."
        onCceTextChange={vi.fn()}
        isSubmitting={false}
        isLoadingInfo={false}
        previousCorrection=""
        nextSequence={2}
        isPending={false}
        productionConfirmed={false}
        onProductionConfirmedChange={vi.fn()}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        onReconcile={vi.fn()}
      />
    );

    expect(screen.getByText('Carta de Correção Eletrônica (CC-e)')).toBeDefined();
    expect(screen.getByText(/Próxima sequência: 2 de 20/)).toBeDefined();
    const submitBtn = screen.getByRole('button', { name: /Transmitir CC-e à SEFAZ/i });
    expect(submitBtn.hasAttribute('disabled')).toBe(false);
  });

  it('renderiza FiscalCancelModal e exibe dados fiscais', () => {
    const mockDoc: NfeDocumentRecord = {
      id: 'doc-1',
      order_id: 'ord-1',
      numero_nfe: 100,
      serie: '1',
      chave_acesso: '41261044512248000107550010000007011234567890',
      modelo: '55',
      ambiente: 2,
      status: 'autorizada',
      valor_total: 1500,
      destinatario_nome: 'João da Silva',
      created_at: '',
      updated_at: '',
    };

    render(
      <MemoryRouter>
        <FiscalCancelModal
          isOpen={true}
          document={mockDoc}
          eligibility={{ canProceed: true, action: 'cancel' }}
          orderNumber={5001}
          cancelReason="Cancelamento comercial antes da circulação da mercadoria."
          onCancelReasonChange={vi.fn()}
          isCanceling={false}
          isConsulting={false}
          productionConfirmed={false}
          onProductionConfirmedChange={vi.fn()}
          onClose={vi.fn()}
          onConsultSituation={vi.fn()}
          onConfirmCancel={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Cancelar NF-e')).toBeDefined();
    expect(screen.getByText('João da Silva')).toBeDefined();
    expect(screen.getByText('R$ 1.500,00')).toBeDefined();
  });
});
