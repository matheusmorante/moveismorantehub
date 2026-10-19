// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DOMParser } from '@xmldom/xmldom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NfeOperationDraftReview } from '../components/NfeOperationDraftReview';
import { parseFiscalOperationReview } from '../utils/parseFiscalOperationReview';
import type { DraftPayload, ReviewData, ReviewedLine } from '../types/fiscalOperationDraft.types';

beforeEach(() => vi.stubGlobal('DOMParser', DOMParser));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const productXml = '<prod><cProd>TEST-01</cProd><xProd>Mesa de teste</xProd><NCM>94036000</NCM><CFOP>1202</CFOP><uCom>UN</uCom><qCom>1.0000</qCom><vUnCom>100.00</vUnCom><vProd>100.00</vProd></prod>';
const taxesXml = '<imposto><ICMS><ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS></imposto>';
const reviewedLines: ReviewedLine[] = [{ draft_line_id: 'line-1', cfop: '1202', product_xml: productXml, taxes_xml: taxesXml }];
const review: ReviewData = {
  nature_of_operation: 'DEVOLUCAO DE VENDA DE MERCADORIA ADQUIRIDA OU RECEBIDA DE TERCEIROS',
  reason: 'Revisão de operação sintética.',
  recipient_xml: '<dest><CPF>12345678901</CPF><xNome>Cliente da revisão</xNome><enderDest><xLgr>Rua de Teste</xLgr><nro>10</nro><xBairro>Centro</xBairro><xMun>Curitiba</xMun><UF>PR</UF></enderDest><indIEDest>9</indIEDest></dest>',
  totals_xml: '<total><ICMSTot><vProd>100.00</vProd><vNF>100.00</vNF></ICMSTot></total>',
  transport_xml: '<transp><modFrete>9</modFrete></transp>',
  payment_xml: '<pag><detPag><tPag>90</tPag><vPag>0.00</vPag></detPag></pag>',
  item_taxes_confirmed: false, totals_confirmed: false, apportionment_review_confirmed: false, period_adjustment_text: '',
};

function renderReview(kind: 'return' | 'estorno') {
  const payload: DraftPayload = {
    draft: { id: 'draft-1', operation_kind: kind, status: 'draft', environment: 2, original_access_key: '1'.repeat(44) },
    source: { id: 'source-1', order_id: 'sale-1', modelo: '55', ambiente: 2, numero_nfe: 715, serie: '1', chave_acesso: '1'.repeat(44) },
    returnOrder: { id: 'return-1', orderIndex: 1, returnMethod: 'CLIENT_DELIVERED', operationContext: { issuerUf: 'PR', recipientUf: 'PR', scope: 'internal', returnMethod: 'CLIENT_DELIVERED', recipientFiscalStatus: 'non_taxpayer', isFinalConsumer: true, taxRegime: '1' } },
    lines: [{ id: 'line-1', fiscal_item_number: 1, quantity: 1, gross_value: 100, discount_value: 0, originalDescription: 'Mesa original', originalProductCode: 'TEST-01', originalQuantity: 3, originalGrossValue: 300, originalDiscountValue: 0, originalProductXml: productXml.replace('1.0000', '3.0000'), originalTaxesXml: taxesXml, suggestedCfop: '1202', allowedCfops: [{ value: '1202', label: '1202 - Devolução' }, { value: '1201', label: '1201 - Produção' }] }],
    reviewTemplate: review,
  };
  const onReviewChange = vi.fn();
  const onLineCfopChange = vi.fn();
  const onLineTaxesChange = vi.fn();
  render(<NfeOperationDraftReview payload={payload} review={review} reviewedLines={reviewedLines} isProduction={false} productionConfirmed={false} onProductionConfirmedChange={vi.fn()} onLineCfopChange={onLineCfopChange} onLineTaxesChange={onLineTaxesChange} onReviewChange={onReviewChange} />);
  return { onReviewChange, onLineCfopChange, onLineTaxesChange };
}

describe('apresentação legível da revisão fiscal', () => {
  it.each(['return', 'estorno'] as const)('%s usa as seis abas da nota normal e mantém controles fiscais sem XML aberto', kind => {
    const { onReviewChange, onLineCfopChange } = renderReview(kind);
    expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['Resumo', 'Cliente', 'Itens', 'Pagamento', 'Transporte', 'Eventos']);
    expect(screen.queryByRole('region', { name: 'XML da revisão fiscal' })).toBeNull();
    expect(screen.queryByLabelText('Destinatário (XML)')).toBeNull();
    fireEvent.click(screen.getByLabelText('Revisei totais, valores e referências fiscais da operação.'));
    expect(onReviewChange).toHaveBeenCalledWith('totals_confirmed', true);

    fireEvent.click(screen.getByRole('tab', { name: 'Cliente' }));
    expect(screen.getByText('Cliente da revisão')).toBeTruthy();
    expect(screen.getByText('Curitiba - PR')).toBeTruthy();
    expect(screen.getByText('Rua de Teste, 10')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Itens' }));
    expect(screen.getByText('Mesa de teste')).toBeTruthy();
    expect(screen.getByText('NCM 94036000')).toBeTruthy();
    expect(screen.getByText('CFOP 1202')).toBeTruthy();
    expect(screen.getByText('CST/CSOSN 102')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1201' } });
    expect(onLineCfopChange).toHaveBeenCalledWith(0, '1201');
    fireEvent.click(screen.getByRole('tab', { name: 'Pagamento' }));
    expect(screen.getByText('Sem pagamento')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Transporte' }));
    expect(screen.queryByText('modFrete: 9')).toBeNull();
    expect(document.body.textContent).toContain('Sem ocorrência de transporte');
    fireEvent.click(screen.getByRole('tab', { name: 'Eventos' }));
    expect(screen.getByText('Rascunho em elaboração.')).toBeTruthy();
    expect(document.querySelector('textarea')).toBeNull();
    expect(document.body.textContent).not.toContain('<dest>');
  });

  it.each(['return', 'estorno'] as const)('%s só exibe blocos XML por ação explícita e conserva suas permissões', kind => {
    const { onLineTaxesChange, onReviewChange } = renderReview(kind);
    fireEvent.click(screen.getByRole('button', { name: 'Ver XML da revisão' }));
    expect((screen.getByLabelText('Produto 1 (XML somente leitura)') as HTMLTextAreaElement).readOnly).toBe(true);
    const taxes = screen.getByLabelText('Tributos do item 1 (XML)') as HTMLTextAreaElement;
    const recipient = screen.getByLabelText('Destinatário (XML)') as HTMLTextAreaElement;
    expect(taxes.value).toBe(taxesXml);
    expect(taxes.readOnly).toBe(kind === 'return');
    expect(recipient.readOnly).toBe(kind === 'return');
    if (kind === 'estorno') {
      fireEvent.change(taxes, { target: { value: '<imposto />' } });
      expect(onLineTaxesChange).toHaveBeenCalledWith(0, '<imposto />');
      fireEvent.change(recipient, { target: { value: '<dest />' } });
      expect(onReviewChange).toHaveBeenCalledWith('recipient_xml', '<dest />');
    }
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar XML da revisão' }));
    expect(screen.queryByLabelText('Destinatário (XML)')).toBeNull();
    expect(review.recipient_xml).toContain('Cliente da revisão');
    expect(reviewedLines[0].taxes_xml).toBe(taxesXml);
  });

  it('apresenta os valores da revisão proporcional sem reescrever os fragmentos nem usar a quantidade original', () => {
    const before = JSON.stringify({ review, reviewedLines });
    const parsed = parseFiscalOperationReview(review, reviewedLines);
    expect(parsed?.items[0]).toMatchObject({ description: 'Mesa de teste', quantity: '1.0000', total: '100.00', cfop: '1202', cst: '102' });
    expect(parsed?.general.total).toBe('100.00');
    expect(JSON.stringify({ review, reviewedLines })).toBe(before);
    expect(parseFiscalOperationReview({ ...review, totals_xml: '' }, [])).toBeNull();
  });
});
