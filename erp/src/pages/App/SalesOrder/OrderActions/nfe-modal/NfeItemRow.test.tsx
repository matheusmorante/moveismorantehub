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

  it('pede confirmação antes de aplicar o CSOSN novo', () => {
    const onUpdateFiscal = vi.fn();
    render(
      <NfeItemRow item={createItem(false)} itemIndex={0} onUpdateFiscal={onUpdateFiscal} />
    );
    fireEvent.click(screen.getByTitle('Ver / editar CFOP, CSOSN, Origem e CEST'));

    const csosn = screen.getByRole('combobox', { name: 'CSOSN' }) as HTMLSelectElement;
    expect(csosn.value).toBe('103');

    fireEvent.change(csosn, { target: { value: '102' } });
    expect(onUpdateFiscal).not.toHaveBeenCalled();
    fireEvent.blur(csosn);
    expect(screen.getByText('Confirmar alteração de CSOSN?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Sim, alterar' }));
    expect(onUpdateFiscal).toHaveBeenCalledWith('cst', '102');
  });

  it('restaura o CSOSN anterior quando a alteração é cancelada', () => {
    const onUpdateFiscal = vi.fn();
    render(
      <NfeItemRow item={createItem(false)} itemIndex={0} onUpdateFiscal={onUpdateFiscal} />
    );
    fireEvent.click(screen.getByTitle('Ver / editar CFOP, CSOSN, Origem e CEST'));

    const csosn = screen.getByRole('combobox', { name: 'CSOSN' }) as HTMLSelectElement;
    fireEvent.change(csosn, { target: { value: '102' } });
    fireEvent.blur(csosn);
    fireEvent.click(screen.getByRole('button', { name: 'Não, manter atual' }));

    expect(csosn.value).toBe('103');
    expect(onUpdateFiscal).not.toHaveBeenCalled();
  });

  it('exibe CFOP candidato interestadual, mas impede sua seleção enquanto a matriz está pendente', () => {
    const onUpdateFiscal = vi.fn();
    render(
      <NfeItemRow
        item={createItem(false)}
        itemIndex={0}
        cfopContextMessage="Operação PR → SC; matriz tributária pendente."
        cfopOptions={[
          { value: '6102', label: '6102 — venda interestadual; matriz pendente', disabled: true },
        ]}
        onUpdateFiscal={onUpdateFiscal}
      />
    );
    fireEvent.click(screen.getByTitle('Ver / editar CFOP, CSOSN, Origem e CEST'));

    const cfopInput = screen.getByRole('textbox', { name: 'CFOP' });
    fireEvent.change(cfopInput, { target: { value: '6102' } });

    const disabledOptionText = screen.getByText('6102 — venda interestadual; matriz pendente');
    expect(disabledOptionText).toBeTruthy();

    const optionItem = disabledOptionText.closest('li');
    expect(optionItem?.className).toContain('cursor-not-allowed');

    fireEvent.mouseDown(optionItem!);
    expect(onUpdateFiscal).not.toHaveBeenCalled();
    expect(screen.getByText('Operação PR → SC; matriz tributária pendente.')).toBeTruthy();
  });

  it('permite selecionar 103 diretamente e limpa erro quando o item não tem CSOSN prévio', () => {
    const onUpdateFiscal = vi.fn();
    const onClearFieldError = vi.fn();
    const itemWithoutCsosn = {
      ...createItem(false),
      fiscal: { ncm: '94035000', cfop: '5102', cst: '', origem: '0' },
    };

    render(
      <NfeItemRow
        item={itemWithoutCsosn}
        itemIndex={0}
        fieldError={{ field: 'cst', message: 'Selecione o CSOSN do produto' }}
        onUpdateFiscal={onUpdateFiscal}
        onClearFieldError={onClearFieldError}
      />
    );

    const csosnSelect = screen.getByRole('combobox', { name: 'CSOSN' }) as HTMLSelectElement;
    expect(csosnSelect.value).toBe('');

    fireEvent.change(csosnSelect, { target: { value: '103' } });
    expect(onClearFieldError).toHaveBeenCalled();
    expect(onUpdateFiscal).toHaveBeenCalledWith('cst', '103');
    expect(screen.queryByText('Confirmar alteração de CSOSN?')).toBeNull();
  });

  it('permite aplicar 103 pelo link de atalho quando o item não tem CSOSN cadastrado', () => {
    const onUpdateFiscal = vi.fn();
    const onClearFieldError = vi.fn();
    const itemWithoutCsosn = {
      ...createItem(false),
      fiscal: { ncm: '94035000', cfop: '5102', cst: '', origem: '0' },
    };

    render(
      <NfeItemRow
        item={itemWithoutCsosn}
        itemIndex={0}
        fieldError={{ field: 'cst', message: 'Selecione o CSOSN do produto' }}
        onUpdateFiscal={onUpdateFiscal}
        onClearFieldError={onClearFieldError}
      />
    );

    const applyButton = screen.getByRole('button', { name: 'clique aqui para aplicar 103' });
    fireEvent.click(applyButton);

    expect(onClearFieldError).toHaveBeenCalled();
    expect(onUpdateFiscal).toHaveBeenCalledWith('cst', '103');
  });
});
