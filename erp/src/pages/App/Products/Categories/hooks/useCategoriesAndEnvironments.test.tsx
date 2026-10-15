// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCategoriesAndEnvironments } from './useCategoriesAndEnvironments';
const mocks = vi.hoisted(() => ({ environments: vi.fn(), categories: vi.fn(), counts: vi.fn(), createEnvironment: vi.fn(), updateEnvironment: vi.fn(), createCategory: vi.fn(), updateCategory: vi.fn(), attributes: vi.fn(), error: vi.fn() }));
vi.mock('@/pages/utils/categoryService', () => ({
  fetchEnvironments: mocks.environments, fetchCategories: mocks.categories, fetchCategoryProductCounts: mocks.counts,
  createEnvironment: mocks.createEnvironment, updateEnvironment: mocks.updateEnvironment,
  createCategory: mocks.createCategory, updateCategory: mocks.updateCategory, fetchCategoryAttributes: mocks.attributes,
  deleteEnvironment: vi.fn(), deleteCategory: vi.fn(), unlinkCategoryFromEnvironment: vi.fn(),
}));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, success: vi.fn() } }));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks(); mocks.environments.mockResolvedValue([]); mocks.categories.mockResolvedValue([]); mocks.counts.mockResolvedValue({}); mocks.attributes.mockResolvedValue([]);
  for (const save of [mocks.createEnvironment, mocks.updateEnvironment, mocks.createCategory, mocks.updateCategory]) save.mockResolvedValue(undefined);
});
const submit = (result: ReturnType<typeof renderHook<ReturnType<typeof useCategoriesAndEnvironments>, unknown>>['result']) => result.current.handleSave({ preventDefault() {} } as React.FormEvent);
const mount = async () => {
  const view = renderHook(() => useCategoriesAndEnvironments());
  await waitFor(() => expect(view.result.current.loading).toBe(false)); return view;
};
describe('cadastro proprietário de ambientes e categorias', () => {
  it('bloqueia nome vazio e vínculo sem identidade antes de criar', async () => {
    const { result } = await mount(); act(() => result.current.openNewEnvironment());
    await act(async () => { await submit(result); }); expect(mocks.error).toHaveBeenCalled(); expect(mocks.createEnvironment).not.toHaveBeenCalled();
    act(() => { result.current.setNameInput('Sala'); result.current.toggleLink(''); });
    await act(async () => { await submit(result); }); expect(mocks.createEnvironment).not.toHaveBeenCalled();
  });
  it.each([false, true])('cria usando nome normalizado, vínculos e atributos; ambiente=%s', async (environment) => {
    const { result } = await mount();
    act(() => { if (environment) result.current.openNewEnvironment(); else result.current.openNewCategory('env'); });
    act(() => { result.current.setNameInput('  sala de estar  '); if (environment) result.current.toggleLink('category'); else result.current.setSelectedAttributes([{ id: 'material', name: 'Material', isRequired: true }]); });
    await act(async () => { await submit(result); });
    if (environment) expect(mocks.createEnvironment).toHaveBeenCalledWith('SALA DE ESTAR', ['category']);
    else expect(mocks.createCategory).toHaveBeenCalledWith('SALA DE ESTAR', ['env'], [{ id: 'material', name: 'Material', isRequired: true }], { meta_title: 'SALA DE ESTAR | Móveis Morante' });
    expect(result.current.showModal).toBeNull();
  });
  it.each([false, true])('edita com payload parseado e atributos carregados; ambiente=%s', async (environment) => {
    mocks.attributes.mockResolvedValue([{ id: 'material', name: 'Material', isRequired: true }]);
    const { result } = await mount();
    await act(async () => { if (environment) result.current.openEditEnvironment({ id: 'env', name: 'Sala', categories: ['category'] }); else await result.current.openEditCategory({ id: 'category', name: 'Sofás', parents: ['env'] }); });
    act(() => result.current.setNameInput('  Novo nome  '));
    await act(async () => { await submit(result); });
    if (environment) expect(mocks.updateEnvironment).toHaveBeenCalledWith('env', 'NOVO NOME', ['category']);
    else expect(mocks.updateCategory).toHaveBeenCalledWith('category', 'NOVO NOME', ['env'], [{ id: 'material', name: 'Material', isRequired: true }]);
  });
  it('não salva categoria enquanto atributos estão pendentes ou falharam', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let fail!: (error: Error) => void;
    mocks.attributes.mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }));
    const { result } = await mount(); let loading!: Promise<void>;
    await act(async () => { loading = result.current.openEditCategory({ id: 'category', name: 'Sala', parents: [] }); });
    await act(async () => { await submit(result); }); expect(mocks.updateCategory).not.toHaveBeenCalled();
    await act(async () => { fail(new Error('Falha simulada')); await loading; });
    await act(async () => { await submit(result); }); expect(mocks.updateCategory).not.toHaveBeenCalled(); expect(result.current.showModal).toBe('categoria');
  });
  it('bloqueia nome duplicado no contexto carregado', async () => {
    mocks.environments.mockResolvedValue([{ id: 'env', name: 'SALA', categories: [] }]);
    const { result } = await mount(); act(() => { result.current.openNewEnvironment(); result.current.setNameInput(' sala '); });
    await act(async () => { await submit(result); }); expect(mocks.createEnvironment).not.toHaveBeenCalled(); expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('Já existe'));
  });
  it('mantém proteção até terminar e permite retomar após falha do serviço', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let fail!: (error: Error) => void;
    mocks.createEnvironment.mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }));
    const { result } = await mount(); act(() => { result.current.openNewEnvironment(); result.current.setNameInput('Sala'); });
    let first!: ReturnType<typeof submit>;
    await act(async () => { first = submit(result); }); await waitFor(() => expect(mocks.createEnvironment).toHaveBeenCalledTimes(1));
    await act(async () => { await submit(result); }); expect(mocks.createEnvironment).toHaveBeenCalledTimes(1);
    await act(async () => { fail(new Error('Simulada')); await first; }); expect(result.current.showModal).toBe('ambiente');
    await act(async () => { await submit(result); }); expect(mocks.createEnvironment).toHaveBeenCalledTimes(2); expect(result.current.showModal).toBeNull();
  });
});
