import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { variationMergeCommandSchema, variationMergeSearchSchema, variationMergeAckSchema, VariationMergeUnconfirmedError,
  type VariationMergeOperationGuard } from '../../../../../../../../shared-utils/variationMergeFormSchemas';
import { withTimeout } from '../../../../../../../../shared-utils/withTimeout';
import { mergeVariationIntoCanonical } from '@/pages/utils/productService';
import { searchCanonicalVariations } from '@/pages/utils/productService/productVariationMergeQueries';
import type { VariationOption, MergeVariationModalProps } from '../MergeVariationModal';

export const useMergeVariation = (variation: MergeVariationModalProps['variation'], onMerged: () => void, onClose: () => void, operationGuard?: VariationMergeOperationGuard) => {
  const [query, changeQuery] = useState(''), [options, setOptions] = useState<readonly VariationOption[]>([]), [target, chooseTarget] = useState<VariationOption | null>(null);
  const [saving, setSaving] = useState(false), [error, setError] = useState(operationGuard?.error || '');
  const [searchLoading, setSearchLoading] = useState(false), [searchError, setSearchError] = useState(''), [searchRevision, setSearchRevision] = useState(0);
  const active = useRef(false), lock = useRef(false), completed = useRef(false), revision = useRef(0), renderRevision = revision.current;
  const token = useRef(Symbol('merge-variation')), ownGuard = useRef<VariationMergeOperationGuard>({ active: null, error: '' });
  const guard = operationGuard ?? ownGuard.current, sourceId = String(variation?.variationId || variation?.id || '').trim().toLowerCase();
  const isOpen = Boolean(variation), sourceParentId = variation?.parentId?.trim().toLowerCase() || undefined, supplierId = variation?.supplierId?.trim().toLowerCase() || undefined;
  const { validateAndRun } = useZodForm(variationMergeCommandSchema, { sourceId, targetId: target?.id || '', sourceParentId, supplierId });
  const { validateValues } = useZodForm(variationMergeSearchSchema, { sourceId, query, supplierId });
  const blocked = Boolean(guard.error) || completed.current;

  useEffect(() => {
    const currentToken = token.current; active.current = isOpen;
    if (guard.active && guard.active !== currentToken) { guard.error ||= new VariationMergeUnconfirmedError().message; setError(guard.error); }
    return () => { active.current = false; if (!completed.current && guard.active === currentToken) guard.error ||= new VariationMergeUnconfirmedError().message; };
  }, [isOpen, sourceId, guard]);

  useEffect(() => {
    let current = true, accepting = true;
    setOptions([]); setSearchError('');
    if (!isOpen || query.trim().length < 2 || target || blocked || saving) { setSearchLoading(false); return; }
    setSearchLoading(true);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const values = await validateValues({ sourceId, query, supplierId }, (errors) => {
            if (current) setSearchError(Object.values(flattenFormErrors(errors))[0] || 'Confira os dados da busca.');
          });
          if (!values || !current) return;
          const result = await withTimeout(searchCanonicalVariations(values, () => current && accepting), 11000, null, 'mesclar-variacao:busca-formulario');
          if (!current) return;
          if (!result) throw new Error('A busca de variações excedeu o prazo. Consulte novamente.');
          setOptions(result);
        } catch (failure) { if (current) setSearchError(failure instanceof Error ? failure.message : 'Não foi possível buscar variações.'); }
        finally { accepting = false; if (current) setSearchLoading(false); }
      })();
    }, 250);
    return () => { current = false; accepting = false; clearTimeout(timer); };
  }, [isOpen, sourceId, query, target, supplierId, searchRevision, blocked, saving, validateValues]);

  const handleCancel = useCallback(() => { if (active.current && !lock.current) onClose(); }, [onClose]);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') handleCancel(); };
    document.addEventListener('keydown', handleKeyDown); return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleCancel]);
  const editable = () => active.current && !lock.current && !guard.error && !completed.current;
  const setQuery = (value: string) => {
    if (!editable()) return;
    revision.current += 1; changeQuery(value); chooseTarget(null); setOptions([]); setSearchLoading(value.trim().length >= 2); setSearchError(''); setError('');
  };
  const setTarget = (value: VariationOption) => {
    if (!editable() || renderRevision !== revision.current || searchLoading || searchError) return;
    const selected = options.find((option) => option.id === value.id);
    if (!selected) return;
    revision.current += 1; chooseTarget(selected); changeQuery(selected.name); setOptions([]); setError('');
  };
  const confirm = async () => {
    if (!editable() || !target || guard.active || renderRevision !== revision.current || searchLoading || searchError) return false;
    lock.current = true; setSaving(true); setError('');
    let accepting = true;
    const stillCurrent = () => active.current && accepting && !guard.error && renderRevision === revision.current;
    try {
      return await validateAndRun({ sourceId, targetId: target.id, sourceParentId, supplierId }, async (values) => {
        if (!stillCurrent()) return false;
        guard.active = token.current;
        const result = await withTimeout(mergeVariationIntoCanonical(values.sourceId, values.targetId,
          { sourceParentId: values.sourceParentId, supplierId: values.supplierId }, stillCurrent), 60000, null, 'mesclar-variacao:confirmar-formulario');
        const ack = variationMergeAckSchema.safeParse(result);
        if (!ack.success) throw new VariationMergeUnconfirmedError();
        if (!stillCurrent()) return false;
        completed.current = true; guard.active = null;
        toast.success(`Variação mesclada. ${ack.data.transferredSupplierIds.length} fornecedor(es) exclusivo(s) foram incorporados ao canônico.`);
        try { onMerged(); onClose(); } catch { setError('Mesclagem confirmada, mas a tela não foi atualizada. Recarregue a página.'); }
        return true;
      }, (errors) => { if (active.current) setError(Object.values(flattenFormErrors(errors))[0] || 'Confira os dados da mesclagem.'); });
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : 'Não foi possível mesclar as variações.';
      if ((failure as { uncertain?: boolean })?.uncertain) guard.error = message;
      if (active.current) { setError(message); toast.error(message); } return false;
    } finally {
      accepting = false; lock.current = false;
      if (guard.active === token.current) guard.active = null;
      if (active.current) setSaving(false);
    }
  };
  return { query, setQuery, options, target, setTarget, saving, sourceId, confirm, handleCancel, searchLoading, searchError, error, blocked,
    retrySearch: () => { if (editable()) { revision.current += 1; setOptions([]); setSearchLoading(true); setSearchRevision((value) => value + 1); } },
  };
};
