// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NfeItemRow } from './NfeItemRow';

vi.mock('./NcmSelect', () => ({
  NcmSelect: ({ value, onBlur }: { value: string; onBlur?: (value: string) => void }) => (
    <input aria-label="NCM" value={value} onChange={() => undefined} onBlur={(event) => onBlur?.(event.target.value)} />
  ),
}));

describe('NfeItemRow', () => {
  afterEach(() => cleanup());

  const createItem = (isUnregistered: boolean, condition: 'novo' | 'usado' | 'salvado' = 'novo') => ({
    description: 'Mesa de madeira',
    itemType: 'product',
    quantity: 1,
    unitPrice: 100,
    fiscal: { ncm: '', cfop: '5102', cst: '102', origem: '0' },
    isUnregistered,
    condition,
  }) as any;

  it('mostra somente o alerta de produto convencional sem cadastro', async () => {
    const { container } = render(
      <NfeItemRow item={createItem(true)} onUpdateFiscal={vi.fn()} />
    );
    const indicator = screen.getByRole('button', { name: 'Produto convencional não cadastrado no RP' });

    expect(container.querySelector('.bi-exclamation-triangle-fill')).toBeTruthy();
    expect(screen.queryByText('Não Cadastrado no ERP')).toBeNull();

    fireEvent.mouseEnter(indicator);
    expect(screen.getByRole('tooltip').textContent).toBe('Produto convencional não cadastrado no RP.');
    expect(screen.queryByText(/NCM não foi carregado/i)).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.mouseLeave(indicator);
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());

    fireEvent.focus(indicator);
    expect(screen.getByRole('tooltip')).toBeTruthy();
  });

  it('não mostra o alerta para produto cadastrado', () => {
    render(<NfeItemRow item={createItem(false)} onUpdateFiscal={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Produto convencional não cadastrado no RP' })).toBeNull();
    expect(screen.getByText('Produto cadastrado')).toBeTruthy();
  });

  it.each(['usado', 'salvado'] as const)('não mostra o alerta para produto de origem %s', (condition) => {
    render(<NfeItemRow item={createItem(true, condition)} onUpdateFiscal={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Produto convencional não cadastrado no RP' })).toBeNull();
    expect(screen.queryByText('Produto cadastrado')).toBeNull();
  });

  it('mantém o aviso flutuante de alteração do NCM aberto até uma escolha explícita', () => {
    render(
      <NfeItemRow
        item={{ ...createItem(false), productId: 'product-1', catalogNcm: '94034000', fiscal: { ...createItem(false).fiscal, ncm: '94036000' } }}
        onUpdateFiscal={vi.fn()}
        pendingNcmConfirmation={{ previousNcm: '94034000', nextNcm: '94036000' }}
        onResolveNcmConfirmation={vi.fn()}
      />
    );

    expect(screen.getByRole('alertdialog', { name: 'Confirmar atualização do NCM do produto' })).toBeTruthy();
    expect(screen.getByText('Cadastro: 94034000 → Nota: 94036000')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Prosseguir sem atualizar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Atualizar cadastro' })).toBeTruthy();
  });
});
