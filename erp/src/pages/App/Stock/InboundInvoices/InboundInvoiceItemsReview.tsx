import { useEffect, useMemo, useState } from 'react';
import ProductAutocomplete from '@/components/ProductAutocomplete';
import Product, { Variation } from '@/pages/types/product.type';
import Person from '@/pages/types/person.type';
import { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { findProductSupplierCodes, saveProductSupplierCode } from '@/pages/utils/productSupplierCodesService';
import { saveProduct } from '@/pages/utils/productService';
import { fetchGroupsAndCategories } from '@/pages/utils/categoryService';
import { ensureDefaultVariation } from '@/pages/utils/productVariationDefaults';
import { aiService } from '@/pages/utils/aiService';
import { toast } from 'react-toastify';
import { formatCurrency } from '@/pages/utils/formatters';
import { InboundInvoiceItemFiscalReview } from './InboundInvoiceItemFiscalReview';

type Props = {
    items: InboundInvoiceItem[];
    supplierId?: string;
    suppliers: Person[];
    onChange: (itemNumber: number, update: Partial<InboundInvoiceItem>) => void;
};

const productName = (product: Product, variation?: Variation) => variation?.name || variation?.title || product.name || product.title || product.description || '';
const finalItemCost = (item: InboundInvoiceItem) => {
    const quantity = Math.max(1, item.quantity);
    return item.unitCost + (item.ipiValue || 0) / quantity + (item.freightValue || 0) / quantity + (item.totalAdditionalCosts || 0) / quantity;
};

export function InboundInvoiceItemsReview({ items, supplierId, suppliers, onChange }: Props) {
    const [creatingItemNumber, setCreatingItemNumber] = useState<number | null>(null);
    const [creationQueue, setCreationQueue] = useState<number[]>([]);
    const [initialProductData, setInitialProductData] = useState<Partial<Product> | null>(null);
    const [isSuggestingName, setIsSuggestingName] = useState(false);
    const [searchingItemNumber, setSearchingItemNumber] = useState<number | null>(null);
    const [isBatchReviewOpen, setIsBatchReviewOpen] = useState(false);
    const [batchCountdown, setBatchCountdown] = useState(5);
    const [individualItem, setIndividualItem] = useState<InboundInvoiceItem | null>(null);
    const [individualCountdown, setIndividualCountdown] = useState(5);
    const [individualMarkup, setIndividualMarkup] = useState('');
    const [batchMarkup, setBatchMarkup] = useState('');
    const [suggestedCategory, setSuggestedCategory] = useState<{ id: string; name: string } | null>(null);
    const [isPreparingProduct, setIsPreparingProduct] = useState(false);
    const linkedCount = items.filter((item) => Boolean(item.matchedProductId)).length;
    const unlinkedItems = useMemo(() => items.filter((item) => !item.matchedProductId), [items]);
    const creatingItem = items.find((item) => item.itemNumber === creatingItemNumber);
    const supplier = suppliers.find((person) => person.id === supplierId);

    useEffect(() => {
        if (!isBatchReviewOpen) return;
        setBatchCountdown(5);
        const timer = window.setInterval(() => {
            setBatchCountdown((current) => {
                if (current <= 1) {
                    window.clearInterval(timer);
                    return 0;
                }
                return current - 1;
            });
        }, 1000);
        return () => window.clearInterval(timer);
    }, [isBatchReviewOpen]);

    useEffect(() => {
        if (!individualItem) return;
        setIndividualCountdown(5);
        const timer = window.setInterval(() => {
            setIndividualCountdown((current) => {
                if (current <= 1) {
                    window.clearInterval(timer);
                    return 0;
                }
                return current - 1;
            });
        }, 1000);
        return () => window.clearInterval(timer);
    }, [individualItem]);

    const selectProduct = (itemNumber: number, product: Product, variation?: Variation) => onChange(itemNumber, {
        matchedProductId: product.id,
        matchedVariationId: variation?.id,
        linkedProductCode: variation?.sku || product.code || '',
        productErpName: productName(product, variation),
    });

    const startCreation = async (item: InboundInvoiceItem, queue: number[] = []) => {
        if (!supplierId) return toast.info('Vincule o fornecedor para identificar ou cadastrar os produtos.');
        if (item.productCode) {
            const existing = await findProductSupplierCodes(supplierId, [item.productCode]);
            const match = existing.get(item.productCode.trim().toLocaleUpperCase('pt-BR'));
            if (match) {
                onChange(item.itemNumber, { matchedProductId: match.productId, matchedVariationId: match.productVariationId, productErpName: 'Produto já vinculado ao código do fornecedor' });
                toast.info('Este código do fornecedor já possui um produto vinculado.');
                return;
            }
        }
        setCreationQueue(queue);
        setCreatingItemNumber(item.itemNumber);
        setIsSuggestingName(true);
        setIsPreparingProduct(true);
        try {
            const suggestion = await aiService.generateMarketplaceTitle({ description: item.productDescription });
            const { categories } = await fetchGroupsAndCategories();
            const categoryNames = categories.filter((category) => category.active !== false).map((category) => category.name);
            const categorySuggestion = await aiService.suggestCategory(suggestion.title, categoryNames);
            const category = categories.find((candidate) => candidate.name.toLocaleLowerCase() === String(categorySuggestion.category || '').toLocaleLowerCase()) || categories[0];
            if (!category) throw new Error('Nenhuma categoria existente foi encontrada para o produto.');
            setSuggestedCategory({ id: category.id, name: category.name });
            setInitialProductData({
                name: suggestion.title,
                title: suggestion.title,
                description: item.productDescription,
                unit: item.unit || 'UN',
                itemType: 'product',
                active: true,
                isDraft: false,
                status: 'hidden',
                mainSupplierId: supplierId,
                supplierId,
                supplierIds: [supplierId],
                supplierRef: item.productCode || undefined,
                categoryIds: [category.id],
                fiscal: { ncm: item.ncm || undefined, cest: item.cest || undefined, cfop: item.cfop || undefined },
                unitPrice: 0,
                ecommerceSync: false,
                whatsappSync: false,
            });
        } catch (error: any) {
            setInitialProductData(null);
            setCreatingItemNumber(null);
            toast.error(error.message || 'Não foi possível preparar categoria e dados obrigatórios do produto.');
        } finally {
            setIsSuggestingName(false);
            setIsPreparingProduct(false);
        }
    };

    const createProductDirectly = async (markupInput: string) => {
        if (!creatingItem || !supplierId || !initialProductData) return;
        const markup = Number(markupInput.replace(',', '.'));
        if (!Number.isFinite(markup) || markup < 0) return toast.error('Informe um acréscimo válido sobre o custo final.');
        const finalCost = finalItemCost(creatingItem);
        const salePrice = Number((finalCost * (1 + markup / 100)).toFixed(2));
        const prepared = ensureDefaultVariation({ ...initialProductData, unitPrice: salePrice, costPrice: finalCost, finalPurchasePrice: finalCost, active: true, isDraft: false, status: 'hidden', categoryIds: suggestedCategory ? [suggestedCategory.id] : initialProductData.categoryIds, mainSupplierId: supplierId, supplierId, supplierIds: [supplierId] } as Product);
        try {
            const productId = await saveProduct(prepared, true);
            const createdProduct = { ...prepared, id: productId };
            await saveProductSupplierCode({ supplierId, productId, productVariationId: createdProduct.variations?.[0]?.id, supplierProductCode: creatingItem.productCode, supplierDescription: creatingItem.productDescription });
            onChange(creatingItem.itemNumber, { matchedProductId: productId, matchedVariationId: createdProduct.variations?.[0]?.id, linkedProductCode: createdProduct.variations?.[0]?.sku || createdProduct.code || '', productErpName: createdProduct.name || createdProduct.title || creatingItem.productDescription });
            handleCreated(createdProduct);
        } catch (error: any) {
            toast.error(error.message || 'Não foi possível cadastrar o produto.');
        }
    };

    const handleCreated = (product: Product) => {
        const nextQueue = creationQueue.filter((itemNumber) => itemNumber !== creatingItem.itemNumber);
        setCreatingItemNumber(null);
        setInitialProductData(null);
        setSuggestedCategory(null);
        setIndividualMarkup('');
        if (nextQueue.length) {
            const next = items.find((item) => item.itemNumber === nextQueue[0] && !item.matchedProductId);
            if (next) void startCreation(next, nextQueue);
            else setCreationQueue([]);
        }
    };

    const openBatchReview = () => {
        if (!supplierId) return toast.info('Vincule o fornecedor para cadastrar os produtos.');
        setIsBatchReviewOpen(true);
    };

    const confirmBatchCreation = () => {
        if (!batchMarkup.trim() || !Number.isFinite(Number(batchMarkup.replace(',', '.'))) || Number(batchMarkup.replace(',', '.')) < 0) {
            return toast.error('Informe o acréscimo padrão sobre o custo final.');
        }
        setIsBatchReviewOpen(false);
        setIndividualMarkup(batchMarkup);
        const first = unlinkedItems[0];
        if (first) void startCreation(first, unlinkedItems.map((item) => item.itemNumber));
    };

    const requestIndividualCreation = (item: InboundInvoiceItem) => {
        if (!supplierId) return toast.info('Vincule o fornecedor para identificar ou cadastrar os produtos.');
        setIndividualItem(item);
        setIndividualMarkup('');
    };

    const confirmIndividualCreation = () => {
        if (!individualItem) return;
        const item = individualItem;
        setIndividualItem(null);
        void startCreation(item);
    };

    return (
        <>
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Itens da NF ({items.length})</h3>
                        <p className="mt-1 text-xs text-slate-500">{linkedCount} vinculados · {items.length - linkedCount} não vinculados</p>
                    </div>
                </header>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((item) => {
                        const linked = Boolean(item.matchedProductId);
                        const quantity = Math.max(1, item.quantity);
                        const totalUnit = item.unitCost + (item.ipiValue || 0) / quantity + (item.freightValue || 0) / quantity;
                        return <div key={item.itemNumber} className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                            <div className="min-w-0 space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dados da NF</span>
                                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">{item.itemNumber}. {item.productDescription || 'Descrição não encontrada'}</h4>
                                <p className="text-xs font-mono text-slate-600 dark:text-slate-300">Cód. fornecedor: {item.productCode || '—'} · {item.quantity} {item.unit}</p>
                                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300"><span>Unit.: <b>{formatCurrency(item.unitCost)}</b></span><span>Total: <b>{formatCurrency(item.totalCost)}</b></span><span>NCM: {item.ncm || '—'}</span><span>CFOP: {item.cfop || '—'}</span></div>
                                <InboundInvoiceItemFiscalReview item={item} />
                            </div>
                            <div className="min-w-0 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                                <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Produto no ERP</span><span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${linked ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>{linked ? 'Vinculado' : 'Não vinculado'}</span></div>
                                {!supplierId ? <p className="mt-5 text-xs text-amber-700">Vincule o fornecedor para identificar ou cadastrar os produtos.</p> : linked ? <div className="mt-5 space-y-2"><p className="text-sm font-black text-slate-800 dark:text-slate-100">{item.productErpName || 'Produto vinculado'}</p><p className="text-[10px] text-slate-500">Código ERP: {item.linkedProductCode || item.matchedProductId}</p><button type="button" onClick={() => onChange(item.itemNumber, { matchedProductId: undefined, matchedVariationId: undefined, linkedProductCode: undefined, productErpName: undefined })} className="text-xs font-black text-indigo-700">Trocar</button></div> : <div className="mt-5 space-y-3"><p className="text-xs text-slate-500">Nenhum produto vinculado</p>{searchingItemNumber === item.itemNumber ? <ProductAutocomplete supplierId={supplierId} value="" isSelected={false} placeholder="Buscar nome ou código..." onSelect={(product, variation) => { selectProduct(item.itemNumber, product, variation); setSearchingItemNumber(null); }} /> : <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setSearchingItemNumber(item.itemNumber)} className="rounded-lg bg-indigo-600 px-3 py-2 text-[10px] font-black text-white">Vincular existente</button><button type="button" onClick={() => requestIndividualCreation(item)} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-700">+ Cadastrar produto</button></div>}</div>}
                            </div>
                        </div>;
                    })}
                </div>
                {unlinkedItems.length > 0 && <footer className="border-t border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/30">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            <p>{items.length} itens na NF</p>
                            <p className="mt-1 text-emerald-700 dark:text-emerald-300">{linkedCount} vinculados · {unlinkedItems.length} sem vínculo</p>
                        </div>
                        <button type="button" onClick={openBatchReview} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[10px] font-black uppercase text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">Cadastrar {unlinkedItems.length} produtos restantes</button>
                    </div>
                </footer>}
            </section>
            {individualItem && <div className="fixed inset-0 z-[1000005] flex items-center justify-center bg-slate-950/60 p-4">
                <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Cadastrar produto</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">Confirme que este produto ainda não existe no ERP. Antes de cadastrar, utilize “Vincular existente” para pesquisar possíveis correspondências.</p>
                    <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-700 dark:bg-slate-950 dark:text-slate-200">{individualItem.productDescription}</p>
                    <label className="mt-4 block text-xs font-black text-slate-600 dark:text-slate-300">Acréscimo sobre o custo final (%)<input type="number" min="0" step="0.01" required value={individualMarkup} onChange={(event) => setIndividualMarkup(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
                    <p className="mt-3 text-xs text-slate-500">Custo final estimado: <b>{formatCurrency(finalItemCost(individualItem))}</b> · Preço estimado: <b>{individualMarkup.trim() ? formatCurrency(finalItemCost(individualItem) * (1 + Number(individualMarkup.replace(',', '.')) / 100)) : 'Informe o acréscimo'}</b></p>
                    <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setIndividualItem(null)} className="rounded-lg px-3 py-2 text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button><button type="button" disabled={individualCountdown > 0 || !individualMarkup.trim()} onClick={confirmIndividualCreation} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{individualCountdown > 0 ? `Confirmar cadastro em ${individualCountdown}s` : 'Confirmar cadastro'}</button></div>
                </section>
            </div>}
            {isBatchReviewOpen && <div className="fixed inset-0 z-[1000004] flex items-center justify-center bg-slate-950/60 p-4">
                <section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Cadastrar {unlinkedItems.length} produtos restantes</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">Os produtos abaixo ainda não possuem vínculo no ERP. Confirme que você já verificou possíveis correspondências antes de criar novos cadastros.</p>
                    <label className="mt-4 block text-xs font-black text-slate-600 dark:text-slate-300">Acréscimo padrão sobre o custo final (%)<input type="number" min="0" step="0.01" required value={batchMarkup} onChange={(event) => setBatchMarkup(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
                    <div className="mt-4 max-h-48 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-950">
                        {unlinkedItems.map((item) => <p key={item.itemNumber} className="font-bold text-slate-700 dark:text-slate-200">{item.itemNumber}. {item.productDescription}</p>)}
                    </div>
                    <div className="mt-5 flex justify-end gap-2">
                        <button type="button" onClick={() => setIsBatchReviewOpen(false)} className="rounded-lg px-3 py-2 text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
                        <button type="button" disabled={batchCountdown > 0} onClick={confirmBatchCreation} className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{batchCountdown > 0 ? `Confirmar cadastro em ${batchCountdown}s` : `Confirmar cadastro de ${unlinkedItems.length} produtos`}</button>
                    </div>
                </section>
            </div>}
            {creatingItemNumber && initialProductData && !isPreparingProduct && <div className="fixed inset-0 z-[1000006] flex items-center justify-center bg-slate-950/60 p-4"><section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"><h3 className="text-base font-black text-slate-800 dark:text-slate-100">Confirmar cadastro inteligente</h3><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">A categoria foi selecionada automaticamente entre as categorias existentes. O nome foi sugerido pelo Gemini e pode ser revisado antes do cadastro.</p><div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-950"><p><b>Nome:</b> {initialProductData.name}</p><p><b>Categoria:</b> {suggestedCategory?.name || 'Não encontrada'}</p><p><b>NCM:</b> {initialProductData.fiscal?.ncm || 'Não informado na NF'}</p><p><b>Custo final:</b> {creatingItem ? formatCurrency(finalItemCost(creatingItem)) : '—'}</p></div><label className="mt-4 block text-xs font-black text-slate-600 dark:text-slate-300">Acréscimo sobre o custo final (%)<input type="number" min="0" step="0.01" value={creationQueue.length ? batchMarkup : individualMarkup} onChange={(event) => creationQueue.length ? setBatchMarkup(event.target.value) : setIndividualMarkup(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></label><p className="mt-2 text-xs text-slate-500">Preço de venda estimado: <b>{creatingItem && (creationQueue.length ? batchMarkup : individualMarkup).trim() ? formatCurrency(finalItemCost(creatingItem) * (1 + Number((creationQueue.length ? batchMarkup : individualMarkup).replace(',', '.')) / 100)) : 'Informe o acréscimo'}</b></p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => { setCreatingItemNumber(null); setInitialProductData(null); setCreationQueue([]); }} className="rounded-lg px-3 py-2 text-xs font-black text-slate-500">Cancelar</button><button type="button" onClick={() => void createProductDirectly(creationQueue.length ? batchMarkup : individualMarkup)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white">Cadastrar e vincular</button></div></section></div>}
        </>
    );
}
