// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import SellerSearchModal from './SellerSearchModal';
import { supabase } from '@/pages/utils/supabaseConfig';
import { isValidEmployee } from '@/pages/utils/accessRoles';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    rpc: vi.fn(),
  }
}));

describe('SellerSearchModal - UI e UX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const anchorRef = { current: document.createElement('div') } as any;

  it('UX: Permite termo vazio (busca top 15 defaults) mas bloqueia 1-2 chars', async () => {
    vi.useFakeTimers();
    const mockAbortSignal = vi.fn().mockResolvedValue({ data: [], error: null });
    (supabase.rpc as any).mockReturnValue({ abortSignal: mockAbortSignal });

    render(<SellerSearchModal onSelect={vi.fn()} onClose={vi.fn()} onAddNew={vi.fn()} anchorRef={anchorRef} />);
    
    // Abertura com input vazio gera request
    act(() => { vi.advanceTimersByTime(300); });
    expect(supabase.rpc).toHaveBeenCalledWith('search_employees', { p_query: '', p_limit: 15 });
    (supabase.rpc as any).mockClear();

    // 1-2 chars no busca
    const input = screen.getByPlaceholderText(/Buscar vendedor/i);
    fireEvent.change(input, { target: { value: 'A' } });
    act(() => { vi.advanceTimersByTime(300); });
    expect(supabase.rpc).not.toHaveBeenCalled();

    // >= 3 chars busca
    fireEvent.change(input, { target: { value: 'Abc' } });
    act(() => { vi.advanceTimersByTime(300); });
    expect(supabase.rpc).toHaveBeenCalledWith('search_employees', { p_query: 'Abc', p_limit: 15 });

    vi.useRealTimers();
  });

  it('Cancelamento: aborta query em voo via AbortController e previne Race Condition', async () => {
    vi.useFakeTimers();
    let abortSignalRef: AbortSignal | undefined;
    
    const mockAbortSignal = vi.fn().mockImplementation((signal) => {
      abortSignalRef = signal;
      return new Promise((resolve) => setTimeout(() => resolve({ data: [], error: null }), 1000));
    });
    (supabase.rpc as any).mockReturnValue({ abortSignal: mockAbortSignal });

    render(<SellerSearchModal onSelect={vi.fn()} onClose={vi.fn()} onAddNew={vi.fn()} anchorRef={anchorRef} />);
    
    const input = screen.getByPlaceholderText(/Buscar vendedor/i);
    
    // Request 1
    fireEvent.change(input, { target: { value: 'Joao' } });
    act(() => { vi.advanceTimersByTime(300); });
    expect(supabase.rpc).toHaveBeenCalledTimes(2); // 1 do vazio (mount), 1 do Joao
    expect(abortSignalRef?.aborted).toBe(false);

    // Request 2 enquanto Request 1 esta em voo
    fireEvent.change(input, { target: { value: 'Joao da Silva' } });
    act(() => { vi.advanceTimersByTime(300); });
    
    // O sinal da requisicao anterior deve ser cancelado
    expect(abortSignalRef?.aborted).toBe(true);

    vi.useRealTimers();
  });

  it('Debounce de 300ms funcional', async () => {
    vi.useFakeTimers();
    (supabase.rpc as any).mockReturnValue({ abortSignal: vi.fn().mockResolvedValue({ data: [], error: null }) });

    render(<SellerSearchModal onSelect={vi.fn()} onClose={vi.fn()} onAddNew={vi.fn()} anchorRef={anchorRef} />);
    const input = screen.getByPlaceholderText(/Buscar vendedor/i);

    (supabase.rpc as any).mockClear(); // limpa montagem inicial
    
    fireEvent.change(input, { target: { value: 'Mar' } });
    act(() => { vi.advanceTimersByTime(100); });
    fireEvent.change(input, { target: { value: 'Marc' } });
    act(() => { vi.advanceTimersByTime(100); });
    fireEvent.change(input, { target: { value: 'Marco' } });
    act(() => { vi.advanceTimersByTime(300); });

    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith('search_employees', { p_query: 'Marco', p_limit: 15 });

    vi.useRealTimers();
  });
});
