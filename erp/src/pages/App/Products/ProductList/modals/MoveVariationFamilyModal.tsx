import React, { useEffect, useRef } from 'react';
import type { VariationFamilyOperationGuard } from '../../../../../../../shared-utils/variationFamilyFormSchemas';
import Product, { type Variation } from '@/pages/types/product.type';
import { useMoveVariationFamily } from './MoveVariationFamily/useMoveVariationFamily';
import { FamilySearchSelector } from './MoveVariationFamily/FamilySearchSelector';
import { AttributeConflictResolver } from './MoveVariationFamily/AttributeConflictResolver';

export interface MoveVariationFamilyModalProps {
  readonly variation: (Product & { readonly variationId?: string; attributes: Variation['attributes'] }) | null;
  readonly onClose: () => void;
  readonly onMoved: () => void;
}

export const MoveVariationFamilyModal: React.FC<MoveVariationFamilyModalProps> = (props) => {
  const guards = useRef(new Map<string, VariationFamilyOperationGuard>());
  const sourceId = (props.variation?.variationId || '').trim().toLowerCase();
  if (!guards.current.has(sourceId)) guards.current.set(sourceId, { active: null, error: '' });
  return props.variation ? <MoveVariationFamilySession key={JSON.stringify([sourceId, props.variation.parentId])} {...props} operationGuard={guards.current.get(sourceId)!} /> : null;
};

const MoveVariationFamilySession: React.FC<MoveVariationFamilyModalProps & { operationGuard: VariationFamilyOperationGuard }> = ({
  variation,
  onClose,
  onMoved,
  operationGuard,
}) => {
  const {
    families,
    targetFamilyId,
    setTargetFamilyId,
    attributes,
    updateAttribute,
    addAttribute,
    hasConflict,
    countdown,
    isOnlyVariation,
    saving,
    handleConfirm,
    handleCancel, loading, queryError, conflictLoading, conflictError, error, canConfirm, blocked, retryQueries, retryConflict,
  } = useMoveVariationFamily(variation, onMoved, onClose, operationGuard);

  useEffect(() => {
    if (!variation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [variation, handleCancel]);

  if (!variation) return null;

  const validAttributes = attributes.filter(
    (attribute) => attribute.name.trim() && attribute.value.trim()
  );
  const hasValidAttributes = validAttributes.length > 0;

  const confirmButtonLabel = () => {
    if (!hasValidAttributes) return 'Atributo obrigatório';
    if (saving) return 'Movendo…';
    if (loading || conflictLoading) return 'Conferindo dados…';
    if (hasConflict) return 'Resolva o conflito';
    if (countdown > 0 && targetFamilyId) return `Confirmar em ${countdown}s`;
    if (isOnlyVariation) return 'Mover e remover produto';
    return 'Confirmar mudança';
  };

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Mover variação para outro produto pai"
    >
      <div className="w-full max-w-4xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-visible border border-slate-100 dark:border-slate-800">
        <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
              Mover variação para outro produto pai
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              A variação permanece com o mesmo ID; somente o vínculo com o produto pai será
              alterado.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <i className="bi bi-x-lg text-base" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {queryError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{queryError} <button type="button" onClick={retryQueries} disabled={saving || blocked}>Consultar novamente</button></p>}
          {conflictError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{conflictError} <button type="button" onClick={retryConflict} disabled={saving || blocked}>Validar destino novamente</button></p>}
          {(loading || conflictLoading || saving) && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800"><i aria-hidden="true" className="bi bi-arrow-repeat animate-spin mr-2" />{saving ? 'Movendo a variação e confirmando dados e fotos...' : 'Conferindo origem, destino e atributos...'}</p>}
          <fieldset disabled={loading || saving || blocked} className="contents">
          {isOnlyVariation ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="font-bold text-sm text-amber-900 dark:text-amber-200 mb-1">
                <i className="bi bi-exclamation-triangle-fill mr-2 text-amber-600 dark:text-amber-400" />
                Esta é a única variação deste produto.
              </p>
              <p className="text-xs font-medium leading-relaxed">
                Ao mover esta variação para o novo produto, o produto de origem ficará sem variações
                e será removido automaticamente.
              </p>
              <p className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                A variação manterá o mesmo ID e todo o histórico será preservado.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              <i className="bi bi-info-circle-fill mr-2 text-amber-600" />O nome da variação pode
              mudar: ele será formado pelo nome do novo produto pai mais os valores dos atributos da
              variação.
            </div>
          )}

          <FamilySearchSelector
            families={families}
            targetFamilyId={targetFamilyId}
            setTargetFamilyId={setTargetFamilyId}
          />

          {targetFamilyId && (
            <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-100">
              <i className="bi bi-images mr-2 text-blue-600" />
              As fotos já vinculadas a esta variação serão adicionadas automaticamente ao novo
              produto pai. A variação continuará vinculada às mesmas fotos.
            </section>
          )}

          <AttributeConflictResolver
            hasConflict={hasConflict}
            attributes={attributes}
            onAddAttribute={addAttribute}
            onUpdateAttribute={updateAttribute}
          />
          </fieldset>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-45 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            {confirmButtonLabel()}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveVariationFamilyModal;
