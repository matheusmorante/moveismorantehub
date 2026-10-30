import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import {
  duplicateProductMergeCommandSchema,
  duplicateProductMergeSearchSchema,
  DuplicateProductMergeUnconfirmedError,
} from '../../../../../../../shared-utils/productDuplicateMergeFormSchemas';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import {
  mergeDuplicateProductIntoCanonical,
  searchDuplicateProductMergeTargets,
  type DuplicateProductMergeOption,
} from '@/pages/utils/productService';

export interface MergeDuplicateProductModalProps {
  readonly product: { readonly id?: string; readonly code?: string | null; readonly name?: string | null } | null;
  readonly onClose: () => void;
  readonly onMerged: () => void;
}

export const MergeDuplicateProductModal: React.FC<MergeDuplicateProductModalProps> = ({
  product,
  onClose,
  onMerged,
}) => {
  const sourceId = String(product?.id || '').trim().toLowerCase();
  const [query, setQueryValue] = useState('');
  const [options, setOptions] = useState<DuplicateProductMergeOption[]>([]);
  const [target, setTarget] = useState<DuplicateProductMergeOption | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const revision = useRef(0);
  const active = useRef(false);
  const { validateValues } = useZodForm(duplicateProductMergeSearchSchema, { sourceId, query });
  const { validateAndRun } = useZodForm(duplicateProductMergeCommandSchema, {
    sourceId,
    canonicalId: target?.id || '',
  });

  useEffect(() => {
    active.current = Boolean(product);
    return () => { active.current = false; };
  }, [product]);

  useEffect(() => {
    let accepting = true;
    const currentRevision = ++revision.current;
    setOptions([]);
    setSearchError('');
    if (!product || query.trim().length < 2 || target || blocked || saving) {
      setSearchLoading(false);
      return () => { accepting = false; };
    }

    setSearchLoading(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const values = await validateValues({ sourceId, query }, (formErrors) => {
            if (accepting) setSearchError(Object.values(flattenFormErrors(formErrors))[0] || 'Confira a busca.');
          });
          if (!values || !accepting || currentRevision !== revision.current) return;
          const results = await withTimeout(
            searchDuplicateProductMergeTargets(values.sourceId, values.query,
              () => accepting && currentRevision === revision.current),
            12000,
            null,
            'mesclar-produto:busca-formulario',
          );
          if (!results) throw new Error('A busca de produtos excedeu o prazo. Tente novamente.');
          if (accepting && currentRevision === revision.current) setOptions(results);
        } catch (failure) {
          if (accepting && currentRevision === revision.current) {
            setSearchError(failure instanceof Error ? failure.message : 'Não foi possível buscar produtos.');
          }
        } finally {
          if (accepting && currentRevision === revision.current) setSearchLoading(false);
        }
      })();
    }, 250);

    return () => {
      accepting = false;
      window.clearTimeout(timer);
    };
  }, [product, sourceId, query, target, blocked, validateValues]);

  if (!product) return null;
  const sourceLabel = [product.code, product.name].filter(Boolean).join(' • ') || sourceId;

  const changeQuery = (value: string) => {
    if (saving || blocked) return;
    revision.current += 1;
    setQueryValue(value);
    setTarget(null);
    setOptions([]);
    setError('');
    setSearchError('');
  };

  const confirm = async () => {
    if (!target || saving || blocked || searchLoading || searchError) return;
    setSaving(true);
    setError('');
    const currentRevision = revision.current;
    const stillCurrent = () => active.current && currentRevision === revision.current;
    try {
      await validateAndRun({ sourceId, canonicalId: target.id }, async (values) => {
        if (!stillCurrent()) return false;
        const result = await withTimeout(
          mergeDuplicateProductIntoCanonical(values.sourceId, values.canonicalId),
          70000,
          null,
          'mesclar-produto:confirmar-formulario',
        );
        if (!result) throw new DuplicateProductMergeUnconfirmedError();
        if (!stillCurrent()) throw new DuplicateProductMergeUnconfirmedError();
        toast.success(`${product.code || 'Produto'} mesclado em ${result.canonical_code} e movido para a Lixeira.`);
        onMerged();
        onClose();
        return true;
      }, (formErrors) => {
        setError(Object.values(flattenFormErrors(formErrors))[0] || 'Confira os produtos selecionados.');
      });
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : 'Não foi possível mesclar os produtos.';
      if ((failure as { uncertain?: boolean })?.uncertain) setBlocked(true);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!saving) onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCancel} aria-hidden="true" />
      <div
        className="relative z-10 m-4 w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="merge-duplicate-product-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6 dark:border-slate-800">
          <div>
            <h2 id="merge-duplicate-product-title" className="text-lg font-black text-slate-800 dark:text-white">
              Mesclar produto duplicado
            </h2>
            <p className="mt-1 text-xs text-slate-500">Origem: {sourceLabel}</p>
          </div>
          <button type="button" onClick={handleCancel} disabled={saving} aria-label="Fechar" className="p-2 text-slate-400 hover:text-slate-700 disabled:opacity-40 dark:hover:text-slate-200">
            <i className="bi bi-x-lg text-base" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {(error || searchError) && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error || searchError}</p>}
          {(searchLoading || saving) && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800"><i aria-hidden="true" className="bi bi-arrow-repeat animate-spin mr-2" />{saving ? 'Mesclando e conferindo os vínculos…' : 'Buscando produtos canônicos…'}</p>}

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
            O saldo será somado por variação com os mesmos atributos. Vendas e movimentações serão vinculadas ao destino; descrições e snapshots históricos serão preservados. O produto de origem irá para a Lixeira, com recuperação por 30 dias.
          </div>

          <fieldset disabled={saving || blocked} className="space-y-2">
            <label htmlFor="duplicate-product-canonical" className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Produto canônico de destino
            </label>
            <input
              autoFocus
              id="duplicate-product-canonical"
              value={query}
              onChange={(event) => changeQuery(event.target.value)}
              placeholder="Pesquise por código ou nome…"
              className="w-full border-b-2 border-slate-200 bg-transparent px-2 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:text-white"
            />
            {target && (
              <p className="rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                Destino selecionado: {target.code} • {target.name}
              </p>
            )}
            {!target && !searchLoading && !searchError && query.trim().length >= 2 && (
              <div className="max-h-56 overflow-auto rounded-xl border border-slate-200 shadow-lg dark:border-slate-700">
                {options.map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    onClick={() => {
                      setTarget(option);
                      setQueryValue(`${option.code} • ${option.name}`);
                      setOptions([]);
                      setError('');
                    }}
                    className="flex w-full flex-col border-b border-slate-100 p-3 text-left last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <span className="text-sm font-bold text-slate-800 dark:text-white">{option.code} • {option.name}</span>
                    <span className="text-xs text-slate-500">Estoque atual: {option.stock}</span>
                  </button>
                ))}
                {options.length === 0 && <p className="p-4 text-center text-xs text-slate-500">Nenhum produto compatível encontrado.</p>}
              </div>
            )}
          </fieldset>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
          <button type="button" onClick={handleCancel} disabled={saving} className="rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800">
            Fechar
          </button>
          <button type="button" onClick={confirm} disabled={!target || saving || blocked || searchLoading || Boolean(searchError)} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-40">
            {saving ? 'Mesclando…' : 'Confirmar mesclagem'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MergeDuplicateProductModal;
