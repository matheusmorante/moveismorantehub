import { useCallback, useEffect, useRef, useState } from 'react';
import type Product from '@/pages/types/product.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { ncmService } from '@/services/fiscal/ncmService';
import { withSpan } from '../../../../../../../src/telemetry/tracer';

export type PendingNcmSuggestion = { code: string; description: string };
type Result = {
  category?: { id: string; name: string } | null;
  ncm?: PendingNcmSuggestion | null;
};

async function getCurrentNcmSuggestion(
  candidate: PendingNcmSuggestion
): Promise<PendingNcmSuggestion | null> {
  const code = candidate.code.replace(/\D/g, '');
  if (!/^\d{8}$/.test(code)) return null;
  const current = await ncmService.getCatalogEntry(code);
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
  )
    return null;
  return { code: current.code, description: current.official_description };
}

export function useProductJevClassification(
  formData: Partial<Product>,
  setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>,
  isOpen: boolean,
  categoryName = ''
) {
  const [suggestion, setSuggestion] = useState<PendingNcmSuggestion | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const rejectedSignature = useRef('');
  const lastRequested = useRef('');
  const latestSignature = useRef('');
  const requestNumber = useRef(0);
  const skipAutomaticCategory = useRef('');
  const timerRef = useRef<number | null>(null);

  const name = formData.name || '';
  const productTitle = formData.title || '';
  const title = (name || productTitle).trim();
  const categoryId = formData.categoryIds?.[0] || '';
  const category = (categoryName || formData.category || '').trim();
  const description = (formData.description || '').trim();
  const technicalMaterial =
    formData.technicalValues?.['Material'] ||
    formData.technicalValues?.['Estrutura'] ||
    '';
  const material = (
    formData.material ||
    (typeof technicalMaterial === 'string' ? technicalMaterial : '')
  ).trim();
  const ncm = (formData.fiscal?.ncm || '').trim();
  const itemType = formData.itemType;

  // Os 3 campos obrigatórios segundo a regra:
  // 1. Nome do produto (mínimo 3 caracteres)
  // 2. Categoria (ID ou nome da categoria)
  // 3. Descrição do produto (não vazia)
  const isNameFilled = title.length >= 3;
  const isCategoryFilled = Boolean(categoryId || category);
  const isDescriptionFilled = description.length > 0;
  const areMandatoryFieldsFilled = isNameFilled && isCategoryFilled && isDescriptionFilled;

  // Se já tiver um NCM escolhido, NUNCA deve gerar nova solicitação à IA:
  const hasNcm = Boolean(ncm);

  const signature = JSON.stringify([title, categoryId || category, description, material]);
  latestSignature.current = signature;

  useEffect(() => {
    if (!isOpen) {
      setSuggestion(null);
      rejectedSignature.current = '';
      lastRequested.current = '';
      setIsClassifying(false);
    } else if (hasNcm && !lastRequested.current) {
      // Se o formulário abriu com NCM já definido, marca a assinatura inicial
      // para não disparar sem que haja alteração real nos campos se o NCM for limpo
      lastRequested.current = signature;
    }
  }, [isOpen, hasNcm, signature]);

  const executeClassification = useCallback(
    async (targetSignature?: string) => {
      const sigToUse = targetSignature || latestSignature.current;

      // 1. Regra estrita: se já tiver um NCM escolhido, NÃO deve gerar nova solicitação à IA:
      if (hasNcm) {
        setSuggestion(null);
        return;
      }

      // 2. Os 3 campos (nome, categoria, descrição) devem estar TODOS preenchidos:
      if (!areMandatoryFieldsFilled || itemType === 'service' || !isOpen) {
        setSuggestion(null);
        return;
      }

      // 3. Deve haver alteração real (evita requisições repetidas se não houve mudança):
      if (lastRequested.current === sigToUse || rejectedSignature.current === sigToUse) {
        return;
      }

      const requestId = ++requestNumber.current;
      const controller = new AbortController();
      lastRequested.current = sigToUse;
      setIsClassifying(true);

      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token || controller.signal.aborted) {
          setIsClassifying(false);
          return;
        }

        const response = await fetch('/api/products/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            source: 'product',
            name,
            title: productTitle,
            description,
            material,
            category,
            categoryId,
            ncm: '',
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          setIsClassifying(false);
          return;
        }

        const result = (await response.json()) as Result;
        if (
          controller.signal.aborted ||
          requestId !== requestNumber.current ||
          latestSignature.current !== sigToUse
        ) {
          setIsClassifying(false);
          return;
        }

        let currentNcm: PendingNcmSuggestion | null = null;
        const candidateNcm = result.ncm;
        if (!ncm && candidateNcm && /^\d{8}$/.test(candidateNcm.code)) {
          try {
            currentNcm = await getCurrentNcmSuggestion(candidateNcm);
          } catch {
            // Mantém a seleção manual se a consulta de vigência falhar
          }

          if (
            controller.signal.aborted ||
            requestId !== requestNumber.current ||
            latestSignature.current !== sigToUse
          ) {
            setIsClassifying(false);
            return;
          }

          if (currentNcm) {
            setSuggestion(null);
            void withSpan('product.jev.ncm.autofill', async () => undefined, {
              module: 'Products',
            });
          } else if (result.ncm) {
            setSuggestion(result.ncm);
            void withSpan('product.jev.ncm.present', async () => undefined, {
              module: 'Products',
            });
          }
        }

        if (!categoryId && result.category?.id) {
          const nextSignature = JSON.stringify([title, result.category.id, description, material]);
          if (result.ncm && /^\d{8}$/.test(result.ncm.code)) {
            skipAutomaticCategory.current = nextSignature;
          }
        }

        if ((!categoryId && result.category?.id) || currentNcm) {
          setFormData((prev) => ({
            ...prev,
            ...(!prev.categoryIds?.length && !categoryId && result.category?.id
              ? { categoryIds: [result.category.id] }
              : {}),
            ...(currentNcm && !prev.fiscal?.ncm?.trim()
              ? {
                  fiscal: {
                    ...prev.fiscal,
                    ncm: currentNcm.code,
                    ncmDescription: currentNcm.description,
                  },
                }
              : {}),
          }));
        }

        if (!categoryId && result.category?.id) {
          void withSpan('product.jev.category.apply', async () => undefined, {
            module: 'Products',
          });
        }
      } catch {
        // Classificação opcional; campo permanece editável
      } finally {
        setIsClassifying(false);
      }
    },
    [
      hasNcm,
      areMandatoryFieldsFilled,
      itemType,
      isOpen,
      name,
      productTitle,
      description,
      material,
      category,
      categoryId,
      ncm,
      setFormData,
    ]
  );

  // Gatilho executado no desfocar (onBlur) de um dos campos
  const onFieldBlur = useCallback(
    (_fieldName?: string) => {
      // Se já tem NCM escolhido, NUNCA gera nova solicitação
      if (hasNcm) return;

      // Cancela timer de debounce pendente
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      // Se os 3 campos obrigatórios estão preenchidos e a assinatura mudou em relação à última requisitada
      if (areMandatoryFieldsFilled && signature !== lastRequested.current) {
        void executeClassification(signature);
      }
    },
    [hasNcm, areMandatoryFieldsFilled, signature, executeClassification]
  );

  // Gatilho com debounce para preenchimento programático / primeira vez que os 3 campos estiverem preenchidos
  useEffect(() => {
    if (rejectedSignature.current && rejectedSignature.current !== signature) {
      rejectedSignature.current = '';
    }

    // Se já tem NCM escolhido ou falta algum dos 3 campos obrigatórios, não agenda solicitação:
    if (!isOpen || !areMandatoryFieldsFilled || hasNcm || itemType === 'service') {
      if (hasNcm) setSuggestion(null);
      return;
    }

    if (signature === skipAutomaticCategory.current) {
      skipAutomaticCategory.current = '';
      lastRequested.current = signature;
      return;
    }

    if (lastRequested.current === signature || rejectedSignature.current === signature) {
      return;
    }

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      // Se o usuário ainda estiver com o foco ativo em um input ou textarea (digitando), aguarda o blur real
      const isActivelyTyping =
        typeof document !== 'undefined' &&
        document.activeElement instanceof HTMLElement &&
        document.activeElement.matches(
          'input:not([type="checkbox"]):not([type="radio"]), textarea'
        );

      if (!isActivelyTyping) {
        void executeClassification(signature);
      }
    }, 1200);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    isOpen,
    areMandatoryFieldsFilled,
    hasNcm,
    itemType,
    signature,
    executeClassification,
  ]);

  const rejectSuggestion = () => {
    rejectedSignature.current = signature;
    setSuggestion(null);
    void withSpan('product.jev.ncm.reject', async () => undefined, { module: 'Products' });
  };

  const acceptSuggestion = async () => {
    if (!suggestion || hasNcm) return;
    try {
      const current = await getCurrentNcmSuggestion(suggestion);
      if (!current) {
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
                ncmDescription: current.description,
              },
            }
      );
      setSuggestion(null);
      void withSpan('product.jev.ncm.accept', async () => undefined, { module: 'Products' });
    } catch {
      setSuggestion(null);
    }
  };

  return {
    suggestion: !hasNcm ? suggestion : null,
    isClassifying,
    onFieldBlur,
    triggerClassification: executeClassification,
    acceptSuggestion,
    rejectSuggestion,
  };
}
