// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NfeEmissionHeader } from '../components/NfeEmissionHeader';
import { NfeEmissionTabBar } from '../components/NfeEmissionTabBar';
import { NfeEmissionFooter } from '../components/NfeEmissionFooter';
import type Order from '@/pages/types/order.type';

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
});
