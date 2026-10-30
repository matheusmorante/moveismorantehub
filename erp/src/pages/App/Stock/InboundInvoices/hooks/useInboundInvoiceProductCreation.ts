import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { createInboundCreatedProductLinkSchema, createInboundClassificationCommandSchema, createInboundProductLinkSchema, createInboundProductPreparationCommandSchema, inboundProductTitleSchema, type InboundProductPreparationCommand } from '../../../../../../../shared-utils/inboundProductLinkFormSchemas';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import type Product from '@/pages/types/product.type';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import {
  findProductSupplierCodes,
  saveProductSupplierCode,
} from '@/pages/utils/productSupplierCodesService';
import { getFullProduct, saveVariation } from '@/pages/utils/productService';
import { fetchGroupsAndCategories } from '@/pages/utils/categoryService';
import { resolveAutoCategory } from '@/pages/utils/categoryResolutionService';
import { aiService } from '@/pages/utils/aiService';
import { itemCostWithAdditionalCosts } from '@/pages/utils/inboundNfe/inboundItemCosts';
import { resolveLinkedProductDetails } from '@/pages/utils/inboundNfe/inboundItemProductResolver';
import type { AiClassification } from './useInboundInvoiceClassification';

export interface UseInboundInvoiceProductCreationParams {
  items: InboundInvoiceItem[];
  contextKey?: string;
  supplierId?: string;
  onChange: (itemNumber: number, update: Partial<InboundInvoiceItem>) => void | boolean | Promise<void | boolean>;
  setCreatingItemNumber: (val: number | null) => void;
  setCreatingVariationId: (val: string | null) => void;
  setIsPreparingProduct: (val: boolean) => void;
  setSuggestedCategory: (val: { id: string; name: string } | null) => void;
  setInitialProductData: (val: any) => void;
  setIsProductModalOpen: (val: boolean) => void;
  creatingItemNumber: number | null;
  creatingVariationId: string | null;
  aiClassification: AiClassification | null;
  setAiClassification: (val: AiClassification | null) => void;
  classifyingItem: InboundInvoiceItem | null;
  classifyWithAI: (item: InboundInvoiceItem, stillCurrent?: () => boolean, supplierId?: string) => Promise<AiClassification | null>;
  resetClassification: () => void;
  effectiveMarkup: string;
  setIndividualMarkup: (val: string) => void;
}

export function useInboundInvoiceProductCreation({
  items,
  contextKey = '',
  supplierId,
  onChange,
  setCreatingItemNumber,
  setCreatingVariationId,
  setIsPreparingProduct,
  setSuggestedCategory,
  setInitialProductData,
  setIsProductModalOpen,
  creatingItemNumber,
  creatingVariationId,
  aiClassification,
  setAiClassification,
  classifyingItem,
  classifyWithAI,
  resetClassification,
  effectiveMarkup,
  setIndividualMarkup,
}: UseInboundInvoiceProductCreationParams) {
  const [creationQueue, setCreationQueue] = useState<number[]>([]);
  const [isSuggestingName, setIsSuggestingName] = useState(false);
  const [preparationError, setPreparationError] = useState('');
  const inFlight = useRef(false), active = useRef(true);
  const context = useRef({ items, supplierId, contextKey }); context.current = { items, supplierId, contextKey };
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const itemNumbers = items.map((item) => item.itemNumber);
  const preparationForm = useZodForm(createInboundProductPreparationCommandSchema(itemNumbers), {
    itemNumber: creatingItemNumber || 0, supplierId: supplierId || '', markup: effectiveMarkup,
    finalCost: 0, quantity: 1, item: null,
  });
  const classificationForm = useZodForm(createInboundClassificationCommandSchema(itemNumbers), {
    intent: 'existing', itemNumber: classifyingItem?.itemNumber || 0, supplierId: supplierId || '', markup: effectiveMarkup,
    finalCost: classifyingItem ? itemCostWithAdditionalCosts(classifyingItem) : 0, quantity: classifyingItem?.quantity || 0,
    item: classifyingItem ? { ...classifyingItem } : null, classification: aiClassification || undefined,
  });
  const [classificationBusy, setClassificationBusy] = useState(false);
  const [classificationError, setClassificationError] = useState('');
  const proposalRef = useRef({ item: classifyingItem, classification: aiClassification }); proposalRef.current = { item: classifyingItem, classification: aiClassification };
  // ponytail: receipts/retry progress live in this mounted owner; cross-session recovery requires backend idempotency.
  const familyProgressRef = useRef(new Map<string, { signature: string; base: string; id: string; family: Product | null; variationSaved: boolean; codeSaved: boolean; codeConfirmed: boolean }>());
  const uncertainClassificationRef = useRef(new Set<string>());
  const linkForm = useZodForm(createInboundProductLinkSchema(itemNumbers), {
    itemNumber: classifyingItem?.itemNumber || 0, productId: aiClassification?.matchedProductId || '',
    variationId: aiClassification?.matchedVariationId || undefined, supplierId,
  });
  const createdLinkForm = useZodForm(createInboundCreatedProductLinkSchema(itemNumbers), {
    itemNumber: creatingItemNumber || 0, supplierId: supplierId || '', productId: '',
    supplierProductCode: '', supplierDescription: '',
  });
  const linkInFlight = useRef(false), uncertainLink = useRef('');
  const currentLinkItem = items.find((item) => item.itemNumber === creatingItemNumber);
  const linkKey = JSON.stringify([contextKey, supplierId, creatingItemNumber, creatingVariationId, currentLinkItem]);
  const linkContext = useRef({ key: linkKey, generation: 0 });
  if (linkContext.current.key !== linkKey) linkContext.current = { key: linkKey, generation: linkContext.current.generation + 1 };

  const advanceQueue = (queue: number[]) => {
    setCreationQueue(queue);
    if (queue.length) {
      const next = items.find(
        (item) =>
          item.itemNumber === queue[0] &&
          item.linkMode !== 'not_applicable' &&
          !item.matchedProductId
      );
      if (next) void classifyAndStart(next, queue);
    }
  };

  const prepareCreation = async (
    validated: InboundProductPreparationCommand,
    queue: number[],
    assertCurrent: () => void,
    family?: { id: string; name: string },
  ) => {
    const item = validated.item;
    assertCurrent();
    setCreationQueue(queue);
    setCreatingItemNumber(item.itemNumber);
    setCreatingVariationId(null);
    setIsSuggestingName(true);
    setIsPreparingProduct(true);
    const parsedTitle = inboundProductTitleSchema.safeParse(await aiService.generateMarketplaceTitle({
      description: item.productDescription,
    }));
    if (!parsedTitle.success) throw new Error(parsedTitle.error.issues[0].message);
    const suggestion = parsedTitle.data;
    assertCurrent();
    const { categories } = await fetchGroupsAndCategories();
    assertCurrent();
    const activeCategories = (categories || []).filter(
      (category) => (category as { active?: boolean }).active !== false
    );
    const resolvedCategory = await resolveAutoCategory(suggestion.title, activeCategories);
    assertCurrent();

    const finalCost = validated.finalCost;
    const markup = validated.markup || 0;
    const salePrice =
      Number.isFinite(markup) && markup > 0
        ? Number((finalCost * (1 + markup / 100)).toFixed(2))
        : 0;

    setSuggestedCategory(
      resolvedCategory
        ? {
            id: resolvedCategory.id,
            name: resolvedCategory.name || resolvedCategory.category || '',
          }
        : null
    );
    setInitialProductData({
      name: suggestion.title,
      title: suggestion.title,
      description: '',
      unit: item.unit || 'UN',
      itemType: 'product',
      active: true,
      isDraft: false,
      status: 'hidden',
      mainSupplierId: validated.supplierId,
      supplierId: validated.supplierId,
      supplierIds: [validated.supplierId],
      supplierRef: item.productCode || undefined,
      categoryIds: resolvedCategory ? [resolvedCategory.id] : [],
      parentId: family?.id,
      costPrice: finalCost,
      unitPrice: salePrice,
      stock: 0,
      fiscal: {
        ncm: item.ncm || undefined,
        cest: item.cest || undefined,
        cfop: item.cfop || undefined,
      },
      ecommerceSync: false,
      whatsappSync: false,
    });
    setIsProductModalOpen(true);
    return true;
  };

  const runPreparation = async (
    item: InboundInvoiceItem,
    queue: number[], markupInput: string | undefined, classify: boolean,
    family?: { id: string; name: string }, extraGuard: () => boolean = () => true,
  ): Promise<boolean> => {
    if (inFlight.current || !active.current) return false;
    inFlight.current = true; setPreparationError('');
    const original = JSON.stringify([contextKey, supplierId, item]);
    let accepting = true;
    const isCurrent = () => accepting && active.current && extraGuard()
      && original === JSON.stringify([context.current.contextKey, context.current.supplierId, context.current.items.find((candidate) => candidate.itemNumber === item.itemNumber)]);
    const assertCurrent = () => { if (!isCurrent()) throw new Error('O contexto da nota mudou. Reabra a preparação do produto.'); };
    try {
      return await preparationForm.validateAndRun({ itemNumber: item.itemNumber, supplierId: supplierId || '', markup: markupInput || '',
        finalCost: itemCostWithAdditionalCosts(item), quantity: item.quantity, item: { ...item } }, async (values) => {
        const task = async () => {
          assertCurrent(); resetClassification();
          if (classify) {
            if (values.item.productCode) {
              const existing = await findProductSupplierCodes(values.supplierId, [values.item.productCode]); assertCurrent();
              const match = existing.get(values.item.productCode.toLocaleUpperCase('pt-BR'));
              if (match) return await linkForm.validateAndRun({ itemNumber: values.itemNumber, productId: match.productId,
                variationId: match.productVariationId || undefined, supplierId: values.supplierId }, async (link) => {
                assertCurrent(); const details = await resolveLinkedProductDetails(link.productId, link.variationId); assertCurrent();
                if (!details) throw new Error('O produto associado ao código do fornecedor não foi encontrado. Atualize a nota e confira o vínculo.');
                const applied = await withTimeout(Promise.resolve(onChange(link.itemNumber, { matchedProductId: link.productId, matchedVariationId: link.variationId,
                  linkedProductCode: details.linkedProductCode, productErpName: details.productErpName || 'Produto vinculado' })).then(result => result !== false), 20_000, false, 'entrada:aplicar-codigo-existente');
                if (!applied) throw new Error('Não foi possível confirmar o vínculo no item. Confira antes de repetir.');
                toast.info('Este código do fornecedor já possui um produto vinculado.'); return true;
              }, (errors) => { throw new Error(Object.values(flattenFormErrors(errors))[0]); });
            }
            setCreationQueue(queue);
            const classification = await classifyWithAI(values.item, isCurrent, values.supplierId); assertCurrent();
            if (classification && ['EXISTING_VARIATION', 'NEW_VARIATION_OF_EXISTING_PRODUCT'].includes(classification.decision) && classification.matchedProductId) {
              setAiClassification(classification); return true;
            }
          }
          return await prepareCreation(values, queue, assertCurrent, family);
        };
        const result = await withTimeout(task(), 60000, null, 'entrada:preparar-produto');
        if (result === null) throw new Error('A preparação do produto demorou além do esperado. Tente novamente.');
        return result;
      }, (errors) => { throw new Error(Object.values(flattenFormErrors(errors))[0]); });
    } catch (error) {
      if (active.current) {
        const message = error instanceof Error ? error.message : 'Não foi possível preparar o cadastro do produto.';
        setPreparationError(message); toast.error(message); resetClassification();
      }
      return false;
    } finally { accepting = false; inFlight.current = false; if (active.current) { setIsSuggestingName(false); setIsPreparingProduct(false); } }
  };
  const startCreation = (item: InboundInvoiceItem, queue: number[] = [], family?: { id: string; name: string }, markupInput?: string) => runPreparation(item, queue, markupInput, false, family);
  const classifyAndStart = (item: InboundInvoiceItem, queue: number[] = [], markupInput?: string, stillCurrent?: () => boolean) => runPreparation(item, queue, markupInput, true, undefined, stillCurrent);

  const runClassificationCommand = async (intent: 'existing' | 'family' | 'independent'): Promise<boolean> => {
    if (inFlight.current || !active.current || !classifyingItem || !aiClassification) return false;
    const base = JSON.stringify([contextKey, supplierId, classifyingItem.itemNumber]);
    if (uncertainClassificationRef.current.has(base)) { setClassificationError('Existe uma operação sem confirmação para este item. Confira a variação e os vínculos antes de repetir.'); return false; }
    inFlight.current = true; setClassificationBusy(true); setClassificationError('');
    const originalItem = JSON.stringify(classifyingItem); const originalProposal = JSON.stringify(aiClassification);
    let accepting = true; let writing = false; let completed = false; let nextQueue: number[] = [];
    const sameProposal = () => accepting && active.current && context.current.supplierId === supplierId && context.current.contextKey === contextKey
      && proposalRef.current.item?.itemNumber === classifyingItem.itemNumber && JSON.stringify(proposalRef.current.classification) === originalProposal;
    const assertCurrent = () => {
      if (!sameProposal() || JSON.stringify(context.current.items.find(item => item.itemNumber === classifyingItem.itemNumber)) !== originalItem) throw new Error('O item, fornecedor ou sugestão mudou. Confira o resultado antes de continuar.');
    };
    const knownFailure = (message: string) => Object.assign(new Error(message), { knownFailure: true });
    try {
      return Boolean(await classificationForm.validateAndRun({ intent, itemNumber: classifyingItem.itemNumber, supplierId: supplierId || '', markup: intent === 'existing' ? '' : effectiveMarkup,
        finalCost: itemCostWithAdditionalCosts(classifyingItem), quantity: classifyingItem.quantity, item: { ...classifyingItem }, classification: intent === 'independent' ? undefined : { ...aiClassification } }, async parsed => {
        assertCurrent();
        if (parsed.intent === 'independent') {
          if (familyProgressRef.current.get(base)?.variationSaved) throw knownFailure('A variação já foi cadastrada. Confira o vínculo antes de criar outro produto.');
          const prepared = await withTimeout(prepareCreation(parsed, [...creationQueue], assertCurrent), 60_000, false, 'entrada:preparar-independente');
          assertCurrent(); if (!prepared) throw knownFailure('A preparação do produto excedeu o prazo. Tente novamente.');
          resetClassification(); return true;
        }
        const proposal = parsed.classification!;
        const productId = proposal.matchedProductId!.trim();
        let variationId = proposal.matchedVariationId?.trim() || undefined;
        let name = proposal.normalizedParentName;
        let code: string | undefined;
        if (parsed.intent === 'existing') {
          const details = await withTimeout(resolveLinkedProductDetails(productId, variationId), 15_000, null, 'entrada:consultar-variacao-sugerida');
          assertCurrent(); if (!details) throw knownFailure('O produto sugerido não foi encontrado. Analise o item novamente.');
          name = details.productErpName || name; code = details.linkedProductCode;
        } else {
          const signature = JSON.stringify(parsed);
          const previous = familyProgressRef.current.get(base);
          if (previous?.base === base && previous.signature !== signature && previous.variationSaved) throw knownFailure('A variação já foi cadastrada com os dados anteriores. Confira o produto e seu vínculo antes de alterar esta confirmação.');
          const progress = previous?.signature === signature ? previous : { signature, base, id: crypto.randomUUID(), family: null, variationSaved: false, codeSaved: false, codeConfirmed: false };
          familyProgressRef.current.set(base, progress); variationId = progress.id;
          if (!progress.family) {
            const family = await withTimeout(getFullProduct(productId), 15_000, null, 'entrada:consultar-produto-pai');
            assertCurrent(); if (!family || family.id !== productId || family.deleted) throw knownFailure('Produto pai sugerido não encontrado no ERP.');
            progress.family = family;
          }
          const family = progress.family;
          if (!progress.variationSaved) {
            writing = true;
            const saved = await withTimeout(saveVariation(productId, { id: progress.id, name: parsed.item.productDescription, attributes: [],
              unitPrice: Number((parsed.finalCost * (1 + parsed.markup! / 100)).toFixed(2)), costPrice: parsed.finalCost, stock: 0,
              syncUnitPrice: false, syncPromoPrice: false, syncDescription: true, syncWidth: true, images: [],
            }).then(() => true), 20_000, false, 'entrada:salvar-variacao-sugerida');
            if (!saved) throw new Error('A gravação da variação não foi confirmada no prazo.');
            progress.variationSaved = true; writing = false; assertCurrent();
          }
          if (!progress.codeSaved) {
            writing = true;
            const saved = await withTimeout(saveProductSupplierCode({ supplierId: parsed.supplierId, productId, productVariationId: progress.id,
              supplierProductCode: parsed.item.productCode, supplierDescription: parsed.item.productDescription, normalizedDescription: proposal.normalizedParentName,
            }).then(() => true), 20_000, false, 'entrada:salvar-codigo-variacao');
            if (!saved) throw new Error('A gravação do código do fornecedor não foi confirmada no prazo.');
            progress.codeSaved = true; writing = false; assertCurrent();
          }
          if (!progress.codeConfirmed) {
            const mappings = await withTimeout(findProductSupplierCodes(parsed.supplierId, [parsed.item.productCode]), 15_000, null, 'entrada:confirmar-variacao-fornecedor');
            assertCurrent();
            const mapping = mappings?.get(parsed.item.productCode.toLocaleUpperCase('pt-BR'));
            if (!mapping || mapping.productId !== productId || mapping.productVariationId !== progress.id) throw knownFailure('Variação cadastrada. Não foi possível confirmar seu vínculo ao fornecedor. Tente consultar novamente.');
            progress.codeConfirmed = true;
          }
          name = `${family.name || family.title || proposal.normalizedParentName} — ${parsed.item.productDescription}`;
        }
        assertCurrent(); writing = true;
        const applied = await withTimeout(Promise.resolve(onChange(parsed.itemNumber, { matchedProductId: productId, matchedVariationId: variationId, linkedProductCode: code, productErpName: name })).then(result => result !== false), 20_000, null, 'entrada:aplicar-classificacao');
        if (applied === null) throw new Error('A aplicação do vínculo no item não foi confirmada no prazo.');
        writing = false;
        if (!applied) throw knownFailure(parsed.intent === 'family' ? 'Variação cadastrada e vínculo confirmado. Não foi possível aplicar ao item; tente novamente para aplicar o mesmo vínculo.' : 'Não foi possível aplicar o vínculo no item. Tente novamente.');
        if (!sameProposal()) return false;
        nextQueue = creationQueue.filter(number => number !== parsed.itemNumber); completed = true;
        resetClassification(); toast.success(parsed.intent === 'family' ? 'Variação cadastrada, vínculo confirmado e item atualizado.' : 'Item vinculado à variação existente identificada pela IA.');
        return true;
      }, errors => setClassificationError(Object.values(flattenFormErrors(errors))[0] || 'Confira os dados da classificação.')));
    } catch (failure) {
      const knownRejected = failure && typeof failure === 'object' && (('knownFailure' in failure && failure.knownFailure === true) || ('code' in failure && /^(22|23|42)/.test(String(failure.code))));
      if (writing && !knownRejected) uncertainClassificationRef.current.add(base);
      if (active.current) { const message = failure && typeof failure === 'object' && 'message' in failure ? String(failure.message) : 'Não foi possível confirmar a classificação.'; setClassificationError(familyProgressRef.current.get(base)?.variationSaved ? `Variação já cadastrada. ${message}` : message); } return false;
    } finally {
      accepting = false; inFlight.current = false;
      if (active.current) { setClassificationBusy(false); setIsSuggestingName(false); setIsPreparingProduct(false); if (completed) advanceQueue(nextQueue); }
    }
  };
  const confirmExistingVariationLink = () => runClassificationCommand('existing');
  const confirmNewVariationInFamily = () => runClassificationCommand('family');
  const discardClassificationAndCreateNew = () => runClassificationCommand('independent');

  const handleCreatedProductFromModal = async (createdProduct: Product): Promise<boolean> => {
    // Editing without a creation target does not create a supplier association.
    if (creatingItemNumber === null) return true;
    if (linkInFlight.current) return false;
    if (uncertainLink.current) { toast.error(uncertainLink.current); return false; }
    linkInFlight.current = true;
    const submittedContext = linkContext.current;
    let expired = false, writing = false;
    const assertCurrent = () => {
      if (expired || !active.current || linkContext.current !== submittedContext) throw new Error('O item ou fornecedor mudou. Confira o produto salvo antes de vincular.');
    };
    try {
      return Boolean(await createdLinkForm.validateAndRun({
        itemNumber: creatingItemNumber, productId: createdProduct.id || '', supplierId: supplierId || '',
        variationId: creatingVariationId || undefined, supplierProductCode: currentLinkItem?.productCode || '',
        supplierDescription: currentLinkItem?.productDescription || '',
      }, async (data) => {
        assertCurrent();
        const productToUse = await withTimeout(getFullProduct(data.productId), 15000, null, 'entrada:recarregar-produto-salvo');
        assertCurrent();
        if (!productToUse || productToUse.id !== data.productId || productToUse.deleted) throw new Error('Produto salvo não encontrado. Confira o cadastro antes de vincular.');
        const variation = data.variationId ? productToUse.variations?.find((candidate) => candidate.id === data.variationId) : productToUse.variations?.[0];
        if (data.variationId && !variation) throw new Error('A variação recém-cadastrada não foi encontrada. O vínculo não foi salvo em outra variação.');
        const resolvedCode = (variation?.sku || productToUse.code || productToUse.sku || '').trim();
        const resolvedName = (variation?.name || variation?.title || productToUse.name || productToUse.title || data.supplierDescription).trim();
        writing = true;
        const saved = await withTimeout(saveProductSupplierCode({
          supplierId: data.supplierId, productId: data.productId, productVariationId: variation?.id,
          supplierProductCode: data.supplierProductCode, supplierDescription: data.supplierDescription,
        }).then(() => true), 20000, false, 'entrada:salvar-codigo-fornecedor');
        assertCurrent();
        if (!saved) throw new Error('A gravação do vínculo não foi confirmada.');
        const mappings = await withTimeout(findProductSupplierCodes(data.supplierId, [data.supplierProductCode]), 15000, null, 'entrada:confirmar-codigo-fornecedor');
        assertCurrent();
        const mapping = mappings?.get(data.supplierProductCode.toLocaleUpperCase('pt-BR'));
        if (!mapping || mapping.productId !== data.productId || mapping.productVariationId !== variation?.id) throw new Error('O vínculo salvo não corresponde ao produto e à variação escolhidos.');
        const applied = await withTimeout(Promise.resolve(onChange(data.itemNumber, {
          matchedProductId: data.productId, matchedVariationId: variation?.id, linkedProductCode: resolvedCode, productErpName: resolvedName,
        })).then((result) => result !== false), 20000, false, 'entrada:aplicar-vinculo-produto');
        if (!applied) throw new Error('Não foi possível confirmar o vínculo no item da nota.');
        if (!active.current) return false;
        setIsProductModalOpen(false);
        setCreatingItemNumber(null); setCreatingVariationId(null); setInitialProductData(null); setSuggestedCategory(null); setIndividualMarkup('');
        advanceQueue(creationQueue.filter((number) => number !== data.itemNumber));
        toast.success(`Produto "${resolvedName}" cadastrado e vinculado.`);
        return true;
      }, (errors) => toast.error(Object.values(flattenFormErrors(errors))[0])));
    } catch (error) {
      const message = `Produto já salvo. ${error instanceof Error ? error.message : 'Não foi possível confirmar o vínculo.'}`;
      if (writing) uncertainLink.current = `${message} Confira os vínculos antes de repetir.`;
      if (active.current) toast.error(uncertainLink.current || message);
      return false;
    } finally { expired = true; linkInFlight.current = false; }
  };

  return {
    classificationBusy, classificationError,
    preparationError,
    clearPreparationError: () => setPreparationError(''),
    creationQueue,
    isSuggestingName,
    startCreation,
    classifyAndStart,
    confirmExistingVariationLink,
    confirmNewVariationInFamily,
    discardClassificationAndCreateNew,
    handleCreatedProductFromModal,
  };
}
