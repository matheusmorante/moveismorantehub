// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FetchFiscalDocumentsResult } from '../services/fiscalDocumentsService';
import type { NfeDocumentRecord } from '../types/fiscalDocuments.types';

const mocks = vi.hoisted(() => ({
  fetchFiscalDocumentsList: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock('react-router-dom', () => ({ useSearchParams: () => [mocks.searchParams] }));
vi.mock('../services/fiscalDocumentsService', () => ({
  fetchFiscalDocumentsList: mocks.fetchFiscalDocumentsList,
}));

import { useFiscalDocumentsList } from '../hooks/useFiscalDocumentsList';

const emptyResult: FetchFiscalDocumentsResult = {
  documents: [],
  totalCount: 0,
  orderNumbers: {},
  cancellationEligibility: {},
};

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
  });

  it('does not fetch documents when fiscal view permission is disabled', async () => {
    const { result } = renderHook(() => useFiscalDocumentsList(false), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mocks.fetchFiscalDocumentsList).not.toHaveBeenCalled();
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
    act(() => result.current.setStatusFilter('rejected'));
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

    mocks.searchParams = new URLSearchParams('documentId=doc-target');
    rerender();

    await waitFor(() => expect(result.current.pageIndex).toBe(0));
    await waitFor(() => expect(result.current.filters.environment).toBe('all'));
    await waitFor(() => expect(mocks.fetchFiscalDocumentsList).toHaveBeenLastCalledWith(
      expect.objectContaining({ pageIndex: 0, targetDocumentId: 'doc-target' })
    ));
  });
});
