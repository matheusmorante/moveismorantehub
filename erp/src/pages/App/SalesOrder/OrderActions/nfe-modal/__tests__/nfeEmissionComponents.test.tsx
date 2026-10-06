// @vitest-environment happy-dom

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import type Order from '@/pages/types/order.type';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';
import { NfeEmissionFooter } from '../components/NfeEmissionFooter';
import { NfeEmissionHeader } from '../components/NfeEmissionHeader';
import { NfeEmissionTabBar } from '../components/NfeEmissionTabBar';
import { NfeFiscalIssueModal } from '../components/NfeFiscalIssueModal';

describe('NfeEmission Components', () => {
  const dummyOrder: Order = {
    id: 'ord-123',
    orderIndex: '1001',
    company_id: 'c1',
    created_at: new Date().toISOString(),
    customerData: { fullName: 'Teste' },
    items: [],
  };

  it('renderiza o cabeçalho com indicador de homologação e aciona fechamento', () => {
    const onClose = vi.fn();
    render(
      <NfeEmissionHeader
        order={dummyOrder}
        modelLabel="NF-e · modelo 55 necessária"
        environment={2}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Emitir nota fiscal de saída')).toBeTruthy();
    expect(screen.getByText(/Pedido #1001/)).toBeTruthy();
    expect(screen.getByText('Homologação')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Fechar emissão fiscal'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renderiza a barra de abas e permite alternar entre abas', () => {
    const onTabChange = vi.fn();
    render(<NfeEmissionTabBar activeTab="general" onTabChange={onTabChange} />);

    expect(screen.getByRole('tab', { name: 'Informações Gerais' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Transporte' })).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Transporte' }));
    expect(onTabChange).toHaveBeenCalledWith('transport');
  });

  it('renderiza o rodapé com total formatado e aciona emissão', () => {
    const onEmit = vi.fn();
    render(
      <NfeEmissionFooter
        invoiceTotal={250.75}
        environment={1}
        isNfce={false}
        canOperateFiscal={true}
        isSubmitting={false}
        isLoadingFiscalData={false}
        isLoadingNfeNumber={false}
        isLoadingCustomerType={false}
        fiscalPreparationError={null}
        emissionResult={null}
        productionConfirmed={false}
        onClose={vi.fn()}
        onEmit={onEmit}
        onPrintDanfe={vi.fn()}
      />
    );

    expect(screen.getByText(/R\$\s*250,75/)).toBeTruthy();
    const emitBtn = screen.getByTestId('nfe-emit-button');
    expect(emitBtn.hasAttribute('disabled')).toBe(false);

    fireEvent.click(emitBtn);
    expect(onEmit).toHaveBeenCalledWith(false, false);
  });

  it('exibe o ícone de alerta no cabeçalho somente quando há erro fiscal e aciona onOpenFiscalIssue', () => {
    const onOpenFiscalIssue = vi.fn();
    const { rerender } = render(
      <NfeEmissionHeader
        order={dummyOrder}
        modelLabel="NF-e · modelo 55 necessária"
        environment={2}
        onClose={vi.fn()}
        hasFiscalIssue={false}
      />
    );

    expect(screen.queryByTestId('nfe-fiscal-issue-trigger')).toBeNull();

    rerender(
      <NfeEmissionHeader
        order={dummyOrder}
        modelLabel="NF-e · modelo 55 necessária"
        environment={2}
        onClose={vi.fn()}
        hasFiscalIssue={true}
        fiscalIssueTone="error"
        onOpenFiscalIssue={onOpenFiscalIssue}
      />
    );

    const trigger = screen.getByTestId('nfe-fiscal-issue-trigger');
    expect(trigger).toBeTruthy();
    expect(trigger.textContent).toContain('Aviso fiscal');
    expect(trigger.querySelector('.bi-exclamation-triangle-fill')).toBeTruthy();

    fireEvent.click(trigger);
    expect(onOpenFiscalIssue).toHaveBeenCalledTimes(1);
  });

  it('renderiza o modal NfeFiscalIssueModal quando aberto com erro fiscal e permite fechar', () => {
    const onClose = vi.fn();
    const emissionResultWithError: NfeEmissionResult = {
      success: false,
      pending: false,
      model: '55',
      environment: 2,
      error: 'Operação interestadual. Esta operação exige matriz tributária específica aprovada.',
      technicalDetails: {
        apiCode: 'OPERATION_NOT_ALLOWED',
      },
    };

    const { rerender } = render(
      <NfeFiscalIssueModal
        isOpen={false}
        onClose={onClose}
        emissionResult={emissionResultWithError}
        environment={2}
        productionConfirmed={false}
        retryNumber=""
        canOperateFiscal={true}
        isSubmitting={false}
        isLoadingFiscalData={false}
        isLoadingNfeNumber={false}
        fiscalPreparationError={null}
      />
    );

    expect(screen.queryByRole('dialog', { name: 'Aviso da Nota Fiscal' })).toBeNull();
    expect(screen.queryByTestId('fiscal-issue-card')).toBeNull();

    rerender(
      <NfeFiscalIssueModal
        isOpen={true}
        onClose={onClose}
        emissionResult={emissionResultWithError}
        environment={2}
        productionConfirmed={false}
        retryNumber=""
        canOperateFiscal={true}
        isSubmitting={false}
        isLoadingFiscalData={false}
        isLoadingNfeNumber={false}
        fiscalPreparationError={null}
      />
    );

    expect(screen.getByText('Aviso da Nota Fiscal')).toBeTruthy();
    expect(screen.getByTestId('fiscal-issue-card')).toBeTruthy();
    expect(screen.getByText(/Operação interestadual/)).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Fechar aviso'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
