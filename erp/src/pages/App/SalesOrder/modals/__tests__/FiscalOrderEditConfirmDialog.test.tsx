// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FiscalOrderEditConfirmDialog } from '../FiscalOrderEditConfirmDialog';
import type { FiscalOrderEditAudit } from '@/pages/utils/nfe/orderEditFiscalService';

describe('FiscalOrderEditConfirmDialog', () => {
  afterEach(cleanup);

  it('renderiza estado de bloqueio quando a mercadoria já circulou (sem CC-e e orientando devolução)', () => {
    const audit: FiscalOrderEditAudit = {
      status: 'blocked',
      error: 'A mercadoria já circulou (entregue ou retirada). A legislação fiscal impede cancelamento ou estorno como mecanismo de correção de dados.',
      changes: [
        { field: 'dest.CNPJ/CPF', expected: '12345678909', actual: '98765432100' },
        { field: 'det[1].prod.NCM', expected: '94016100', actual: '94036000' },
        { field: 'itens[1].quantidade', expected: 1, actual: 2 },
      ],
      documents: [
        {
          id: 'doc-1',
          model: '55',
          environment: 2,
          action: 'blocked',
          reason: 'A mercadoria já circulou.',
          changes: [],
        },
      ],
    };

    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const onNavigateToReturns = vi.fn();

    render(
      <FiscalOrderEditConfirmDialog
        audit={audit}
        isConfirmingFiscalEdit={false}
        onCancel={onCancel}
        onConfirm={onConfirm}
        onNavigateToReturns={onNavigateToReturns}
      />
    );

    // Título e política de CC-e
    expect(screen.getByText(/Alteração fiscal não permitida · Documento autorizado/i)).toBeInTheDocument();
    expect(screen.getByText(/Política MoranteHub: Zero CC-e/i)).toBeInTheDocument();
    expect(
      screen.getByText(/O ERP impede a alteração direta do documento fiscal e não utiliza Carta de Correção Eletrônica/i)
    ).toBeInTheDocument();

    // Motivo do bloqueio e orientação para devolução
    expect(screen.getAllByText(/A mercadoria já circulou/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/não é permitido cancelamento ou estorno como simples mecanismo de correção/i)).toBeInTheDocument();
    expect(screen.getByText(/Realize o procedimento de devolução fiscal/i)).toBeInTheDocument();

    // Campos alterados
    expect(screen.getByText(/CPF \/ CNPJ/i)).toBeInTheDocument();
    expect(screen.getByText(/Item 1 · NCM/i)).toBeInTheDocument();
    expect(screen.getByText(/Item 1 · Quantidade/i)).toBeInTheDocument();

    // Não deve exibir botão de confirmar substituição quando bloqueado
    expect(screen.queryByText(/Confirmar substituição fiscal/i)).not.toBeInTheDocument();

    // Deve exibir botão de voltar e de ir para devoluções
    const backBtn = screen.getByText(/Voltar à edição \(manter dados originais\)/i);
    fireEvent.click(backBtn);
    expect(onCancel).toHaveBeenCalledTimes(1);

    const returnsBtn = screen.getByText(/Ir para Devoluções/i);
    fireEvent.click(returnsBtn);
    expect(onNavigateToReturns).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('renderiza estado de confirmação para cancelamento fiscal dentro do prazo e sem circulação', () => {
    const audit: FiscalOrderEditAudit = {
      status: 'confirmation_required',
      orderUpdatedAt: '2026-10-19T12:00:00Z',
      changes: [
        { field: 'det[1].prod.CFOP', expected: '5102', actual: '5405' },
        { field: 'total.valorPedidoCalculado', expected: '100.00', actual: '120.00' },
      ],
      documents: [
        {
          id: 'doc-55',
          model: '55',
          environment: 2,
          action: 'cancel',
          changes: [
            { field: 'det[1].prod.CFOP', expected: '5102', actual: '5405' },
          ],
        },
      ],
    };

    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <FiscalOrderEditConfirmDialog
        audit={audit}
        isConfirmingFiscalEdit={false}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText(/Correção fiscal e integridade de nota autorizada/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Cancelamento Fiscal/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Sem circulação e dentro do prazo legal da SEFAZ-PR/i)).toBeInTheDocument();

    // Rastreabilidade e regra SEFAZ-PR
    expect(screen.getByText(/A nota original permanecerá registrada de forma imutável com seu XML/i)).toBeInTheDocument();
    expect(screen.getByText(/Cancelar ou estornar uma NF-e não significa automaticamente que será permitido emitir outra/i)).toBeInTheDocument();

    // Botões
    const confirmBtn = screen.getByText(/Confirmar substituição fiscal/i);
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('renderiza estado de confirmação para estorno fiscal (finalidade 3) com aviso de que não substitui CC-e', () => {
    const audit: FiscalOrderEditAudit = {
      status: 'confirmation_required',
      orderUpdatedAt: '2026-10-19T12:00:00Z',
      changes: [
        { field: 'det[1].imposto.ICMS.CST_CSOSN', expected: '102', actual: '500' },
      ],
      documents: [
        {
          id: 'doc-estorno',
          model: '55',
          environment: 1,
          action: 'estorno',
          changes: [
            { field: 'det[1].imposto.ICMS.CST_CSOSN', expected: '102', actual: '500' },
          ],
        },
      ],
    };

    render(
      <FiscalOrderEditConfirmDialog
        audit={audit}
        isConfirmingFiscalEdit={false}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText(/Ambiente de Produção/i)).toBeInTheDocument();
    expect(screen.getByText(/Estorno Fiscal \(Fin\. 3\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Emissão de NF-e modelo 55 de estorno \(finalidade 3 - NF-e de Ajuste\)/i)).toBeInTheDocument();
    expect(screen.getByText(/O estorno fiscal por finalidade 3 não deve ser tratado como substituto universal da CC-e/i)).toBeInTheDocument();
  });
});
