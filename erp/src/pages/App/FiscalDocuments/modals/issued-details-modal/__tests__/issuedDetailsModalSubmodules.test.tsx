// @vitest-environment happy-dom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { IssuedFiscalDocumentDetailsHeader } from '../IssuedFiscalDocumentDetailsHeader';
import { IssuedFiscalDocumentAnteriorBanner } from '../IssuedFiscalDocumentAnteriorBanner';
import { IssuedFiscalDocumentDetailsFooter } from '../IssuedFiscalDocumentDetailsFooter';

afterEach(cleanup);

describe('issued-details-modal submodules', () => {
  describe('IssuedFiscalDocumentDetailsHeader', () => {
    it('renderiza título, ambiente e número do pedido', () => {
      render(
        <IssuedFiscalDocumentDetailsHeader
          title="NF-e"
          isEstorno={false}
          isDevolucao={false}
          environment={1}
          isEstornada={false}
          status="autorizada"
          documentNumberLabel="nº 123"
          orderNumber={5500}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText('Detalhes da nota fiscal')).toBeTruthy();
      expect(screen.getByText('Produção')).toBeTruthy();
      expect(screen.getByText(/NF-e nº 123.*Pedido #5500/)).toBeTruthy();
    });

    it('renderiza rótulo de estorno quando isEstorno é true', () => {
      render(
        <IssuedFiscalDocumentDetailsHeader
          title="NF-e de Estorno Fiscal"
          isEstorno={true}
          isDevolucao={false}
          environment={2}
          isEstornada={false}
          status="homologada"
          documentNumberLabel="nº 733"
          orderNumber={5500}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText('Detalhes da nota fiscal de estorno fiscal')).toBeTruthy();
      expect(screen.getByText('Homologação')).toBeTruthy();
    });
  });

  describe('IssuedFiscalDocumentAnteriorBanner', () => {
    it('exibe alerta de emissão anterior e permite voltar para a nota ativa', () => {
      const onReturn = vi.fn();
      render(
        <IssuedFiscalDocumentAnteriorBanner
          currentActiveEmission={{
            id: 'doc-active',
            order_id: 'order-1',
            numero_nfe: 658,
            serie: '1',
            ambiente: 2,
            status: 'homologada',
            document_type: 'outbound',
            created_at: '2026-10-20T10:00:00Z',
          }}
          onReturnToActive={onReturn}
        />
      );

      expect(screen.getByText(/Visualizando/)).toBeTruthy();
      expect(screen.getByText(/emissão anterior/)).toBeTruthy();

      const button = screen.getByRole('button', { name: /Voltar à nota vigente/i });
      fireEvent.click(button);
      expect(onReturn).toHaveBeenCalledWith('doc-active');
    });
  });

  describe('IssuedFiscalDocumentDetailsFooter', () => {
    it('renderiza ações de XML e DANFE quando não há rascunho', () => {
      const onPrint = vi.fn();
      const onDownload = vi.fn();
      const onShare = vi.fn();
      const onXml = vi.fn();
      const onClose = vi.fn();

      render(
        <IssuedFiscalDocumentDetailsFooter
          storedXml="<xml />"
          hasDetailsOrDocument={true}
          hasXmlAvailable={true}
          isLoading={false}
          shareFile={new File(['pdf'], 'danfe.pdf')}
          onReviewDraft={vi.fn()}
          onShowXml={onXml}
          onPrintDanfe={onPrint}
          onDownloadXml={onDownload}
          onShareDanfe={onShare}
          onClose={onClose}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Imprimir DANFE/i }));
      expect(onPrint).toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: /Baixar XML/i }));
      expect(onDownload).toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: /Compartilhar DANFE/i }));
      expect(onShare).toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: /Ver XML/i }));
      expect(onXml).toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: /Fechar/i }));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('FiscalSituationNotice contextual actions', () => {
    it('renderiza aviso e botão Emitir nova nota fiscal para awaiting_new_invoice com referência à nota anterior', async () => {
      const { FiscalSituationNotice } = await import('../../../components/FiscalSituationNotice');
      const onAction = vi.fn();

      render(
        <FiscalSituationNotice
          situation={{
            status: 'reissue_required',
            actionKind: 'awaiting_new_invoice',
            environment: 1,
            orderCancelled: false,
            previousDocumentNumber: 124,
            previousDocumentClosure: 'estornada',
          }}
          onExecuteAction={onAction}
        />
      );

      expect(screen.getByText('Nova nota fiscal necessária')).toBeTruthy();
      expect(screen.getByText(/NF anterior nº 124/)).toBeTruthy();
      expect(screen.getByText(/^estornada$/i)).toBeTruthy();

      const button = screen.getByRole('button', { name: /Emitir nova nota fiscal/i });
      expect(button).toBeTruthy();
      fireEvent.click(button);
      expect(onAction).toHaveBeenCalledWith('awaiting_new_invoice');
    });

    it('renderiza Continuar emissão quando actionKind é draft', async () => {
      const { FiscalSituationNotice } = await import('../../../components/FiscalSituationNotice');
      const onAction = vi.fn();

      render(
        <FiscalSituationNotice
          situation={{
            status: 'reissue_required',
            actionKind: 'draft',
            environment: 2,
            orderCancelled: false,
            previousDocumentNumber: 655,
            previousDocumentClosure: 'estornada',
          }}
          onExecuteAction={onAction}
        />
      );

      expect(screen.getByText('Emissão não transmitida')).toBeTruthy();
      const button = screen.getByRole('button', { name: /Continuar emissão/i });
      fireEvent.click(button);
      expect(onAction).toHaveBeenCalledWith('draft');
    });

    it('renderiza Corrigir emissão quando actionKind é rejected', async () => {
      const { FiscalSituationNotice } = await import('../../../components/FiscalSituationNotice');
      const onAction = vi.fn();

      render(
        <FiscalSituationNotice
          situation={{
            status: 'reissue_required',
            actionKind: 'rejected',
            environment: 1,
            orderCancelled: false,
            reason: '778 - Informado NCM inexistente',
          }}
          onExecuteAction={onAction}
        />
      );

      expect(screen.getByText('Nova nota fiscal rejeitada pela SEFAZ')).toBeTruthy();
      expect(screen.getByText(/778 - Informado NCM inexistente/)).toBeTruthy();
      const button = screen.getByRole('button', { name: /Corrigir emissão/i });
      fireEvent.click(button);
      expect(onAction).toHaveBeenCalledWith('rejected');
    });

    it('renderiza Consultar situação quando actionKind é transmission_uncertain', async () => {
      const { FiscalSituationNotice } = await import('../../../components/FiscalSituationNotice');
      const onAction = vi.fn();

      render(
        <FiscalSituationNotice
          situation={{
            status: 'regularization_uncertain',
            actionKind: 'transmission_uncertain',
            environment: 2,
            orderCancelled: false,
          }}
          onExecuteAction={onAction}
        />
      );

      expect(screen.getByText('Regularização fiscal pendente')).toBeTruthy();
      const button = screen.getByRole('button', { name: /Consultar situação/i });
      fireEvent.click(button);
      expect(onAction).toHaveBeenCalledWith('transmission_uncertain');
    });
  });
});
