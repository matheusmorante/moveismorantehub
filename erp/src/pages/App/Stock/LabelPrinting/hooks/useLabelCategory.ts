import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LabelPreset } from '../utils/LabelConstants';

export const VALID_LABEL_CATEGORIES = ['identificacao', 'precos', 'logos', 'posts'] as const;
export type LabelCategoryType = typeof VALID_LABEL_CATEGORIES[number];
export type CategoryType = LabelCategoryType;

export const useLabelCategory = (isProductContextParam = false) => {
    const [searchParams, setSearchParams] = useSearchParams();

    const productIdParam = searchParams.get('productId');
    const isProductContext = isProductContextParam || !!productIdParam;

    const catFromUrl = (searchParams.get('cat') || searchParams.get('category')) as LabelCategoryType | null;
    const presetFromUrl = searchParams.get('preset') as LabelPreset | null;

    // Detectar categoria a partir do preset se cat não estiver presente
    const inferredCat: LabelCategoryType | null = VALID_LABEL_CATEGORIES.includes(catFromUrl as LabelCategoryType) ? catFromUrl : (
        presetFromUrl === 'qr_product' || presetFromUrl === 'barcode_only' ? 'identificacao' :
        presetFromUrl === 'price_only' || presetFromUrl === 'promotional_price' ? 'precos' :
        presetFromUrl === 'store_logo' ? 'logos' :
        null
    );

    const [selectedCategory, setSelectedCategoryState] = useState<LabelCategoryType | null>(
        inferredCat || 'logos'
    );
    const [printingMode, setPrintingMode] = useState<'simple' | 'advanced'>('advanced');

    const setSelectedCategory = (cat: LabelCategoryType | null) => {
        setSelectedCategoryState(cat);
        // Logos e Posts são sempre modo simples (apenas imagem)
        if (cat === 'logos' || cat === 'posts') {
            setPrintingMode('simple');
        }

        if (cat) {
            setSearchParams((prev: any) => { prev.set('cat', cat); return prev; }, { replace: true });

            if (cat !== 'logos' && cat !== 'posts') {
                setPrintingMode('advanced');
            }
        } else {
            setSearchParams((prev: any) => { prev.delete('cat'); return prev; }, { replace: true });
        }
    };

    // Sincronizar o estado interno com a URL quando houver navegação externa ou via menu
    useEffect(() => {
        const cat = (searchParams.get('cat') || searchParams.get('category')) as LabelCategoryType | null;
        const preset = searchParams.get('preset') as LabelPreset | null;

        const finalCat: LabelCategoryType | null = VALID_LABEL_CATEGORIES.includes(cat as LabelCategoryType) ? cat : (
            preset === 'qr_product' || preset === 'barcode_only' ? 'identificacao' :
            preset === 'price_only' || preset === 'promotional_price' ? 'precos' :
            preset === 'store_logo' ? 'logos' :
            null
        );

        if (finalCat && finalCat !== selectedCategory) {
            setSelectedCategoryState(finalCat);
            if (finalCat === 'logos' || finalCat === 'posts') setPrintingMode('simple');
            else setPrintingMode('advanced');
        }
    }, [searchParams, selectedCategory]);

    return {
        selectedCategory,
        setSelectedCategory,
        printingMode,
        setPrintingMode,
        catFromUrl,
        isProductContext,
    };
};
