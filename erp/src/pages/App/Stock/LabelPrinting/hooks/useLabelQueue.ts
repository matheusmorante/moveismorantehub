import { useState } from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { labelBlankQueueFormSchema, labelProductQueueFormSchema, labelPrintingFormSchema } from '../../../../../../../shared-utils/labelDesignFormSchemas';
import Product, { Variation } from '@/pages/types/product.type';
import { formatCurrency } from '@/pages/utils/formatters';
import { getSelectedProductDisplayName } from '@/pages/utils/productVariationDefaults';
import type { LabelItemConfig, LogoItemConfig } from '../types/LabelGridItem.types';
import { LabelConfig } from '../utils/LabelConstants';
import { useLabelPrintMode } from './useLabelPrintMode';
import {
  generateInventoryLabelsBatch,
  LabelBatchRequestItem,
} from '../services/inventoryLabelService';

interface UseLabelQueueProps {
  selectedCategory: string | null;
  config: LabelConfig;
  printingMode: 'simple' | 'advanced';
}

const toLabelImages = (images: unknown) =>
  Array.isArray(images)
    ? images.flatMap((image, index) => {
        if (typeof image === 'string') {
          return image.trim() ? [{ image_url: image.trim(), is_main: index === 0 }] : [];
        }
        return image?.image_url
          ? [{ image_url: String(image.image_url), is_main: Boolean(image.is_main) }]
          : [];
      })
    : [];

const getProductLabelFields = (
  product: Product,
  quantity: number,
  variation?: Variation
): Partial<LabelItemConfig> => {
  const selectedVariation = variation?.isVirtual ? undefined : variation;
  const productTitle = product.title || product.name || product.description || '';
  const legacyVariationName = (product as any).variation || (product as any).variationName;
  const fullName = selectedVariation
    ? getSelectedProductDisplayName(product, selectedVariation)
    : product.isVariation && legacyVariationName
      ? legacyVariationName
      : productTitle;
  const parentImageSource = product.images || (product as any).product_images;
  const productImages = toLabelImages(
    selectedVariation?.images?.length
      ? selectedVariation.images
      : product.isVariation
        ? product.images
        : parentImageSource
  );
  const parentImages = selectedVariation
    ? toLabelImages(parentImageSource)
    : product.isVariation
      ? toLabelImages((product as any).parentImages)
      : [];
  const allImages = [...productImages, ...parentImages];
  const initialImage = allImages.find((image: any) => image.is_main) || allImages[0];
  const price = selectedVariation?.unitPrice ??
    (product.unitPrice ? product.unitPrice : (product as any).price || 0);
  const promoPrice =
    selectedVariation?.promoPrice ??
    ((product as any).promoPrice || (product as any).promo_price);
  const rawOpportunity = (product as any).opportunity || (product as any).opportunities;
  const opportunity = Array.isArray(rawOpportunity) ? rawOpportunity[0] : rawOpportunity;

  return {
    name: fullName,
    price: formatCurrency(price),
    promoPrice: promoPrice ? formatCurrency(promoPrice) : '',
    showPromoPrice: Boolean(promoPrice),
    sku:
      selectedVariation?.sku ||
      (product.isVariation ? product.sku : '') ||
      product.code ||
      product.sku ||
      '',
    barcode: selectedVariation?.barcode || product.barcode || (product as any).ean || '',
    code: product.code || '',
    quantity,
    opportunityId:
      (product as any).opportunityId ||
      (product as any).opportunity_id ||
      opportunity?.id ||
      opportunity?.slug ||
      ((product as any).condition === 'salvado' ? 'salvado' : 'none'),
    productImages,
    parentImages,
    currentImageIndex: 0,
    image: initialImage?.image_url || '',
    productId: product.isVariation ? (product as any).parentId : product.id,
    variationId:
      selectedVariation?.id ||
      (product.isVariation ? (product as any).variationId || product.id : undefined),
    instances: Array.from({ length: quantity }, () => '000XXX'),
  };
};

export const useLabelQueue = ({ selectedCategory, config, printingMode }: UseLabelQueueProps) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const rawPrintLabels = useLabelPrintMode();

  const [simpleLabelItems, setSimpleLabelItems] = useState<LabelItemConfig[]>([]);
  const [advancedLabelItems, setAdvancedLabelItems] = useState<LabelItemConfig[]>([]);

  const labelItems = printingMode === 'simple' ? simpleLabelItems : advancedLabelItems;
  const setLabelItems = (updater: React.SetStateAction<LabelItemConfig[]>) => {
    if (printingMode === 'simple') {
      setSimpleLabelItems(updater);
    } else {
      setAdvancedLabelItems(updater);
    }
  };

  const [logoItems, setLogoItems] = useState<LogoItemConfig[]>([]);
  const productQueueForm = useZodForm(labelProductQueueFormSchema, { product: { id: '' }, quantity: 1 });
  const blankQueueForm = useZodForm(labelBlankQueueFormSchema, { quantity: 1 });
  const printingForm = useZodForm(labelPrintingFormSchema, { config: { ...config }, items: labelItems.map((item) => ({ ...item })), logos: logoItems.map((item) => ({ ...item })) });

  const handlePrintLabels = async () => {
    if (isPrinting) return;
    return printingForm.validateAndRun({ config: { ...config }, items: labelItems.map((item) => ({ ...item })), logos: logoItems.map((item) => ({ ...item })) }, async (values) => {
    if (selectedCategory === 'identificacao' && values.items.length > 0) {
      setIsPrinting(true);
      try {
        const updatedItems = [...values.items];

        // Itens que necessitam de geração de novos UUIDs (não é reimpressão já preenchida)
        const itemsNeedingLabels: Array<{ itemIndex: number; request: LabelBatchRequestItem }> = [];

        for (let i = 0; i < updatedItems.length; i++) {
          const item = updatedItems[i];
          // SEMPRE gera novos UUIDs a cada clique em Imprimir para garantir unicidade,
          // mesmo que o usuário clique em imprimir repetidas vezes a mesma fila.
          if (!item.isBlank && (item.productId || item.variationId)) {
            itemsNeedingLabels.push({
              itemIndex: i,
              request: {
                productId: item.productId || item.variationId || '',
                variationId: item.variationId,
                sku: item.sku,
                quantity: Math.max(1, Number(item.quantity) || 1),
              },
            });
          }
        }

        // 1 único bulk insert no Supabase para todo o lote
        if (itemsNeedingLabels.length > 0) {
          const batchResults = await generateInventoryLabelsBatch(
            itemsNeedingLabels.map((entry) => entry.request)
          );

          for (let k = 0; k < itemsNeedingLabels.length; k++) {
            const targetItemIndex = itemsNeedingLabels[k].itemIndex;
            updatedItems[targetItemIndex].instances = batchResults[k];
          }
        }

        setLabelItems(updatedItems);

        await new Promise<void>((resolve) => setTimeout(resolve, 800));
        await rawPrintLabels();
      } catch (err: any) {
        console.error('[useLabelQueue] Erro ao imprimir etiquetas com identificador único:', err);
        toast.error(
          err?.message ||
            'A impressão foi abortada devido a um erro na geração dos identificadores.'
        );
      } finally {
        setIsPrinting(false);
      }
    } else {
      await rawPrintLabels();
    }
    }, (errors) => toast.error(Object.values(flattenFormErrors(errors))[0]));
  };

  const handleProductSelect = (selectedProduct: Product, selectedQuantity: number = 1) => productQueueForm.enqueueAndRun<boolean>({ product: { ...selectedProduct, id: selectedProduct.id || '' }, quantity: selectedQuantity }, (values) => {
    const product = values.product as unknown as Product;
    const quantity = values.quantity;
    const fields = getProductLabelFields(product, quantity);
    const fullName = selectedCategory === 'precos'
      ? String(fields.name || '').split(' - ')[0]
      : fields.name || '';

    const newItem: LabelItemConfig = {
      ...fields,
      name: fullName,
      extraFields: config.extraFields ? JSON.parse(JSON.stringify(config.extraFields)) : [],
      printingMode: 'advanced',
      instances: selectedCategory === 'identificacao' ? fields.instances : [],
    };

    setLabelItems((prev: any) => [...prev, newItem]);
    toast.success(`${fullName} (${quantity} un) adicionado à lista.`);
    return true;
  }, (errors) => toast.error(Object.values(flattenFormErrors(errors))[0]));

  const handleReplaceProduct = (
    index: number,
    selectedProduct: Product,
    selectedVariation?: Variation
  ) => {
    const currentItem = labelItems[index];
    if (!currentItem) return Promise.resolve(false);
    return productQueueForm.enqueueAndRun<boolean>(
      {
        product: { ...selectedProduct, id: selectedProduct.id || '' },
        quantity: currentItem.quantity,
      },
      (values) => {
        const product = values.product as unknown as Product;
        const fields = getProductLabelFields(product, values.quantity, selectedVariation);
        setLabelItems((items) => items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, ...fields, isBlank: false } : item
        ));
        toast.success(`Produto da etiqueta atualizado para ${fields.name}.`);
        return true;
      },
      (errors) => toast.error(Object.values(flattenFormErrors(errors))[0])
    );
  };

  const handleAddBlankLabel = (qty: number = 1) => blankQueueForm.enqueueAndRun({ quantity: qty }, (values) => {
    const quantity = values.quantity;
    if (selectedCategory === 'logos') {
      const newItem: LogoItemConfig = {
        image: '',
        quantity: quantity,
        imageFit: config.imageFit || 'contain',
        scale: config.imageScale || 1,
        rotation: 0,
        name: 'ETIQUETA EM BRANCO',
        price: '',
        promoPrice: '',
        sku: '',
        isBlank: true as any,
      };
      setLogoItems((prev: any) => [...prev, newItem]);
    } else {
      const newItem: LabelItemConfig = {
        name: 'ETIQUETA EM BRANCO',
        price: '',
        promoPrice: '',
        sku: '',
        quantity: quantity,
        isBlank: true,
        printingMode: 'simple',
        extraFields: [],
      };
      setLabelItems((prev: any) => [...prev, newItem]);
    }
    if (selectedCategory !== 'precos') {
      toast.success(`Etiqueta em branco (${quantity} un) adicionada à fila.`);
    }
  }, (errors) => toast.error(Object.values(flattenFormErrors(errors))[0]));

  const handleReorderItems = (draggedIdx: number, targetIdx: number) => {
    const isLogos = selectedCategory === 'logos';
    const sourceItems = isLogos ? logoItems : labelItems;

    const flattenedItems: any[] = [];
    sourceItems.forEach((item) => {
      const qty = Number(item.quantity || 0);
      for (let i = 0; i < qty; i++) {
        flattenedItems.push({ ...item, quantity: 1 });
      }
    });

    if (
      draggedIdx < 0 ||
      draggedIdx >= flattenedItems.length ||
      targetIdx < 0 ||
      targetIdx >= flattenedItems.length
    ) {
      return;
    }

    const [movedItem] = flattenedItems.splice(draggedIdx, 1);
    flattenedItems.splice(targetIdx, 0, movedItem);

    const compactQueue: any[] = [];
    flattenedItems.forEach((item) => {
      const last = compactQueue[compactQueue.length - 1];
      const isSame =
        last &&
        ((item.isBlank && last.isBlank) ||
          (!item.isBlank &&
            !last.isBlank &&
            ((isLogos && item.image === last.image && item.name === last.name) ||
              (!isLogos &&
                item.name === last.name &&
                item.sku === last.sku &&
                item.price === last.price &&
                item.promoPrice === last.promoPrice))));

      if (isSame) {
        last.quantity += 1;
      } else {
        compactQueue.push({ ...item });
      }
    });

    if (isLogos) {
      setLogoItems(compactQueue);
    } else {
      setLabelItems(compactQueue);
    }
  };

  return {
    labelItems,
    setLabelItems,
    logoItems,
    setLogoItems,
    handlePrintLabels,
    handleProductSelect,
    handleReplaceProduct,
    handleAddBlankLabel,
    handleReorderItems,
    isPrinting,
  };
};
