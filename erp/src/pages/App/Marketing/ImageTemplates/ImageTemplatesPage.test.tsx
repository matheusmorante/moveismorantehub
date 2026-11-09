// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { startImageTemplate } from '../../../../../../shared-utils/catalogImageTemplate';
import { bindTestArtifactContext, clearTestArtifactContext } from '../../../../../../shared-utils/testArtifactContext';
import ImageTemplatesPage from './index';
import { listPreviewProductGroups, listPreviewProducts, mapPreviewProduct, readPreviewProduct } from './productPreviewService';
import { prepareTemplateAsset, readTemplateAssets } from './imageTemplateService';

const mocks = vi.hoisted(() => ({ list: vi.fn(), read: vi.fn(), save: vi.fn(), remove: vi.fn(), rename: vi.fn(), render: vi.fn(),
  userId: 'operator', role: 'manager' }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: mocks.userId }, profile: { role: mocks.role } }) }));
vi.mock('@/components/shared/confirmationService', () => ({ requestConfirmation: vi.fn().mockResolvedValue(true) }));
vi.mock('./imageTemplateService', () => ({
  IMAGE_TEMPLATE_PAGE_SIZE: 15, listImageTemplates: mocks.list, readImageTemplate: mocks.read,
  saveImageTemplate: mocks.save, deleteImageTemplate: mocks.remove, renameImageTemplate: mocks.rename,
  imageTemplateError: (error: Error) => error.message,
  assetSource: vi.fn((asset: { webp_base64: string }) => `data:image/webp;base64,${asset.webp_base64}`),
  readTemplateAssets: vi.fn().mockResolvedValue([]), prepareTemplateAsset: vi.fn(),
}));
vi.mock('./productPreviewService', () => ({
  PREVIEW_PRODUCT_PAGE_SIZE: 15, listPreviewProductGroups: vi.fn(), listPreviewProducts: vi.fn(), readPreviewProduct: vi.fn(), mapPreviewProduct: vi.fn(),
}));
vi.mock('./TemplateArtboard', () => ({ TemplateArtboard: () => <div role="img" aria-label="Área de prévia" /> }));
vi.mock('./renderImageTemplate', () => ({ createTemplatePictureLoader: () => vi.fn(), renderImageTemplate: mocks.render }));

beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  if (!HTMLDialogElement.prototype.close) HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
beforeEach(() => {
  mocks.userId = 'operator'; mocks.role = 'manager'; clearTestArtifactContext();
  vi.mocked(listPreviewProductGroups).mockReset().mockResolvedValue([]);
  vi.mocked(listPreviewProducts).mockReset().mockResolvedValue({ rows: [], total: 0 });
  vi.mocked(readPreviewProduct).mockReset();
  vi.mocked(mapPreviewProduct).mockReset();
  vi.mocked(readTemplateAssets).mockResolvedValue([]);
  mocks.render.mockResolvedValue({ errors: [], notices: [] });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const saved = { id: '00000000-0000-4000-8000-000000000003', name: 'Vitrine', description: '',
  created_at: '2026-11-06T10:00:00Z', updated_at: '2026-11-06T10:00:00Z' };

function open() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><ImageTemplatesPage /></QueryClientProvider>);
}

describe('biblioteca e editor de modelos', () => {
  it('mantém o marcador de teste desligado inicialmente e não o perde ao desfazer após salvar', async () => {
    mocks.userId = '00000000-0000-4000-8000-000000000012'; mocks.role = 'administrator';
    const identity = { runId: '00000000-0000-4000-8000-000000000011', ownerId: mocks.userId, scenarioKey: 'image_template_crud' };
    const metadata = { is_test: true, ...identity };
    bindTestArtifactContext(identity);
    mocks.list.mockResolvedValue({ rows: [], total: 0 });
    mocks.save.mockResolvedValue({ ...saved, test_artifact: metadata });
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));
    fireEvent.change(within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Nome do modelo' }), { target: { value: 'Teste vinculado' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Avançar' }));
    const marker = await screen.findByRole<HTMLInputElement>('checkbox', { name: 'Modelo de teste desta execução' });
    expect(marker.checked).toBe(false);
    fireEvent.click(marker);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await screen.findByText('Modelo salvo.');
    expect(mocks.save.mock.calls[0][1].design.testArtifact).toEqual(metadata);
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(marker.checked).toBe(true);
    expect(marker.disabled).toBe(true);
  });

  it('valida o nome antes de abrir o editor e salva uma composição em dois formatos', async () => {
    mocks.list.mockResolvedValue({ rows: [], total: 0 });
    mocks.save.mockResolvedValue(saved);
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Avançar' }));
    await screen.findByText('Informe o nome do modelo.');
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Nome do modelo' }), { target: { value: ' Vitrine ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Avançar' }));
    await screen.findByRole('heading', { name: 'Vitrine' });
    await waitFor(() => expect(listPreviewProducts).toHaveBeenCalledWith(1, '', expect.any(AbortSignal)));
    expect(screen.queryByRole('combobox', { name: 'Catálogo' })).toBeNull();
    fireEvent.change(screen.getByRole('combobox', { name: 'Adicionar camada' }), { target: { value: 'catalog' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Campo do produto' }), { target: { value: 'currentPrice' } });
    const angle = screen.getByRole<HTMLInputElement>('slider', { name: 'Ângulo' });
    fireEvent.pointerDown(angle);
    fireEvent.change(angle, { target: { value: '23' } });
    fireEvent.change(angle, { target: { value: '48' } });
    fireEvent.pointerUp(angle);
    expect(angle.value).toBe('48');
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(angle.value).toBe('0');
    fireEvent.click(screen.getByRole('button', { name: 'Refazer' }));
    expect(angle.value).toBe('48');
    const square = screen.getByRole('tab', { name: '1:1' });
    square.focus();
    fireEvent.keyDown(square, { key: 'End' });
    expect(screen.getByRole('tab', { name: '9:16' }).getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: '9:16' }));
    fireEvent.change(screen.getByRole('slider', { name: 'Ângulo' }), { target: { value: '72' } });
    fireEvent.click(screen.getByRole('tab', { name: '1:1' }));
    expect(screen.getByRole<HTMLInputElement>('slider', { name: 'Ângulo' }).value).toBe('48');
    fireEvent.click(screen.getByRole('tab', { name: '9:16' }));
    expect(screen.getByRole<HTMLInputElement>('slider', { name: 'Ângulo' }).value).toBe('72');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    const [, values, original] = mocks.save.mock.calls[0];
    expect(original).toBeNull();
    expect(values.name).toBe('Vitrine');
    expect(values.design.formats['9:16'].layers[0]).toMatchObject({ type: 'catalog', field: 'currentPrice', angle: 72 });
    expect(values.design.formats['1:1'].layers[0]).toMatchObject({ type: 'catalog', field: 'currentPrice' });
    await screen.findByText('Modelo salvo.');
  });

  it('insere campos do produto no texto e duplica a camada sem substituir o original', async () => {
    mocks.list.mockResolvedValue({ rows: [], total: 0 });
    mocks.save.mockResolvedValue(saved);
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));
    fireEvent.change(within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Nome do modelo' }), { target: { value: 'Oferta' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Avançar' }));
    await screen.findByRole('heading', { name: 'Oferta' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Adicionar camada' }), { target: { value: 'text' } });
    const input = screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Mensagem' });
    fireEvent.change(input, { target: { value: 'DE  POR' } });
    input.setSelectionRange(3, 3);
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar campo do produto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preço' }));
    expect(input.value).toBe('DE {{product.price}} POR');
    fireEvent.click(screen.getByRole('button', { name: 'Sublinhado' }));
    fireEvent.click(screen.getByRole('button', { name: 'Alinhar no topo' }));
    const lineSpacing = screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Espaçamento entre linhas' });
    fireEvent.change(lineSpacing, { target: { value: '1.5' } });
    fireEvent.blur(lineSpacing);
    const letterSpacing = screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Espaçamento entre letras' });
    fireEvent.change(letterSpacing, { target: { value: '2' } });
    fireEvent.blur(letterSpacing);
    const textOpacity = screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Opacidade do texto (%)' });
    fireEvent.change(textOpacity, { target: { value: '70' } });
    fireEvent.blur(textOpacity);
    fireEvent.click(screen.getByRole('button', { name: 'Ações da camada Texto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Duplicar' }));
    expect(screen.getByRole('button', { name: /Texto \(cópia\)/, pressed: true })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    const layers = mocks.save.mock.calls[0][1].design.formats['1:1'].layers;
    expect(layers.filter((layer: { type: string }) => layer.type === 'text')).toHaveLength(2);
    expect(layers[0].id).not.toBe(layers[1].id);
    expect(layers[0]).toMatchObject({ text: 'DE {{product.price}} POR', underline: true, verticalAlign: 'top',
      lineSpacing: 1.5, letterSpacing: 2, textOpacity: 70 });
  });

  it('oferece os atributos técnicos do ERP em campos e textos do modelo', async () => {
    mocks.list.mockResolvedValue({ rows: [], total: 0 });
    mocks.save.mockResolvedValue(saved);
    vi.mocked(listPreviewProducts).mockResolvedValue({ rows: [{ id: 'p1', name: 'Armário', code: '101', active: true }], total: 1 });
    vi.mocked(readPreviewProduct).mockResolvedValue({ id: 'p1', variations: [] } as never);
    vi.mocked(mapPreviewProduct).mockReturnValue({ id: 'p1', currency: 'BRL', images: [], fields: { name: 'Armário' },
      attributes: { attribute_material: { name: 'Material', value: 'MDF' } } });
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));
    fireEvent.change(within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Nome do modelo' }), { target: { value: 'ERP' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Avançar' }));
    await screen.findByRole('heading', { name: 'ERP' });
    await screen.findByRole('combobox', { name: 'Prévia de um produto' });
    await waitFor(() => expect(mapPreviewProduct).toHaveBeenCalled());

    fireEvent.change(screen.getByRole('combobox', { name: 'Adicionar camada' }), { target: { value: 'catalog' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Campo do produto' }), { target: { value: 'attribute_material' } });
    expect((screen.getByRole('combobox', { name: 'Campo do produto' }) as HTMLSelectElement).value).toBe('attribute_material');

    fireEvent.change(screen.getByRole('combobox', { name: 'Adicionar camada' }), { target: { value: 'text' } });
    const message = screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Mensagem' });
    fireEvent.change(message, { target: { value: 'Material: ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar campo do produto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Material' }));
    expect(message.value).toBe('Material: {{product.attribute_material}}');
  });

  it('abre Alterar nome focando e selecionando o nome da camada ativa', async () => {
    mocks.list.mockResolvedValue({ rows: [], total: 0 });
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));
    fireEvent.change(within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Nome do modelo' }), { target: { value: 'Oferta' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Avançar' }));
    await screen.findByRole('heading', { name: 'Oferta' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Adicionar camada' }), { target: { value: 'text' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ações da camada Texto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Alterar nome' }));
    const nameInput = screen.getByRole<HTMLInputElement>('textbox', { name: 'Nome da camada' });
    await waitFor(() => expect(document.activeElement).toBe(nameInput));
    expect(nameInput.selectionStart).toBe(0);
    expect(nameInput.selectionEnd).toBe(nameInput.value.length);
    fireEvent.click(screen.getByRole('button', { name: 'Ações da camada Texto' }));
    expect(screen.getByRole('button', { name: 'Duplicar' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'Duplicar' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar campo do produto' }));
    expect(screen.getByRole('button', { name: 'Preço' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'Preço' })).toBeNull();
  });

  it('configura a foto do produto, os ajustes de imagem e a regra condicional', async () => {
    mocks.list.mockResolvedValue({ rows: [], total: 0 });
    mocks.save.mockResolvedValue(saved);
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));
    fireEvent.change(within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Nome do modelo' }), { target: { value: 'Produto' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Avançar' }));
    await screen.findByRole('heading', { name: 'Produto' });
    const imageIndex = screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Número da imagem' });
    fireEvent.change(imageIndex, { target: { value: '2' } });
    fireEvent.blur(imageIndex);
    fireEvent.click(screen.getByRole('switch', { name: /Remoção do fundo/ }));
    fireEvent.click(screen.getByRole('switch', { name: /Recortar para ajustar/ }));
    fireEvent.click(screen.getByRole('switch', { name: /Mostrar apenas esta camada/ }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Campo da regra' }), { target: { value: 'currentPrice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    const productLayer = mocks.save.mock.calls[0][1].design.formats['1:1'].layers.find((layer: { type: string }) => layer.type === 'product');
    expect(productLayer).toMatchObject({ imageIndex: 2, removeBackground: true, fit: 'cover',
      condition: { field: 'currentPrice', operator: 'exists' } });
  });

  it('mostra a miniatura e o nome do arquivo numa camada de imagem', async () => {
    mocks.list.mockResolvedValue({ rows: [], total: 0 });
    mocks.save.mockResolvedValue(saved);
    vi.mocked(prepareTemplateAsset).mockResolvedValue({ id: 'a'.repeat(64), webp_base64: 'd2VicA==' });
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));
    fireEvent.change(within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Nome do modelo' }), { target: { value: 'Oferta' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Avançar' }));
    await screen.findByRole('heading', { name: 'Oferta' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Adicionar camada' }), { target: { value: 'image' } });
    const file = new File(['imagem'], 'logo-oferta.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Carregar imagem'), { target: { files: [file] } });
    await screen.findByText('logo-oferta.png');
    expect(document.querySelector('.ct-asset-card img')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Remover' })).toBeTruthy();
  });

  it('atualiza o produto do ERP antes de gerar o PNG', async () => {
    mocks.list.mockResolvedValue({ rows: [], total: 0 });
    vi.mocked(listPreviewProducts).mockResolvedValue({ rows: [{ id: 'p1', name: 'Mesa', code: '101', active: true }], total: 1 });
    vi.mocked(readPreviewProduct).mockResolvedValueOnce({ id: 'p1', variations: [], name: 'Mesa', unitPrice: 100 } as any)
      .mockResolvedValueOnce({ id: 'p1', variations: [], name: 'Mesa', unitPrice: 80 } as any);
    vi.mocked(mapPreviewProduct).mockImplementation((source) => ({ id: source.id, currency: 'BRL', images: [],
      fields: { name: source.name, currentPrice: source.unitPrice, retailerId: '101' } }));
    const blob = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(new Blob(['png'], { type: 'image/png' })));
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:imagem');
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));
    fireEvent.change(within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Nome do modelo' }), { target: { value: 'Oferta' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Avançar' }));
    const download = await screen.findByRole<HTMLButtonElement>('button', { name: 'Baixar PNG' });
    await waitFor(() => expect(download.disabled).toBe(false));
    fireEvent.click(download);
    await waitFor(() => expect(mocks.render).toHaveBeenCalledWith(expect.objectContaining({
      product: expect.objectContaining({ fields: expect.objectContaining({ currentPrice: 80 }) }), format: '1:1',
    })));
    expect(readPreviewProduct).toHaveBeenCalledTimes(2);
    await screen.findByText('Imagem gerada com os dados atuais do produto.');
    blob.mockRestore(); createUrl.mockRestore(); click.mockRestore();
  });

  it('busca o desenho só ao editar e permite duplicar sem sobrescrever o modelo original', async () => {
    mocks.list.mockResolvedValue({ rows: [saved], total: 1 });
    mocks.read.mockResolvedValue({ ...saved, design: startImageTemplate('blank') });
    mocks.save.mockResolvedValue({ ...saved, name: 'Vitrine (cópia)' });
    open();
    await screen.findByRole('button', { name: 'Vitrine' });
    expect(mocks.read).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Ações de Vitrine'));
    fireEvent.click(screen.getByRole('button', { name: 'Fazer uma cópia' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Avançar' }));
    await screen.findByRole('heading', { name: 'Vitrine (cópia)' });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    const [copyId, values, original] = mocks.save.mock.calls[0];
    expect(copyId).not.toBe(saved.id);
    expect(values.name).toBe('Vitrine (cópia)');
    expect(original).toBeNull();
  });

  it('exclui somente após confirmação e envia a versão exibida na lista', async () => {
    mocks.list.mockResolvedValue({ rows: [saved], total: 1 });
    mocks.remove.mockResolvedValue({ id: saved.id });
    open();
    await screen.findByRole('button', { name: 'Vitrine' });
    const menu = () => {
      fireEvent.click(screen.getByLabelText('Ações de Vitrine'));
      fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    };
    menu();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(mocks.remove).not.toHaveBeenCalled();
    menu();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir modelo' }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith({ id: saved.id, updated_at: saved.updated_at }));
  });
});
