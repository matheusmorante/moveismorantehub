// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NfeTransportSection, type ThirdPartyTransporterForm } from './NfeTransportSection';

const transporter: ThirdPartyTransporterForm = {
  personType: 'PJ',
  cnpjCpf: '',
  name: '',
};

const renderSection = (fiscalModel: '55' | '65', deliveryMethod: 'delivery' | 'pickup') =>
  render(
    <NfeTransportSection
      fiscalModel={fiscalModel}
      deliveryMethod={deliveryMethod}
      transportResponsible={
        fiscalModel === '55' && deliveryMethod === 'pickup' ? 'CUSTOMER' : 'OWN_COMPANY'
      }
      onTransportResponsibleChange={vi.fn()}
      freightContractResponsible="SENDER"
      onFreightContractResponsibleChange={vi.fn()}
      thirdPartyTransporter={transporter}
      onThirdPartyTransporterChange={vi.fn()}
    />
  );

describe('NfeTransportSection', () => {
  afterEach(() => cleanup());

  it('mostra somente o aviso de pedido sem transporte para NFC-e com retirada', () => {
    renderSection('65', 'pickup');

    expect(screen.getByText('Pedido sem transporte')).toBeTruthy();
    expect(screen.getByText(/Modalidade: 9 — Sem ocorrência de transporte/)).toBeTruthy();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByText('Quem realiza o transporte?')).toBeNull();
  });

  it('abre as opções de responsável para NF-e 55 com retirada', () => {
    renderSection('55', 'pickup');

    expect(screen.getByText('Quem realiza o transporte?')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Próprio cliente/ })).toBeTruthy();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('abre as opções de responsável para pedidos de entrega', () => {
    renderSection('65', 'delivery');

    expect(screen.getByText('Quem realiza o transporte?')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Própria empresa/ })).toBeTruthy();
    expect(screen.queryByLabelText(/CNPJ \*/)).toBeNull();
    expect(screen.queryByLabelText(/CPF \*/)).toBeNull();
    expect(screen.queryByLabelText(/Nome \/ Razão Social \*/)).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
  });
});
