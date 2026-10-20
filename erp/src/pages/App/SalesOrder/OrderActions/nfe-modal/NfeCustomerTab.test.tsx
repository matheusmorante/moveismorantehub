// @vitest-environment happy-dom
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NfeCustomerTab } from './NfeCustomerTab';
import type Order from '@/pages/types/order.type';

const baseOrder: Order = {
  id: 'order-1',
  date: '2026-10-06',
  observation: '',
  items: [],
  payments: [],
  paymentsSummary: {
    totalPaymentsFee: 0,
    totalOrderValue: 100,
    totalAmountPaid: 100,
    amountRemaining: 0,
  },
  customerData: {
    fullName: 'Empresa Teste LTDA',
    personType: 'PJ',
    cpfCnpj: '12.345.678/0001-90',
    ie: '9012345678',
    ieIndicator: '1',
    phone: '41999999999',
    fullAddress: {
      street: 'Rua Principal',
      number: '100',
      neighborhood: 'Centro',
      city: 'Curitiba',
      state: 'PR',
      cep: '80000000',
    },
  },
};

describe('NfeCustomerTab - Dados Fiscais (IE e indIEDest)', () => {
  afterEach(() => cleanup());

  it('mostra o erro de finalidade junto à situação perante o ICMS', () => {
    const message = 'Destinatário não contribuinte exige operação com consumidor final.';
    render(<NfeCustomerTab order={baseOrder} customerPersonType="PF" isIdentityOptional={false}
      recipientTaxId="10000044067" onRecipientTaxIdChange={vi.fn()} recipientTaxIdError={null}
      recipientTaxIdInputRef={{ current: null }} recipientIeIndicator="9"
      recipientIeIndicatorError={message} fiscalModel="55" />);
    const field = screen.getByLabelText(/Situação perante o ICMS/);
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toContain(message);
    expect(field.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id);
  });

  it('usa o tipo cadastrado do cliente para definir o documento, mesmo se a exigência divergir', () => {
    render(
      <NfeCustomerTab
        order={baseOrder}
        customerPersonType="PJ"
        isIdentityOptional={false}
        recipientTaxId="12.345.678/0001-90"
        onRecipientTaxIdChange={vi.fn()}
        recipientTaxIdError={null}
        recipientTaxIdInputRef={{ current: null }}
        documentType="CPF"
        fiscalModel="65"
      />
    );

    expect(screen.getByText('Pessoa Jurídica (PJ)')).toBeTruthy();
    expect(screen.getByLabelText(/CNPJ/)).toBeTruthy();
    expect(screen.queryByLabelText(/^CPF/)).toBeNull();
  });

  it('não infere se o cliente é PF ou PJ pelo formato do documento', () => {
    render(
      <NfeCustomerTab
        order={{ ...baseOrder, customerData: { ...baseOrder.customerData, personType: undefined } }}
        isIdentityOptional={false}
        recipientTaxId="12.345.678/0001-90"
        onRecipientTaxIdChange={vi.fn()}
        recipientTaxIdError={null}
        recipientTaxIdInputRef={{ current: null }}
        documentType="CPF/CNPJ"
        fiscalModel="65"
      />
    );

    expect(screen.getByText('Tipo de pessoa não determinado')).toBeTruthy();
    expect(screen.getByLabelText(/CPF\/CNPJ/)).toBeTruthy();
  });

  it('mantém a entrada limitada a CPF quando o tipo cadastrado é PF', () => {
    const onRecipientTaxIdChange = vi.fn();
    render(
      <NfeCustomerTab
        order={{
          ...baseOrder,
          customerData: { ...baseOrder.customerData, personType: 'PF' },
        }}
        customerPersonType="PF"
        isIdentityOptional={false}
        recipientTaxId="123.456.789-09"
        onRecipientTaxIdChange={onRecipientTaxIdChange}
        recipientTaxIdError={null}
        recipientTaxIdInputRef={{ current: null }}
        fiscalModel="55"
      />
    );

    fireEvent.change(screen.getByLabelText(/^CPF/) as HTMLInputElement, {
      target: { value: '12345678000190' },
    });

    expect(onRecipientTaxIdChange).toHaveBeenCalledWith('123.456.780-00');
  });

  it('exibe a seção de dados fiscais com situação perante o ICMS e IE', () => {
    render(
      <NfeCustomerTab
        order={baseOrder}
        customerPersonType="PJ"
        isIdentityOptional={false}
        recipientTaxId="12.345.678/0001-90"
        onRecipientTaxIdChange={vi.fn()}
        recipientTaxIdError={null}
        recipientTaxIdInputRef={{ current: null }}
        recipientIe="9012345678"
        recipientIeIndicator="1"
        fiscalModel="55"
      />
    );

    expect(screen.getByText('Dados Fiscais do Destinatário (ICMS / Inscrição Estadual)')).toBeTruthy();
    expect(screen.getByLabelText(/Situação perante o ICMS/)).toBeTruthy();
    expect(screen.getByLabelText(/Inscrição Estadual/)).toBeTruthy();

    const indicatorSelect = screen.getByLabelText(/Situação perante o ICMS/) as HTMLSelectElement;
    expect(indicatorSelect.value).toBe('1');

    const ieInput = screen.getByLabelText(/Inscrição Estadual/) as HTMLInputElement;
    expect(ieInput.value).toBe('9012345678');
  });

  it('permite alterar a situação do ICMS e notifica callback', () => {
    const onIndicatorChange = vi.fn();
    render(
      <NfeCustomerTab
        order={baseOrder}
        customerPersonType="PJ"
        isIdentityOptional={false}
        recipientTaxId="12.345.678/0001-90"
        onRecipientTaxIdChange={vi.fn()}
        recipientTaxIdError={null}
        recipientTaxIdInputRef={{ current: null }}
        recipientIe="9012345678"
        recipientIeIndicator="1"
        onRecipientIeIndicatorChange={onIndicatorChange}
        fiscalModel="55"
      />
    );

    const indicatorSelect = screen.getByLabelText(/Situação perante o ICMS/) as HTMLSelectElement;
    fireEvent.change(indicatorSelect, { target: { value: '2' } });

    expect(onIndicatorChange).toHaveBeenCalledWith('2');
  });

  it('desabilita o campo de IE quando o destinatário é Isento (indIEDest=2)', () => {
    render(
      <NfeCustomerTab
        order={{
          ...baseOrder,
          customerData: {
            ...baseOrder.customerData,
            ie: '',
            ieIndicator: '2',
          },
        }}
        customerPersonType="PJ"
        isIdentityOptional={false}
        recipientTaxId="12.345.678/0001-90"
        onRecipientTaxIdChange={vi.fn()}
        recipientTaxIdError={null}
        recipientTaxIdInputRef={{ current: null }}
        recipientIe=""
        recipientIeIndicator="2"
        fiscalModel="55"
      />
    );

    const ieInput = screen.getByLabelText(/Inscrição Estadual/) as HTMLInputElement;
    expect(ieInput.disabled).toBe(true);
    expect(ieInput.placeholder).toContain('Dispensada');
  });

  it('no modelo NFC-e (65) desabilita a edição e indica que é sempre Não Contribuinte', () => {
    render(
      <NfeCustomerTab
        order={baseOrder}
        customerPersonType="PJ"
        isIdentityOptional={true}
        recipientTaxId="12.345.678/0001-90"
        onRecipientTaxIdChange={vi.fn()}
        recipientTaxIdError={null}
        recipientTaxIdInputRef={{ current: null }}
        recipientIe=""
        recipientIeIndicator="9"
        fiscalModel="65"
      />
    );

    expect(screen.getByText('NFC-e: sempre Não Contribuinte')).toBeTruthy();
    const indicatorSelect = screen.getByLabelText(/Situação perante o ICMS/) as HTMLSelectElement;
    expect(indicatorSelect.disabled).toBe(true);
    const ieInput = screen.getByLabelText(/Inscrição Estadual/) as HTMLInputElement;
    expect(ieInput.disabled).toBe(true);
  });
});
