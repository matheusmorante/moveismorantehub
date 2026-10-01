// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NfeItemRow } from './NfeItemRow';

vi.mock('./NcmSelect', () => ({ NcmSelect: () => null }));

describe('NfeItemRow', () => {
  afterEach(() => cleanup());

  const createItem = (isUnregistered: boolean) => ({
    description: 'Mesa de madeira',
    itemType: 'product',
    quantity: 1,
    unitPrice: 100,
    fiscal: { ncm: '', cfop: '5102', cst: '102', origem: '0' },
    isUnregistered,
  }) as any;

  it('mostra o alerta e explica no tooltip flutuante por que o NCM não foi carregado', () => {
    const { container } = render(
      <NfeItemRow item={createItem(true)} onUpdateFiscal={vi.fn()} />
    );
    const indicator = screen.getByRole('img', { name: 'Produto não cadastrado no ERP' });

    expect(container.querySelector('.bi-exclamation-triangle-fill')).toBeTruthy();
    expect(screen.queryByText('Não Cadastrado no ERP')).toBeNull();

    fireEvent.mouseEnter(indicator);
    expect(screen.getByRole('tooltip').textContent).toContain(
      'Por isso, o NCM não foi carregado automaticamente do cadastro do produto.'
    );
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.mouseLeave(indicator);
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.focus(indicator);
    expect(screen.getByRole('tooltip')).toBeTruthy();
  });

  it('não mostra o alerta para produto cadastrado', () => {
    render(<NfeItemRow item={createItem(false)} onUpdateFiscal={vi.fn()} />);

    expect(screen.queryByRole('img', { name: 'Produto não cadastrado no ERP' })).toBeNull();
    expect(screen.getByText('Cadastrado no ERP')).toBeTruthy();
  });
});
