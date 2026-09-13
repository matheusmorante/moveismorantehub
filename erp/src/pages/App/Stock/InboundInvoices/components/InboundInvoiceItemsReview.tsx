import { useEffect, useMemo, useRef, useState } from 'react';
import ProductAutocomplete from '@/components/ProductAutocomplete';
import Product, { Variation } from '@/pages/types/product.type';
import Person from '@/pages/types/person.type';
import { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { findProductSupplierCodes, saveProductSupplierCode } from '@/pages/utils/productSupplierCodesService';
import { getFullProduct, saveProduct, saveVariation } from '@/pages/utils/productService';
import { ensureAttributeValue } from '@/pages/utils/variationService';
import { fetchGroupsAndCategories } from '@/pages/utils/categoryService';
import { ensureDefaultVariation } from '@/pages/utils/productVariationDefaults';
import { aiService } from '@/pages/utils/aiService';
import { fetchSupplierProductsForContext, buildSupplierContextSummary, SupplierProductSummary } from '@/pages/utils/inboundNfe/inboundSupplierProductContext';
import { toast } from 'react-toastify';
import { formatCurrency } from '@/pages/utils/formatters';
import ProductFormModal from '@/pages/App/Products/ProductFormModal';
import { InboundInvoiceItemFiscalReview } from './InboundInvoiceItemFiscalReview';
import { itemCostRate, itemCostWithAdditionalCosts, itemFiscalOtherExpensesCost, itemFreightCost, itemIpiCost, itemNonFiscalOtherExpensesCost } from '@/pages/utils/inboundNfe/inboundItemCosts';
import { extractColorCandidateFromTitle } from '@/pages/utils/inboundNfe/inboundMatchingRules';
import { QuickRegisterVariationModal, QuickRegisterItem, QuickRegisterSelection } from './QuickRegisterVariationModal';
import { prepareNewParentWithVariation, prepareExistingParentNewVariation } from '../services/inboundProductPreparationService';

type AiClassification = {
    decision: 'EXISTING_VARIATION' | 'NEW_VARIATION_OF_EXISTING_PRODUCT' | 'NEW_PRODUCT' | 'UNSURE';
    matchedProductId: string | null;
    matchedVariationId: string | null;
    normalizedParentName: string;
    extractedAttributes: { color: string | null; measure: string | null; material: string | null };
    confidence: number;
    reasons: string[];
};

type Props = {
    items: InboundInvoiceItem[];
    supplierId?: string;
    suppliers: Person[];
    onChange: (itemNumber: number, update: Partial<InboundInvoiceItem>) => void;
};

const productName = (product: Product, variation?: Variation) => variation?.name || variation?.title || product.name || product.title || product.description || '';
const finalItemCost = itemCostWithAdditionalCosts;

export function InboundInvoiceItemsReview({ items, supplierId, suppliers, onChange }: Props) {
    const [creatingItemNumber, setCreatingItemNumber] = useState<number | null>(null);
    const [creationQueue, setCreationQueue] = useState<number[]>([]);
    const [initialProductData, setInitialProductData] = useState<Partial<Product> | null>(null);
    const [isSuggestingName, setIsSuggestingName] = useState(false);
    const [searchingItemNumber, setSearchingItemNumber] = useState<number | null>(null);
    const [individualItem, setIndividualItem] = useState<InboundInvoiceItem | null>(null);
    const [individualMarkup, setIndividualMarkup] = useState('');
    const [suggestedCategory, setSuggestedCategory] = useState<{ id: string; name: string } | null>(null);
    const [isPreparingProduct, setIsPreparingProduct] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingParentProduct, setEditingParentProduct] = useState<Product | null>(null);
    const [quickRegisterTarget, setQuickRegisterTarget] = useState<{ itemNumber: number; item: QuickRegisterItem } | null>(null);
    // IA com contexto de fornecedor
    const [isClassifying, setIsClassifying] = useState(false);
    const [aiClassification, setAiClassification] = useState<AiClassification | null>(null);
    const [classifyingItem, setClassifyingItem] = useState<InboundInvoiceItem | null>(null);
    // Cache de produtos do fornecedor para evitar multiplas consultas na mesma NF
    const supplierProductsCacheRef = useRef<{ supplierId: string; products: SupplierProductSummary[] } | null>(null);

    const linkedCount = items.filter((item) => Boolean(item.matchedProductId)).length;
    const unlinkedItems = useMemo(() => items.filter((item) => !item.matchedProductId), [items]);
    const creatingItem = items.find((item) => item.itemNumber === creatingItemNumber);
    const supplier = suppliers.find((person) => person.id === supplierId);
    const effectiveMarkup = individualMarkup;
    const setEffectiveMarkup = setIndividualMarkup;

    /** Obtém os produtos do fornecedor, usando cache quando disponível. */
    const getSupplierProducts = async (): Promise<SupplierProductSummary[]> => {
        if (!supplierId) return [];
        if (supplierProductsCacheRef.current?.supplierId === supplierId) return supplierProductsCacheRef.current.products;
        const products = await fetchSupplierProductsForContext(supplierId);
        supplierProductsCacheRef.current = { supplierId, products };
        return products;
    };

    // Invalida cache quando o fornecedor muda
    useEffect(() => {
        if (supplierId && supplierProductsCacheRef.current?.supplierId !== supplierId) {
            supplierProductsCacheRef.current = null;
        }
    }, [supplierId]);

    /**
     * Passo 1: classifica o item com IA antes de abrir o fluxo de criação.
     * Se não houver produtos do fornecedor, vai direto para o fluxo normal.
     */
    const classifyAndStart = async (item: InboundInvoiceItem, queue: number[] = [], markupInput?: string) => {
        if (!supplierId) return toast.info('Vincule o fornecedor para identificar ou cadastrar os produtos.');
        // Vínculo confirmado por código do fornecedor tem prioridade máxima
        if (item.productCode) {
            const existing = await findProductSupplierCodes(supplierId, [item.productCode]);
            const match = existing.get(item.productCode.trim().toLocaleUpperCase('pt-BR'));
            if (match) {
                onChange(item.itemNumber, { matchedProductId: match.productId, matchedVariationId: match.productVariationId, productErpName: 'Produto já vinculado ao código do fornecedor' });
                toast.info('Este código do fornecedor já possui um produto vinculado.');
                return;
            }
        }
        setIsClassifying(true);
        setClassifyingItem(item);
        setCreationQueue(queue);
        try {
            const supplierProducts = await getSupplierProducts();
            if (!supplierProducts.length) {
                setIsClassifying(false);
                void startCreation(item, queue, undefined, markupInput);
                return;
            }
            const contextSummary = buildSupplierContextSummary(supplierProducts);
            const classification = await aiService.classifyInboundItemWithSupplierContext({
                itemDescription: item.productDescription,
                itemProductCode: item.productCode || undefined,
                supplierContextSummary: contextSummary,
            });
            setIsClassifying(false);
            if (classification.decision === 'NEW_PRODUCT' || classification.decision === 'UNSURE' || !classification.matchedProductId) {
                void startCreation(item, queue, undefined, markupInput);
                return;
            }
            setAiClassification(classification);
        } catch {
            setIsClassifying(false);
            void startCreation(item, queue, undefined, markupInput);
        }
    };

    const startCreation = async (item: InboundInvoiceItem, queue: number[] = [], family?: { id: string; name: string }, markupInput?: string) => {
        if (!supplierId) return toast.info('Vincule o fornecedor para identificar ou cadastrar os produtos.');
        setCreationQueue(queue);
        setCreatingItemNumber(item.itemNumber);
        setIsSuggestingName(true);
        setIsPreparingProduct(true);
        try {
            const suggestion = await aiService.generateMarketplaceTitle({ description: item.productDescription });
            const { categories } = await fetchGroupsAndCategories();
            const categoryNames = categories.filter((category) => category.active !== false).map((category) => category.name);
            const categorySuggestion = await aiService.suggestCategory(suggestion.title, categoryNames);
            const suggestedCatName = typeof categorySuggestion === 'string' ? categorySuggestion : (categorySuggestion?.category || '');
            const category = categories.find((candidate) => candidate.name.trim().toLowerCase() === suggestedCatName.trim().toLowerCase()) || categories[0];
            if (!category) throw new Error('Nenhuma categoria existente foi encontrada para o produto.');
            
            const finalCost = finalItemCost(item);
            const markup = markupInput ? Number(markupInput.replace(',', '.')) : 0;
            const salePrice = Number.isFinite(markup) && markup > 0 ? Number((finalCost * (1 + markup / 100)).toFixed(2)) : 0;

            setSuggestedCategory({ id: category.id, name: category.name });
            setInitialProductData({
                name: suggestion.title,
                title: suggestion.title,
                description: '', // Descrição vazia para gerar/aperfeiçoar via IA no formulário se desejar
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
                parentId: family?.id,
                costPrice: finalCost,
                unitPrice: salePrice,
                stock: 0,
                fiscal: { ncm: item.ncm || undefined, cest: item.cest || undefined, cfop: item.cfop || undefined },
                ecommerceSync: false,
                whatsappSync: false,
            });
            setIsProductModalOpen(true);
        } catch (error: any) {
            setInitialProductData(null);
            setCreatingItemNumber(null);
            toast.error(error.message || 'Não foi possível preparar categoria e dados obrigatórios do produto.');
        } finally {
            setIsSuggestingName(false);
            setIsPreparingProduct(false);
        }
    };

    /** Confirmar EXISTING_VARIATION: vincula item à variação já cadastrada. */
    const confirmExistingVariationLink = () => {
        if (!classifyingItem || !aiClassification?.matchedProductId) return;
        onChange(classifyingItem.itemNumber, {
            matchedProductId: aiClassification.matchedProductId,
            matchedVariationId: aiClassification.matchedVariationId || undefined,
            productErpName: aiClassification.normalizedParentName || 'Variação vinculada pela IA',
        });
        toast.success('Item vinculado à variação existente identificada pela IA.');
        const queue = creationQueue.filter((n) => n !== classifyingItem.itemNumber);
        setAiClassification(null); setClassifyingItem(null);
        advanceQueue(queue);
    };

    /** Cria diretamente uma variação dentro do produto pai, herdando os dados aplicáveis. */
    const confirmNewVariationInFamily = async () => {
        if (!classifyingItem || !aiClassification?.matchedProductId || !supplierId) return;
        const markup = Number(effectiveMarkup.replace(',', '.'));
        if (!Number.isFinite(markup) || markup < 0) return toast.error('Informe um acréscimo válido sobre o custo final.');
        try {
            const family = await getFullProduct(aiClassification.matchedProductId);
            if (!family) throw new Error('Produto pai sugerido não encontrado no ERP.');
            const finalCost = finalItemCost(classifyingItem);
            const color = aiClassification.extractedAttributes.color;
            const attributes = color ? [await ensureAttributeValue('Cor', color)] : [];
            const variationId = crypto.randomUUID();
            await saveVariation(family.id, {
                id: variationId,
                name: classifyingItem.productDescription,
                attributes,
                unitPrice: Number((finalCost * (1 + markup / 100)).toFixed(2)),
                costPrice: finalCost,
                stock: 0,
                // Os campos do pai continuam sendo a fonte de herança da variação.
                syncUnitPrice: false, syncPromoPrice: false, syncDescription: true,
                syncWidth: true, images: [],
            });
            await saveProductSupplierCode({ supplierId, productId: family.id, productVariationId: variationId, supplierProductCode: classifyingItem.productCode, supplierDescription: classifyingItem.productDescription, normalizedDescription: aiClassification.normalizedParentName });
            onChange(classifyingItem.itemNumber, { matchedProductId: family.id, matchedVariationId: variationId, productErpName: `${family.name || family.title} — ${classifyingItem.productDescription}` });
            toast.success(`Variação cadastrada no produto pai "${family.name || family.title}".`);
            const queue = creationQueue.filter((n) => n !== classifyingItem.itemNumber);
            setAiClassification(null); setClassifyingItem(null);
            advanceQueue(queue);
        } catch (error: any) {
            toast.error(error.message || 'Não foi possível cadastrar a variação no produto pai.');
        }
    };

    /** Descartar sugestão IA e criar como produto independente. */
    const discardClassificationAndCreateNew = () => {
        const item = classifyingItem;
        const queue = [...creationQueue];
        setAiClassification(null); setClassifyingItem(null);
        if (item) void startCreation(item, queue);
    };

    const handleQuickRegisterConfirm = async (selection: QuickRegisterSelection) => {
        if (!quickRegisterTarget) return;
        const { itemNumber, item } = quickRegisterTarget;
        setQuickRegisterTarget(null);

        if (selection.mode === 'EXISTING_PARENT') {
            try {
                setIsPreparingProduct(true);
                const parentProduct = await getFullProduct(selection.parentProductId);
                if (!parentProduct) {
                    setIsPreparingProduct(false);
                    toast.error('Produto pai não encontrado.');
                    return;
                }

                const updatedParentProduct = await prepareExistingParentNewVariation(parentProduct, item);

                setIsPreparingProduct(false);
                setCreatingItemNumber(itemNumber);
                setEditingParentProduct(updatedParentProduct);
                setIsProductModalOpen(true);
            } catch (err: any) {
                setIsPreparingProduct(false);
                toast.error(err.message || 'Erro ao carregar produto pai.');
            }
        } else {
            try {
                setIsPreparingProduct(true);
                const preparedData = await prepareNewParentWithVariation(item, supplierId);
                setIsPreparingProduct(false);

                setCreatingItemNumber(itemNumber);
                setEditingParentProduct(null);
                setInitialProductData(preparedData);
                setIsProductModalOpen(true);
            } catch (err: any) {
                setIsPreparingProduct(false);
                toast.error(err.message || 'Erro ao preparar formulário de cadastro.');
            }
        }
    };

    const handleCreatedProductFromModal = async (createdProduct: Product) => {
        setIsProductModalOpen(false);
        if (!creatingItemNumber || !supplierId) return;

        const currentItem = items.find((item) => item.itemNumber === creatingItemNumber);
        if (currentItem) {
            try {
                await saveProductSupplierCode({
                    supplierId,
                    productId: createdProduct.id,
                    productVariationId: createdProduct.variations?.[0]?.id,
                    supplierProductCode: currentItem.productCode,
                    supplierDescription: currentItem.productDescription,
                });
                onChange(currentItem.itemNumber, {
                    matchedProductId: createdProduct.id,
                    matchedVariationId: createdProduct.variations?.[0]?.id,
                    linkedProductCode: createdProduct.variations?.[0]?.sku || createdProduct.code || '',
                    productErpName: createdProduct.name || createdProduct.title || currentItem.productDescription,
                });
                toast.success(`Produto "${createdProduct.name || createdProduct.title}" cadastrado e vinculado.`);
            } catch (error: any) {
                toast.error('Produto cadastrado, mas não foi possível vincular o código do fornecedor.');
            }
        }
        const nextQueue = creationQueue.filter((itemNumber) => itemNumber !== creatingItemNumber);
        setCreatingItemNumber(null);
        setInitialProductData(null);
        setSuggestedCategory(null);
        setIndividualMarkup('');
        advanceQueue(nextQueue);
    };

    const advanceQueue = (queue: number[]) => {
        setCreationQueue(queue);
        if (queue.length) {
            const next = items.find((item) => item.itemNumber === queue[0] && !item.matchedProductId);
            if (next) void classifyAndStart(next, queue);
        }
    };

    const requestIndividualCreation = (item: InboundInvoiceItem) => {
        if (!supplierId) return toast.info('Vincule o fornecedor para identificar ou cadastrar os produtos.');
        setIndividualItem(item); setIndividualMarkup('');
    };

    const confirmIndividualCreation = () => {
        if (!individualItem) return;
        const item = individualItem;
        const markup = individualMarkup;
        setIndividualItem(null);
        void classifyAndStart(item, [], markup);
    };

    const selectProduct = async (itemNumber: number, product: Product, variation?: Variation) => {
        const matchedProductId = product.id;
        const matchedVariationId = variation?.id;
        const linkedProductCode = variation?.sku || product.code || '';
        const productErpName = variation?.name || variation?.title || product.name || product.title || '';

        if (supplierId) {
            const item = items.find((i) => i.itemNumber === itemNumber);
            if (item) {
                try {
                    await saveProductSupplierCode({
                        supplierId,
                        productId: matchedProductId,
                        productVariationId: matchedVariationId,
                        supplierProductCode: item.productCode,
                        supplierDescription: item.productDescription,
                    });
                } catch (err) {
                    console.warn('Erro ao salvar código de fornecedor do produto:', err);
                }
            }
        }

        onChange(itemNumber, {
            matchedProductId,
            matchedVariationId,
            linkedProductCode,
            productErpName,
        });
        toast.success(`Item vinculado a "${productErpName}"`);
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
                        const freightCost = itemFreightCost(item);
                        const ipiCost = itemIpiCost(item);
                        const fiscalOtherExpensesCost = itemFiscalOtherExpensesCost(item);
                        const nonFiscalOtherExpensesCost = itemNonFiscalOtherExpensesCost(item);
                        const totalUnit = finalItemCost(item);
                        const itemDescription = item.productDescription || (item as any).descricao || (item as any).xProd || (item as any).xprod || 'Descrição não encontrada';

                        return <div key={item.itemNumber} className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                            <div className="min-w-0 space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dados da NF</span>
                                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">{item.itemNumber}. {itemDescription}</h4>
                                <p className="text-xs font-mono text-slate-600 dark:text-slate-300">Cód. fornecedor: {item.productCode || '—'} · {item.quantity} {item.unit}</p>
                                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300"><span>Unit.: <b>{formatCurrency(item.unitCost)}</b></span><span>Total: <b>{formatCurrency(item.totalCost)}</b></span><span>NCM: {item.ncm || '—'}</span><span>CFOP: {item.cfop || '—'}</span></div>
                                <InboundInvoiceItemFiscalReview item={item} />
                            </div>
                            <div className="flex min-w-0 flex-col rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">VINCULAR PRODUTO CADASTRADO</span>
                                    <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${linked ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'}`}>{linked ? 'Vinculado' : 'Não vinculado'}</span>
                                </div>
                                {!supplierId ? (
                                    <p className="mt-5 text-xs text-amber-700 dark:text-amber-400 font-semibold">Vincule o fornecedor para identificar ou cadastrar os produtos.</p>
                                ) : linked ? (
                                    <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/80 bg-emerald-50/60 p-3.5 dark:border-emerald-500/60 dark:bg-emerald-950/30">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <i className="bi bi-check-circle-fill text-emerald-600 dark:text-emerald-400 text-lg shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-xs font-black text-emerald-800 dark:text-emerald-200 truncate">{item.productErpName || 'Produto vinculado'}</p>
                                                <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">Código ERP: {item.linkedProductCode || item.matchedProductId}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => onChange(item.itemNumber, { matchedProductId: undefined, matchedVariationId: undefined, linkedProductCode: undefined, productErpName: undefined })}
                                            className="shrink-0 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 px-3 py-1.5 text-xs font-black text-emerald-700 hover:bg-emerald-100 dark:hover:bg-slate-800 cursor-pointer shadow-xs transition-colors"
                                        >
                                            Trocar
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mt-auto space-y-3 pt-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs text-slate-600 dark:text-slate-300 font-bold">Buscar produto:</span>
                                            <button
                                                type="button"
                                                onClick={() => setQuickRegisterTarget({ itemNumber: item.itemNumber, item: { productDescription: itemDescription, productCode: item.productCode, unit: item.unit, ncm: item.ncm, quantity: item.quantity, unitCost: item.unitCost, finalCost: totalUnit } })}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 transition-colors shadow-xs cursor-pointer"
                                            >
                                                <i className="bi bi-plus-circle-fill text-xs" />
                                                Cadastrar rapidamente
                                            </button>
                                        </div>
                                        <ProductAutocomplete
                                            supplierId={supplierId}
                                            value=""
                                            isSelected={false}
                                            placeholder="Digite 2 ou mais letras para buscar..."
                                            onSelect={(product, variation) => selectProduct(item.itemNumber, product, variation)}
                                        />
                                    </div>
                                )}
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
                    </div>
                </footer>}
            </section>
            {individualItem && <div className="fixed inset-0 z-[1000005] flex items-center justify-center bg-slate-950/60 p-4">
                <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Cadastrar produto</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">Confirme que este produto ainda não existe no ERP. Antes de cadastrar, utilize “Vincular existente” para pesquisar possíveis correspondências.</p>
                    <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-700 dark:bg-slate-950 dark:text-slate-200">{individualItem.productDescription}</p>
                    <label className="mt-4 block text-xs font-black text-slate-600 dark:text-slate-300">Acréscimo sobre o custo final (%)<input type="number" min="0" step="0.01" value={individualMarkup} onChange={(event) => setIndividualMarkup(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
                    <p className="mt-3 text-xs text-slate-500">Custo final unitário: <b>{formatCurrency(finalItemCost(individualItem))}</b> · Preço estimado: <b>{individualMarkup.trim() ? formatCurrency(finalItemCost(individualItem) * (1 + Number(individualMarkup.replace(',', '.')) / 100)) : 'Informe o acréscimo (opcional)'}</b></p>
                    <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setIndividualItem(null)} className="rounded-lg px-3 py-2 text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button><button type="button" onClick={confirmIndividualCreation} className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-black text-white hover:bg-emerald-700">Abrir cadastro</button></div>
                </section>
            </div>}
            {isPreparingProduct && <div className="fixed inset-0 z-[1000006] flex items-center justify-center bg-slate-950/60 p-4"><section className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-slate-900"><i className="bi bi-arrow-repeat text-3xl text-emerald-600 animate-spin inline-block" /><h3 className="mt-3 text-base font-black text-slate-800 dark:text-slate-100">Preparando formulário...</h3><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Classificando categoria e estruturando dados do produto com IA.</p></section></div>}
            {/* Modal de Formulário Completo de Produtos */}
            <ProductFormModal
                isOpen={isProductModalOpen}
                onClose={() => {
                    setIsProductModalOpen(false);
                    setCreatingItemNumber(null);
                    setEditingParentProduct(null);
                    setInitialProductData(null);
                    setSuggestedCategory(null);
                }}
                product={editingParentProduct}
                initialData={initialProductData}
                initialTab={editingParentProduct ? 'variacoes' : 'geral'}
                openAddVariationOnOpen={Boolean(editingParentProduct)}
                onSuccess={handleCreatedProductFromModal}
            />
            {/* Loading: classificando item com IA */}
            {isClassifying && classifyingItem && <div className="fixed inset-0 z-[1000005] flex items-center justify-center bg-slate-950/60 p-4">
                <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 text-center">
                    <i className="bi bi-stars text-3xl text-indigo-500 animate-pulse" />
                    <h3 className="mt-3 text-base font-black text-slate-800 dark:text-slate-100">Analisando com IA...</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Comparando com os produtos do fornecedor para sugerir o melhor vínculo.</p>
                    <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-700 dark:bg-slate-950 dark:text-slate-200">{classifyingItem.productDescription}</p>
                </section>
            </div>}
            {/* Modal: EXISTING_VARIATION — confirmar vínculo com variação já existente */}
            {!isClassifying && aiClassification?.decision === 'EXISTING_VARIATION' && classifyingItem && <div className="fixed inset-0 z-[1000005] flex items-center justify-center bg-slate-950/60 p-4">
                <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                    <div className="flex items-center gap-2"><i className="bi bi-stars text-indigo-500" /><h3 className="text-base font-black text-slate-800 dark:text-slate-100">Variação já existe no ERP</h3></div>
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">A IA identificou que este item já está cadastrado como uma variação existente.</p>
                    <div className="mt-4 space-y-1 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-950">
                        <p className="font-bold text-slate-700 dark:text-slate-200">Item da NF: {classifyingItem.productDescription}</p>
                        <p className="text-slate-500">Produto sugerido: <b className="text-emerald-700 dark:text-emerald-300">{aiClassification.normalizedParentName || '—'}</b></p>
                        {aiClassification.extractedAttributes.color && <p className="text-slate-500">Cor detectada: <b>{aiClassification.extractedAttributes.color}</b></p>}
                        {aiClassification.extractedAttributes.measure && <p className="text-slate-500">Medida detectada: <b>{aiClassification.extractedAttributes.measure}</b></p>}
                        <p className="text-slate-400">Confiança: {Math.round(aiClassification.confidence * 100)}%</p>
                        {aiClassification.reasons.length > 0 && <ul className="mt-1 list-disc pl-4 text-slate-400">{aiClassification.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>}
                    </div>
                    <div className="mt-5 flex justify-end gap-2">
                        <button type="button" onClick={discardClassificationAndCreateNew} className="rounded-lg px-3 py-2 text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Criar como produto novo</button>
                        <button type="button" onClick={confirmExistingVariationLink} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white">Vincular à variação existente</button>
                    </div>
                </section>
            </div>}
            {/* Modal: NEW_VARIATION_OF_EXISTING_PRODUCT — criar variação dentro do produto pai */}
            {!isClassifying && aiClassification?.decision === 'NEW_VARIATION_OF_EXISTING_PRODUCT' && classifyingItem && <div className="fixed inset-0 z-[1000005] flex items-center justify-center bg-slate-950/60 p-4">
                <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                    <div className="flex items-center gap-2"><i className="bi bi-diagram-2 text-indigo-500" /><h3 className="text-base font-black text-slate-800 dark:text-slate-100">Nova variação em produto pai existente</h3></div>
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">A IA identificou que este item deve ser cadastrado como variação de um produto pai existente.</p>
                    <div className="mt-4 space-y-1 rounded-xl bg-indigo-50 p-3 text-xs dark:bg-indigo-950/30">
                        <p className="font-bold text-slate-700 dark:text-slate-200">Item da NF: {classifyingItem.productDescription}</p>
                        <p className="text-slate-600 dark:text-slate-300">Produto pai sugerido: <b className="text-indigo-700 dark:text-indigo-300">{aiClassification.normalizedParentName || '—'}</b></p>
                        {aiClassification.extractedAttributes.color && <p className="text-slate-500">Cor da nova variação: <b>{aiClassification.extractedAttributes.color}</b></p>}
                        {aiClassification.extractedAttributes.measure && <p className="text-slate-500">Medida: <b>{aiClassification.extractedAttributes.measure}</b></p>}
                        {aiClassification.extractedAttributes.material && <p className="text-slate-500">Material: <b>{aiClassification.extractedAttributes.material}</b></p>}
                        <p className="text-slate-400">Confiança: {Math.round(aiClassification.confidence * 100)}%</p>
                    </div>
                    <label className="mt-4 block text-xs font-black text-slate-600 dark:text-slate-300">Acréscimo sobre o custo final (%)
                        <input type="number" min="0" step="0.01" required value={effectiveMarkup} onChange={(event) => setEffectiveMarkup(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                    </label>
                    <p className="mt-2 text-xs text-slate-500">Custo final unitário: <b>{formatCurrency(finalItemCost(classifyingItem))}</b> · Preço estimado: <b>{effectiveMarkup.trim() ? formatCurrency(finalItemCost(classifyingItem) * (1 + Number(effectiveMarkup.replace(',', '.')) / 100)) : 'Informe o acréscimo'}</b></p>
                    <div className="mt-5 flex justify-end gap-2">
                        <button type="button" onClick={discardClassificationAndCreateNew} className="rounded-lg px-3 py-2 text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Criar como produto independente</button>
                        <button type="button" onClick={confirmNewVariationInFamily} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-black text-white">Cadastrar variação no produto pai</button>
                    </div>
                </section>
            </div>}

            <QuickRegisterVariationModal
                isOpen={Boolean(quickRegisterTarget)}
                item={quickRegisterTarget?.item || null}
                supplierId={supplierId}
                onClose={() => setQuickRegisterTarget(null)}
                onConfirmSelection={handleQuickRegisterConfirm}
            />
        </>
    );
}
