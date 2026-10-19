// @vitest-environment happy-dom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { IssuedFiscalDocumentSummaryTab } from '../components/tabs/IssuedFiscalDocumentSummaryTab';
import type { FiscalDocumentDetails } from '../types/fiscalDocuments.types';

afterEach(cleanup);

function renderSummary(cStat: string | null, protocolNumber: string | null, status = 'erro') {
  const details: FiscalDocumentDetails = {
    document: {
      id: 'rejected-706', order_id: 'test-sale', numero_nfe: 706, serie: '1',
      chave_acesso: '41261044512248000107550010000007061446761435', modelo: '55', ambiente: 2,
      status, numero_protocolo: protocolNumber, valor_total: 100, destinatario_nome: 'Teste',
      destinatario_documento: null, created_at: '2026-10-17T20:10:00Z', updated_at: '2026-10-17T20:10:00Z',
      xml_nfe: null,
      xml_protocolo: cStat ? `<protNFe><infProt><cStat>${cStat}</cStat>${protocolNumber ? `<nProt>${protocolNumber}</nProt>` : ''}<dhRecbto>2026-10-17T22:52:00-03:00</dhRecbto></infProt></protNFe>` : null,
    },
    parsedXml: null, events: [],
  };
  render(<IssuedFiscalDocumentSummaryTab details={details} parsed={null} />);
  return within(screen.getByText('Data autorização').parentElement!);
}

describe('data de autorização nos detalhes fiscais', () => {
  it.each([
    ['434', null, 'erro'],
    ['301', '141260000000001', 'denegada'],
    ['104', null, 'pendente'],
    [null, null, 'homologada'],
  ])('não transforma recebimento/criação em autorização para %s / %s / %s', (cStat, protocol, status) => {
    const authorization = renderSummary(cStat, protocol, status!);
    expect(authorization.getByText('—')).toBeTruthy();
  });

  it.each([
    ['100', 'homologada'],
    ['150', 'autorizada'],
    ['100', 'cancelada'],
  ])('preserva a data do protocolo de autorização %s quando o estado é %s', (cStat, status) => {
    const authorization = renderSummary(cStat, '141260000000001', status);
    expect(authorization.queryByText('—')).toBeNull();
    expect(authorization.getByText(/18\/10\/2026|17\/10\/2026/)).toBeTruthy();
  });
});
