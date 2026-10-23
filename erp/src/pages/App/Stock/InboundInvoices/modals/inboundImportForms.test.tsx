// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InboundAccessKeyModal } from './InboundAccessKeyModal';
import { InboundXmlImportModal } from './InboundXmlImportModal';
import { InboundDocumentImportModal } from './InboundDocumentImportModal';

const key = '41261012ABC34501DE35550010000001061705367136';
const mocks = vi.hoisted(() => ({ importXml: vi.fn(), file: vi.fn(), xml: vi.fn(), error: vi.fn(), warn: vi.fn(), importing: false }));
vi.mock('@/pages/utils/inboundNfe/inboundInvoicesService', () => ({ importInboundInvoiceXml: mocks.importXml }));
vi.mock('../hooks/useInboundDocumentImport', () => ({ useInboundDocumentImport: () => ({ isLoading: false, statusMessage: '', isDraggingFile: false, setIsDraggingFile: vi.fn(), duplicateAlertOpen: false, setDuplicateAlertOpen: vi.fn(), duplicateKey: '', duplicateExistingInvoice: null, handleFile: mocks.file, handleXmlString: mocks.xml, isImportInFlight: () => mocks.importing }) }));
vi.mock('./InboundDuplicateKeyAlertModal', () => ({ InboundDuplicateKeyAlertModal: () => null }));
vi.mock('@/components/shared/QRScannerModal', () => ({ default: ({ isOpen, onScan }: any) => isOpen ? <>
  <button onClick={() => onScan('inválida')}>Scan inválido</button>
  <button onClick={() => onScan('https://example.test/?chNFe=41261012abc34501de35550010000001061705367136')}>Scan válido</button>
</> : null }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, warn: mocks.warn, success: vi.fn(), info: vi.fn() } }));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks(); mocks.importing = false;
  mocks.importXml.mockResolvedValue({ nfeNumber: '106', emitterName: 'Fornecedor' });
  mocks.file.mockResolvedValue(undefined); mocks.xml.mockResolvedValue(undefined);
});
const file = (name = 'nota.xml') => {
  const selected = new File(['<file/>'], name, { type: name.endsWith('.xml') ? 'text/xml' : 'text/plain' });
  Object.defineProperty(selected, 'text', { value: vi.fn().mockResolvedValue('<file/>') }); return selected;
};
const mountKeyImport = () => {
  const view = render(<InboundDocumentImportModal isOpen onClose={vi.fn()} onImportSuccess={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Consultar Chave de Acesso'), { target: { value: key } });
  return view;
};

describe('entradas de importação com resolver real', () => {
  it('recusa chave de 44 caracteres com DV inválido antes do callback', async () => {
    const submit = vi.fn();
    const view = render(<InboundAccessKeyModal isOpen isLoading={false} onClose={vi.fn()} onSubmit={submit} />);
    fireEvent.change(screen.getByPlaceholderText('44 caracteres da chave de acesso'), { target: { value: key.slice(0, -1) + '5' } });
    fireEvent.submit(view.container.querySelector('form')!);
    await waitFor(() => expect(mocks.error).toHaveBeenCalled()); expect(submit).not.toHaveBeenCalled();
  });
  it('normaliza chave e bloqueia Enter/clique repetidos até concluir ou falhar', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let fail!: (error: Error) => void;
    const submit = vi.fn().mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; })).mockResolvedValue(undefined);
    const view = render(<InboundAccessKeyModal isOpen isLoading={false} onClose={vi.fn()} onSubmit={submit} />);
    fireEvent.change(screen.getByPlaceholderText('44 caracteres da chave de acesso'), { target: { value: key.toLowerCase() } });
    const form = view.container.querySelector('form')!;
    act(() => { fireEvent.submit(form); fireEvent.submit(form); });
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1)); expect(submit).toHaveBeenCalledWith(key);
    await act(async () => { fail(new Error('Simulada')); });
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    fireEvent.submit(form); await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
  });
  it('bloqueia arquivo sem formato XML antes de ler no modal de texto', async () => {
    const view = render(<InboundXmlImportModal isOpen onClose={vi.fn()} onImportSuccess={vi.fn()} />);
    const selected = file('nota.txt'); fireEvent.change(view.container.querySelector('input[type=file]')!, { target: { files: [selected] } });
    await waitFor(() => expect(mocks.error).toHaveBeenCalled()); expect(selected.text).not.toHaveBeenCalled(); expect(mocks.importXml).not.toHaveBeenCalled();
  });
  it('aguarda a importação do XML colado e permite retomar após falha', async () => {
    let fail!: (error: Error) => void;
    mocks.importXml.mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }));
    const onClose = vi.fn(); render(<InboundXmlImportModal isOpen onClose={onClose} onImportSuccess={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Conteúdo do XML da nota fiscal'), { target: { value: '<pasted/>' } });
    const submit = screen.getByRole('button', { name: 'Processar e Salvar' });
    act(() => { fireEvent.click(submit); fireEvent.click(submit); });
    await waitFor(() => expect(mocks.importXml).toHaveBeenCalledTimes(1)); expect(mocks.importXml).toHaveBeenCalledWith('<pasted/>');
    await act(async () => { fail(new Error('Falha simulada')); });
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Falha simulada'));
    fireEvent.click(screen.getByRole('button', { name: 'Processar e Salvar' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1)); expect(mocks.importXml).toHaveBeenCalledTimes(2);
  });
  it('usa o arquivo validado para preencher o texto sem salvar automaticamente', async () => {
    const view = render(<InboundXmlImportModal isOpen onClose={vi.fn()} onImportSuccess={vi.fn()} />);
    fireEvent.change(view.container.querySelector('input[type=file]')!, { target: { files: [file()] } });
    await waitFor(() => expect((screen.getByLabelText('Conteúdo do XML da nota fiscal') as HTMLTextAreaElement).value).toBe('<file/>'));
    expect(mocks.importXml).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Processar e Salvar' }));
    await waitFor(() => expect(mocks.importXml).toHaveBeenCalledWith('<file/>'));
  });
  it('bloqueia importação durante leitura e ignora arquivo de uma abertura anterior', async () => {
    let finish!: (text: string) => void;
    const selected = file(); vi.mocked(selected.text).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const props = { onClose: vi.fn(), onImportSuccess: vi.fn() };
    const view = render(<InboundXmlImportModal isOpen {...props} />);
    fireEvent.change(screen.getByLabelText('Conteúdo do XML da nota fiscal'), { target: { value: '<old/>' } });
    const submit = screen.getByRole('button', { name: 'Processar e Salvar' });
    act(() => { fireEvent.change(view.container.querySelector('input[type=file]')!, { target: { files: [selected] } }); fireEvent.click(submit); });
    await waitFor(() => expect(selected.text).toHaveBeenCalled()); expect(mocks.importXml).not.toHaveBeenCalled();
    view.rerender(<InboundXmlImportModal isOpen={false} {...props} />); view.rerender(<InboundXmlImportModal isOpen {...props} />);
    await act(async () => { finish('<stale/>'); });
    expect((screen.getByLabelText('Conteúdo do XML da nota fiscal') as HTMLTextAreaElement).value).toBe('');
  });
  it('executa resolver no scanner e mostra erro antes de aceitar outra chave', async () => {
    mountKeyImport();
    fireEvent.click(screen.getByRole('button', { name: 'Escanear QR Code ou código de barras da chave NF-e' })); fireEvent.click(screen.getByRole('button', { name: 'Scan inválido' }));
    await waitFor(() => expect(mocks.warn).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Escanear QR Code ou código de barras da chave NF-e' })); fireEvent.click(screen.getByRole('button', { name: 'Scan válido' }));
    await waitFor(() => expect((screen.getByLabelText('Consultar Chave de Acesso') as HTMLInputElement).value).toBe(key));
  });
});
