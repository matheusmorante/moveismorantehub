// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FetchFiscalDocumentsResult } from '../services/fiscalDocumentsService';
import type { NfeDocumentRecord } from '../types/fiscalDocuments.types';

const mocks = vi.hoisted(() => ({
  fetchFiscalDocumentsList: vi.fn(),
  fetchFiscalDocumentsSummary: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock('react-router-dom', () => ({ useSearchParams: () => [mocks.searchParams] }));
vi.mock('../services/fiscalDocumentsService', () => ({
  fetchFiscalDocumentsList: mocks.fetchFiscalDocumentsList,
  fetchFiscalDocumentsSummary: mocks.fetchFiscalDocumentsSummary,
}));

import { useFiscalDocumentsList } from '../hooks/useFiscalDocumentsList';

const emptyResult: FetchFiscalDocumentsResult = {
  documents: [],
  totalCount: 0,
  orderNumbers: {},
  cancellationEligibility: {},
};

afterEach(cleanup);

describe('useFiscalDocumentsList', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);
    return wrapper;
  };

  beforeEach(() => {
    mocks.searchParams = new URLSearchParams();
    mocks.fetchFiscalDocumentsList.mockReset().mockResolvedValue(emptyResult);
    mocks.fetchFiscalDocumentsSummary.mockReset().mockResolvedValue({});
  });

  it('does not fetch documents when fiscal view permission is disabled', async () => {
    const { result } = renderHook(() => useFiscalDocumentsList(false), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setSearchInput('719'));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 400)); });
    expect(mocks.fetchFiscalDocumentsList).not.toHaveBeenCalled();
  });

  it.each(['', '719'])('refreshes the current search %s after another session changes the document', async search => {
    const authorized = { ...emptyResult, documents: [{ id: 'document-719', status: 'homologada' } as NfeDocumentRecord], totalCount: 1 };
    mocks.fetchFiscalDocumentsList.mockResolvedValue(authorized);
    const { result } = renderHook(() => useFiscalDocumentsList(true), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.documents[0]?.status).toBe('homologada'));
    if (search) {
      act(() => result.current.setSearchInput(search));
      await waitFor(() => expect(mocks.fetchFiscalDocumentsList).toHaveBeenCalledTimes(2));
    }
    const previousCalls = mocks.fetchFiscalDocumentsList.mock.calls.length;
    mocks.fetchFiscalDocumentsList.mockResolvedValue({ ...authorized, documents: [{ ...authorized.documents[0], status: 'cancelada' }] });
    await act(async () => { await result.current.loadDocuments(); });
    await waitFor(() => expect(result.current.documents[0]?.status).toBe('cancelada'));
    expect(mocks.fetchFiscalDocumentsList).toHaveBeenCalledTimes(previousCalls + 1);
    expect(mocks.fetchFiscalDocumentsList).toHaveBeenLastCalledWith(expect.objectContaining({ pageIndex: 0, filters: expect.objectContaining({ search }) }));
  });

  it('fetches a changed search at page zero without refreshing the previous query', async () => {
    const { result } = renderHook(() => useFiscalDocumentsList(true), { wrapper: createWrapper() });
    await waitFor(() => expect(mocks.fetchFiscalDocumentsList).toHaveBeenCalledTimes(1));
    act(() => result.current.setPageIndex(2));
    await waitFor(() => expect(mocks.fetchFiscalDocumentsList).toHaveBeenCalledTimes(2));
    act(() => result.current.setSearchInput('719'));
    await waitFor(() => expect(mocks.fetchFiscalDocumentsList).toHaveBeenCalledTimes(3));
    expect(mocks.fetchFiscalDocumentsList).toHaveBeenLastCalledWith(expect.objectContaining({ pageIndex: 0, filters: expect.objectContaining({ search: '719' }) }));
  });

  it('debounces searches of at least three characters and clears shorter terms', async () => {
    const { result } = renderHook(() => useFiscalDocumentsList(true), { wrapper: createWrapper() });
    await waitFor(() => expect(mocks.fetchFiscalDocumentsList).toHaveBeenCalledTimes(1));

    act(() => result.current.setSearchInput('71'));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 400)); });
    expect(mocks.fetchFiscalDocumentsList).toHaveBeenCalledTimes(1);

    act(() => result.current.setSearchInput('719'));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 150)); });
    expect(mocks.fetchFiscalDocumentsList).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mocks.fetchFiscalDocumentsList).toHaveBeenLastCalledWith(
      expect.objectContaining({ filters: expect.objectContaining({ search: '719' }) })
    ));

    act(() => result.current.setSearchInput('71'));
    await waitFor(() => expect(result.current.filters.search).toBe(''));
    expect(mocks.fetchFiscalDocumentsList).toHaveBeenLastCalledWith(
      expect.objectContaining({ filters: expect.objectContaining({ search: '' }) })
    );
  });

  it('exposes a query failure separately from a successful empty result', async () => {
    const queryError = new Error('falha fiscal simulada');
    mocks.fetchFiscalDocumentsList
      .mockRejectedValueOnce(queryError)
      .mockResolvedValueOnce(emptyResult);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { result } = renderHook(() => useFiscalDocumentsList(true), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loadError).not.toBeNull());
    expect(result.current.documents).toEqual([]);
    expect(result.current.loadError).toBe('Falha ao consultar as notas fiscais. Tente atualizar a lista.');

    await act(async () => {
      await result.current.loadDocuments();
    });
    await waitFor(() => expect(result.current.loadError).toBeNull());
    expect(mocks.fetchFiscalDocumentsList).toHaveBeenCalledTimes(2);
    errorSpy.mockRestore();
  });

  it('ignores an older response that resolves after the newest filter response', async () => {
    let resolveInitial!: (value: FetchFiscalDocumentsResult) => void;
    let resolveFiltered!: (value: FetchFiscalDocumentsResult) => void;
    mocks.fetchFiscalDocumentsList
      .mockImplementationOnce(() => new Promise((resolve) => { resolveInitial = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFiltered = resolve; }));

    const { result } = renderHook(() => useFiscalDocumentsList(true), { wrapper: createWrapper() });
    await waitFor(() => expect(mocks.fetchFiscalDocumentsList).toHaveBeenCalledTimes(1));
    act(() => result.current.setStatusFilter('rejeitada'));
    await waitFor(() => expect(mocks.fetchFiscalDocumentsList).toHaveBeenCalledTimes(2));

    await act(async () => {
      resolveFiltered({ ...emptyResult, documents: [{ id: 'new-filter-result' } as NfeDocumentRecord] });
    });
    await waitFor(() =>
      expect(result.current.documents.map((document) => document.id)).toEqual(['new-filter-result'])
    );

    await act(async () => {
      resolveInitial({ ...emptyResult, documents: [{ id: 'stale-result' } as NfeDocumentRecord] });
    });
    await waitFor(() =>
      expect(result.current.documents.map((document) => document.id)).toEqual(['new-filter-result'])
    );
  });

  it('resets pagination and environment when opening a targeted document link', async () => {
    const { result, rerender } = renderHook(() => useFiscalDocumentsList(true), { wrapper: createWrapper() });
    await waitFor(() => expect(mocks.fetchFiscalDocumentsList).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.setEnvironmentFilter('2');
    });
    act(() => result.current.setPageIndex(3));
    await waitFor(() => expect(result.current.pageIndex).toBe(3));
    await waitFor(() => expect(mocks.fetchFiscalDocumentsList).toHaveBeenCalled());

    mocks.searchParams = new URLSearchParams('documentId=34d868e3-64fd-4909-a126-bdbf96b03b9b');
    rerender();

    await waitFor(() => expect(result.current.pageIndex).toBe(0));
    await waitFor(() => expect(result.current.filters.environment).toBe('all'));
    await waitFor(() => expect(mocks.fetchFiscalDocumentsList).toHaveBeenLastCalledWith(
      expect.objectContaining({ pageIndex: 0, targetDocumentId: '34d868e3-64fd-4909-a126-bdbf96b03b9b' })
    ));
  });

  it('keeps an invalid custom period editable, blocks the query and recovers when corrected', async () => {
    const { result } = renderHook(() => useFiscalDocumentsList(true), { wrapper: createWrapper() });
    await waitFor(() => expect(mocks.fetchFiscalDocumentsList).toHaveBeenCalledTimes(1));
    act(() => {
      result.current.setPeriod('custom');
      result.current.setCustomDateFrom('2026-10-14');
      result.current.setCustomDateTo('2026-10-01');
    });
    await waitFor(() => expect(result.current.loadError).toMatch(/data final/));
    expect(result.current.customDateTo).toBe('2026-10-01');
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mocks.fetchFiscalDocumentsList).toHaveBeenCalledTimes(1);
    act(() => result.current.setCustomDateTo('2026-10-15'));
    await waitFor(() => expect(mocks.fetchFiscalDocumentsList).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.loadError).toBeNull());
    expect(mocks.fetchFiscalDocumentsList).toHaveBeenLastCalledWith(expect.objectContaining({ filters: expect.objectContaining({ dateFrom: '2026-10-14', dateTo: '2026-10-15' }) }));
  });

  it('preserves lookup by document identity when the service ignores an incomplete period', async () => {
    mocks.searchParams = new URLSearchParams('documentId=34d868e3-64fd-4909-a126-bdbf96b03b9b');
    const { result } = renderHook(() => useFiscalDocumentsList(true), { wrapper: createWrapper() });
    await waitFor(() => expect(mocks.fetchFiscalDocumentsList).toHaveBeenCalledTimes(1));
    act(() => { result.current.setPeriod('custom'); result.current.setCustomDateFrom(''); });
    await waitFor(() => expect(mocks.fetchFiscalDocumentsList).toHaveBeenCalledTimes(2));
    expect(result.current.loadError).toBeNull();
    expect(mocks.fetchFiscalDocumentsList).toHaveBeenLastCalledWith(expect.objectContaining({ targetDocumentId: '34d868e3-64fd-4909-a126-bdbf96b03b9b' }));
  });
});
