// @vitest-environment happy-dom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IssuedFiscalDocumentLinkedTab } from '../components/tabs/IssuedFiscalDocumentLinkedTab';
import type { NfeDocumentRecord, FiscalOperationDraftSummary } from '../types/fiscalDocuments.types';

afterEach(cleanup);

describe('IssuedFiscalDocumentLinkedTab', () => {
  it('exibe estado vazio quando não há documentos vinculados', () => {
    render(<IssuedFiscalDocumentLinkedTab linkedDocuments={[]} operationDrafts={[]} />);
    expect(screen.getByText('Nenhum documento vinculado')).toBeTruthy();
  });

  it('renderiza nota fiscal de estorno vinculada com chave, protocolo e ações', () => {
    const estornoDoc: NfeDocumentRecord = {
      id: 'doc-estorno-733',
      order_id: 'order-1',
      numero_nfe: 733,
      serie: '1',
      chave_acesso: '41261044512248000107550010000007331046645952',
      modelo: '55',
      ambiente: 2,
      status: 'homologada',
      numero_protocolo: '141260000000733',
      created_at: '2026-10-19T22:15:00Z',
      updated_at: '2026-10-19T22:15:00Z',
      document_type: 'estorno',
      xml_nfe: '<nfeProc />',
    };

    render(<IssuedFiscalDocumentLinkedTab linkedDocuments={[estornoDoc]} />);
    expect(screen.getByText(/NF-e de Estorno nº 733/)).toBeTruthy();
    expect(screen.getByText('Nota de estorno')).toBeTruthy();
    expect(screen.getByText('homologada')).toBeTruthy();
    expect(screen.getByText('141260000000733')).toBeTruthy();
    expect(screen.getByText(/Imprimir DANFE/)).toBeTruthy();
    expect(screen.getByText(/Baixar XML/)).toBeTruthy();
    expect(screen.getByText(/Ver XML/)).toBeTruthy();
  });

  it('renderiza nota fiscal de devolução (NFD) vinculada com valor e ações', () => {
    const returnDoc: NfeDocumentRecord = {
      id: 'doc-return-709',
      order_id: 'order-1',
      numero_nfe: 709,
      serie: '1',
      chave_acesso: '41261044512248000107550010000007091046645952',
      modelo: '55',
      ambiente: 2,
      status: 'homologada',
      valor_total: 450.0,
      numero_protocolo: '141260000000709',
      created_at: '2026-10-18T15:30:00Z',
      updated_at: '2026-10-18T15:30:00Z',
      document_type: 'return',
      xml_nfe: '<nfeProc />',
    };

    render(<IssuedFiscalDocumentLinkedTab linkedDocuments={[returnDoc]} />);
    expect(screen.getByText(/NF-e de Devolução nº 709/)).toBeTruthy();
    expect(screen.getByText('homologada')).toBeTruthy();
    expect(screen.getByText(/450,00/)).toBeTruthy();
    expect(screen.getByText(/Imprimir DANFE/)).toBeTruthy();
    expect(screen.getByText(/Baixar XML/)).toBeTruthy();
  });

  it('renderiza rascunho de estorno em andamento com motivação', () => {
    const draft: FiscalOperationDraftSummary = {
      id: 'draft-estorno-1',
      operation_kind: 'estorno',
      environment: 2,
      status: 'ready',
      reason: 'Mercadoria não circulou conforme art. 298 RICMS/PR',
      created_at: '2026-10-20T14:00:00Z',
    };

    render(<IssuedFiscalDocumentLinkedTab operationDrafts={[draft]} />);
    expect(screen.getByText('Pronto para transmissão')).toBeTruthy();
    expect(screen.getByText(/Mercadoria não circulou conforme art. 298 RICMS\/PR/)).toBeTruthy();
  });

  it('renderiza o histórico de emissões do pedido (1ª e 2ª emissão) e permite selecionar', () => {
    const onSelect = vi.fn();
    const emissions: NfeDocumentRecord[] = [
      {
        id: 'doc-emission-1',
        order_id: 'order-1',
        numero_nfe: 100,
        serie: '1',
        chave_acesso: '41261044512248000107550010000001001046645952',
        modelo: '55',
        ambiente: 1,
        status: 'cancelada',
        valor_total: 1200.0,
        created_at: '2026-10-18T10:00:00Z',
        updated_at: '2026-10-18T11:00:00Z',
        document_type: 'outbound',
      },
      {
        id: 'doc-emission-2',
        order_id: 'order-1',
        numero_nfe: 101,
        serie: '1',
        chave_acesso: '41261044512248000107550010000001011046645952',
        modelo: '55',
        ambiente: 1,
        status: 'autorizada',
        valor_total: 1200.0,
        created_at: '2026-10-18T14:00:00Z',
        updated_at: '2026-10-18T14:00:00Z',
        document_type: 'outbound',
      },
    ];

    render(
      <IssuedFiscalDocumentLinkedTab
        orderEmissions={emissions}
        currentDocumentId="doc-emission-2"
        onSelectDocument={onSelect}
      />
    );

    expect(screen.getByText(/Histórico de Emissões do Pedido \(2\)/)).toBeTruthy();
    expect(screen.getByText(/1ª Emissão/)).toBeTruthy();
    expect(screen.getByText(/2ª Emissão/)).toBeTruthy();
    expect(screen.getByText(/NF-e nº 100/)).toBeTruthy();
    expect(screen.getByText(/NF-e nº 101/)).toBeTruthy();
    expect(screen.getByText(/Em visualização/)).toBeTruthy();
    expect(screen.getByText(/Ver detalhes/)).toBeTruthy();
  });
});
