import { useEffect, useRef, useState } from 'react';
import type Product from '@/pages/types/product.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { ncmService } from '@/services/fiscal/ncmService';
import { withSpan } from '../../../../../../../src/telemetry/tracer';

export type PendingNcmSuggestion = { code: string; description: string };
type Result = {
  category?: { id: string; name: string } | null;
  ncm?: PendingNcmSuggestion | null;
};

export function useProductJevClassification(
  formData: Partial<Product>,
  setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>,
  isOpen: boolean
) {
  const [suggestion, setSuggestion] = useState<PendingNcmSuggestion | null>(null);
  const rejectedSignature = useRef('');
  const lastRequested = useRef('');
  const latestSignature = useRef('');
  const requestNumber = useRef(0);
  const skipAutomaticCategory = useRef('');
  const name = formData.name || '';
  const productTitle = formData.title || '';
  const description = formData.description || '';
  const material = formData.material || '';
  const itemType = formData.itemType;
  const title = (name || productTitle).trim();
  const categoryId = formData.categoryIds?.[0] || '';
  const ncm = (formData.fiscal?.ncm || '').trim();
  const signature = JSON.stringify([title, description, material, categoryId]);
  latestSignature.current = signature;

  useEffect(() => {
    if (!isOpen) {
      setSuggestion(null);
      rejectedSignature.current = '';
      lastRequested.current = '';
    }
  }, [isOpen]);

  useEffect(() => {
    if (rejectedSignature.current && rejectedSignature.current !== signature)
      rejectedSignature.current = '';
    if (!isOpen || title.length < 3 || itemType === 'service' || (categoryId && ncm)) {
      setSuggestion(null);
      return;
    }
    if (signature === skipAutomaticCategory.current) {
      skipAutomaticCategory.current = '';
      lastRequested.current = signature;
      return;
    }
    setSuggestion(null);
    if (lastRequested.current === signature || rejectedSignature.current === signature) return;
    const requestId = ++requestNumber.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      lastRequested.current = signature;
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token || controller.signal.aborted) return;
        const response = await fetch('/api/products/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name,
            title: productTitle,
            description,
            material,
            categoryId,
            ncm,
          }),
          signal: controller.signal,
        });
        if (!response.ok) return;
        const result = (await response.json()) as Result;
        if (
          controller.signal.aborted ||
          requestId !== requestNumber.current ||
          latestSignature.current !== signature
        )
          return;
        if (!ncm && result.ncm && /^\d{8}$/.test(result.ncm.code)) {
          setSuggestion(result.ncm);
          void withSpan('product.jev.ncm.present', async () => undefined, { module: 'Products' });
        }
        if (!categoryId && result.category?.id) {
          const nextSignature = JSON.stringify([title, description, material, result.category.id]);
          if (result.ncm && /^\d{8}$/.test(result.ncm.code))
            skipAutomaticCategory.current = nextSignature;
          setFormData((prev) =>
            prev.categoryIds?.length ? prev : { ...prev, categoryIds: [result.category!.id] }
          );
          void withSpan('product.jev.category.apply', async () => undefined, {
            module: 'Products',
          });
        }
      } catch {
        // A classificação é opcional: o formulário e a escolha manual continuam disponíveis.
      }
    }, 1200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    isOpen,
    signature,
    title,
    categoryId,
    ncm,
    itemType,
    setFormData,
    name,
    productTitle,
    description,
    material,
  ]);

  const rejectSuggestion = () => {
    rejectedSignature.current = signature;
    setSuggestion(null);
    void withSpan('product.jev.ncm.reject', async () => undefined, { module: 'Products' });
  };

  const acceptSuggestion = async () => {
    if (!suggestion || ncm) return;
    try {
      const current = await ncmService.getCatalogEntry(suggestion.code);
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
      if (
        !current?.active ||
        !current.is_active ||
        (current.start_date && current.start_date > today) ||
        (current.end_date && current.end_date < today)
      ) {
        setSuggestion(null);
        return;
      }
      setFormData((prev) =>
        prev.fiscal?.ncm
          ? prev
          : {
              ...prev,
              fiscal: {
                ...prev.fiscal!,
                ncm: current.code,
                ncmDescription: current.official_description,
              },
            }
      );
      setSuggestion(null);
      void withSpan('product.jev.ncm.accept', async () => undefined, { module: 'Products' });
    } catch {
      setSuggestion(null);
    }
  };

  return { suggestion: !ncm ? suggestion : null, acceptSuggestion, rejectSuggestion };
}
