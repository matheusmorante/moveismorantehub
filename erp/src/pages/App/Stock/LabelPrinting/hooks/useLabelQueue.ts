import { useState } from 'react';
import { toast } from 'react-toastify';
import Product from '@/pages/types/product.type';
import { formatCurrency } from '@/pages/utils/formatters';
import { LabelItemConfig, LogoItemConfig } from '../components/LabelGrid';
import { LabelConfig } from '../utils/LabelConstants';
import { useLabelPrintMode } from './useLabelPrintMode';
import { generateInventoryLabelsBatch, LabelBatchRequestItem } from '../services/inventoryLabelService';

interface UseLabelQueueProps {
    selectedCategory: string | null;
    config: LabelConfig;
    printingMode: 'simple' | 'advanced';
}

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

    const handlePrintLabels = async () => {
        if (selectedCategory === 'identificacao' && labelItems.length > 0) {
            setIsPrinting(true);
            try {
                const updatedItems = [...labelItems];
                
                // Itens que necessitam de geração de novos UUIDs (não é reimpressão já preenchida)
                const itemsNeedingLabels: Array<{ itemIndex: number; request: LabelBatchRequestItem }> = [];

                for (let i = 0; i < updatedItems.length; i++) {
                    const item = updatedItems[i];
                    const hasValidInstances = Array.isArray(item.instances) &&
                        item.instances.length === item.quantity &&
                        item.instances.every(inst => inst && inst !== '000XXX');

                    // Se já tiver UUIDs válidos associados (caso de reimpressão), preserva
                    if (!hasValidInstances && !item.isBlank && (item.productId || item.variationId)) {
                        itemsNeedingLabels.push({
                            itemIndex: i,
                            request: {
                                productId: item.productId || item.variationId || '',
                                variationId: item.variationId,
                                sku: item.sku,
                                quantity: Math.max(1, Number(item.quantity) || 1)
                            }
                        });
                    }
                }

                // 1 único bulk insert no Supabase para todo o lote
                if (itemsNeedingLabels.length > 0) {
                    const batchResults = await generateInventoryLabelsBatch(
                        itemsNeedingLabels.map(entry => entry.request)
                    );

                    for (let k = 0; k < itemsNeedingLabels.length; k++) {
                        const targetItemIndex = itemsNeedingLabels[k].itemIndex;
                        updatedItems[targetItemIndex].instances = batchResults[k];
                    }
                }

                setLabelItems(updatedItems);

                setTimeout(() => {
                    rawPrintLabels();
                    setIsPrinting(false);
                }, 800);
            } catch (err: any) {
                console.error('[useLabelQueue] Erro ao imprimir etiquetas com identificador único:', err);
                setIsPrinting(false);
                toast.error(err?.message || "A impressão foi abortada devido a um erro na geração dos identificadores.");
            }
        } else {
            rawPrintLabels();
        }
    };

    const handleProductSelect = (product: Product, quantity: number = 1) => {
        const productTitle = (product as any).title || product.name || product.description || '';
        const variationName = (product as any).variation || (product as any).variationName;
        let fullName = productTitle;
        if (product.isVariation && variationName) {
            fullName = variationName;
        }

        if (selectedCategory === 'precos') {
            fullName = fullName.split(' - ')[0];
        }

        const rawProductOpportunity = (product as any).opportunity || (product as any).opportunities;
        const productOpportunity = Array.isArray(rawProductOpportunity)
            ? rawProductOpportunity[0]
            : rawProductOpportunity;
        const opportunityId = (product as any).opportunityId ||
            (product as any).opportunity_id ||
            productOpportunity?.id ||
            productOpportunity?.slug ||
            ((product as any).condition === 'salvado' ? 'salvado' : 'none');

        const productImages = (product.images || (product as any).product_images || []) as { image_url: string; is_main: boolean }[];
        const parentImages = ((product as any).parentImages || []) as { image_url: string; is_main: boolean }[];

        let initialImage = '';
        const allImages = [...productImages, ...parentImages];
        if (allImages.length > 0) {
            const mainImg = allImages.find(img => img.is_main);
            initialImage = mainImg ? mainImg.image_url : allImages[0].image_url;
        }

        const newItem: LabelItemConfig = {
            name: fullName,
            price: product.unitPrice ? formatCurrency(product.unitPrice) :
                   (product as any).price ? formatCurrency((product as any).price) : 'R$ 0,00',
            promoPrice: (product as any).promoPrice ? formatCurrency((product as any).promoPrice) :
                        (product as any).promo_price ? formatCurrency((product as any).promo_price) : '',
            showPromoPrice: Boolean((product as any).promoPrice || (product as any).promo_price),
            sku: (product as any).sku || product.code || '',
            barcode: (product as any).barcode || (product as any).ean || '',
            code: product.code || '',
            quantity: Math.max(1, quantity),
            extraFields: config.extraFields ? JSON.parse(JSON.stringify(config.extraFields)) : [],
            opportunityId,
            productImages,
            parentImages,
            currentImageIndex: 0,
            image: initialImage,
            productId: product.isVariation ? (product as any).parentId : product.id,
            variationId: product.isVariation ? product.id : undefined,
            printingMode: 'advanced',
            instances: selectedCategory === 'identificacao' ? Array.from({ length: Math.max(1, quantity) }).map(() => '000XXX') : []
        };

        setLabelItems((prev: any) => [...prev, newItem]);
        toast.success(`${fullName} (${quantity} un) adicionado à lista.`);
    };

    const handleAddBlankLabel = (qty: number = 1) => {
        const quantity = Math.max(1, qty);
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
                isBlank: true as any
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
                extraFields: []
            };
            setLabelItems((prev: any) => [...prev, newItem]);
        }
        if (selectedCategory !== 'precos') {
            toast.success(`Etiqueta em branco (${quantity} un) adicionada à fila.`);
        }
    };

    const handleReorderItems = (draggedIdx: number, targetIdx: number) => {
        const isLogos = selectedCategory === 'logos';
        const sourceItems = isLogos ? logoItems : labelItems;

        const flattenedItems: any[] = [];
        sourceItems.forEach(item => {
            const qty = Number(item.quantity || 0);
            for (let i = 0; i < qty; i++) {
                flattenedItems.push({ ...item, quantity: 1 });
            }
        });

        if (draggedIdx < 0 || draggedIdx >= flattenedItems.length || targetIdx < 0 || targetIdx >= flattenedItems.length) {
            return;
        }

        const [movedItem] = flattenedItems.splice(draggedIdx, 1);
        flattenedItems.splice(targetIdx, 0, movedItem);

        const compactQueue: any[] = [];
        flattenedItems.forEach(item => {
            const last = compactQueue[compactQueue.length - 1];
            const isSame = last && (
                (item.isBlank && last.isBlank) ||
                (!item.isBlank && !last.isBlank && (
                    (isLogos && item.image === last.image && item.name === last.name) ||
                    (!isLogos && item.name === last.name && item.sku === last.sku && item.price === last.price && item.promoPrice === last.promoPrice)
                ))
            );

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
        handleAddBlankLabel,
        handleReorderItems,
        isPrinting,
    };
};
