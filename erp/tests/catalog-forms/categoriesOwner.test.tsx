import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  auth: { user: { id: 'operator' }, loading: false }, categories: [] as any[], relationships: [] as any[], calls: [] as any[], reply: null as null | ((call: any) => any), error: vi.fn(), success: vi.fn(),
}));
vi.mock('@/hooks/use-auth', () => ({ useAuth: () => mocks.auth }));
vi.mock('sonner', () => ({ toast: { error: mocks.error, success: mocks.success } }));
vi.mock('@/lib/supabase/client', () => ({ supabase: { from: (table: string) => {
  const call: any = { table, action: 'read', payload: undefined, filters: {} };
  const builder: any = {
    select: () => builder, order: () => builder,
    insert: (payload: any) => { call.action = 'insert'; call.payload = payload; return builder; },
    update: (payload: any) => { call.action = 'update'; call.payload = payload; return builder; },
    delete: () => { call.action = 'delete'; return builder; },
    eq: (key: string, value: any) => { call.filters[key] = value; return builder; },
    then: (resolve: any, reject: any) => {
      mocks.calls.push(call); let response = mocks.reply?.(call);
      if (response === undefined) {
        const source = table === 'categories' ? mocks.categories : mocks.relationships;
        const matches = (row: any) => Object.entries(call.filters).every(([key, value]) => row[key] === value);
        let data: any[];
        if (call.action === 'read') data = [...source];
        else if (call.action === 'insert') { data = call.payload.map((row: any) => table === 'categories' ? { id: 'created', ...row } : row); source.push(...data); }
        else if (call.action === 'update') { data = source.filter(matches).map((row: any) => Object.assign(row, call.payload)); }
        else { data = source.filter(matches); if (table === 'categories') mocks.categories = source.filter((row: any) => !matches(row)); else mocks.relationships = source.filter((row: any) => !matches(row)); }
        response = { data, error: null };
      }
      return Promise.resolve(response).then(resolve, reject);
    },
  }; return builder;
} } }));
vi.mock('@/components/ui/button', () => ({ Button: ({ children, asChild, variant, size, ...props }: any) => asChild ? children : <button {...props}>{children}</button> }));
vi.mock('@/components/ui/input', () => ({ Input: (props: any) => <input {...props} /> }));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
  DialogClose: ({ children }: any) => children,
  ...Object.fromEntries(['DialogContent', 'DialogDescription', 'DialogFooter', 'DialogHeader', 'DialogTitle'].map((name) => [name, ({ children }: any) => <div>{children}</div>])),
}));
vi.mock('@/components/ui/select', () => ({ Select: ({ children, value, onValueChange, ...props }: any) => <select {...props} value={value} onChange={(e) => onValueChange(e.target.value)}>{children}</select>, SelectContent: ({ children }: any) => children, SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>, SelectTrigger: () => null, SelectValue: () => null }));
vi.mock('@/components/ui/checkbox', () => ({ Checkbox: ({ checked, onCheckedChange, ...props }: any) => <input {...props} type="checkbox" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} /> }));
vi.mock('@/components/ui/badge', () => ({ Badge: ({ children }: any) => <span>{children}</span> }));
import { CategoriesManagerModal } from '../../../digital-catalog/src/features/categories/components/categories-manager-modal';

const props = () => ({ isOpen: true, onOpenChange: vi.fn(), onSuccess: vi.fn() });
const loaded = () => waitFor(() => expect(screen.getByRole('button', { name: 'Nova Categoria' })).toHaveProperty('disabled', false));
const startNew = async () => { await loaded(); fireEvent.click(screen.getByRole('button', { name: 'Nova Categoria' })); };
const edit = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = () => fireEvent.submit(screen.getByLabelText('Nome do cadastro').closest('form')!);
const writes = () => mocks.calls.filter((call) => call.action !== 'read');
beforeEach(() => {
  vi.clearAllMocks(); mocks.auth = { user: { id: 'operator' }, loading: false }; mocks.reply = null; mocks.calls = [];
  mocks.categories = [{ id: 'cat', name: 'Mesas', slug: 'mesas', type: 'category' }, { id: 'env', name: 'Sala', slug: 'sala', type: 'environment' }];
  mocks.relationships = [{ parent_id: 'env', child_id: 'cat' }, { parent_id: 'other-env', child_id: 'other-cat' }];
  vi.stubGlobal('confirm', vi.fn().mockReturnValue(true)); vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('proprietário de ambientes e categorias do catálogo', () => {
  it('bloqueia campos inválidos e entrega nome parseado antes de persistir', async () => {
    const owner = props(); render(<CategoriesManagerModal {...owner} />); await startNew(); submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Informe o nome.')); expect(writes()).toHaveLength(0);
    edit('Nome do cadastro', '  Cadeiras  '); fireEvent.click(screen.getByLabelText('Sala')); submit();
    await waitFor(() => expect(owner.onSuccess).toHaveBeenCalledOnce());
    expect(writes()[0].payload).toEqual([{ name: 'Cadeiras', slug: 'cadeiras', type: 'category' }]);
    expect(mocks.relationships).toContainEqual({ parent_id: 'env', child_id: 'created' });
  });
  it('aguarda callback do proprietário e bloqueia salvar/excluir concorrentes', async () => {
    let release!: () => void; const owner = { ...props(), onSuccess: vi.fn(() => new Promise<void>((resolve) => { release = resolve; })) };
    render(<CategoriesManagerModal {...owner} />); await startNew(); edit('Nome do cadastro', 'Cadeiras'); act(() => { submit(); submit(); });
    await waitFor(() => expect(release).toBeTypeOf('function')); expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Excluir Mesas' })).toHaveProperty('disabled', true); expect(mocks.success).not.toHaveBeenCalled();
    await act(async () => { release(); }); await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce());
    expect(writes().filter((call) => call.table === 'categories' && call.action === 'insert')).toHaveLength(1);
  });
  it('mantém rascunho e identidade após falha de vínculo sem duplicar cadastro', async () => {
    const owner = props(); mocks.reply = (call) => call.table === 'category_relationships' && call.action === 'insert' ? { data: null, error: { message: 'Vínculo recusado' } } : undefined;
    render(<CategoriesManagerModal {...owner} />); await startNew(); edit('Nome do cadastro', 'Cadeiras'); fireEvent.click(screen.getByLabelText('Sala')); submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Vínculo recusado'));
    expect(screen.getByLabelText('Nome do cadastro')).toHaveProperty('value', 'Cadeiras'); expect(owner.onSuccess).not.toHaveBeenCalled();
    mocks.reply = null; submit(); await waitFor(() => expect(mocks.success).toHaveBeenCalled());
    expect(writes().filter((call) => call.table === 'categories' && call.action === 'insert')).toHaveLength(1);
    expect(writes().some((call) => call.table === 'categories' && call.action === 'update' && call.filters.id === 'created')).toBe(true);
  });
  it('troca tipo limpando apenas relações da identidade editada e preserva relações alheias', async () => {
    render(<CategoriesManagerModal {...props()} />); await loaded(); fireEvent.click(screen.getByRole('button', { name: 'Editar Mesas' }));
    edit('Tipo do cadastro', 'environment'); submit(); await waitFor(() => expect(mocks.success).toHaveBeenCalled());
    expect(mocks.relationships).toEqual([{ parent_id: 'other-env', child_id: 'other-cat' }]);
    const deletes = writes().filter((call) => call.table === 'category_relationships' && call.action === 'delete');
    expect(deletes.map((call) => call.filters)).toEqual([{ child_id: 'cat' }, { parent_id: 'cat' }]);
  });
  it('não anuncia sucesso quando remoção dos vínculos falha', async () => {
    mocks.reply = (call) => call.table === 'category_relationships' && call.action === 'delete' ? { data: null, error: new Error('Remoção recusada') } : undefined;
    render(<CategoriesManagerModal {...props()} />); await startNew(); edit('Nome do cadastro', 'Cadeiras'); submit();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Remoção recusada')); expect(mocks.success).not.toHaveBeenCalled();
  });
  it('executa exclusão validada uma vez e aguarda recibo da identidade', async () => {
    let release!: (value: any) => void; const owner = props(); mocks.reply = (call) => call.table === 'categories' && call.action === 'delete' ? new Promise((resolve) => { release = resolve; }) : undefined;
    render(<CategoriesManagerModal {...owner} />); await loaded(); const button = screen.getByRole('button', { name: 'Excluir Mesas' }); act(() => { fireEvent.click(button); fireEvent.click(button); });
    await waitFor(() => expect(release).toBeTypeOf('function')); expect(mocks.success).not.toHaveBeenCalled();
    await act(async () => { release({ data: [{ id: 'cat' }], error: null }); }); await waitFor(() => expect(owner.onSuccess).toHaveBeenCalledOnce());
    expect(writes()).toHaveLength(1); expect(mocks.success).toHaveBeenCalledWith('Excluído!');
  });
  it('não aceita exclusão sem linha confirmada', async () => {
    mocks.reply = (call) => call.table === 'categories' && call.action === 'delete' ? { data: [], error: null } : undefined;
    render(<CategoriesManagerModal {...props()} />); await loaded(); fireEvent.click(screen.getByRole('button', { name: 'Excluir Mesas' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('A exclusão do item não foi confirmada.')); expect(mocks.success).not.toHaveBeenCalled();
  });
  it('encerra espera inicial com erro e permite repetir o carregamento', async () => {
    mocks.reply = () => ({ data: null, error: new Error('Consulta indisponível') }); render(<CategoriesManagerModal {...props()} />);
    await screen.findByRole('button', { name: 'Tentar carregar novamente' }); expect(screen.getByRole('alert').textContent).toBe('Consulta indisponível');
    mocks.reply = null; fireEvent.click(screen.getByRole('button', { name: 'Tentar carregar novamente' })); await loaded();
  });
  it('descarta consulta tardia após trocar sessão', async () => {
    let releases: ((value: any) => void)[] = []; mocks.reply = () => new Promise((resolve) => { releases.push(resolve); }); const owner = props();
    const view = render(<CategoriesManagerModal {...owner} />); await waitFor(() => expect(releases).toHaveLength(2));
    mocks.auth.user = { id: 'other' }; mocks.reply = null; view.rerender(<CategoriesManagerModal {...owner} />); await loaded();
    await act(async () => { for (const release of releases) release({ data: [{ id: 'stale', name: 'Antigo', type: 'category' }], error: null }); });
    expect(screen.queryByRole('button', { name: 'Editar Antigo' })).toBeNull();
  });
  it('limita gravação incerta sem repetir nem fechar por resposta tardia', async () => {
    const owner = props(); render(<CategoriesManagerModal {...owner} />); await startNew(); edit('Nome do cadastro', 'Cadeiras');
    vi.useFakeTimers(); let release!: (value: any) => void; mocks.reply = (call) => call.action === 'insert' ? new Promise((resolve) => { release = resolve; }) : undefined;
    await act(async () => { submit(); await vi.advanceTimersByTimeAsync(20_001); });
    expect(screen.getByRole('alert').textContent).toContain('gravação não foi confirmada');
    await act(async () => { submit(); release({ data: [{ id: 'created', name: 'Cadeiras', slug: 'cadeiras', type: 'category' }], error: null }); });
    expect(writes()).toHaveLength(1); expect(mocks.success).not.toHaveBeenCalled(); expect(owner.onSuccess).not.toHaveBeenCalled();
  });
});
