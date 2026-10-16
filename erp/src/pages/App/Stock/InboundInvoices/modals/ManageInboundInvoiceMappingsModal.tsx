import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { inboundInvoiceMappingFormSchema } from '../../../../../../../shared-utils/inboundProductLinkFormSchemas';
import PersonFormModal from '@/pages/App/Registrations/shared/modals/PersonFormModal';
import { saveInboundInvoice } from '@/pages/utils/inboundNfe/inboundInvoicesService';
import { parseInboundNfeXml } from '@/pages/utils/inboundNfe/inboundXmlParser';
import { InboundInvoice, InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { fetchPersons } from '@/pages/utils/personService';
import { findProductSupplierCodes } from '@/pages/utils/productSupplierCodesService';
import SupplierAutocomplete from '@/components/SupplierAutocomplete';
import Person from '@/pages/types/person.type';
import { InboundInvoiceItemsReview } from '../components/InboundInvoiceItemsReview';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  invoice: InboundInvoice | null;
  onSaveSuccess: () => void | Promise<void>;
};

export function ManageInboundInvoiceMappingsModal({
  isOpen,
  onClose,
  invoice: initialInvoice,
  onSaveSuccess,
}: Props) {
  const [invoice, setInvoice] = useState<InboundInvoice | null>(initialInvoice);
  const [suppliers, setSuppliers] = useState<Person[]>([]);
  const [newSupplier, setNewSupplier] = useState(false);
  const [saving, setSaving] = useState(false), [loading, setLoading] = useState(false), [errorMessage, setErrorMessage] = useState('');
  const [loadRevision, setLoadRevision] = useState(0);
  const inFlight = useRef(false), activeRef = useRef(true), uncertain = useRef(new Set<string>());
  const context = useRef({ initialInvoice, isOpen });
  if (context.current.initialInvoice !== initialInvoice || context.current.isOpen !== isOpen) context.current = { initialInvoice, isOpen };
  useEffect(() => { activeRef.current = true; return () => { activeRef.current = false; }; }, []);
  const mappingForm = useZodForm(inboundInvoiceMappingFormSchema, { id: initialInvoice?.id || '', items: [] });
  const mappingsKey = `${invoice?.supplierId || ''}:${invoice?.items?.map((item) => `${item.itemNumber}:${item.productCode}`).join('|') || ''}`;

  useEffect(() => {
    if (!initialInvoice) {
      setInvoice(null);
      return;
    }
    let inv = initialInvoice;
    if (
      inv.rawXml &&
      inv.items &&
      inv.items.some(
        (i) =>
          !i.productDescription ||
          i.productDescription === 'Item sem descrição' ||
          (i.unitCost === 0 && i.totalCost === 0)
      )
    ) {
      try {
        const parsed = parseInboundNfeXml(inv.rawXml);
        if (parsed.items && parsed.items.length > 0) {
          const repairedItems = parsed.items.map((xmlItem, idx) => {
            const existing =
              inv.items.find(
                (c) =>
                  c.itemNumber === xmlItem.itemNumber ||
                  (c.productCode && c.productCode === xmlItem.productCode)
              ) || inv.items[idx];
            return {
              ...xmlItem,
              matchedProductId: existing?.matchedProductId || xmlItem.matchedProductId,
              matchedVariationId: existing?.matchedVariationId || xmlItem.matchedVariationId,
              productErpName: existing?.productErpName || xmlItem.productErpName,
              linkedProductCode: existing?.linkedProductCode || xmlItem.linkedProductCode,
            };
          });
          inv = { ...inv, items: repairedItems };
        }
      } catch (e) {
        console.warn('Erro ao restaurar itens do XML:', e);
      }
    }
    setInvoice(inv);
  }, [initialInvoice]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const sourceSnapshot = JSON.stringify(invoice?.items);
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const list = await withTimeout(fetchPersons('suppliers'), 15000, null, 'entrada:consultar-fornecedores');
        if (!list) throw new Error('A consulta de fornecedores demorou demais.');
        if (active) setSuppliers(list);

        if (!invoice?.supplierId || !invoice?.items?.length) {
          return;
        }

        const mappings = await withTimeout(findProductSupplierCodes(
          invoice.supplierId,
          invoice.items.map((item) => item.productCode)
        ), 15000, null, 'entrada:consultar-vinculos');
        if (!mappings) throw new Error('A consulta de vínculos demorou demais.');
        if (!active || !mappings.size) return;
        setInvoice((current) => {
          if (!current || inFlight.current || current.id !== invoice.id || current.supplierId !== invoice.supplierId || JSON.stringify(current.items) !== sourceSnapshot) return current;
          const nextItems = current.items.map((item) => {
              const mapping = mappings.get(item.productCode.trim().toLocaleUpperCase('pt-BR'));
              return mapping
                ? {
                    ...item,
                    matchedProductId: item.matchedProductId || mapping.productId,
                    matchedVariationId: item.matchedVariationId || mapping.productVariationId,
                  }
                : item;
            });
          return JSON.stringify(nextItems) === sourceSnapshot ? current : { ...current, items: nextItems };
        });
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Não foi possível consultar fornecedores/vínculos.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadInitialData();
    return () => {
      active = false;
    };
  }, [isOpen, mappingsKey, initialInvoice, loadRevision, invoice?.id, invoice?.items, invoice?.supplierId]);

  if (!isOpen || !invoice) return null;

  const hasMatchedProducts = invoice.items.some((item) => Boolean(item.matchedProductId || item.compositionLinks?.length));
  const close = () => { if (!inFlight.current) onClose(); };

  const persistInvoice = async (nextInvoice: InboundInvoice) => {
    if (inFlight.current) return false;
    if (uncertain.current.has(nextInvoice.id)) { setErrorMessage('Há uma alteração sem confirmação nesta nota. Recarregue e confira os vínculos antes de repetir.'); return false; }
    inFlight.current = true;
    setSaving(true); setErrorMessage('');
    const submittedContext = context.current;
    let expired = false, writing = false;
    const assertCurrent = () => {
      if (expired || !activeRef.current || context.current !== submittedContext) throw new Error('A nota mudou. Confira o resultado antes de repetir.');
    };
    try {
      return Boolean(await mappingForm.validateAndRun({ ...nextInvoice, items: nextInvoice.items.map((item) => ({ ...item })) }, async (values) => {
        assertCurrent();
        const parsedInvoice = values as unknown as InboundInvoice;
        writing = true;
        const saved = await withTimeout(saveInboundInvoice(parsedInvoice, { requireConfirmation: true, assertCurrent }), 30000, null, 'entrada:salvar-mapeamentos');
        assertCurrent();
        if (!saved || saved.id !== parsedInvoice.id) throw new Error('A alteração do vínculo não foi confirmada.');
        setInvoice(saved);
        try {
          const refreshed = await withTimeout(Promise.resolve(onSaveSuccess()).then(() => true), 15000, false, 'entrada:atualizar-lista');
          if (!refreshed && activeRef.current && context.current === submittedContext) setErrorMessage('Vínculos salvos. A atualização da lista demorou demais; recarregue a lista.');
        } catch {
          if (activeRef.current && context.current === submittedContext) setErrorMessage('Vínculos salvos. Não foi possível atualizar a lista; recarregue a lista.');
        }
        return true;
      }, (errors) => setErrorMessage(Object.values(flattenFormErrors(errors))[0] || 'Confira os vínculos.')));
    } catch (error) {
      if (writing) uncertain.current.add(nextInvoice.id);
      if (activeRef.current && context.current === submittedContext) {
        const message = `${error instanceof Error ? error.message : 'Não foi possível salvar o vínculo.'} ${writing ? 'Confira a nota antes de repetir.' : ''}`;
        setErrorMessage(message); toast.error(message);
      }
      return false;
    } finally { expired = true; inFlight.current = false; if (activeRef.current) setSaving(false); }
  };

  const setSupplier = (id: string) => {
    const nextInvoice = {
      ...invoice,
      supplierId: id || undefined,
      items: invoice.items.map((item) => ({
        ...item,
        matchedProductId: undefined,
        matchedVariationId: undefined,
      })),
    };
    return persistInvoice(nextInvoice);
  };

  const handleItemChange = (itemNumber: number, update: Partial<InboundInvoiceItem>) => {
    const nextInvoice = {
      ...invoice,
      items: invoice.items.map((item) =>
        item.itemNumber === itemNumber ? { ...item, ...update } : item
      ),
    };
    return persistInvoice(nextInvoice);
  };

  return (
    <>
      <div className="fixed inset-0 z-[1000002] flex items-center justify-center p-3">
        <button type="button" aria-label="Fechar vínculos" disabled={saving} className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={close} />
        <section role="dialog" aria-modal="true" aria-label="Gerenciar vínculos da nota" className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 animate-in fade-in zoom-in-95">
          <header className="flex items-center justify-between border-b p-5 dark:border-slate-800">
            <div>
              <h2 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <i className="bi bi-link-45deg text-blue-600 text-lg" />
                Gerenciar Vínculos - NF-e #{invoice.nfeNumber}
              </h2>
            </div>
            <button
              type="button"
              aria-label="Fechar janela"
              disabled={saving}
              onClick={close}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <i className="bi bi-x-lg" />
            </button>
          </header>

          <main className="space-y-5 overflow-y-auto p-5">
            {errorMessage && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{errorMessage}</p>}
            {(loading || saving) && <p role="status" className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300"><i className="bi bi-arrow-repeat animate-spin" aria-hidden="true" />{saving ? 'Salvando e confirmando vínculos...' : 'Consultando fornecedores e vínculos...'}</p>}
            {errorMessage && !saving && <button type="button" onClick={() => { setErrorMessage(''); setLoadRevision((value) => value + 1); }}>Consultar novamente</button>}
            <fieldset disabled={saving} className="space-y-5">
            {/* Seção Fornecedor */}
            <section className="rounded-2xl border p-4 dark:border-slate-800">
              <h3 className="text-xs font-black uppercase text-slate-500">Fornecedor</h3>
              <p className="mt-2 font-bold text-slate-800 dark:text-slate-100">
                {invoice.emitterName || 'Emitente não identificado'}
              </p>
              <p className="text-xs text-slate-500">
                {invoice.emitterCnpj || 'CNPJ/CPF não encontrado'}
              </p>

              <div className="mt-3 flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <SupplierAutocomplete
                    suppliers={suppliers}
                    selectedSupplierId={invoice.supplierId || ''}
                    onSelect={(id) => setSupplier(id)}
                    disabled={hasMatchedProducts}
                    disabledReason={
                      hasMatchedProducts
                        ? 'Para alterar o fornecedor da NF, desvincule primeiro todos os produtos da nota.'
                        : undefined
                    }
                    hideLabel={true}
                    inputClassName="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-blue-600 transition-colors"
                    placeholder="Digite 2 ou mais letras para buscar fornecedor..."
                    minChars={2}
                  />
                </div>
                <button
                  disabled={hasMatchedProducts}
                  className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shrink-0"
                  onClick={() => setNewSupplier(true)}
                >
                  + Novo fornecedor
                </button>
              </div>

              {hasMatchedProducts ? (
                <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
                  <i className="bi bi-lock-fill text-amber-600 text-sm" />
                  Para alterar o fornecedor da NF, desvincule primeiro todos os produtos da nota.
                </p>
              ) : invoice.supplierId ? (
                <p className="mt-2 text-xs font-bold text-emerald-700">
                  Fornecedor vinculado. Os produtos estão liberados.
                </p>
              ) : (
                <p className="mt-2 text-xs text-amber-700">
                  Selecione o fornecedor para habilitar a vinculação de produtos.
                </p>
              )}
            </section>

            {/* Revisão de Itens e Vínculos */}
            <InboundInvoiceItemsReview
              suggestionsEnabled={false}
              items={invoice.items}
              supplierId={invoice.supplierId}
              suppliers={suppliers}
              onChange={handleItemChange}
            />
            </fieldset>
          </main>
        </section>
      </div>

      <PersonFormModal
        isOpen={newSupplier}
        onClose={() => setNewSupplier(false)}
        collectionName="suppliers"
        title="Novo Fornecedor"
        onSuccess={(person) => {
          setSuppliers((current) => [...current, person]);
          setSupplier(person.id || '');
          setNewSupplier(false);
        }}
      />
    </>
  );
}
