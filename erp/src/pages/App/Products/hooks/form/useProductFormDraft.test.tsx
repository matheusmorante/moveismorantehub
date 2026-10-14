// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type Product from '@/pages/types/product.type';
import { useProductFormDraft } from './useProductFormDraft';
import { setTestArtifactMode } from '../../../../../../../shared-utils/testArtifactContext';

const mocks = vi.hoisted(() => ({ saveProduct: vi.fn() }));
vi.mock('@/pages/utils/productService', () => ({ saveProduct: mocks.saveProduct }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('useProductFormDraft em modo de artefato de teste', () => {
  it('mantém o mesmo rascunho, versão e identificador de teste entre salvamentos', async () => {
    const metadata = {
      testArtifact: {
        is_test: true,
        runId: 'fd41a462-a72a-4e69-b0cd-b673b8ccb570',
        ownerId: '0bad55d5-2099-41fa-8c74-1a9fbab0e183',
      },
    };
    mocks.saveProduct.mockImplementation(async (draft: Product) => {
      draft.technicalSpecs = metadata;
      draft.updatedAt = '2026-10-11T16:00:00.000Z';
      return 'draft-test-id';
    });
    const { result } = renderHook(() => {
      const [data, setData] = useState<Partial<Product>>({ name: 'Produto HML', isDraft: true, technicalSpecs: metadata });
      const draft = useProductFormDraft(data, setData, true, true, null,
        { current: true }, { current: '' });
      return { data, ...draft };
    });

    await act(async () => { await result.current.autoSaveDraft(result.current.data); });
    expect(result.current.data).toMatchObject({
      id: 'draft-test-id', updatedAt: '2026-10-11T16:00:00.000Z', technicalSpecs: metadata,
    });
    await act(async () => {
      await result.current.autoSaveDraft({ ...result.current.data, description: 'Descrição preenchida' });
    });
    expect(mocks.saveProduct).toHaveBeenLastCalledWith(expect.objectContaining({
      id: 'draft-test-id', updatedAt: '2026-10-11T16:00:00.000Z', technicalSpecs: metadata,
    }), false, { isTestArtifact: true });
    expect(result.current.autoSaveStatus).toBe('saved');
  });

  it('persiste o rascunho identificado e limpa erro de autosave anterior', async () => {
    const data: Partial<Product> = {
      name: 'TESTE FISCAL ERP',
      title: 'TESTE FISCAL ERP',
      isDraft: true,
      status: 'draft',
    };
    const setFormData = vi.fn();
    const hasChanged = { current: true };
    const initialFormDataRef = { current: '' };
    const { result } = renderHook(
      () => useProductFormDraft(
        data,
        setFormData,
        true,
        true,
        null,
        hasChanged,
        initialFormDataRef,
      ),
    );

    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.saveProduct.mockRejectedValueOnce(new Error('Falha de autosave'));
    mocks.saveProduct.mockResolvedValueOnce('draft-test-id');
    await act(async () => {
      await result.current.autoSaveDraft(data);
    });
    expect(result.current.autoSaveStatus).toBe('error');

    const identifiedData = setTestArtifactMode(data, 'technicalSpecs', true, {
      runId: 'fd41a462-a72a-4e69-b0cd-b673b8ccb570',
      ownerId: '0bad55d5-2099-41fa-8c74-1a9fbab0e183',
    });
    await act(async () => {
      await result.current.autoSaveDraft(identifiedData);
    });

    expect(mocks.saveProduct).toHaveBeenCalledTimes(2);
    expect(mocks.saveProduct).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'TESTE FISCAL ERP', isDraft: true, status: 'draft' }),
      false,
      { isTestArtifact: true },
    );
    expect(result.current.autoSaveStatus).toBe('saved');
  });

  it('salva OFF depois do primeiro autosave sem restaurar o identificador anterior', async () => {
    const identity = {
      runId: 'fd41a462-a72a-4e69-b0cd-b673b8ccb570',
      ownerId: '0bad55d5-2099-41fa-8c74-1a9fbab0e183',
    };
    let finishFirstSave: () => void;
    mocks.saveProduct.mockImplementationOnce(async (draft: Product) => {
      await new Promise<void>((resolve) => { finishFirstSave = resolve; });
      draft.updatedAt = 'v1';
      return 'same-draft';
    }).mockImplementationOnce(async (draft: Product) => {
      draft.updatedAt = 'v2';
      return 'same-draft';
    });
    const { result } = renderHook(() => {
      const [data, setData] = useState<Partial<Product>>(setTestArtifactMode({ name: 'Produto HML' }, 'technicalSpecs', true, identity));
      return { data, setData, ...useProductFormDraft(data, setData, true, true, null, { current: true }, { current: '' }) };
    });
    let first: Promise<boolean>;
    act(() => { first = result.current.autoSaveDraft(result.current.data); });
    await waitFor(() => expect(mocks.saveProduct).toHaveBeenCalledTimes(1));
    act(() => result.current.setData((prev) => setTestArtifactMode(prev, 'technicalSpecs', false)));
    let queued: Promise<boolean>;
    act(() => { queued = result.current.autoSaveDraft(result.current.data); });
    await act(async () => { finishFirstSave!(); await first!; await queued!; });
    expect(mocks.saveProduct).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'same-draft', technicalSpecs: {} }), false, {});
    expect(result.current.data).toMatchObject({ id: 'same-draft', technicalSpecs: {}, updatedAt: 'v2' });
  });
});
