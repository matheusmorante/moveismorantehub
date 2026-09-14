// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { InboundInvoicesTable } from './InboundInvoicesTable';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';

afterEach(cleanup);
const invoice = {
    id: 'nota-teste', nfeNumber: '123', series: '1', emitterName: 'Fornecedor teste',
    emitterCnpj: '00000000000000', items: [], itemsCount: 0, totalInvoice: 100,
    status: 'pending', issuedAt: '2026-09-13',
} as InboundInvoice;

it.each([0, 1])('executa Editar Vínculos após mousedown no layout %s', (layout) => {
    const onManageMappings = vi.fn();
    const onViewDetails = vi.fn();
    const view = render(<InboundInvoicesTable invoices={[invoice]} onManageMappings={onManageMappings}
        onViewDetails={onViewDetails} onDownloadXml={vi.fn()} />);
    // Ambos os layouts ficam montados; o CSS alterna qual está visível.
    fireEvent.click(view.getAllByRole('button', { name: 'Mais opções' })[layout]);
    const menu = view.getAllByRole('menu')[layout];
    const action = within(menu).getByRole('menuitem', { name: 'Editar Vínculos' });
    fireEvent.mouseDown(action);
    expect(document.body.contains(action)).toBe(true);
    fireEvent.click(action);
    expect(onManageMappings).toHaveBeenCalledWith(invoice);
    expect(onViewDetails).not.toHaveBeenCalled();
    expect(view.queryAllByRole('menu')).toHaveLength(0);
});

it('fecha os menus ao clicar fora ou pressionar Escape', () => {
    const view = render(<InboundInvoicesTable invoices={[invoice]} onManageMappings={vi.fn()}
        onViewDetails={vi.fn()} onDownloadXml={vi.fn()} />);
    const trigger = view.getAllByRole('button', { name: 'Mais opções' })[0];
    fireEvent.click(trigger);
    fireEvent.mouseDown(document.body);
    expect(view.queryAllByRole('menu')).toHaveLength(0);
    fireEvent.click(trigger);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(view.queryAllByRole('menu')).toHaveLength(0);
});
