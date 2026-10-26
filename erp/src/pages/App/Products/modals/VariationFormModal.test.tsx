// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VariationFormModal } from './VariationFormModal';
import type { Product, Variation } from '@/pages/types/product.type';
import { invalidateTechnicalFieldDefinitionsCache } from '../services/technicalFieldService';
import { createProductVariationFormSchema, productVariationDraftSchema } from '../../../../../../shared-utils/productVariationValidation';

const mocks = vi.hoisted(() => ({ cachedParents: [] as Product[], updateParent: vi.fn(), upload: vi.fn(), compress: vi.fn(), saveVariation: vi.fn(), fetchProductsPage: vi.fn(), response: vi.fn(), success: vi.fn(), error: vi.fn(), profile: { role: 'admin' } as { role: string } }));
vi.mock('@/pages/utils/productService/productLocalCache', () => ({ getLocalProducts: () => mocks.cachedParents }));
vi.mock('@/pages/utils/productService/productMutationService', () => ({ updateProduct: mocks.updateParent }));
vi.mock('../components/tabs/images/productImageUpload', () => ({ uploadOptimizedProductImage: mocks.upload }));
vi.mock('@/pages/utils/imageUtils', () => ({ compressImageToFile: mocks.compress }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ profile: mocks.profile }) }));
vi.mock('react-toastify', () => ({ toast: { success: mocks.success, error: mocks.error, warn: vi.fn() } }));
vi.mock('@/pages/utils/productService', () => ({ saveVariation: mocks.saveVariation, fetchProductsPage: mocks.fetchProductsPage, generateVariationSku: () => '001-01', parseVariationImages: (_raw: unknown, images: string[] | undefined) => images || [] }));
vi.mock('@/pages/utils/supabaseConfig', () => {
  const client = { from: (table: string) => {
    const query: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'in', 'order', 'limit', 'or', 'is', 'neq', 'range']) query[method] = () => query;
    query.then = (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => Promise.resolve(mocks.response(table)).then(resolve, reject);
    return query;
  } };
  return { supabase: client, ecommerceSupabase: client };
});
const variation: Variation = { id: '11111111-1111-4111-8111-111111111111', sku: '001-01', name: 'Armário Azul', stock: 0, unitPrice: 120, active: true, status: 'hidden', attributes: [{ name: 'Cor', value: 'Azul' }],
  syncUnitPrice: false, syncDescription: false, syncWidth: false, syncHeight: false, syncDepth: false,
  width: 80, height: 180, depth: 50, technicalValues: { Cor: 'Azul', Marca: 'Morante', Modelo: 'Padrão', 'Material da estrutura': 'Madeira' }, description: 'Descrição própria', images: ['https://img.test/azul.jpg'] };
const parent: Product = { id: '22222222-2222-4222-8222-222222222222', name: 'Armário', description: 'Descrição do pai', unitPrice: 150, unit: 'UN', itemType: 'product', active: true, status: 'hidden', categoryIds: ['categoria'],
  images: ['https://img.test/azul.jpg', 'https://img.test/verde.jpg'], variations: [variation, { ...variation, id: '33333333-3333-4333-8333-333333333333', sku: '001-02', name: 'Armário Verde', attributes: [{ name: 'Cor', value: 'Verde' }] }] };
const fields = ['Cor', 'Marca', 'Modelo', 'Material da estrutura'].map((name, index) => ({ id: `attribute-${index}`, name, active: true, data_type: 'text', unit: null }));
const mount = (value = variation, product = parent, extras: Record<string, unknown> = {}) => {
  const onSave = vi.fn().mockResolvedValue(true), onClose = vi.fn(), onSuccess = vi.fn();
  const props = { isOpen: true, variation: value, parentProduct: product, onSave, onClose, onSuccess, ...extras };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return { ...render(<VariationFormModal {...props} />, { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> }), props, onSave, onClose, onSuccess };
};
const tab = (name: string) => fireEvent.click(screen.getByRole('tab', { name }));
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
beforeEach(() => {
  vi.clearAllMocks(); invalidateTechnicalFieldDefinitionsCache(); mocks.profile = { role: 'admin' }; mocks.saveVariation.mockResolvedValue(undefined);
  mocks.response.mockImplementation((table: string) => ({ data: table === 'attributes' ? fields : table === 'product_images' ? parent.images?.map((image_url) => ({ image_url })) : [], error: null }));
});
describe('composição real do formulário de variações', () => {
  it('entrega nome, descrição e preço editados nas abas reais somente depois do resolver', async () => {
    const view = mount();
    fireEvent.change(screen.getByLabelText('Nome da variação'), { target: { value: 'Azul Especial' } });
    tab('Descrição'); fireEvent.change(screen.getByLabelText('Descrição da variação'), { target: { value: 'Descrição revisada' } });
    tab('Precificação'); fireEvent.change(screen.getByLabelText('Desconto em percentual da variação'), { target: { value: '25' } });
    submit(); await waitFor(() => expect(view.onSave).toHaveBeenCalledTimes(1));
    expect(view.onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Armário Azul Especial', description: 'Descrição revisada', unitPrice: 120, promoPrice: 90 }));
    expect(view.onSave.mock.calls[0][0]).not.toHaveProperty('discountPercent'); expect(view.onClose).toHaveBeenCalledTimes(1);
  });
  it.each(['101', '-1'])('mostra desconto %s inválido e impede o efeito', async (value) => {
    const view = mount(); tab('Precificação'); fireEvent.change(screen.getByLabelText('Desconto em percentual da variação'), { target: { value } });
    submit(); await screen.findByRole('alert'); expect(view.onSave).not.toHaveBeenCalled(); expect(view.onClose).not.toHaveBeenCalled();
  });
  it('preserva a linha incompleta de atributo para informar o erro de conclusão', async () => {
    const view = mount({ ...variation, attributes: [{ name: 'Cor', value: '' }] }); submit();
    expect((await screen.findByRole('alert')).textContent).toContain('Complete o nome e o valor');
    expect(view.onSave).not.toHaveBeenCalled(); expect(screen.getByRole('tab', { name: 'Informações Básicas' }).getAttribute('aria-selected')).toBe('true');
  });
  it('mantém linha vazia de componente, direciona o erro e permite removê-la antes de concluir', async () => {
    const value = { ...variation, comboItems: [{ productId: 'componente', description: 'Banco', unitPrice: 20, stock: 0, quantity: 2 }] };
    const view = mount(value, { ...parent, itemType: 'composition' }); tab('Composição');
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Produto' })); submit();
    expect((await screen.findByRole('alert')).textContent).toContain('Selecione o produto'); expect(view.onSave).not.toHaveBeenCalled();
    const remove = screen.getAllByRole('button', { name: 'Remover Item' }); fireEvent.click(remove[1]);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '3' } }); submit();
    await waitFor(() => expect(view.onSave).toHaveBeenCalledWith(expect.objectContaining({ comboItems: [expect.objectContaining({ quantity: 3 })] })));
  });
  it('bloqueia fechar, Escape, edição e repetição enquanto aguarda o callback real', async () => {
    let finish!: (value: boolean) => void; const onSave = vi.fn(() => new Promise<boolean>((resolve) => { finish = resolve; }));
    const view = mount(variation, parent, { onSave }); submit(); await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Salvando...' })).toHaveProperty('disabled', true);
    expect(screen.getByLabelText('Nome da variação').closest('fieldset')).toHaveProperty('disabled', true);
    for (const name of ['Fechar', 'Fechar modal', 'Cancelar']) fireEvent.click(screen.getByRole('button', { name }));
    fireEvent.keyDown(window, { key: 'Escape' }); expect(view.onClose).not.toHaveBeenCalled();
    await act(async () => { finish(true); }); expect(view.onClose).toHaveBeenCalledTimes(1); expect(mocks.success).toHaveBeenCalledTimes(1);
  });
  it('não publica callback antigo ao trocar a variação com gravação pendente', async () => {
    let finish!: (value: boolean) => void; const onSave = vi.fn(() => new Promise<boolean>((resolve) => { finish = resolve; }));
    const view = mount(variation, parent, { onSave }); submit(); await waitFor(() => expect(onSave).toHaveBeenCalled());
    view.rerender(<VariationFormModal {...view.props} variation={parent.variations![1]} />);
    await act(async () => { finish(true); }); expect(view.onClose).not.toHaveBeenCalled(); expect(view.onSuccess).not.toHaveBeenCalled(); expect(mocks.success).not.toHaveBeenCalled();
  });
  it('conserva rascunho com nova referência do mesmo pai/variação', () => {
    const view = mount(); fireEvent.change(screen.getByLabelText('Nome da variação'), { target: { value: 'Edição local' } });
    view.rerender(<VariationFormModal {...view.props} parentProduct={{ ...parent }} variation={{ ...variation }} />);
    expect(screen.getByLabelText('Nome da variação')).toHaveProperty('value', 'Edição local');
  });
  it('variação única conserva a herança e bloqueia edição nas abas herdadas', async () => {
    const view = mount(variation, { ...parent, variations: [variation] });
    expect(screen.getByRole('tab', { name: 'Fotos vinculadas' }).getAttribute('aria-selected')).toBe('true'); tab('Precificação');
    expect(screen.getByText(/somente as abas Informações Básicas e Fotos vinculadas permitem edição/)).toBeTruthy();
    submit(); await waitFor(() => expect(view.onSave).toHaveBeenCalledWith(expect.objectContaining({ unitPrice: 150, syncUnitPrice: true, syncDescription: true })));
  });
  it('estoquista não recebe abas de fotos e descrição', () => {
    mocks.profile = { role: 'stockist' }; mount(); expect(screen.queryByRole('tab', { name: 'Fotos vinculadas' })).toBeNull(); expect(screen.queryByRole('tab', { name: 'Descrição' })).toBeNull();
  });
  it('alteração da seleção de fotos passa pelo proprietário e chega ao submit', async () => {
    const view = mount(); tab('Fotos vinculadas'); fireEvent.click(screen.getByRole('button', { name: /Vincular Fotos/ }));
    const dialog = await screen.findByRole('dialog', { name: /fotos/i });
    fireEvent.click(within(dialog).getByRole('img', { name: /Foto 2/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: /Confirmar/ })); await waitFor(() => expect(screen.queryByRole('dialog', { name: /fotos/i })).toBeNull());
    submit(); await waitFor(() => {
      expect(view.onSave).toHaveBeenCalled();
      expect(view.onSave.mock.calls[0][0].images).toContain('https://img.test/verde.jpg');
    });
  });
  it('contrato de rascunho preserva componentes/atributos incompletos; conclusão rejeita', () => {
    const draft = { ...variation, attributes: [{ name: 'Cor', value: '' }], comboItems: [{ productId: '', description: '', quantity: 0, unitPrice: 0, stock: 0 }] };
    expect(productVariationDraftSchema.safeParse(draft).success).toBe(true); expect(createProductVariationFormSchema(parent).safeParse(draft).success).toBe(false);
  });
  it('perde a espera em 60s sem repetir nem publicar retorno tardio, inclusive após reabrir', async () => {
    vi.useFakeTimers();
    let finish!: (value: boolean) => void; const onSave = vi.fn(() => new Promise<boolean>((resolve) => { finish = resolve; }));
    const view = mount(variation, parent, { onSave }); await act(async () => { submit(); }); expect(onSave).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(screen.getByRole('alert').textContent).toContain('pode ter sido gravado'); expect(screen.getByRole('button', { name: 'Salvar Alterações' })).toHaveProperty('disabled', true);
    view.rerender(<VariationFormModal {...view.props} isOpen={false} />); view.rerender(<VariationFormModal {...view.props} />);
    expect(screen.getByRole('alert').textContent).toContain('pode ter sido gravado');
    await act(async () => { finish(true); }); expect(mocks.success).not.toHaveBeenCalled(); expect(view.onClose).not.toHaveBeenCalled(); expect(onSave).toHaveBeenCalledTimes(1);
  });
  it('não inicia gravação quando é desmontado durante a validação assíncrona', async () => {
    const view = mount(); act(() => { submit(); view.unmount(); }); await act(async () => {});
    expect(view.onSave).not.toHaveBeenCalled(); expect(mocks.success).not.toHaveBeenCalled();
  });
  it('aguarda o serviço standalone e conserva a mesma proteção de conclusão', async () => {
    let finish!: () => void; mocks.saveVariation.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    const view = mount(variation, parent, { onSave: undefined }); submit(); await waitFor(() => expect(mocks.saveVariation).toHaveBeenCalledTimes(1));
    expect(view.onClose).not.toHaveBeenCalled(); expect(mocks.saveVariation).toHaveBeenCalledWith(parent.id, expect.objectContaining({ id: variation.id }));
    await act(async () => { finish(); }); expect(view.onClose).toHaveBeenCalledTimes(1);
  });
  it('permite correção após callback rejeitar explicitamente o salvamento', async () => {
    const onSave = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true); const view = mount(variation, parent, { onSave });
    submit(); await screen.findByRole('alert'); expect(view.onClose).not.toHaveBeenCalled(); expect(mocks.success).not.toHaveBeenCalled();
    submit(); await waitFor(() => expect(view.onClose).toHaveBeenCalledTimes(1)); expect(onSave).toHaveBeenCalledTimes(2);
  });
  it('erro de rede depois de iniciar gravação exige conferência antes de repetir', async () => {
    const onSave = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')); mount(variation, parent, { onSave }); submit();
    expect((await screen.findByRole('alert')).textContent).toContain('pode ter sido gravado'); submit(); expect(onSave).toHaveBeenCalledTimes(1); expect(mocks.success).not.toHaveBeenCalled();
  });
  it('um callback de atualização da tela que falha não transforma gravação confirmada em repetição', async () => {
    const view = mount(variation, parent, { onSuccess: () => { throw new Error('Tela indisponível'); } }); submit();
    expect((await screen.findByRole('alert')).textContent).toContain('Variação salva, mas a tela');
    expect(screen.getByRole('button', { name: 'Salvar Alterações' })).toHaveProperty('disabled', true); expect(view.onSave).toHaveBeenCalledTimes(1);
  });
  it('erro de fotos/atributos fica visível e a consulta pode ser repetida', async () => {
    mocks.response.mockResolvedValue({ data: null, error: { message: 'Offline' } }); mount();
    const retry = await screen.findByRole('button', { name: 'Consultar novamente' });
    expect(screen.getByRole('alert').textContent).toContain('Não foi possível carregar');
    mocks.response.mockResolvedValue({ data: [], error: null }); fireEvent.click(retry);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Consultar novamente' })).toBeNull());
  });
  it('campos técnicos reais alterados chegam ao resolver e ao payload', async () => {
    const view = mount(); tab('Características específicas');
    const label = await screen.findByTitle('Marca'); const field = label.parentElement!.parentElement!;
    fireEvent.change(within(field).getByRole('textbox'), { target: { value: 'Moderno' } }); submit();
    await waitFor(() => expect(view.onSave).toHaveBeenCalledWith(expect.objectContaining({ technicalValues: expect.objectContaining({ Marca: 'Moderno' }) })));
  });
  it('autocomplete real preserva preço e estoque zero da variação componente', async () => {
    mocks.fetchProductsPage.mockResolvedValue({ data: [{ ...parent, id: 'componente', name: 'Banco', unitPrice: 80, stock: 10, variations: [{ ...variation, id: 'banco-azul', name: 'Banco Azul', unitPrice: 0, stock: 0 }] }] });
    const view = mount(variation, { ...parent, itemType: 'composition' }); tab('Composição'); fireEvent.click(screen.getByRole('button', { name: 'Adicionar Produto' }));
    fireEvent.change(screen.getByPlaceholderText('Buscar produto (mesmo fornecedor)'), { target: { value: 'Banco' } });
    fireEvent.click(await screen.findByRole('button', { name: /Banco.*Azul/ })); submit(); await waitFor(() => expect(view.onSave).toHaveBeenCalled());
    expect(view.onSave.mock.calls[0][0].comboItems).toEqual([expect.objectContaining({ variationId: 'banco-azul', unitPrice: 0, stock: 0 })]);
  });
  it('não persiste o ID sintético da variação virtual de um componente simples legado', async () => {
    mocks.fetchProductsPage.mockResolvedValue({ data: [{
      ...parent,
      id: 'componente-simples-legado',
      name: 'Banqueta Legada',
      code: 'BAN-1',
      unitPrice: 50,
      stock: 8,
      variations: [{ ...variation, id: 'componente-simples-legado_BAN-1-01', isVirtual: true, name: 'Banqueta Legada', unitPrice: 50, stock: 8 }],
    }] });
    const existingItem = { productId: 'componente-existente', quantity: 1, description: 'Mesa', unitPrice: 120, stock: 4 };
    const view = mount({ ...variation, comboItems: [existingItem] }, { ...parent, itemType: 'composition' });
    tab('Composição'); fireEvent.click(screen.getByRole('button', { name: 'Adicionar Produto' }));
    fireEvent.change(screen.getByPlaceholderText('Buscar produto (mesmo fornecedor)'), { target: { value: 'Banqueta' } });
    fireEvent.click(await screen.findByRole('button', { name: /Banqueta Legada/ })); submit();
    await waitFor(() => expect(view.onSave).toHaveBeenCalled());
    const addedItem = view.onSave.mock.calls[0][0].comboItems[1];
    expect(addedItem).toMatchObject({ productId: 'componente-simples-legado', description: 'Banqueta Legada', quantity: 1, unitPrice: 50, stock: 8 });
    expect(addedItem.variationId).toBeUndefined();
  });
  it('atributos/fotos sem resposta deixam de carregar em 10s e ignoram fotos tardias', async () => {
    vi.useFakeTimers(); let finish!: (value: unknown) => void;
    mocks.response.mockImplementation((table: string) => new Promise((resolve) => { if (table === 'product_images') finish = resolve; })); mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(screen.queryByText('Carregando características e fotos do produto pai...')).toBeNull(); expect(screen.getByRole('button', { name: 'Consultar novamente' })).toHaveProperty('disabled', false);
    await act(async () => { finish({ data: [{ image_url: 'https://img.test/tardia.jpg' }], error: null }); });
    expect(screen.getByRole('alert').textContent).toContain('Não foi possível carregar as fotos');
  });
  it('fotos do pai anterior não entram na sessão de outro produto', async () => {
    let finish!: (value: unknown) => void;
    mocks.response.mockImplementation((table: string) => table === 'product_images' ? new Promise((resolve) => { finish = resolve; }) : { data: [], error: null });
    const view = mount();
    await act(async () => {});
    mocks.response.mockImplementation((table: string) => ({ data: table === 'product_images' ? [{ image_url: 'https://img.test/nova.jpg' }] : [], error: null }));
    view.rerender(<VariationFormModal {...view.props} parentProduct={{ ...parent, id: 'novo-pai', images: ['https://img.test/nova.jpg'] }} />);
    await act(async () => { finish({ data: [{ image_url: 'https://img.test/antiga.jpg' }], error: null }); });
    tab('Fotos vinculadas'); fireEvent.click(screen.getByRole('button', { name: /Vincular Fotos/ }));
    const dialog = screen.getByRole('dialog', { name: /fotos/i }); const images = within(dialog).getAllByRole('img');
    expect(images.some((image) => image.getAttribute('src')?.includes('antiga.jpg'))).toBe(false); expect(images.length).toBe(1);
  });
  it('características sem resposta têm erro em 15s e repetição com consulta nova', async () => {
    vi.useFakeTimers(); mocks.response.mockImplementation(() => new Promise(() => {})); mount(); tab('Características específicas');
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    expect(screen.queryByText('Carregando especificações técnicas...')).toBeNull(); expect(screen.queryByText('Nenhuma característica cadastrada.')).toBeNull();
    mocks.response.mockImplementation((table: string) => ({ data: table === 'attributes' ? fields : [], error: null }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Consultar características novamente' })); });
    expect(screen.getByTitle('Marca')).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Consultar características novamente' })).toBeNull();
  });
  it.each([
    { attributes: [{ name: 'Cor', value: 'Azul' }, { name: ' cor ', value: 'Verde' }] },
    { comboItems: [{ productId: 'banco', description: 'Banco', quantity: 0, unitPrice: 0, stock: 0 }] },
  ])('conclusão recusa atributos duplicados/componentes com quantidade zero: %j', (change) => {
    const result = createProductVariationFormSchema(parent).safeParse({ ...variation, ...change }); expect(result.success).toBe(false);
  });
  it('rejeita nome completo repetido entre as variações no formulário padrão', () => {
    const parentWithNames = { ...parent, variations: [variation, { ...variation, id: '44444444-4444-4444-8444-444444444444', name: 'Armário Verde' }] };
    const result = createProductVariationFormSchema(parentWithNames).safeParse({ ...variation, id: '55555555-5555-4555-8555-555555555555', name: 'Armário Azul' });
    expect(result.error?.issues.some((issue) => issue.path.includes('name') && issue.message.includes('nome completo'))).toBe(true);
  });
  it('permite concluir a variação sem características exigidas apenas pelo catálogo', () => {
    const parentWithVariableFields = { ...parent, variableTechnicalFields: ['Cor', 'Material da estrutura'] };
    const candidate = { ...variation, id: '55555555-5555-4555-8555-555555555555', sku: '001-03', name: 'Armário Carvalho', technicalValues: { Cor: 'Carvalho', 'Material da estrutura': '' }, attributes: [{ name: 'Cor', value: 'Carvalho' }] };
    const parsed = createProductVariationFormSchema(parentWithVariableFields).safeParse(candidate);
    expect(parsed.success).toBe(true);
  });
});

describe('recorte com modal, proprietário e cropper reais', () => {
  const url = 'https://img.test/recortada.webp';
  const deferred = () => { let resolve!: (value: any) => void; const promise = new Promise<any>((yes) => { resolve = yes; }); return { promise, resolve }; };
  beforeEach(() => {
    mocks.cachedParents = [parent]; mocks.updateParent.mockResolvedValue(undefined);
    mocks.upload.mockResolvedValue(url); mocks.compress.mockImplementation(async (file: File) => file);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['image'], { type: 'image/png' }) }));
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:crop-source'); vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300); vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300);
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(800); vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(800);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn(), fillRect: vi.fn() } as any);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(new Blob(['crop'], { type: 'image/webp' })));
  });
  const openCrop = async () => {
    tab('Fotos vinculadas'); fireEvent.click(screen.getByTitle('Recortar foto em 1:1'));
    const image = await screen.findByAltText('Recorte do produto'); fireEvent.load(image);
    const finish = screen.getByRole('button', { name: 'Concluir e Salvar' }); await waitFor(() => expect(finish).toHaveProperty('disabled', false)); return finish;
  };
  it('holds the owner lock through compression, upload and awaited global application', async () => {
    const upload = deferred(), replacement = deferred(); mocks.upload.mockReturnValue(upload.promise); const apply = vi.fn(() => replacement.promise); const view = mount(variation, parent, { onReplaceImageGlobal: apply });
    const finish = await openCrop(), previousSource = screen.getByAltText('Foto 1').getAttribute('src'); fireEvent.click(finish); await waitFor(() => expect(mocks.upload).toHaveBeenCalledOnce());
    expect(screen.getByRole('button', { name: 'Salvando...' })).toHaveProperty('disabled', true);
    fireEvent.keyDown(window, { key: 'Escape' }); expect(view.onClose).not.toHaveBeenCalled(); expect(screen.getByAltText('Recorte do produto')).toBeTruthy();
    await act(async () => { upload.resolve(url); }); await waitFor(() => expect(apply).toHaveBeenCalledWith(variation.images![0], url));
    expect(screen.getByAltText('Foto 1').getAttribute('src')).toBe(previousSource);
    await act(async () => { replacement.resolve(true); }); await waitFor(() => expect(screen.queryByAltText('Recorte do produto')).toBeNull());
    expect(screen.getByAltText('Foto 1').getAttribute('src')).toContain('/recortada'); submit(); await waitFor(() => expect(view.onSave).toHaveBeenCalledOnce()); expect(view.onSave.mock.calls[0][0].images).toEqual([url]);
  });
  it('retries a refused application with the same prepared file and upload receipt', async () => {
    const apply = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true); mount(variation, parent, { onReplaceImageGlobal: apply }); const finish = await openCrop(), previousSource = screen.getByAltText('Foto 1').getAttribute('src');
    fireEvent.click(finish); await waitFor(() => expect(apply).toHaveBeenCalledOnce()); await waitFor(() => expect(finish).toHaveProperty('disabled', false));
    expect(screen.getByAltText('Foto 1').getAttribute('src')).toBe(previousSource); fireEvent.click(finish);
    await waitFor(() => expect(apply).toHaveBeenCalledTimes(2)); await waitFor(() => expect(screen.queryByAltText('Recorte do produto')).toBeNull()); expect(mocks.upload).toHaveBeenCalledOnce(); expect(mocks.compress).toHaveBeenCalledOnce();
  });
  it('blocks replay and final save after an uncertain upload timeout', async () => {
    const apply = vi.fn(); mocks.upload.mockReturnValue(new Promise(() => {})); mount(variation, parent, { onReplaceImageGlobal: apply }); const finish = await openCrop(); vi.useFakeTimers();
    await act(async () => { fireEvent.click(finish); await vi.advanceTimersByTimeAsync(55_001); });
    expect(apply).not.toHaveBeenCalled(); expect(screen.getByRole('button', { name: 'Salvar Alterações' })).toHaveProperty('disabled', true);
    fireEvent.click(finish); expect(mocks.upload).toHaveBeenCalledOnce(); expect(screen.getAllByRole('alert').some((node) => /não foi confirmado/.test(node.textContent || ''))).toBe(true);
  });
  it('discards an old upload when the selected variation changes', async () => {
    const upload = deferred(); mocks.upload.mockReturnValue(upload.promise); const apply = vi.fn(); const view = mount(variation, parent, { onReplaceImageGlobal: apply }); fireEvent.click(await openCrop());
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledOnce()); view.rerender(<VariationFormModal {...view.props} variation={parent.variations![1]} />);
    await act(async () => { upload.resolve(url); }); expect(apply).not.toHaveBeenCalled(); expect(view.onClose).not.toHaveBeenCalled(); expect(screen.queryByAltText('Recorte do produto')).toBeNull();
  });
  it('lets Escape cancel only the idle cropper', async () => {
    const view = mount(); await openCrop(); fireEvent.keyDown(window, { key: 'Escape' }); expect(screen.queryByAltText('Recorte do produto')).toBeNull(); expect(view.onClose).not.toHaveBeenCalled(); expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('awaits the parent service contract when no local aggregate callback is supplied', async () => {
    const saved = deferred(); mocks.updateParent.mockReturnValue(saved.promise); mount(); fireEvent.click(await openCrop()); await waitFor(() => expect(mocks.updateParent).toHaveBeenCalledOnce());
    expect(mocks.updateParent).toHaveBeenCalledWith(parent.id, expect.objectContaining({ images: [url, parent.images![1]] }));
    expect(mocks.updateParent.mock.calls[0][1].variations.every((item: Variation) => item.images?.includes(url))).toBe(true);
    expect(screen.getByAltText('Recorte do produto')).toBeTruthy(); await act(async () => { saved.resolve(undefined); }); await waitFor(() => expect(screen.queryByAltText('Recorte do produto')).toBeNull()); expect(screen.getByAltText('Foto 1').getAttribute('src')).toContain('/recortada');
  });
  it('bounds compression while the owner remains locked and preserves the original photo', async () => {
    mocks.compress.mockReturnValue(new Promise(() => {})); mount(variation, parent, { onReplaceImageGlobal: vi.fn() }); const finish = await openCrop(), previousSource = screen.getByAltText('Foto 1').getAttribute('src'); vi.useFakeTimers();
    await act(async () => { fireEvent.click(finish); await vi.advanceTimersByTimeAsync(15_001); });
    expect(mocks.upload).not.toHaveBeenCalled(); expect(screen.getByAltText('Foto 1').getAttribute('src')).toBe(previousSource); expect(screen.getByRole('button', { name: 'Salvar Alterações' })).toHaveProperty('disabled', false);
    expect(screen.getByRole('alert').textContent).toMatch(/preparação do recorte demorou/);
  });
  it('bounds an uncertain application without resending the image', async () => {
    const apply = vi.fn().mockReturnValue(new Promise(() => {})); mount(variation, parent, { onReplaceImageGlobal: apply }); const finish = await openCrop(); vi.useFakeTimers();
    await act(async () => { fireEvent.click(finish); await vi.advanceTimersByTimeAsync(30_001); });
    expect(mocks.upload).toHaveBeenCalledOnce(); expect(apply).toHaveBeenCalledOnce(); expect(screen.getByRole('button', { name: 'Salvar Alterações' })).toHaveProperty('disabled', true); fireEvent.click(finish); expect(mocks.upload).toHaveBeenCalledOnce();
  });
});
