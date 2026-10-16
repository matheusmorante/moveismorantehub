// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ServiceFormModal from './ServiceFormModal';
const mocks = vi.hoisted(() => ({ save: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('../../utils/serviceService', () => ({ saveService: mocks.save }));
vi.mock('react-toastify', () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock('@/components/CurrencyInput', () => ({ default: ({ value, onChangeValue }: { value: number; onChangeValue: (value: number) => void }) => <input type="number" value={value} onChange={(event) => onChangeValue(Number(event.target.value))} /> }));
beforeEach(() => { vi.resetAllMocks(); mocks.save.mockResolvedValue({ id: 'new-1' }); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const saved = { id: 'existing-1', description: 'Old', unitPrice: 10, costPrice: 5, active: false };
function submit(view: ReturnType<typeof render>) { fireEvent.submit(view.container.querySelector('form')!); }

describe('service form owner with real RHF', () => {
  it('shows invalid input and blocks the service', async () => {
    const view = render(<ServiceFormModal isOpen onClose={vi.fn()} />);
    submit(view);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('A descrição é obrigatória.'));
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('allows a free service and sends parsed fields with the finalization intent', async () => {
    const onClose = vi.fn();
    const view = render(<ServiceFormModal isOpen onClose={onClose} />);
    fireEvent.change(screen.getByPlaceholderText('Ex: Manutenção Preventiva'), { target: { value: ' Free service ' } });
    submit(view);
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ id: undefined, description: 'Free service', unitPrice: 0, costPrice: 0, active: true, isDraft: false }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });
  it('preserves explicit zero prices and active=false when editing, without forwarding timestamps', async () => {
    mocks.save.mockResolvedValue({ id: saved.id });
    const view = render(<ServiceFormModal isOpen onClose={vi.fn()} service={{ ...saved, unitPrice: 0, costPrice: 0, createdAt: 'old' }} />);
    submit(view);
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ ...saved, unitPrice: 0, costPrice: 0, isDraft: false }));
  });
  it('blocks a negative cost through the real resolver', async () => {
    const view = render(<ServiceFormModal isOpen onClose={vi.fn()} service={saved} />);
    fireEvent.change(screen.getAllByRole('spinbutton')[1], { target: { value: '-1' } });
    submit(view);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('custo não pode ser negativo'));
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('keeps one write active and prevents closing it', async () => {
    let finish!: () => void;
    mocks.save.mockReturnValue(new Promise((resolve) => { finish = () => resolve({ id: saved.id }); }));
    const onClose = vi.fn();
    const view = render(<ServiceFormModal isOpen onClose={onClose} service={saved} />);
    submit(view); submit(view);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => { finish(); });
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });
  it('ignores a previous service response after switching owner', async () => {
    let finish!: () => void;
    mocks.save.mockReturnValue(new Promise((resolve) => { finish = () => resolve({ id: saved.id }); }));
    const onClose = vi.fn();
    const view = render(<ServiceFormModal isOpen onClose={onClose} service={saved} />);
    submit(view);
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    view.rerender(<ServiceFormModal isOpen onClose={onClose} service={{ ...saved, id: 'second', description: 'Second' }} />);
    await act(async () => { finish(); });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('Second')).toBeTruthy();
  });
  it('blocks replay after an unacknowledged save', async () => {
    mocks.save.mockRejectedValue({ uncertain: true });
    const view = render(<ServiceFormModal isOpen onClose={vi.fn()} service={saved} />);
    submit(view);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Consulte os serviços'));
    submit(view);
    expect(mocks.save).toHaveBeenCalledOnce();
    expect((screen.getByRole('button', { name: 'Salvar Alterações' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('releases the form after a 30s deadline and blocks replay', async () => {
    vi.useFakeTimers();
    mocks.save.mockReturnValue(new Promise(() => {}));
    const view = render(<ServiceFormModal isOpen onClose={vi.fn()} service={saved} />);
    await act(async () => { submit(view); });
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(screen.getByRole('alert').textContent).toContain('Consulte os serviços');
    expect(screen.queryByRole('status')).toBeNull();
    submit(view);
    expect(mocks.save).toHaveBeenCalledOnce();
  });
  it('does not write after closing during resolver validation', async () => {
    const view = render(<ServiceFormModal isOpen onClose={vi.fn()} service={saved} />);
    submit(view);
    view.rerender(<ServiceFormModal isOpen={false} onClose={vi.fn()} service={saved} />);
    await act(async () => {});
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
