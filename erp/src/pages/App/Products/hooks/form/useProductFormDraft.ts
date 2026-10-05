import { useState, useRef, useCallback, useEffect } from 'react';
import Product from '../../../../types/product.type';
import { saveProduct } from '@/pages/utils/productService';
import { getEnteredProductName, isDraftSaveEligible } from './rules/productDraftRules';

export { getEnteredProductName, isDraftSaveEligible };

export type ProductDraftAutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useProductFormDraft(
  formData: Partial<Product>,
  setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>,
  isOpen: boolean,
  _isProductCreation: boolean,
  _editingVariationId: string | null,
  hasChanged: React.MutableRefObject<boolean>,
  initialFormDataRef: React.MutableRefObject<string>
) {
  const [autoSaveStatus, setAutoSaveStatus] = useState<ProductDraftAutoSaveStatus>('idle');
  const isSavingDraftRef = useRef(false);
  const activeSavePromiseRef = useRef<Promise<boolean> | null>(null);
  const queuedDataRef = useRef<Partial<Product> | null>(null);
  const savedDraftIdRef = useRef<string | null>(null);
  const savedVersionRef = useRef<string | undefined>(formData.updatedAt);
  const wasOpenRef = useRef(isOpen);

  useEffect(() => {
    savedDraftIdRef.current = formData.id ? String(formData.id) : null;
    savedVersionRef.current = formData.updatedAt;
    if (isOpen && !wasOpenRef.current) setAutoSaveStatus('idle');
    if (!isOpen) {
      queuedDataRef.current = null;
      setAutoSaveStatus('idle');
    }
    wasOpenRef.current = isOpen;
  }, [formData.id, formData.updatedAt, isOpen]);

  const autoSaveDraft = useCallback(
    (data: Partial<Product>): Promise<boolean> => {
      if (!getEnteredProductName(data)) {
        setAutoSaveStatus('idle');
        return Promise.resolve(false);
      }

      queuedDataRef.current = data;
      if (activeSavePromiseRef.current) return activeSavePromiseRef.current;

      isSavingDraftRef.current = true;
      setAutoSaveStatus('saving');

      const savePromise = (async () => {
        try {
          while (queuedDataRef.current) {
            const nextData = queuedDataRef.current;
            queuedDataRef.current = null;
            const draftTitle = getEnteredProductName(nextData);
            if (!draftTitle) continue;

            const normalizedData = {
              ...nextData,
              id: nextData.id || savedDraftIdRef.current || undefined,
              updatedAt: savedVersionRef.current || nextData.updatedAt,
              name: draftTitle,
              title: nextData.title || draftTitle,
              isDraft: true,
              active: false,
              status: 'draft',
            } as Product;

            const savedId = await saveProduct(normalizedData);
            savedDraftIdRef.current = savedId;
            savedVersionRef.current = normalizedData.updatedAt;
            const savedSnapshot = { ...normalizedData, id: savedId };
            setFormData((prev) => ({
              ...prev,
              id: savedId,
              updatedAt: normalizedData.updatedAt,
              ...(prev.name === nextData.name ? { name: draftTitle } : {}),
              ...(prev.title === nextData.title ? { title: normalizedData.title } : {}),
              isDraft: true,
              active: false,
              status: 'draft',
            }));
            initialFormDataRef.current = JSON.stringify(savedSnapshot);
          }

          hasChanged.current = false;
          setAutoSaveStatus('saved');
          return true;
        } catch (error: unknown) {
          console.error('[Draft] Falha ao salvar rascunho automaticamente:', error);
          queuedDataRef.current = null;
          setAutoSaveStatus('error');
          return false;
        } finally {
          isSavingDraftRef.current = false;
        }
      })();
      const completedSavePromise = savePromise.finally(() => {
        activeSavePromiseRef.current = null;
      });
      activeSavePromiseRef.current = completedSavePromise;
      return completedSavePromise;
    },
    [setFormData, hasChanged, initialFormDataRef]
  );

  return {
    autoSaveStatus,
    autoSaveDraft,
  };
}
