import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { variationFamilyCommandSchema, variationFamilyQuerySchema, variationFamilyConflictSchema, variationFamilyAckSchema,
  canAddVariationFamilyAttribute, VariationFamilyUnconfirmedError, type VariationFamilyOperationGuard } from '../../../../../../../../shared-utils/variationFamilyFormSchemas';
import { withTimeout } from '../../../../../../../../shared-utils/withTimeout';
import { ensureAttributeValues } from '@/pages/utils/variationService';
import { moveVariationToFamily } from '@/pages/utils/productService';
import { invalidateProductCatalogStatsCache } from '../../services/productCatalogStatsService';
import { MAX_VARIATION_IMAGES } from '@/pages/utils/productImageLimits';
import { fetchVariationFamilyContext, searchVariationFamilies, fetchVariationFamilyConflict } from '@/pages/utils/productService/productVariationFamilyQueries';
import { normalizeSearchTerm } from '../../../../../../../../shared-utils/searchText';
import type Product from '@/pages/types/product.type';
import type { Variation } from '@/pages/types/product.type';
import { type Family, type Attribute, toAttributes, familyName } from './utils';

export const useMoveVariationFamily = (
  variation: (Product & { readonly variationId?: string; attributes: Variation['attributes'] }) | null,
  onMoved: () => void, onClose: () => void, operationGuard?: VariationFamilyOperationGuard,
) => {
  const initialSource = useRef(variation), active = useRef(false), lock = useRef(false), completed = useRef(false);
  const ownGuard = useRef<VariationFamilyOperationGuard>({ active: null, error: '' });
  const guard = operationGuard ?? ownGuard.current, token = useRef(Symbol('move-family'));
  const sourceId = (variation?.variationId || '').trim().toLowerCase();
  const isOpen = Boolean(variation);
  const [families, setFamilies] = useState<readonly Family[]>([]), [targetFamilyId, selectFamily] = useState('');
  const [familySearch, setFamilySearch] = useState(''), [suggestionLoading, setSuggestionLoading] = useState(false),
    [suggestionError, setSuggestionError] = useState(''), [suggestionRevision, setSuggestionRevision] = useState(0);
  const [attributes, setAttributes] = useState<Attribute[]>(() => toAttributes(variation?.attributes));
  const [context, setContext] = useState<Awaited<ReturnType<typeof fetchVariationFamilyContext>> | null>(null);
  const [loading, setLoading] = useState(Boolean(variation)), [queryError, setQueryError] = useState(''), [queryRevision, setQueryRevision] = useState(0);
  const [hasConflict, setHasConflict] = useState(false), [conflictLoading, setConflictLoading] = useState(false);
  const [conflictError, setConflictError] = useState(''), [checkedKey, setCheckedKey] = useState(''), [conflictRevision, setConflictRevision] = useState(0);
  const [countdown, setCountdown] = useState(5), deadline = useRef(0);
  const reviewRevision = useRef(0), renderRevision = reviewRevision.current;
  const [saving, setSaving] = useState(false), [error, setError] = useState(guard.error);
  const family = families.find((candidate) => candidate.id === targetFamilyId);
  const values = { sourceId, familyId: targetFamilyId, sourceParentId: context?.sourceParentId || '', attributes,
    images: context?.images || [], name: [familyName(family), ...attributes.map((attribute) => attribute.value)].filter(Boolean).join(' ') };
  const { validateAndRun } = useZodForm(variationFamilyCommandSchema, values);
  const { validateValues: validateQuery } = useZodForm(variationFamilyQuerySchema, { sourceId });
  const { validateValues: validateConflict } = useZodForm(variationFamilyConflictSchema, { sourceId, familyId: targetFamilyId, attributes });
  const validationKey = JSON.stringify([sourceId, targetFamilyId, attributes]);

  useEffect(() => {
    const currentToken = token.current;
    active.current = isOpen;
    if (guard.active && guard.active !== token.current) {
      guard.error ||= new VariationFamilyUnconfirmedError().message; setError(guard.error);
    }
    return () => {
      active.current = false;
      if (!completed.current && guard.active === currentToken) guard.error ||= new VariationFamilyUnconfirmedError().message;
    };
  }, [guard, sourceId, isOpen]);

  useEffect(() => {
    let current = true, accepting = true;
    setLoading(true); setQueryError(''); setContext(null); setFamilies([]); setFamilySearch(''); selectFamily('');
    setSuggestionLoading(false); setSuggestionError('');
    void (async () => {
      try {
        const input = await validateQuery({ sourceId });
        if (!input || !current) throw new Error('A variação precisa de um UUID válido. Reabra pelo cadastro da variação.');
        const result = await withTimeout(
          fetchVariationFamilyContext(input, initialSource.current?.parentId, () => current && accepting),
          32000,
          null,
          'mover-variacao:consultas'
        );
        if (!current) return;
        if (!result) throw new Error('A consulta da mudança de família excedeu o prazo. Consulte novamente.');
        setContext(result);
      } catch (failure) { if (current) setQueryError(failure instanceof Error ? failure.message : 'Não foi possível consultar a mudança de família.'); }
      finally { accepting = false; if (current) setLoading(false); }
    })();
    return () => { current = false; accepting = false; };
  }, [sourceId, queryRevision, validateQuery]);

  const normalizedFamilySearch = normalizeSearchTerm(familySearch);
  useEffect(() => {
    let current = true, accepting = true;
    if (!isOpen || loading || !context || targetFamilyId || normalizedFamilySearch.length < 3) {
      if (!targetFamilyId) setFamilies([]);
      setSuggestionLoading(false); setSuggestionError('');
      return () => { current = false; accepting = false; };
    }
    setFamilies([]); setSuggestionError(''); setSuggestionLoading(true);
    const timer = setTimeout(() => {
      void searchVariationFamilies(normalizedFamilySearch, context.sourceParentId, () => current && accepting)
        .then((results) => { if (current && accepting) setFamilies(results); })
        .catch((failure) => { if (current && accepting) setSuggestionError(failure instanceof Error ? failure.message : 'Não foi possível buscar os produtos pai.'); })
        .finally(() => { if (current) setSuggestionLoading(false); accepting = false; });
    }, 250);
    return () => { current = false; accepting = false; clearTimeout(timer); };
  }, [context, isOpen, loading, normalizedFamilySearch, suggestionRevision, targetFamilyId]);

  useEffect(() => {
    let current = true, accepting = true;
    deadline.current = 0; setCountdown(5); setCheckedKey(''); setHasConflict(false); setConflictError('');
    if (loading || !family || !context) { setConflictLoading(false); return; }
    setConflictLoading(true);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const input = await validateConflict({ sourceId, familyId: targetFamilyId, attributes }, (errors) => {
            if (current) setConflictError(Object.values(flattenFormErrors(errors))[0] || 'Confira as características.');
          });
          if (!current || !input) return;
          const conflict = await withTimeout(fetchVariationFamilyConflict(input, () => current && accepting), 11000, null, 'mover-variacao:validar-destino');
          if (!current) return;
          if (conflict === null) throw new Error('A validação do destino excedeu o prazo. Consulte novamente.');
          setHasConflict(conflict);
          if (!conflict) { setCheckedKey(validationKey); deadline.current = Date.now() + 5000; }
        } catch (failure) { if (current) setConflictError(failure instanceof Error ? failure.message : 'Não foi possível validar o destino.'); }
        finally { accepting = false; if (current) setConflictLoading(false); }
      })();
    }, 150);
    return () => { current = false; accepting = false; clearTimeout(timer); };
  }, [sourceId, targetFamilyId, attributes, loading, family, context, validationKey, conflictRevision, validateConflict]);

  useEffect(() => {
    if (checkedKey !== validationKey || !checkedKey || !deadline.current || saving) return;
    const timer = setInterval(() => setCountdown(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))), 250);
    return () => clearInterval(timer);
  }, [checkedKey, validationKey, saving]);

  const canConfirm = Boolean(family && context && checkedKey === validationKey && !loading && !queryError && !hasConflict && !conflictLoading
    && !conflictError && countdown === 0 && !saving && !guard.error && !completed.current);
  const editable = () => active.current && !lock.current && !guard.error && !completed.current;
  const invalidateReview = () => { reviewRevision.current += 1; deadline.current = 0; setCheckedKey(''); setCountdown(5); };
  const handleCancel = () => { if (editable()) onClose(); };
  const handleConfirm = async () => {
    if (!active.current || lock.current || guard.active || !canConfirm || !deadline.current || renderRevision !== reviewRevision.current || Date.now() < deadline.current) return false;
    lock.current = true; setSaving(true); setError('');
    let accepting = true;
    const stillCurrent = () => active.current && accepting && !guard.error && renderRevision === reviewRevision.current;
    try {
      return await validateAndRun(values, async (parsed) => {
        if (!stillCurrent()) return false;
        if (parsed.images.length > MAX_VARIATION_IMAGES) throw new Error(`Cada variação pode vincular no máximo ${MAX_VARIATION_IMAGES} fotos.`);
        guard.active = token.current;
        const operation = async () => {
          const storedAttributes = await ensureAttributeValues(parsed.attributes, stillCurrent);
          const canonicalAttributes: Attribute[] = parsed.attributes.map((attribute, index) => ({
            ...attribute,
            ...storedAttributes[index],
          }));
          if (!stillCurrent()) throw new VariationFamilyUnconfirmedError();
          const newName = [familyName(family), ...canonicalAttributes.map((attribute) => attribute.value)].join(' ');
          return moveVariationToFamily(parsed.sourceId, parsed.familyId, canonicalAttributes, newName, parsed.images, parsed.sourceParentId, stillCurrent);
        };
        const result = await withTimeout(operation(), 60000, null, 'mover-variacao:confirmar-formulario');
        const confirmation = variationFamilyAckSchema.safeParse(result);
        if (!confirmation.success) throw new VariationFamilyUnconfirmedError();
        if (!stillCurrent()) return false;
        completed.current = true; guard.active = null;
        toast.success(confirmation.data.sourceParentRemoved
          ? `Variação movida (novo SKU: ${confirmation.data.newSku}). O produto pai antigo ficou sem variações e foi removido.`
          : `Variação movida para o novo produto pai (SKU: ${confirmation.data.newSku}). O ID foi preservado.`);
        try {
          invalidateProductCatalogStatsCache();
          onMoved();
          onClose();
        } catch { setError('Mudança confirmada, mas a tela não foi atualizada. Recarregue a página.'); }
        return true;
      }, (errors) => { if (active.current) setError(Object.values(flattenFormErrors(errors))[0] || 'Confira os dados da mudança.'); });
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : 'Não foi possível mover a variação.';
      if ((failure as { uncertain?: boolean })?.uncertain) guard.error = message;
      if (active.current) { setError(message); toast.error(message); }
      return false;
    } finally {
      accepting = false; lock.current = false;
      if (guard.active === token.current) guard.active = null;
      if (active.current) setSaving(false);
    }
  };
  return { families, familySearch, updateFamilySearch: (value: string) => {
      if (!editable()) return;
      setFamilySearch(value);
      setFamilies([]); setSuggestionError(''); setSuggestionLoading(normalizeSearchTerm(value).length >= 3);
      if (targetFamilyId) { invalidateReview(); selectFamily(''); }
    }, selectFamilySuggestion: (candidate: Family) => {
      if (!editable()) return;
      invalidateReview(); selectFamily(candidate.id);
      setFamilySearch(`${familyName(candidate)}${candidate.code ? ` — ${candidate.code}` : ''}`);
      setSuggestionLoading(false); setSuggestionError('');
    }, targetFamilyId, setTargetFamilyId: (id: string) => { if (editable()) { invalidateReview(); selectFamily(id); } }, attributes,
    updateAttribute: (index: number, field: 'name' | 'value', value: string) => { if (editable()) { invalidateReview(); setAttributes((current) => current.map((attribute, i) => i === index ? { ...attribute, [field]: value } : attribute)); } },
    addAttribute: () => {
      if (!editable() || !canAddVariationFamilyAttribute(attributes)) return;
      invalidateReview();
      setAttributes((current) =>
        canAddVariationFamilyAttribute(current) ? [...current, { name: '', value: '' }] : current
      );
    },
    hasConflict, countdown, isOnlyVariation: Boolean(context?.isOnlyVariation), saving, handleConfirm, handleCancel,
    loading, queryError, suggestionLoading, suggestionError, conflictLoading, conflictError, error, canConfirm, blocked: Boolean(guard.error) || completed.current,
    retryQueries: () => { if (editable()) { invalidateReview(); setQueryRevision((revision) => revision + 1); } },
    retrySuggestions: () => { if (editable()) { setSuggestionError(''); setSuggestionLoading(true); setSuggestionRevision((revision) => revision + 1); } },
    retryConflict: () => { if (editable()) { invalidateReview(); setConflictRevision((revision) => revision + 1); } },
  };
};
