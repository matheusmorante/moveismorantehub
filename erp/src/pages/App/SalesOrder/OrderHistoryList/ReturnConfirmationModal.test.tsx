// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ReturnConfirmationModal from './ReturnConfirmationModal';

afterEach(() => { cleanup(); vi.useRealTimers(); });
const review = async () => { for (let step = 0; step < 5; step++) await act(async () => { await vi.advanceTimersByTimeAsync(1000); }); };
const clickConfirm = async () => { await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Sim, continuar' })); }); };

describe('return draft confirmation library', () => {
  it('requires review before the effect and only confirms once', async () => {
    vi.useFakeTimers(); const confirm = vi.fn();
    render(<ReturnConfirmationModal onCancel={vi.fn()} onConfirm={confirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Aguarde 5s' }));
    expect(confirm).not.toHaveBeenCalled();
    await review(); await clickConfirm(); await clickConfirm();
    expect(confirm).toHaveBeenCalledTimes(1);
  });
  it('waits for the callback and prevents cancellation or duplicate confirmation', async () => {
    vi.useFakeTimers(); let resolve!: () => void;
    const confirm = vi.fn(() => new Promise<void>((done) => { resolve = done; })), cancel = vi.fn();
    render(<ReturnConfirmationModal onCancel={cancel} onConfirm={confirm} />);
    await review(); await clickConfirm();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.keyDown(window, { key: 'Escape' }); await clickConfirm();
    expect(cancel).not.toHaveBeenCalled(); expect(confirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toBeTruthy();
    await act(async () => { resolve(); });
    expect(screen.queryByRole('status')).toBeNull();
  });
  it('shows explicit refusal and allows retry without repeating the review', async () => {
    vi.useFakeTimers(); const confirm = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<ReturnConfirmationModal onCancel={vi.fn()} onConfirm={confirm} />);
    await review(); await clickConfirm();
    expect(screen.getByRole('alert').textContent).toMatch(/Tente novamente/);
    await clickConfirm(); expect(confirm).toHaveBeenCalledTimes(2);
  });
  it('preserves uncertain timeout and blocks replay after a late response', async () => {
    vi.useFakeTimers(); let resolve!: () => void;
    const confirm = vi.fn(() => new Promise<void>((done) => { resolve = done; }));
    render(<ReturnConfirmationModal onCancel={vi.fn()} onConfirm={confirm} />);
    await review(); await clickConfirm();
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(screen.getByRole('alert').textContent).toMatch(/não foi confirmada/);
    await act(async () => { resolve(); }); await clickConfirm();
    expect(confirm).toHaveBeenCalledTimes(1);
  });
});
