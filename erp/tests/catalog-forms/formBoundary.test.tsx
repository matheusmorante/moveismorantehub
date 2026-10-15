import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ZodForm } from '../../../digital-catalog/src/components/forms/ZodForm';
import { accountNameFormSchema } from '@/shared-utils/accountFormSchemas';
const mocks = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: mocks.error } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('fronteira RHF compartilhada do catálogo', () => {
  it('impede o efeito para valores inválidos e mostra o erro do resolver', async () => {
    const save = vi.fn(); const view = render(<ZodForm schema={accountNameFormSchema} values={{ fullName: ' ' }} onValid={save}><button>Salvar</button></ZodForm>);
    fireEvent.submit(view.container.querySelector('form')!); await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('O nome não pode estar vazio.')); expect(save).not.toHaveBeenCalled();
  });
  it('entrega valores parseados e conserva a trava durante todo o callback', async () => {
    let finish!: () => void; const save = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const view = render(<ZodForm schema={accountNameFormSchema} values={{ fullName: ' Nome ' }} onValid={save}><button>Salvar</button></ZodForm>);
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Salvar' })); fireEvent.submit(view.container.querySelector('form')!); });
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1)); expect(save).toHaveBeenCalledWith({ fullName: 'Nome' });
    fireEvent.submit(view.container.querySelector('form')!); await act(async () => {}); expect(save).toHaveBeenCalledTimes(1);
    await act(async () => { finish(); }); fireEvent.submit(view.container.querySelector('form')!); await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    await act(async () => { finish(); });
  });
  it('apresenta falha do callback sem perder a possibilidade de corrigir e tentar novamente', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('Falha ao salvar')).mockResolvedValue(undefined);
    const view = render(<ZodForm schema={accountNameFormSchema} values={{ fullName: ' Nome ' }} onValid={save}><button>Salvar</button></ZodForm>);
    fireEvent.submit(view.container.querySelector('form')!); await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Falha ao salvar'));
    fireEvent.submit(view.container.querySelector('form')!); await waitFor(() => expect(save).toHaveBeenCalledTimes(2)); expect(save).toHaveBeenLastCalledWith({ fullName: 'Nome' });
  });
});
