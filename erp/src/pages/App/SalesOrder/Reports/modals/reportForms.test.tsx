// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ReportConfigModal from './ReportConfigModal';
import ItemExclusionModal from './ItemExclusionModal';

afterEach(cleanup);

describe('report configuration resolver', () => {
  it('exibe erro e impede o callback quando o nome não foi preenchido', async () => {
    const onSave = vi.fn();
    render(<ReportConfigModal isOpen onClose={vi.fn()} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: /Salvar e Atualizar/ }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Dê um nome ao relatório.');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('exige todos os mapeamentos somente para a fonte CSV', async () => {
    const onSave = vi.fn();
    render(<ReportConfigModal isOpen onClose={vi.fn()} onSave={onSave} initialName="Análise" initialSource="csv" />);
    fireEvent.click(screen.getByRole('button', { name: /Salvar e Atualizar/ }));
    expect((await screen.findByRole('alert')).textContent).toContain('mapeamento do CSV');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('entrega valores parseados preservando filtros, exclusões e limiares negativos', async () => {
    const onSave = vi.fn();
    const config = { excludedItems: ['Histórico'], filters: { supplier: 'Fornecedor' }, profitThresholdMode: 'custom', profitThreshold: -10 };
    render(<ReportConfigModal isOpen onClose={vi.fn()} onSave={onSave} initialName=" Análise ERP " initialConfig={config} />);
    fireEvent.click(screen.getByRole('button', { name: /Salvar e Atualizar/ }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      name: ' Análise ERP ', source: 'erp', csvData: [],
      config: expect.objectContaining({ ...config, abcBasis: 'profit' }),
    })));
  });

  it('carrega CSV pelo parser existente e valida o payload real do callback', async () => {
    const onSave = vi.fn();
    const { container } = render(<ReportConfigModal isOpen onClose={vi.fn()} onSave={onSave} initialName="CSV" initialSource="csv" />);
    const file = new File(['Data,Produto,Fornecedor,Quantidade,Custo,Valor,Lucro\n14/10/2026,Armário,Morante,1,10,15,5'], 'report.csv', { type: 'text/csv' });
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText('Documento carregado')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /Salvar e Atualizar/ }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      source: 'csv', config: expect.objectContaining({ product: 'Produto', salesValue: 'Valor', profit: 'Lucro' }),
      csvData: [{ Data: '14/10/2026', Produto: 'Armário', Fornecedor: 'Morante', Quantidade: '1', Custo: '10', Valor: '15', Lucro: '5' }],
    })));
  });

  it('bloqueia limiares não finitos antes de atualizar os resultados', async () => {
    const onSave = vi.fn();
    render(<ReportConfigModal isOpen onClose={vi.fn()} onSave={onSave} initialName="Análise" initialConfig={{ turnoverThreshold: Infinity }} />);
    fireEvent.click(screen.getByRole('button', { name: /Salvar e Atualizar/ }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });
});

const items = [
  { product: 'Armário', supplier: 'A', qty: 1, profit: 10, quadrant: 1 },
  { product: 'Mesa', supplier: 'B', qty: 2, profit: 20, quadrant: 2 },
];

describe('report exclusions resolver', () => {
  it('preserva exclusões históricas que não estão na lista filtrada', async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<ItemExclusionModal isOpen items={items} initialExcludedItems={['Histórico']} onConfirm={onConfirm} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /Concluído/ }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(['Histórico']));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('aplica somente os itens filtrados e entrega a seleção atual ao callback', async () => {
    const onConfirm = vi.fn();
    render(<ItemExclusionModal isOpen items={items} initialExcludedItems={[]} onConfirm={onConfirm} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Pesquisar itens por nome...'), { target: { value: 'Mesa' } });
    fireEvent.click(screen.getByRole('button', { name: /Excluir Filtrados/ }));
    fireEvent.click(screen.getByRole('button', { name: /Concluído/ }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(['Mesa']));
  });

  it('exibe erro para seleção malformada sem confirmar nem fechar o modal', async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<ItemExclusionModal isOpen items={items} initialExcludedItems={[10] as unknown as string[]} onConfirm={onConfirm} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /Concluído/ }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
