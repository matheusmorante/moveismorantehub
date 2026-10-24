import React, { useEffect, useMemo, useRef, useState } from 'react';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { useAuth } from '@/context/AuthContext';
import { inventoryAuditScopeSchema } from '../../../../../../../shared-utils/inventoryAuditFormSchemas';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import type Product from '@/pages/types/product.type';
import type Person from '@/pages/types/person.type';
import { useInventoryScopeBuilder } from '../hooks/useInventoryScopeBuilder';
import { InventoryScopeTypeSelector } from '../components/InventoryScopeTypeSelector';
import { InventoryScopeConfigForm } from '../components/InventoryScopeConfigForm';
import type { ScopeConfiguration } from '../types/inventoryScope.types';
import type { InventorySnapshotItem } from '../types/inventoryAudit.types';

export type { InventoryScopeType, ScopeConfiguration } from '../types/inventoryScope.types';

interface InventoryScopeModalProps {
  readonly allProducts: readonly Product[];
  readonly suppliers: readonly Person[];
  readonly employees: readonly Person[];
  readonly catalogSyncedAt?: string | null;
  readonly copiedItems?: readonly InventorySnapshotItem[] | null;
  readonly onCancel: () => void;
  readonly onConfirm: (config: ScopeConfiguration) => void | boolean | Promise<void | boolean>;
}

export const InventoryScopeModal: React.FC<InventoryScopeModalProps> = ({
  allProducts,
  suppliers,
  employees,
  catalogSyncedAt,
  copiedItems,
  onCancel,
  onConfirm,
}) => {
  const { profile } = useAuth();
  const {
    step,
    scopeType,
    inventoryName,
    setInventoryName,
    selectedSupplierId,
    setSelectedSupplierId,
    selectedResponsibleId,
    setSelectedResponsibleId,
    responsibleError,
    setResponsibleError,
    matchingItems,
    setCustomProducts,
    handleNextStep,
  } = useInventoryScopeBuilder(allProducts, suppliers, profile?.id || '');

  const copyRequested = copiedItems != null;
  const copiedSelection = useMemo(() => {
    if (!copiedItems?.length) return null;
    const selected: Array<{ product: Product; variation?: NonNullable<Product['variations']>[number] }> = [];
    const seen = new Set<string>();
    for (const source of copiedItems) {
      const product = allProducts.find((item) => String(item.id) === source.productId && !item.deleted);
      const variation = source.variationId ? product?.variations?.find((item) => item.id === source.variationId) : undefined;
      const key = JSON.stringify([source.productId, source.variationId || '']);
      if (!product || (source.variationId && !variation) || seen.has(key)) return null;
      seen.add(key); selected.push({ product, variation });
    }
    return selected;
  }, [copiedItems, allProducts]);
  const initializedCopy = useRef(false);
  useEffect(() => {
    if (!copyRequested || !copiedSelection) return;
    setCustomProducts(copiedSelection);
    if (!initializedCopy.current) { initializedCopy.current = true; handleNextStep('custom'); }
  }, [copyRequested, copiedSelection, setCustomProducts, handleNextStep]);
  const copyError = copyRequested && !copiedSelection
    ? 'A cópia contém itens indisponíveis ou não possui itens. Confira o catálogo antes de iniciar.' : '';

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const mounted = useRef(false), locked = useRef(false), replayBlocked = useRef(false);
  const options = useRef({ suppliers, employees });
  options.current = { suppliers, employees };
  const values = {
    type: scopeType!, name: inventoryName, supplierId: selectedSupplierId,
    responsibleId: selectedResponsibleId, hasStages: scopeType === 'full',
    itemsSnapshot: scopeType === 'custom' && !copyRequested ? [] : matchingItems.map((item) => ({ ...item })),
  };
  const form = useZodForm(inventoryAuditScopeSchema, values);
  const latestSnapshot = useRef({ items: values.itemsSnapshot, copyError });
  latestSnapshot.current = { items: values.itemsSnapshot, copyError };
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const close = () => { if (!locked.current) onCancel(); };
  const handleConfirm = async () => {
    if (!mounted.current || locked.current || replayBlocked.current) return;
    locked.current = true;
    setIsSaving(true); setError('');
    try {
      if (copyError) { setError(copyError); return; }
      await form.validateAndRun({ ...values, itemsSnapshot: values.itemsSnapshot.map((item) => ({ ...item })) }, async (data) => {
        if (!mounted.current) return false;
        if (latestSnapshot.current.copyError || JSON.stringify(latestSnapshot.current.items) !== JSON.stringify(data.itemsSnapshot)) {
          setError('O catálogo mudou durante a validação. Confira os itens atualizados antes de iniciar.'); return false;
        }
        if (!options.current.employees.some((employee) => String(employee.id) === data.responsibleId)) {
          setResponsibleError(true);
          setError('O responsável não está mais disponível. Selecione um responsável da lista.');
          return false;
        }
        if (data.type === 'supplier' && !options.current.suppliers.some((supplier) => String(supplier.id) === data.supplierId)) {
          setError('O fornecedor não está mais disponível. Selecione um fornecedor da lista.');
          return false;
        }
        const result = await withTimeout(Promise.resolve(onConfirm(data)).then((value) => ({ value })),
          60_000, null, 'inventario:iniciar');
        if (!mounted.current) return false;
        if (result === null) {
          replayBlocked.current = true; setBlocked(true);
          setError('O início do inventário não foi confirmado no prazo. Confira os rascunhos antes de iniciar novamente.');
          return false;
        }
        if (result.value === false) {
          setError('Não foi possível iniciar o inventário. Confira os dados e tente novamente.');
          return false;
        }
        return true;
      }, (errors) => {
        if (!mounted.current) return;
        if (errors.responsibleId) setResponsibleError(true);
        setError(Object.values(flattenFormErrors(errors))[0] || 'Confira o escopo do inventário.');
      });
    } catch (cause) {
      if (!mounted.current) return;
      if ((cause as { uncertain?: boolean })?.uncertain || cause instanceof TypeError) {
        replayBlocked.current = true; setBlocked(true);
        setError('O início do inventário não foi confirmado. Confira os rascunhos antes de iniciar novamente.');
      } else setError('Não foi possível iniciar o inventário. Confira os dados e tente novamente.');
    } finally {
      locked.current = false;
      if (mounted.current) setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      <header className="flex shrink-0 items-center justify-between gap-4 px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100">
            Novo Inventário
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            {step === 1 ? 'O que você deseja inventariar?' : 'Configuração do Escopo'}
          </p>
          <p className="mt-1 text-[11px] text-slate-400" role="status">
            {catalogSyncedAt
              ? `Índice offline sincronizado em ${new Date(catalogSyncedAt).toLocaleString('pt-BR')}`
              : 'Índice offline ainda não sincronizado neste navegador'}
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          disabled={isSaving}
          aria-label="Fechar escopo"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
        >
          <i className="bi bi-x-lg"></i>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {(error || copyError) && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error || copyError}</div>}
          {isSaving && <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
            <i className="bi bi-arrow-repeat animate-spin" aria-hidden="true" /> Validando e iniciando inventário...
          </div>}
          <fieldset disabled={isSaving || blocked} className="min-w-0">
            {step === 1 && <InventoryScopeTypeSelector onSelect={(type) => { if (!locked.current) handleNextStep(type); }} />}

            {step === 2 && (
              <InventoryScopeConfigForm
                scopeType={scopeType}
                inventoryName={inventoryName}
                setInventoryName={(value) => { if (!locked.current && !replayBlocked.current) setInventoryName(value); }}
                selectedSupplierId={selectedSupplierId}
                setSelectedSupplierId={(value) => { if (!locked.current && !replayBlocked.current) setSelectedSupplierId(value); }}
                selectedResponsibleId={selectedResponsibleId}
                setSelectedResponsibleId={(value) => { if (!locked.current && !replayBlocked.current) setSelectedResponsibleId(value); }}
                responsibleError={responsibleError}
                setResponsibleError={(value) => { if (!locked.current) setResponsibleError(value); }}
                suppliers={suppliers}
                employees={employees}
              />
            )}
          </fieldset>
        </div>
      </main>

      {step === 2 && (
        <footer className="shrink-0 px-6 py-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm">
          <button
            type="button"
            onClick={close}
            disabled={isSaving}
            className="px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSaving || blocked}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            Confirmar e Iniciar
            <i className="bi bi-arrow-right"></i>
          </button>
        </footer>
      )}
    </div>
  );
};

export default InventoryScopeModal;
