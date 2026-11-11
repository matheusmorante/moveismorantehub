// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createImageLayer, startImageTemplate, type ImageTemplateFormValues } from '../../../../../../shared-utils/catalogImageTemplate';
import ImageTemplateEditor from './ImageTemplateEditor';

const mocks = vi.hoisted(() => ({ save: vi.fn(), measureText: vi.fn() }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ profile: { role: 'manager' } }) }));
vi.mock('./useTemplateAssets', () => ({ useTemplateAssets: () => ({ sources: new Map(), loading: false, error: '', retry: vi.fn() }) }));
vi.mock('./TemplateProductPreview', () => ({ TemplateProductPreview: () => null,
  useTemplateProductPreview: () => ({ product: null, productId: '', detail: {} }) }));
vi.mock('./renderImageTemplate', () => ({ createTemplatePictureLoader: () => vi.fn(),
  renderImageTemplate: async () => ({ errors: [], notices: [] }), interpolateTemplateFields: (text: string) => text,
  measureTextLayerSafetyBounds: mocks.measureText }));
vi.mock('./imageTemplateService', () => ({ saveImageTemplate: mocks.save, assetSource: vi.fn(), prepareTemplateAsset: vi.fn(),
  readTemplateAssets: vi.fn(), imageTemplateError: (error: Error) => error.message }));

beforeEach(() => {
  mocks.save.mockReset().mockResolvedValue({ id: crypto.randomUUID(), name: 'Modelo', updated_at: '2026-11-10T18:00:00Z' });
  mocks.measureText.mockImplementation((layer: { width: number; height: number }) => ({ width: layer.width, height: layer.height,
    minimumWidth: 120, minimumHeight: 60 }));
});
afterEach(cleanup);

function open() {
  const layout = startImageTemplate('blank').formats['1:1'];
  const images = ['A', 'B', 'C'].map((name, index) => ({ ...createImageLayer('image', '1:1'), name,
    x: 20 + index * 180, y: 30 + index * 90, width: 100, height: 60 }));
  const initial: ImageTemplateFormValues = { name: 'Modelo', description: '', design: { version: 1, formats: { '1:1': { layers: [...images, ...layout.layers] } } } };
  const view = render(<ImageTemplateEditor initial={initial} original={null} userId="operator" onBack={vi.fn()} onSaved={vi.fn()} />);
  return { ...view, images, list: screen.getByRole('complementary', { name: 'Camadas' }) };
}
function groupTwo() {
  const view = open();
  fireEvent.click(screen.getByRole('button', { name: 'Ações da camada A' }));
  fireEvent.click(screen.getByRole('button', { name: 'Selecionar vários' }));
  expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'Selecionar camada A' }).checked).toBe(true);
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Agrupar' }).disabled).toBe(true);
  expect(screen.queryByRole('button', { name: 'Mover posição de A' })).toBeNull();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar camada B' }));
  fireEvent.click(screen.getByRole('button', { name: 'Agrupar' }));
  return view;
}
async function save() {
  const previous = mocks.save.mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
  await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(previous + 1));
  await waitFor(() => expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Salvar' }).disabled).toBe(false));
  return mocks.save.mock.calls.at(-1)![1] as ImageTemplateFormValues;
}

it('cria o container azul, move o grupo, limita o filho e aumenta a área sem escalar os itens', async () => {
  const { container, images, list } = groupTwo();
  expect(container.querySelector('.ct-layer-group')).not.toBeNull();
  expect(container.querySelector('.ct-layer-outline[data-group="true"]')).not.toBeNull();
  expect(screen.getByRole('button', { name: 'Mover posição de Grupo 1' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Mover posição de A' })).toBeNull();
  expect(screen.queryByRole('checkbox', { name: 'Selecionar camada A' })).toBeNull();
  const board = screen.getByLabelText(/Área de edição do modelo/);
  fireEvent.keyDown(board, { key: 'ArrowRight' });
  let values = await save();
  let layout = values.design.formats['1:1'];
  expect(layout.layers.find((layer) => layer.id === images[0].id)).toMatchObject({ x: 21, y: 30 });
  expect(layout.layers.find((layer) => layer.id === images[1].id)).toMatchObject({ x: 201, y: 120 });
  fireEvent.click(within(list).getByRole('button', { name: 'A Imagem' }));
  expect(container.querySelector('.ct-group-boundary')).not.toBeNull();
  for (let step = 0; step < 30; step++) fireEvent.keyDown(board, { key: 'ArrowRight', shiftKey: true });
  values = await save();
  layout = values.design.formats['1:1'];
  expect(layout.layers.find((layer) => layer.id === images[0].id)).toMatchObject({ x: 201 });
  fireEvent.click(within(list).getByRole('button', { name: 'Grupo 1 2 camadas' }));
  const width = screen.getByRole('spinbutton', { name: 'Largura do agrupamento' });
  fireEvent.change(width, { target: { value: '400' } }); fireEvent.blur(width);
  fireEvent.click(within(list).getByRole('button', { name: 'A Imagem' }));
  fireEvent.keyDown(board, { key: 'ArrowRight', shiftKey: true });
  const childWidth = screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Largura' });
  fireEvent.change(childWidth, { target: { value: '999' } }); fireEvent.blur(childWidth);
  expect(childWidth.value).toBe('100');
  expect(screen.getByRole('alert').textContent).toContain('Aumente o tamanho do agrupamento');
  values = await save();
  layout = values.design.formats['1:1'];
  expect(layout.groups?.[0]).toMatchObject({ x: 21, width: 400 });
  expect(layout.layers.find((layer) => layer.id === images[0].id)).toMatchObject({ x: 211, width: 100, height: 60 });
  expect(layout.layers.find((layer) => layer.id === images[1].id)).toMatchObject({ x: 201, width: 100, height: 60 });
});

it('adiciona camadas, desagrupa um item e remove o grupo com desfazer e refazer', async () => {
  const { container, images } = groupTwo();
  fireEvent.click(screen.getByRole('button', { name: 'Ações da camada Grupo 1' }));
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar camada' }));
  expect(screen.queryByRole('checkbox', { name: 'Selecionar camada A' })).toBeNull();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar camada C' }));
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar camadas selecionadas' }));
  expect(screen.getByRole('button', { name: 'Grupo 1 3 camadas' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Ações da camada A' }));
  fireEvent.click(screen.getByRole('button', { name: 'Duplicar' }));
  expect(screen.getByRole('button', { name: 'Grupo 1 4 camadas' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Ações da camada A (cópia)' }));
  fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
  fireEvent.click(screen.getByRole('button', { name: 'Ações da camada A' }));
  fireEvent.click(screen.getByRole('button', { name: 'Desagrupar' }));
  expect(screen.getByRole('button', { name: 'Mover posição de A' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
  expect(screen.queryByRole('button', { name: 'Mover posição de A' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Refazer' }));
  expect(screen.getByRole('button', { name: 'Mover posição de A' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Ações da camada Grupo 1' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remover agrupamento' }));
  expect(container.querySelector('.ct-layer-group')).toBeNull();
  const values = await save();
  const layout = values.design.formats['1:1'];
  expect(layout.groups).toEqual([]);
  expect(layout.layers).toHaveLength(5);
  for (const image of images) expect(layout.layers.find((layer) => layer.id === image.id)).toEqual(image);
});

it('usa o resolver proprietário para impedir salvamento de agrupamento sem nome', async () => {
  groupTwo();
  fireEvent.change(screen.getByRole('textbox', { name: 'Nome do agrupamento' }), { target: { value: ' ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('alert').textContent).toContain('Informe o nome do agrupamento.');
  expect(mocks.save).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole('textbox', { name: 'Nome do agrupamento' }), { target: { value: 'Oferta' } });
  const values = await save();
  expect(values.design.formats['1:1'].groups?.[0].name).toBe('Oferta');
});

it('reabre o desenho salvo com o agrupamento e as camadas individuais disponíveis', async () => {
  const view = groupTwo();
  const values = await save();
  view.unmount();
  const { container } = render(<ImageTemplateEditor initial={values} original={null} userId="operator" onBack={vi.fn()} onSaved={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'Grupo 1 2 camadas' })).toBeTruthy();
  expect(container.querySelector('.ct-group-boundary')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Grupo 1 2 camadas' }));
  expect(screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Largura do agrupamento' }).value).toBe('280');
  expect(container.querySelector('.ct-layer-outline[data-group="true"]')).not.toBeNull();
});

it('duplica a camada de texto mantendo o tamanho atual da área de seleção', async () => {
  const design = startImageTemplate('blank');
  const text = { ...createImageLayer('text', '1:1'), name: 'Oferta', text: 'Uma frase longa que precisa continuar na horizontal',
    width: 500, height: 240 } as Extract<ReturnType<typeof createImageLayer>, { type: 'text' }>;
  const layout = design.formats['1:1'];
  const initial: ImageTemplateFormValues = { name: 'Modelo', description: '', design: { ...design,
    formats: { ...design.formats, '1:1': { ...layout, layers: [
      ...layout.layers.filter((layer) => layer.type !== 'background'), text,
      ...layout.layers.filter((layer) => layer.type === 'background'),
    ] } } } };
  render(<ImageTemplateEditor initial={initial} original={null} userId="operator" onBack={vi.fn()} onSaved={vi.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: 'Oferta Texto' }));
  const width = screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Largura' });
  fireEvent.change(width, { target: { value: '510' } });
  fireEvent.blur(width);
  await waitFor(() => expect(screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Largura' }).value).toBe('510'));
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Largura' }), { target: { value: '500' } });
  fireEvent.blur(screen.getByRole('spinbutton', { name: 'Largura' }));
  const height = screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Altura' });
  fireEvent.change(height, { target: { value: '240' } });
  fireEvent.blur(height);
  await waitFor(() => expect(screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Largura' }).value).toBe('500'));

  fireEvent.click(screen.getByRole('button', { name: 'Ações da camada Oferta' }));
  fireEvent.click(screen.getByRole('button', { name: 'Duplicar' }));
  await waitFor(() => {
    expect(screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Largura' }).value).toBe('500');
    expect(screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Altura' }).value).toBe('240');
  });
  const values = await save();
  const layers = values.design.formats['1:1'].layers.filter((layer) => layer.type === 'text');
  expect(layers).toHaveLength(2);
  expect(layers[0]).toMatchObject({ width: 500, height: 240 });
  expect(layers[1]).toMatchObject({ width: 500, height: 240 });
});
