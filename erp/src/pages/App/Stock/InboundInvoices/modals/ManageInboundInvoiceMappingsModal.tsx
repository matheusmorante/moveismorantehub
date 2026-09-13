import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import PersonFormModal from '@/pages/App/Registrations/shared/PersonFormModal';
import { saveInboundInvoice } from '@/pages/utils/inboundNfe/inboundInvoicesService';
import { parseInboundNfeXml } from '@/pages/utils/inboundNfe/inboundXmlParser';
import { InboundInvoice, InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { fetchPersons } from '@/pages/utils/personService';
import { saveProductSupplierCode, findProductSupplierCodes } from '@/pages/utils/productSupplierCodesService';
import { recordProductResolutionFeedback } from '@/pages/utils/inboundNfe/productResolutionFeedbackService';
import SupplierAutocomplete from '@/components/SupplierAutocomplete';
import Person from '@/pages/types/person.type';
import { InboundInvoiceItemsReview } from '../components/InboundInvoiceItemsReview';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    invoice: InboundInvoice | null;
    onSaveSuccess: () => void;
};

export function ManageInboundInvoiceMappingsModal({ isOpen, onClose, invoice: initialInvoice, onSaveSuccess }: Props) {
    const [invoice, setInvoice] = useState<InboundInvoice | null>(initialInvoice);
    const [suppliers, setSuppliers] = useState<Person[]>([]);
    const [newSupplier, setNewSupplier] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!initialInvoice) {
            setInvoice(null);
            return;
        }
        let inv = initialInvoice;
        if (inv.rawXml && inv.items && inv.items.some((i) => !i.productDescription || i.productDescription === 'Item sem descrição' || (i.unitCost === 0 && i.totalCost === 0))) {
            try {
                const parsed = parseInboundNfeXml(inv.rawXml);
                if (parsed.items && parsed.items.length > 0) {
                    const repairedItems = parsed.items.map((xmlItem, idx) => {
                        const existing = inv.items.find((c) => c.itemNumber === xmlItem.itemNumber || (c.productCode && c.productCode === xmlItem.productCode)) || inv.items[idx];
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
        const loadInitialData = async () => {
            try {
                const list = await fetchPersons('suppliers');
                if (active) setSuppliers(list);

                if (!invoice?.supplierId || !invoice?.items?.length) return;

                const mappings = await findProductSupplierCodes(invoice.supplierId, invoice.items.map((item) => item.productCode));
                if (!active || !mappings.size) return;
                setInvoice((current) => {
                    if (!current || current.supplierId !== invoice.supplierId) return current;
                    return {
                        ...current,
                        items: current.items.map((item) => {
                            const mapping = mappings.get(item.productCode.trim().toLocaleUpperCase('pt-BR'));
                            return mapping ? {
                                ...item,
                                matchedProductId: item.matchedProductId || mapping.productId,
                                matchedVariationId: item.matchedVariationId || mapping.productVariationId,
                            } : item;
                        }),
                    };
                });
            } catch (error) {
                console.warn('Erro ao carregar dados do fornecedor/vínculos:', error);
            }
        };
        void loadInitialData();
        return () => { active = false; };
    }, [isOpen, invoice?.id, invoice?.supplierId]);

    if (!isOpen || !invoice) return null;

    const hasMatchedProducts = invoice.items.some((item) => Boolean(item.matchedProductId));

    const setSupplier = (id: string) => setInvoice((current) => current ? ({
        ...current,
        supplierId: id || undefined,
        items: current.items.map((item) => ({ ...item, matchedProductId: undefined, matchedVariationId: undefined })),
    }) : current);

    const handleSave = async () => {
        if (!invoice.supplierId) return toast.error('Selecione um fornecedor antes de salvar.');

        try {
            setLoading(true);

            // Salvar vínculos confirmados para produtos selecionados
            await Promise.all(
                invoice.items
                    .filter((item) => item.matchedProductId && item.productCode)
                    .map((item) =>
                        saveProductSupplierCode({
                            supplierId: invoice.supplierId!,
                            productId: item.matchedProductId!,
                            productVariationId: item.matchedVariationId,
                            supplierProductCode: item.productCode,
                            supplierDescription: item.productDescription,
                        })
                    )
            );

            await Promise.all(
                invoice.items
                    .filter((item) => item.matchedProductId)
                    .map((item) =>
                        recordProductResolutionFeedback({
                            supplierId: invoice.supplierId!,
                            supplierProductCode: item.productCode,
                            supplierCodeFamily: item.detectedSupplierCodeFamily,
                            nfItemDescription: item.productDescription,
                            normalizedParentName: item.normalizedParentName,
                            detectedAttributes: Object.fromEntries(
                                Object.entries(item.extractedAttributes || {}).filter(([, value]) => typeof value === 'string')
                            ) as Record<string, string>,
                            unitCost: item.unitCost,
                            userDecision: 'accepted',
                            finalProductId: item.matchedProductId!,
                            finalVariationId: item.matchedVariationId,
                            relationType: item.matchedVariationId ? 'existing_variation' : 'new_product',
                        })
                    )
            );

            await saveInboundInvoice(invoice);
            toast.success('Vínculos da nota fiscal atualizados com sucesso.');
            onSaveSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Não foi possível salvar os vínculos.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-[1000002] flex items-center justify-center p-3">
                <button className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={onClose} />
                <section className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 animate-in fade-in zoom-in-95">
                    <header className="flex items-center justify-between border-b p-5 dark:border-slate-800">
                        <div>
                            <h2 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <i className="bi bi-link-45deg text-blue-600 text-lg" />
                                Editar Vínculos - NF-e #{invoice.nfeNumber}
                            </h2>
                            <p className="text-xs text-slate-500">
                                Gerencie o fornecedor e a vinculação dos produtos desta nota aos produtos do sistema.
                            </p>
                        </div>
                        <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                            <i className="bi bi-x-lg" />
                        </button>
                    </header>

                    <main className="space-y-5 overflow-y-auto p-5">
                        {/* Seção Fornecedor */}
                        <section className="rounded-2xl border p-4 dark:border-slate-800">
                            <h3 className="text-xs font-black uppercase text-slate-500">Fornecedor</h3>
                            <p className="mt-2 font-bold text-slate-800 dark:text-slate-100">{invoice.emitterName || 'Emitente não identificado'}</p>
                            <p className="text-xs text-slate-500">{invoice.emitterCnpj || 'CNPJ/CPF não encontrado'}</p>

                            <div className="mt-3 flex items-center gap-2">
                                <div className="min-w-0 flex-1">
                                    <SupplierAutocomplete
                                        suppliers={suppliers}
                                        selectedSupplierId={invoice.supplierId || ''}
                                        onSelect={(id) => setSupplier(id)}
                                        disabled={hasMatchedProducts}
                                        disabledReason={hasMatchedProducts ? 'Para alterar o fornecedor da NF, desvincule primeiro todos os produtos da nota.' : undefined}
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
                                <p className="mt-2 text-xs font-bold text-emerald-700">Fornecedor vinculado. Os produtos estão liberados.</p>
                            ) : (
                                <p className="mt-2 text-xs text-amber-700">Selecione o fornecedor para habilitar a vinculação de produtos.</p>
                            )}
                        </section>

                        {/* Revisão de Itens e Vínculos */}
                        <InboundInvoiceItemsReview
                            items={invoice.items}
                            supplierId={invoice.supplierId}
                            suppliers={suppliers}
                            onChange={(itemNumber, update) =>
                                setInvoice((current) =>
                                    current
                                        ? {
                                              ...current,
                                              items: current.items.map((item) => (item.itemNumber === itemNumber ? { ...item, ...update } : item)),
                                          }
                                        : current
                                )
                            }
                        />
                    </main>

                    <footer className="flex items-center justify-end gap-3 border-t p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            disabled={loading}
                            onClick={() => void handleSave()}
                            className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
                        >
                            {loading ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </footer>
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
