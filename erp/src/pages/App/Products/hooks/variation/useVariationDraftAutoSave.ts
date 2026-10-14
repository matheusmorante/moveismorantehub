import { useCallback, useEffect, useRef, useState } from 'react';
import type { Variation } from '@/pages/types/product.type';
import type { ProductDraftAutoSaveStatus } from '../form/useProductFormDraft';
import { useZodForm } from '@/hooks/useZodForm';
import { productVariationDraftSchema } from '../../../../../../../shared-utils/productVariationValidation';

interface Options {
  isOpen: boolean;
  isDraft: boolean;
  variation: Variation | null;
  onChange?: (variation: Variation) => void;
  save: (variation: Variation) => Promise<boolean>;
}

export function useVariationDraftAutoSave({ isOpen, isDraft, variation, onChange, save }: Options) {
  const [status, setStatus] = useState<ProductDraftAutoSaveStatus>('idle');
  const { validateAndRun } = useZodForm(productVariationDraftSchema, variation ? { ...variation } : {
    id: '', sku: '', name: '', stock: 0, unitPrice: 0, active: false, attributes: [],
  });
  const latest = useRef(variation);
  latest.current = variation;
  const saveRef = useRef(save);
  saveRef.current = save;
  const identity = useRef<string | null>(null);
  const observed = useRef('');
  const saved = useRef('');
  const queued = useRef<Variation | null>(null);
  const active = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback((override?: Variation): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const data = override || latest.current;
    if (!data) return Promise.resolve(true);
    if (JSON.stringify(data) === saved.current && !active.current) return Promise.resolve(true);
    queued.current = data;
    if (active.current) return active.current;
    setStatus('saving');
    const promise = (async () => {
      try {
        while (queued.current) {
          const next = queued.current;
          queued.current = null;
          if (!(await validateAndRun(next, (values) => saveRef.current({ ...next, ...values })))) {
            setStatus('error');
            return false;
          }
          saved.current = JSON.stringify(next);
        }
        setStatus('saved');
        return true;
      } catch (error) {
        console.error('[Draft] Falha ao salvar a variação:', error);
        setStatus('error');
        return false;
      }
    })();
    active.current = promise.finally(() => { active.current = null; });
    return active.current;
  }, [validateAndRun]);

  useEffect(() => {
    if (!isOpen || !isDraft || !variation) {
      identity.current = null;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      return;
    }
    const snapshot = JSON.stringify(variation);
    if (identity.current !== variation.id) {
      identity.current = variation.id;
      observed.current = snapshot;
      saved.current = snapshot;
      setStatus('idle');
      return;
    }
    if (observed.current === snapshot) return;
    observed.current = snapshot;
    onChange?.(variation);
    if (snapshot === saved.current && !active.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flush(); }, 500);
  }, [isOpen, isDraft, variation, onChange, flush]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { status, flush };
}
