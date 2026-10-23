import { useCallback, useEffect, useRef, useState } from 'react';
import { WEB_URL, supabase } from '../../../services/supabaseClient';
import { fetchMobileNcmCatalogEntry } from '../services/mobileProductFiscalService';

export type PendingMobileNcmSuggestion = { code: string; description: string };

type ClassificationResult = {
  category?: { id: string; name: string } | null;
  ncm?: PendingMobileNcmSuggestion | null;
};

const isCurrentNcm = async (candidate: PendingMobileNcmSuggestion) => {
  const code = candidate.code.replace(/\D/g, '');
  if (!/^\d{8}$/.test(code)) return null;
  const entry = await fetchMobileNcmCatalogEntry(code);
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  if (
    !entry?.active ||
    !entry.is_active ||
    (entry.start_date && entry.start_date > today) ||
    (entry.end_date && entry.end_date < today)
  ) {
    return null;
  }
  return { code: entry.code, description: entry.official_description };
};

export function useMobileProductJevClassification(
  formData: any,
  setFormData: (update: (previous: any) => any) => void,
  isOpen: boolean
) {
  const [suggestion, setSuggestion] = useState<PendingMobileNcmSuggestion | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const lastRequested = useRef('');
  const rejectedSignature = useRef('');
  const latestSignature = useRef('');
  const activeTextField = useRef<string | null>(null);
  const requestNumber = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const name = String(formData.name || '').trim();
  const title = String(formData.title || formData.marketplaceTitle || '').trim();
  const classificationTitle = name || title;
  const categoryId = String(formData.categoryIds?.[0] || formData.categoryId || '');
  const category = String(formData.category || '').trim();
  const description = String(formData.description || '').trim();
  const technicalMaterial =
    formData.technicalValues?.Material || formData.technicalValues?.Estrutura || '';
  const material = String(formData.material || technicalMaterial || '').trim();
  const ncm = String(formData.fiscal?.ncm || '').trim();
  const isReady =
    classificationTitle.length >= 3 && Boolean(categoryId || category) && Boolean(description);
  const signature = JSON.stringify([classificationTitle, categoryId || category, description, material]);
  latestSignature.current = signature;

  const executeClassification = useCallback(
    async (targetSignature?: string) => {
      const signatureToUse = targetSignature || latestSignature.current;
      if (
        !isOpen ||
        !isReady ||
        formData.itemType === 'service' ||
        ncm ||
        lastRequested.current === signatureToUse ||
        rejectedSignature.current === signatureToUse
      ) {
        if (ncm) setSuggestion(null);
        return;
      }

      const requestId = ++requestNumber.current;
      const controller = new AbortController();
      controllerRef.current?.abort();
      controllerRef.current = controller;
      const timeout = setTimeout(() => controller.abort(), 10_000);
      lastRequested.current = signatureToUse;
      setSuggestion(null);
      setIsClassifying(true);

      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token || controller.signal.aborted) return;

        const response = await fetch(`${WEB_URL.replace(/\/$/, '')}/api/products/classify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            source: 'product',
            name,
            title,
            description,
            material,
            category,
            categoryId,
            ncm: '',
          }),
          signal: controller.signal,
        });
        if (!response.ok) return;
        const result = (await response.json()) as ClassificationResult;
        if (
          controller.signal.aborted ||
          requestId !== requestNumber.current ||
          latestSignature.current !== signatureToUse
        ) {
          return;
        }

        let currentNcm: PendingMobileNcmSuggestion | null = null;
        if (result.ncm && !ncm && /^\d{8}$/.test(result.ncm.code.replace(/\D/g, ''))) {
          try {
            currentNcm = await isCurrentNcm(result.ncm);
          } catch {
            currentNcm = null;
          }
          if (controller.signal.aborted || requestId !== requestNumber.current) return;
          if (!currentNcm) setSuggestion(result.ncm);
        }

        const inferredCategory = !categoryId ? result.category : null;
        if (currentNcm || inferredCategory?.id) {
          setFormData((previous) => ({
            ...previous,
            ...(inferredCategory?.id && !previous.categoryIds?.length && !previous.categoryId
              ? {
                  categoryIds: [inferredCategory.id],
                  categoryId: inferredCategory.id,
                  category: inferredCategory.name || previous.category,
                }
              : {}),
            ...(currentNcm && !previous.fiscal?.ncm?.trim()
              ? {
                  fiscal: {
                    ...(previous.fiscal || {}),
                    ncm: currentNcm.code,
                    ncmDescription: currentNcm.description,
                  },
                }
              : {}),
          }));
        }
      } catch {
        // Classificação é opcional; os campos permanecem editáveis.
      } finally {
        clearTimeout(timeout);
        if (requestId === requestNumber.current) setIsClassifying(false);
      }
    },
    [
      isOpen,
      isReady,
      formData.itemType,
      ncm,
      name,
      title,
      description,
      material,
      category,
      categoryId,
      setFormData,
    ]
  );

  const onFieldFocus = useCallback((fieldName: string) => {
    activeTextField.current = fieldName;
  }, []);

  const onFieldBlur = useCallback(
    (fieldName: string) => {
      if (activeTextField.current === fieldName) activeTextField.current = null;
      void executeClassification(latestSignature.current);
    },
    [executeClassification]
  );

  useEffect(() => {
    if (!isOpen) {
      requestNumber.current += 1;
      controllerRef.current?.abort();
      controllerRef.current = null;
      activeTextField.current = null;
      lastRequested.current = '';
      rejectedSignature.current = '';
      setSuggestion(null);
      setIsClassifying(false);
      return;
    }
    if (ncm) {
      requestNumber.current += 1;
      controllerRef.current?.abort();
      setSuggestion(null);
      setIsClassifying(false);
      return;
    }
    if (!isReady || formData.itemType === 'service') return;
    if (rejectedSignature.current && rejectedSignature.current !== signature) {
      rejectedSignature.current = '';
    }
    if (lastRequested.current === signature || rejectedSignature.current === signature) return;
    const timer = setTimeout(() => {
      if (activeTextField.current === null) void executeClassification(signature);
    }, 1200);
    return () => clearTimeout(timer);
  }, [isOpen, ncm, isReady, formData.itemType, signature, executeClassification]);

  const rejectSuggestion = useCallback(() => {
    rejectedSignature.current = latestSignature.current;
    setSuggestion(null);
  }, []);

  const acceptSuggestion = useCallback(async () => {
    if (!suggestion || ncm) return;
    try {
      const current = await isCurrentNcm(suggestion);
      if (!current) {
        setSuggestion(null);
        return;
      }
      setFormData((previous) =>
        previous.fiscal?.ncm
          ? previous
          : {
              ...previous,
              fiscal: {
                ...(previous.fiscal || {}),
                ncm: current.code,
                ncmDescription: current.description,
              },
            }
      );
      setSuggestion(null);
    } catch {
      setSuggestion(null);
    }
  }, [suggestion, ncm, setFormData]);

  return {
    suggestion: ncm ? null : suggestion,
    isClassifying,
    onFieldFocus,
    onFieldBlur,
    acceptSuggestion,
    rejectSuggestion,
  };
}
