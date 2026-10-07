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
    const { container } = render(
      <NfeItemRow item={createItem(true)} itemIndex={0} onUpdateFiscal={vi.fn()} />
    );
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
    render(<NfeItemRow item={createItem(false)} itemIndex={0} onUpdateFiscal={vi.fn()} />);

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
    expect(onUpdateFiscal).toHaveBeenCalledWith('cst', '102');
    expect(screen.queryByText('Confirmar alteração de CSOSN?')).toBeNull();
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

  it('mostra o CFOP incompatível desabilitado, explica o motivo no foco e bloqueia sua seleção', () => {
    const onUpdateFiscal = vi.fn();
    render(
      <NfeItemRow
        item={createItem(false)}
        itemIndex={0}
        cfopOptions={[
          {
            value: '5102',
            label: '5102 — venda interna de mercadoria de terceiros',
            disabled: true,
            disabledReason:
              'A regra aprovada para indIEDest=9 em operação interestadual selecionou CFOP 6108.',
            diagnostic: {
              source: 'matrix',
              context: [
                { label: 'Modelo fiscal', value: 'NF-e 55' },
                { label: 'Destino', value: 'interestadual' },
                { label: 'UF de origem', value: 'PR' },
                { label: 'UF de destino', value: 'SC' },
                { label: 'indIEDest', value: '9' },
              ],
              conflicts: [
                'A regra exige destinatário contribuinte ou isento; o atual é não contribuinte (indIEDest=9).',
              ],
              recommendedCfop: '6108',
            },
          },
          { value: '6108', label: '6108 — venda interestadual a não contribuinte' },
        ]}
        onUpdateFiscal={onUpdateFiscal}
      />
    );
    fireEvent.click(screen.getByTitle('Ver / editar CFOP, CSOSN, Origem e CEST'));

    const cfopInput = screen.getByRole('textbox', { name: 'CFOP' }) as HTMLInputElement;
    expect(cfopInput.value).toBe('');
    fireEvent.focus(cfopInput);

    const disabledOption = screen.getByRole('option', { name: /CFOP 5102:.*Indisponível/ });
    fireEvent.focus(disabledOption);
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.textContent).toContain('Contexto fiscal considerado pela matriz');
    expect(tooltip.textContent).toContain('indIEDest=9');
    expect(tooltip.textContent).toContain('UF de origem: PR');
    expect(tooltip.textContent).toContain('Conflitos encontrados');
    expect(tooltip.textContent).toContain('matriz seleciona CFOP 6108');
    fireEvent.keyDown(disabledOption, { key: 'Enter' });
    fireEvent.mouseDown(disabledOption);
    expect(onUpdateFiscal).not.toHaveBeenCalled();
    expect(screen.getByText('6108 — venda interestadual a não contribuinte')).toBeTruthy();
  });

  it('assume 103 por padrão e permite alterar diretamente sem confirmação quando o item não tem CSOSN prévio', () => {
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
    expect(csosnSelect.value).toBe('103');

    fireEvent.change(csosnSelect, { target: { value: '102' } });
    expect(onClearFieldError).toHaveBeenCalled();
    expect(onUpdateFiscal).toHaveBeenCalledWith('cst', '102');
    expect(screen.queryByText('Confirmar alteração de CSOSN?')).toBeNull();
  });
});
