import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import type { PurchaseItem } from '@/pages/types/purchase.type';
import { ReceiptReadOnlyItemsSection } from './ReceiptReadOnlyItemsSection';
import { ReceiptFormHeader } from './ReceiptFormHeader';
import { ReceiptFormCosts } from './ReceiptFormCosts';
import ReturnObservationTags from '@/pages/App/SalesOrder/OrderActions/ReturnObservationTags';

describe('formulário de recebimento vinculado a NF-e', () => {
  it('mostra produto, quantidade e custos sem o campo de desconto', () => {
    const item = {
      productId: 'product-1',
      description: 'Roupeiro Seridó',
      quantity: 4,
      baseCost: 151,
      discountUnit: 2.5,
      unitCost: 148.5,
      totalCost: 594,
    } as PurchaseItem;
    const markup = renderToStaticMarkup(
      <ReceiptReadOnlyItemsSection items={[item]} formatCurrency={(value) => `R$ ${value.toFixed(2)}`} />,
    );

    expect(markup).toContain('Roupeiro Seridó');
    expect(markup).toContain('Quantidade');
    expect(markup).toContain('Custo unitário');
    expect(markup).toContain('R$ 151.00');
    expect(markup).not.toContain('R$ 2.50');
    expect(markup).not.toContain('Desconto por unidade');
    expect(markup).not.toContain('<input');
    expect(markup).not.toContain('<button');
  });

  it('mantém somente a data como campo editável no cabeçalho com NF', () => {
    const invoice = {
      emitterName: 'Móveis Sul',
      emitterCnpj: '00000000000000',
      nfeKey: '12345678901234567890123456789012345678901234',
    } as unknown as InboundInvoice;
    const markup = renderToStaticMarkup(
      <ReceiptFormHeader
        initialInboundInvoice={invoice}
        isInvoiceLinkedReceipt
        items={[]}
        suppliers={[]}
        supplierId="supplier-1"
        setSupplierId={() => undefined}
        receiptDate="2026-11-01"
        setReceiptDate={() => undefined}
      />,
    );

    expect(markup).toContain('Móveis Sul');
    expect(markup).toContain('type="date"');
    expect(markup.match(/<input\b/g)).toHaveLength(1);
    expect(markup).not.toContain('<button');
  });

  it('mostra os custos operacionais como informação quando a NF está vinculada', () => {
    const markup = renderToStaticMarkup(
      <ReceiptFormCosts
        readOnly
        isInvoiceLinkedReceipt
        baseValueForRateio={100}
        nonFiscalFreightMode="percent"
        setNonFiscalFreightMode={() => undefined}
        nonFiscalFreightValue={5}
        setNonFiscalFreightValue={() => undefined}
        nonFiscalOtherExpensesMode="fixed"
        setNonFiscalOtherExpensesMode={() => undefined}
        nonFiscalOtherExpensesValue={2}
        setNonFiscalOtherExpensesValue={() => undefined}
      />,
    );

    expect(markup).toContain('Despesas não fiscais');
    expect(markup).toContain('Custos cobrados fora da nota fiscal, rateados entre os itens.');
    expect(markup).not.toContain('Desconto');
    expect(markup).toContain('5%');
    expect(markup).toContain('R$ 2,00');
    expect(markup).not.toContain('<input');
    expect(markup).not.toContain('<button');
  });

  it('mantém o campo de observações editável no recebimento com NF', () => {
    const markup = renderToStaticMarkup(
      <ReturnObservationTags
        label="Observações do Recebimento"
        observations={[]}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('Observações do Recebimento');
    expect(markup).toContain('<input');
    expect(markup).toContain('Digite e pressione Enter');
    expect(markup).not.toContain('readonly');
  });
});
