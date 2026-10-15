// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ save: vi.fn(), error: vi.fn(), success: vi.fn(), warn: vi.fn(), done: vi.fn(), close: vi.fn() }));
vi.mock('@/pages/utils/personService', async () => ({ ...(await import('@/pages/utils/personService/personMapper')), savePeopleBatch: mocks.save }));
vi.mock('@/pages/utils/settingsService', () => ({ getSettings: () => ({ requiredFields: { customer: { phone: true } } }) }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, success: mocks.success, warn: mocks.warn } }));
import PersonImportModal from './PersonImportModal';
const props = { isOpen: true, onClose: mocks.close, onSuccess: mocks.done, collectionName: 'suppliers', title: 'Fornecedores' };
const upload = async (text: string, name = 'pessoas.csv') => {
  fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [new File([text], name, { type: 'text/csv' })] } });
};
const preview = async (text = 'Nome,Telefone\n Ana , 41999999999 ') => {
  await upload(text); await screen.findByText('Avançar para Visualização');
  await act(async () => { fireEvent.click(screen.getByText('Avançar para Visualização')); });
};
const submit = () => fireEvent.click(screen.getByRole('button', { name: /Finalizar Importação/ }));
beforeEach(() => { vi.clearAllMocks(); mocks.save.mockResolvedValue(undefined); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('importação de pessoas pelo proprietário real', () => {
  it('valida arquivo antes da leitura e mostra o erro no modal', async () => {
    const read = vi.spyOn(FileReader.prototype, 'readAsText'); render(<PersonImportModal {...props} />); await upload('Nome\nAna', 'pessoas.txt');
    await screen.findByRole('alert'); expect(read).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it('valida a coluna obrigatória antes de montar a prévia', async () => {
    render(<PersonImportModal {...props} />); await upload('Outra\nAna'); await screen.findByText('Avançar para Visualização');
    await act(async () => { fireEvent.click(screen.getByText('Avançar para Visualização')); });
    expect(screen.getByRole('alert')).toBeTruthy(); expect(screen.queryByRole('table')).toBeNull(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it('usa o encoding escolhido, preserva CSV com aspas e envia somente dados parseados', async () => {
    const read = vi.spyOn(FileReader.prototype, 'readAsText'); render(<PersonImportModal {...props} />); fireEvent.click(screen.getByRole('button', { name: 'ANSI' }));
    await preview('Nome;Telefone\n"Ana; Maria"; 41999999999 '); await act(async () => { submit(); });
    expect(read).toHaveBeenCalledWith(expect.any(File), 'ISO-8859-1'); expect(mocks.save).toHaveBeenCalledWith('suppliers', [expect.objectContaining({ fullName: 'Ana; Maria', phone: '41999999999', personType: 'PF', active: true })]);
    expect(mocks.done).toHaveBeenCalledTimes(1); expect(screen.queryByRole('button', { name: /Finalizar Importação/ })).toBeNull();
  });
  it('mantém o resolver/trava durante a gravação e impede dois cliques no mesmo lote', async () => {
    let finish!: () => void; mocks.save.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    render(<PersonImportModal {...props} />); await preview(); await act(async () => { submit(); });
    const button = screen.queryByRole('button', { name: /Finalizar Importação/ }); if (button) fireEvent.click(button);
    await act(async () => { await Promise.resolve(); }); expect(mocks.save).toHaveBeenCalledTimes(1);
    await act(async () => { finish(); }); expect(mocks.done).toHaveBeenCalledTimes(1);
  });
  it('valida cada linha, bloqueia as inválidas e respeita a escolha do operador', async () => {
    render(<PersonImportModal {...props} collectionName="customers" title="Clientes" />);
    await preview('Nome,Sem telefone,Sem endereço,Origem\nAna,sim,sim,organic\nBruno,talvez,sim,organic\nCarla,sim,sim,organic');
    const rows = screen.getAllByRole('row').slice(1); expect(within(rows[1]).getByRole('checkbox')).toHaveProperty('disabled', true);
    fireEvent.click(within(rows[2]).getByRole('checkbox')); await act(async () => { submit(); });
    expect(mocks.save).toHaveBeenCalledWith('customers', [expect.objectContaining({ fullName: 'Ana', noPhone: true, noAddress: true, marketingOrigin: 'organic', phone: undefined, fullAddress: expect.objectContaining({ street: '' }) })]);
  });
  it('não repete um bloco confirmado depois de falha no seguinte', async () => {
    mocks.save.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Sem resposta'));
    render(<PersonImportModal {...props} />); await preview('Nome\n'+Array.from({ length: 101 }, (_, i) => 'Pessoa '+i).join('\n'));
    await act(async () => { submit(); }); expect(mocks.save).toHaveBeenCalledTimes(2); expect(screen.getByRole('alert')).toBeTruthy();
    vi.useFakeTimers(); await act(async () => { submit(); }); expect(mocks.save).toHaveBeenCalledTimes(3); expect(mocks.save.mock.calls[2][1]).toEqual([expect.objectContaining({ fullName: 'Pessoa 100' })]);
    await act(async () => { await vi.advanceTimersByTimeAsync(1_501); }); expect(mocks.close).not.toHaveBeenCalled(); expect(screen.getByRole('status').textContent).toContain('sem confirmação');
  });
  it('não fecha nem chama callbacks de uma sessão anterior do modal', async () => {
    let finish!: () => void; mocks.save.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    const view = render(<PersonImportModal {...props} />); await preview(); await act(async () => { submit(); });
    view.rerender(<PersonImportModal {...props} isOpen={false} />); view.rerender(<PersonImportModal {...props} />);
    await act(async () => { finish(); }); expect(mocks.done).not.toHaveBeenCalled(); expect(mocks.close).not.toHaveBeenCalled(); expect(screen.getByText('Arraste seu arquivo CSV')).toBeTruthy();
  });
  it.each([
    ['arquivo vazio', ''], ['apenas cabeçalho', 'Nome'], ['aspas abertas', 'Nome\n"Ana'],
  ])('rejeita %s sem preparar registros', async (_, text) => {
    render(<PersonImportModal {...props} />); await upload(text); await screen.findByRole('alert');
    expect(screen.queryByText('Avançar para Visualização')).toBeNull(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it('aplica a coluna escolhida na prévia e bloqueia uma seleção vazia na finalização', async () => {
    render(<PersonImportModal {...props} />); await upload('Nome,Texto\nNome antigo,Paulo'); await screen.findByText('Avançar para Visualização');
    fireEvent.change(screen.getByLabelText('Nome Completo / Razão Social'), { target: { value: '1' } });
    await act(async () => { fireEvent.click(screen.getByText('Avançar para Visualização')); }); expect(screen.getByRole('table').textContent).toContain('Paulo');
    fireEvent.click(screen.getByRole('button', { name: 'Desmarcar Todos' })); await act(async () => { submit(); });
    expect(screen.getByRole('alert').textContent).toContain('Selecione registros'); expect(mocks.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar Todos' })); await act(async () => { submit(); });
    expect(mocks.save).toHaveBeenCalledWith('suppliers', [expect.objectContaining({ fullName: 'Paulo' })]);
  });
  it('limita a leitura e ignora a resposta antiga depois do prazo', async () => {
    vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => {}); let reader!: FileReader;
    vi.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function (this: FileReader) { reader = this; });
    render(<PersonImportModal {...props} />); await act(async () => { await upload('Nome\nAna'); });
    expect(screen.getByRole('status').textContent).toBe('Lendo CSV...'); await act(async () => { await vi.advanceTimersByTimeAsync(15_001); });
    expect(screen.getByRole('alert')).toBeTruthy(); expect(screen.getByLabelText('Arquivo CSV')).toHaveProperty('disabled', false);
    await act(async () => { Object.defineProperty(reader, 'result', { value: 'Nome\nAna' }); reader.onload?.(new ProgressEvent('load') as ProgressEvent<FileReader>); });
    expect(screen.queryByText('Avançar para Visualização')).toBeNull(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it('apresenta falha de leitura e libera nova seleção', async () => {
    vi.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function (this: FileReader) { this.onerror?.(new ProgressEvent('error') as ProgressEvent<FileReader>); });
    render(<PersonImportModal {...props} />); await upload('Nome\nAna'); await screen.findByRole('alert');
    expect(screen.getByLabelText('Arquivo CSV')).toHaveProperty('disabled', false); expect(mocks.save).not.toHaveBeenCalled();
  });
  it('encerra a espera da gravação sem reenviar ou aceitar sucesso tardio', async () => {
    let finish!: () => void; mocks.save.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    render(<PersonImportModal {...props} />); await preview(); vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => {});
    await act(async () => { submit(); await vi.advanceTimersByTimeAsync(30_001); });
    expect(screen.getByRole('alert').textContent).toContain('não foi confirmada'); expect(screen.queryByText('Processando Importação...')).toBeNull();
    expect(screen.getByRole('button', { name: 'Voltar' })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: 'Desmarcar Todos' })); await act(async () => { submit(); });
    await act(async () => { finish(); }); expect(mocks.save).toHaveBeenCalledTimes(1); expect(mocks.done).not.toHaveBeenCalled(); expect(mocks.success).not.toHaveBeenCalled();
  });
  it('cancela o fechamento programado quando o modal fecha e reabre', async () => {
    const view = render(<PersonImportModal {...props} />); await preview(); vi.useFakeTimers(); await act(async () => { submit(); });
    view.rerender(<PersonImportModal {...props} isOpen={false} />); view.rerender(<PersonImportModal {...props} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(1_501); }); expect(mocks.close).not.toHaveBeenCalled(); expect(screen.getByText('Arraste seu arquivo CSV')).toBeTruthy();
  });
  it('para os próximos blocos quando muda o cadastro de destino', async () => {
    let finish!: () => void; mocks.save.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    const view = render(<PersonImportModal {...props} />); await preview('Nome\n'+Array.from({ length: 51 }, (_, i) => 'Pessoa '+i).join('\n')); await act(async () => { submit(); });
    view.rerender(<PersonImportModal {...props} collectionName="employees" title="Funcionários" />);
    await act(async () => { finish(); }); expect(mocks.save).toHaveBeenCalledTimes(1); expect(mocks.done).not.toHaveBeenCalled(); expect(screen.getByText('Arraste seu arquivo CSV')).toBeTruthy();
  });
});
