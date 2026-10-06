// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NfeItemRow } from './NfeItemRow';

vi.mock('./NcmSelect', () => ({ NcmSelect: () => null }));

describe('NfeItemRow', () => {
  afterEach(() => cleanup());

  const createItem = (isUnregistered: boolean) =>
    ({
      description: 'Mesa de madeira',
      itemType: 'product',
      quantity: 1,
      unitPrice: 100,
      fiscal: { ncm: '', cfop: '5102', cst: '103', origem: '0' },
      isUnregistered,
    }) as any;

  it('mostra o alerta e explica no tooltip flutuante por que o NCM não foi carregado', async () => {
    const { container } = render(<NfeItemRow item={createItem(true)} onUpdateFiscal={vi.fn()} />);
    const indicator = screen.getByRole('button', { name: 'Produto não cadastrado no ERP' });

    expect(container.querySelector('.bi-exclamation-triangle-fill')).toBeTruthy();
    expect(screen.queryByText('Não Cadastrado no ERP')).toBeNull();

    fireEvent.mouseEnter(indicator);
    expect(screen.getByRole('tooltip').textContent).toContain(
      'Por isso, o NCM não foi carregado automaticamente do cadastro do produto.'
    );
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.mouseLeave(indicator);
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());

    fireEvent.focus(indicator);
    expect(screen.getByRole('tooltip')).toBeTruthy();
  });

  it('não mostra o alerta para produto cadastrado', () => {
    render(<NfeItemRow item={createItem(false)} onUpdateFiscal={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Produto não cadastrado no ERP' })).toBeNull();
    expect(screen.getByText('Cadastrado no ERP')).toBeTruthy();
  });

  it('deixa editar o CSOSN do item', () => {
    const onUpdateFiscal = vi.fn();
    render(
      <NfeItemRow item={createItem(false)} itemIndex={0} onUpdateFiscal={onUpdateFiscal} />
    );
    fireEvent.click(screen.getByTitle('Ver / editar CFOP, CSOSN, Origem e CEST'));

    const csosn = screen.getByRole('combobox', { name: 'CSOSN' }) as HTMLSelectElement;
    expect(csosn.disabled).toBe(false);
    expect(csosn.value).toBe('103');

    fireEvent.change(csosn, { target: { value: '102' } });
    expect(onUpdateFiscal).toHaveBeenCalledWith('cst', '102');
  });

  it('exibe CFOP candidato interestadual, mas impede sua seleção enquanto a matriz está pendente', () => {
    render(
      <NfeItemRow
        item={createItem(false)}
        itemIndex={0}
        cfopContextMessage="Operação PR → SC; matriz tributária pendente."
        cfopOptions={[
          { value: '6102', label: '6102 — venda interestadual; matriz pendente', disabled: true },
        ]}
        onUpdateFiscal={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTitle('Ver / editar CFOP, CSOSN, Origem e CEST'));

    const cfopOption = screen.getByRole('option', { name: /6102 — venda interestadual/ });
    expect(cfopOption).toHaveProperty('disabled', true);
    expect(screen.getByText('Operação PR → SC; matriz tributária pendente.')).toBeTruthy();
  });
});
