import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '@/pages/utils/supabaseConfig';
import { GridModel } from '../modals/LabelGridModelModal';
import {
    LabelType,
    LabelPreset,
    LabelConfig,
    DEFAULT_LAYOUT_MODELS
} from '../utils/LabelConstants';
import { mapModelToDb, mapDbToModel } from '../utils/LabelUtils';
import { subscribeToPriceLabelTemplateUpdates } from '../services/priceLabelTemplateSync';
import { CategoryType } from './useLabelCategory';
import { getSettings, saveSettings, subscribeToSettings } from '../../../../utils/settingsService';

interface UseLabelLayoutsProps {
    selectedCategory: CategoryType | null;
    catFromUrl?: CategoryType | null;
    isProductContext?: boolean;
}

export const useLabelLayouts = ({
    selectedCategory,
    catFromUrl,
    isProductContext = false
}: UseLabelLayoutsProps) => {
    const [currentModel, setCurrentModel] = useState<GridModel | null>(null);
    const [editingGridModel, setEditingGridModel] = useState<GridModel | null>(null);
    const [customLayouts, setCustomLayouts] = useState<GridModel[]>([]);
    const [savedArtConfigs, setSavedArtConfigs] = useState<Record<string, any>>({});
    const [hiddenDefaultIds, setHiddenDefaultIds] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem('hidden_default_layout_ids') || '[]'); } catch { return []; }
    });
    const [artVersion, setArtVersion] = useState(0);
    const [modelToDelete, setModelToDelete] = useState<string | null>(null);

    const [lastSelectedRoundModelId, setLastSelectedRoundModelId] = useState<string>(
        () => localStorage.getItem('lastSelectedRoundModelId') || 'round-small'
    );
    const [lastSelectedRectModelId, setLastSelectedRectModelId] = useState<string>(
        () => localStorage.getItem('lastSelectedRectModelId') || 'labels-image-compact'
    );

    const [defaultLayoutIds, setDefaultLayoutIds] = useState<Record<string, string>>(getSettings().defaultLabelLayoutIds || {});

    useEffect(() => {
        const unsubscribe = subscribeToSettings((settings) => {
            if (settings.defaultLabelLayoutIds) {
                setDefaultLayoutIds(settings.defaultLabelLayoutIds);
            }
        });
        return unsubscribe;
    }, []);

    const [config, setConfig] = useState<LabelConfig>({
        type: 'rect',
        preset: isProductContext ? 'qr_product' : 'store_logo',
        layout: isProductContext ? 'horizontal' : 'horizontal',
        showName: isProductContext,
        showPrice: false,
        showBarcode: isProductContext,
        showSKU: isProductContext,
        showStoreName: !isProductContext,
        showStoreLogo: !isProductContext,
        showCustomText: false,
        text: '',
        price: '',
        sku: '',
        qrContent: '',
        customText: 'Qualidade Garantida',
        imageScale: 1,
        marginT: 8,
        marginB: 8,
        marginL: 9,
        marginR: 9,
        gapH: 10,
        gapV: 2,
        columns: 2,
        rows: 3,
        layoutId: '2x3_std',
        paperSize: 'A4',
        showPromoPrice: false,
        promoPrice: '',
        oldPriceColor: '#94a3b8',
        priceColor: '#1e293b',
        promoPriceColor: '#2563eb',
        nameColor: '#0f172a',
        promoColor: '#16a34a',
        nameFontSize: 10,
        category: 'identificacao',
        priceFontSize: 28,
        promoPriceFontSize: 24,
        promoFontSize: 18,
        imageFit: 'contain',
    });

    // Subscrição de atualizações de template de etiquetas de preço
    useEffect(() => subscribeToPriceLabelTemplateUpdates(({ layoutId, artConfig }) => {
        setSavedArtConfigs((prev: any) => ({
            ...prev,
            [layoutId]: artConfig,
            'preco_2x5_restored': artConfig,
        }));
        setConfig((prev: any) => ({ ...prev, artConfig }));
        setArtVersion((prev: any) => prev + 1);
    }), []);

    // Sincroniza layouts customizados com o Supabase e localStorage
    useEffect(() => {
        const fetchCustomLayouts = async () => {
            const { data, error } = await supabase.from('label_layouts').select('*');
            if (data && !error && data.length > 0) {
                const mapped = data.map(mapDbToModel);
                setCustomLayouts(mapped);
                localStorage.setItem('custom_label_layouts', JSON.stringify(mapped));
            } else {
                const saved = localStorage.getItem('custom_label_layouts');
                if (saved) {
                    try { setCustomLayouts(JSON.parse(saved)); } catch (e) { console.error(e); }
                }
            }
        };
        fetchCustomLayouts();
    }, []);

    // Sincroniza artConfig salvo com o config atual
    useEffect(() => {
        const artConfig = savedArtConfigs[config.layoutId || ''];
        if (artConfig && config.artConfig !== artConfig) {
            setConfig((prev: any) => ({ ...prev, artConfig }));
        }
    }, [config.layoutId, savedArtConfigs]);

    const selectLayout = (model: GridModel) => {
        const autoPreset: LabelPreset = model.category === 'precos' ? 'price_only' : 
                                       model.category === 'identificacao' ? 'qr_product' : 
                                       model.category === 'logos' ? 'store_logo' : 'qr_product';

        setConfig((prefConfig: any) => ({
            ...prefConfig,
            layoutId: model.id,
            preset: autoPreset,
            columns: model.columns,
            rows: model.rows,
            marginT: model.marginT,
            marginB: model.marginB,
            marginL: model.marginL,
            marginR: model.marginR,
            gapH: model.gapH,
            gapV: model.gapV,
            paperSize: model.paperSize,
            paperWidth: model.paperWidth,
            paperHeight: model.paperHeight,
            type: model.type || 'rect',
            category: model.category || prefConfig.category, 
            
            // Design e Tipografia (Normal)
            nameFontSize: model.nameFontSize || prefConfig.nameFontSize,
            nameColor: model.nameColor || '#1e293b',
            nameBold: model.nameBold,
            nameAlign: model.nameAlign,
            nameVAlign: model.nameVAlign,
            priceFontSize: model.priceFontSize || prefConfig.priceFontSize,
            priceColor: model.priceColor || '#1e293b',
            priceBold: model.priceBold,
            priceAlign: model.priceAlign,
            priceVAlign: model.priceVAlign,
            fontFamily: model.fontFamily || 'Inter',
            
            // Fontes por Faixa
            priceFontSizeTens: model.priceFontSizeTens,
            priceFontSizeHundreds: model.priceFontSizeHundreds,
            priceFontSizeThousands: model.priceFontSizeThousands,
            priceFontSizeTenThousands: model.priceFontSizeTenThousands,

            // Posições e Dimensões (Normal)
            namePosX: model.namePosX,
            namePosY: model.namePosY,
            nameWidth: model.nameWidth,
            nameHeight: model.nameHeight,
            pricePosX: model.pricePosX,
            pricePosY: model.pricePosY,
            priceWidth: model.priceWidth,
            priceHeight: model.priceHeight,
            barcodePosX: model.barcodePosX,
            barcodePosY: model.barcodePosY,
            dePricePorGroupPos: model.dePricePorGroupPos,
            dePricePorGroupRotation: model.dePricePorGroupRotation,
            dePricePorGroupGap: model.dePricePorGroupGap,
            artConfig: savedArtConfigs[model.id] || model.artConfig || prefConfig.artConfig,

            // Estilos Promocionais (Novo Preço)
            promoPriceFontSize: model.promoPriceFontSize || 24,
            promoPriceColor: model.promoPriceColor || '#2563eb',
            promoPriceBold: model.promoPriceBold,
            promoPriceAlign: model.promoPriceAlign,
            promoPriceVAlign: model.promoPriceVAlign,
            promoPosX: model.promoPosX,
            promoPosY: model.promoPosY,
            promoWidth: model.promoWidth,
            promoHeight: model.promoHeight,
            
            // Preço Antigo
            oldPriceFontSize: model.oldPriceFontSize,
            oldPriceColor: model.oldPriceColor || '#94a3b8',
            oldPriceBold: model.oldPriceBold,
            oldPriceAlign: model.oldPriceAlign,
            oldPriceVAlign: model.oldPriceVAlign,
            oldPricePosX: model.oldPricePosX,

            // Promo Label (Texto PROMOÇÃO)
            promoFontSize: model.promoFontSize,
            promoColor: model.promoColor,
            promoBold: model.promoBold,
            promoAlign: model.promoAlign,
            promoVAlign: model.promoVAlign,

            // Preço Split (Normal)
            priceFormat: model.priceFormat || 'standard',
            priceSymbolFontSize: model.priceSymbolFontSize,
            priceSymbolColor: model.priceSymbolColor,
            priceSymbolBold: model.priceSymbolBold,
            priceSymbolPosX: model.priceSymbolPosX,
            priceSymbolPosY: model.priceSymbolPosY,
            priceDecimalsFontSize: model.priceDecimalsFontSize,
            priceDecimalsColor: model.priceDecimalsColor,
            priceDecimalsBold: model.priceDecimalsBold,
            priceDecimalsPosX: model.priceDecimalsPosX,
            priceDecimalsPosY: model.priceDecimalsPosY,

            // Preço Split (Promo)
            promoPriceSymbolFontSize: model.promoPriceSymbolFontSize,
            promoPriceSymbolColor: model.promoPriceSymbolColor,
            promoPriceSymbolBold: model.promoPriceSymbolBold,
            promoPriceSymbolPosX: model.promoPriceSymbolPosX,
            promoPriceSymbolPosY: model.promoPriceSymbolPosY,
            promoPriceDecimalsFontSize: model.promoPriceDecimalsFontSize,
            promoPriceDecimalsColor: model.promoPriceDecimalsColor,
            promoPriceDecimalsBold: model.promoPriceDecimalsBold,
            promoPriceDecimalsPosX: model.promoPriceDecimalsPosX,
            promoPriceDecimalsPosY: model.promoPriceDecimalsPosY,

            // Cores de Fundo e Campos Extras
            bg_color: model.bg_color || '#ffffff',
            nameBgColor: model.nameBgColor || 'transparent',
            priceBgColor: model.priceBgColor || 'transparent',
            promoBgColor: model.promoBgColor || 'transparent',
            extraFields: model.extraFields || [],
            extraFieldsPromo: model.extraFieldsPromo || [],

            showName: true,
            showPrice: model.category === 'precos',
            showBarcode: model.category !== 'precos',
            showStoreLogo: model.category !== 'precos',
            imageScale: model.imageScale || 1,
        }));
    };

    const applyPresetWithConfig = (preset: LabelPreset, baseConfig: LabelConfig) => {
        const newConfig: LabelConfig = { ...baseConfig, preset };
        if (preset === 'qr_product' || preset === 'barcode_only') newConfig.category = 'identificacao';
        else if (preset === 'price_only' || preset === 'promotional_price') newConfig.category = 'precos';
        else if (preset === 'store_logo') newConfig.category = 'logos';
        else if (preset === 'social_square') newConfig.category = 'posts';

        switch (preset) {
            case 'store_logo':
                newConfig.type = 'rect';
                newConfig.layout = 'horizontal';
                newConfig.showName = false;
                newConfig.showPrice = false;
                newConfig.showBarcode = false;
                newConfig.showStoreLogo = true;
                newConfig.showStoreName = false;
                newConfig.showSKU = false;
                newConfig.showCustomText = false;
                break;
            case 'qr_product':
                newConfig.type = 'rect';
                newConfig.layout = 'horizontal';
                newConfig.showName = true;
                newConfig.showPrice = false;
                newConfig.showBarcode = true;
                newConfig.showSKU = true;
                newConfig.showStoreLogo = false;
                newConfig.showStoreName = false;
                newConfig.showCustomText = false;
                break;
            case 'price_only':
                newConfig.type = 'rect';
                newConfig.layout = 'horizontal';
                newConfig.showName = true;
                newConfig.showPrice = true;
                newConfig.showBarcode = false;
                newConfig.showSKU = false;
                newConfig.showStoreLogo = false;
                newConfig.showStoreName = false;
                newConfig.showCustomText = false;
                break;
            case 'social_square':
                newConfig.type = 'rect';
                newConfig.layout = 'horizontal';
                newConfig.showName = true;
                newConfig.showPrice = true;
                newConfig.showBarcode = false;
                newConfig.showSKU = false;
                newConfig.showStoreLogo = true;
                newConfig.showStoreName = true;
                newConfig.showCustomText = false;
                break;
        }
        setConfig(newConfig);
    };

    const layoutModels = (() => {
        const defaults = DEFAULT_LAYOUT_MODELS.filter(m => {
            const sameCategory = m.category === selectedCategory;
            const sameType = m.type === config.type;
            return sameCategory && sameType && !hiddenDefaultIds.includes(m.id);
        });
        
        const customs = customLayouts.filter(m => {
            const sameCategory = m.category === selectedCategory;
            const sameType = m.type === config.type;
            return sameCategory && sameType;
        });
        
        const finalMap = new Map<string, GridModel>();
        defaults.forEach(def => {
            finalMap.set(def.id, def);
        });

        customs.forEach(c => {
            if (c.baseModelId) {
                finalMap.set(c.baseModelId, c);
            } else {
                finalMap.set(c.id, c);
            }
        });

        return Array.from(finalMap.values());
    })();

    // Seleção de modelo inicial por categoria
    useEffect(() => {
        const cat = selectedCategory || catFromUrl;
        if (!cat) return;

        if (cat === 'precos') {
            const defaultId = defaultLayoutIds['precos_rect'] || defaultLayoutIds['precos'];
            const models = [...DEFAULT_LAYOUT_MODELS, ...customLayouts];
            const targetId = defaultId || 'preco_2x5_restored';
            const found = models.find(m => m.id === targetId) || models.find(m => m.id === 'preco_2x5_restored');
            if (found) {
                selectLayout(found);
                return;
            }
        }

        if (cat === 'identificacao') {
            const models = [...DEFAULT_LAYOUT_MODELS, ...customLayouts];
            const found = models.find(m => m.id === 'ident_2x5' || m.baseModelId === 'ident_2x5');
            if (found) {
                selectLayout(found);
                return;
            }
        }

        const type = config.type || 'rect';
        const defaultId = defaultLayoutIds[`${cat}_${type}`] || defaultLayoutIds[cat];
        
        if (defaultId) {
            const models = [...DEFAULT_LAYOUT_MODELS, ...customLayouts];
            const found = models.find(m => m.id === defaultId);
            if (found) {
                selectLayout(found);
                return;
            }
        }

        const presetMap: Record<string, LabelPreset> = {
            precos: 'price_only',
            identificacao: 'qr_product',
            logos: 'store_logo',
            posts: 'social_square',
        };
        const preset = presetMap[cat];
        if (preset) {
            applyPresetWithConfig(preset as LabelPreset, {
                ...config,
                showBarcode: cat !== 'precos',
                showStoreLogo: cat !== 'precos',
            });
        }
    }, [catFromUrl, selectedCategory, defaultLayoutIds, savedArtConfigs]);

    // Troca de modelo ao trocar categoria/tipo
    useEffect(() => {
        if (!selectedCategory || layoutModels.length === 0) return;
        
        const type = config.type || 'rect';
        const key = `${selectedCategory}_${type}`;
        const savedId = defaultLayoutIds[key] || defaultLayoutIds[selectedCategory];
        
        const targetModel = layoutModels.find(m => m.id === savedId) || layoutModels[0];
        
        if (targetModel && (config.layoutId !== targetModel.id || config.category !== selectedCategory || config.type !== type)) {
            selectLayout(targetModel);
        }
    }, [selectedCategory, config.type, layoutModels.length]);

    const handleDuplicateLayout = async (model: GridModel) => {
        const newModel = { 
            ...model, 
            id: undefined as any,
            name: `${model.name} (Cópia)` 
        };
        
        const dbModel = mapModelToDb(newModel);
        const { data, error } = await supabase
            .from('label_layouts')
            .insert([dbModel])
            .select()
            .single();

        if (data && !error) {
            const saved = mapDbToModel(data);
            const updated = [...customLayouts, saved];
            setCustomLayouts(updated);
            localStorage.setItem('custom_label_layouts', JSON.stringify(updated));
            toast.success('Layout duplicado e salvo no banco!');
        } else {
            const localModel: GridModel = { ...newModel, id: `custom_${Date.now()}` as any };
            const updated = [...customLayouts, localModel];
            setCustomLayouts(updated);
            localStorage.setItem('custom_label_layouts', JSON.stringify(updated));
            toast.success('Layout duplicado (Local)');
        }
    };

    const toggleDefaultLayout = (modelId: string, category: string) => {
        const model = [...DEFAULT_LAYOUT_MODELS, ...customLayouts].find(m => m.id === modelId);
        if (!model) return;

        const key = `${category}_${model.type || 'rect'}`;
        const newDefaults = { ...defaultLayoutIds, [key]: modelId };
        setDefaultLayoutIds(newDefaults);
        localStorage.setItem('default_label_layout_ids', JSON.stringify(newDefaults));
        toast.info(`Modelo definido como padrão para ${model.type === 'round' ? 'etiquetas redondas' : 'etiquetas retangulares'}.`);
    };

    const handleDeleteLayout = async (modelId: string) => {
        const isSystemDefault = DEFAULT_LAYOUT_MODELS.some(m => m.id === modelId);
        const isLocalOnly = String(modelId).startsWith('custom_');

        if (isSystemDefault) {
            if (!hiddenDefaultIds.includes(modelId)) {
                const updated = [...hiddenDefaultIds, modelId];
                setHiddenDefaultIds(updated);
                localStorage.setItem('hidden_default_layout_ids', JSON.stringify(updated));
            }
        } else {
            const updatedCustom = customLayouts.filter(m => m.id !== modelId);
            setCustomLayouts(updatedCustom);
            localStorage.setItem('custom_label_layouts', JSON.stringify(updatedCustom));

            if (!isLocalOnly) {
                try {
                    const dbId = /^\d+$/.test(modelId) ? Number(modelId) : modelId;
                    await supabase.from('label_layouts').delete().eq('id', dbId);
                } catch (e) {
                    console.error('Erro na requisição de deleção:', e);
                }
            }
        }

        if (config.layoutId === modelId) {
            const allModels = [...DEFAULT_LAYOUT_MODELS, ...customLayouts.filter(m => m.id !== modelId)];
            const available = allModels.filter(m => 
                m.id !== modelId && !hiddenDefaultIds.includes(m.id) && m.category === selectedCategory
            );
            if (available.length > 0) selectLayout(available[0]);
        }
    };

    const confirmDeleteLayout = async () => {
        if (!modelToDelete) return;
        await handleDeleteLayout(modelToDelete);
        toast.success('Modelo excluído ou ocultado com sucesso.');
        setModelToDelete(null);
    };

    const handleCopyToCategory = async (model: GridModel, targetCat: CategoryType) => {
        const newModel = { 
            ...model, 
            id: undefined as any, 
            category: targetCat,
            name: model.name
        };
        
        const dbModel = mapModelToDb(newModel);
        const { data, error } = await supabase
            .from('label_layouts')
            .insert([dbModel])
            .select()
            .single();

        if (data && !error) {
            const saved = mapDbToModel(data);
            const updated = [...customLayouts, saved];
            setCustomLayouts(updated);
            localStorage.setItem('custom_label_layouts', JSON.stringify(updated));
            const catName = targetCat === 'identificacao' ? 'Identificação' : 
                            targetCat === 'precos' ? 'Preços' : 
                            targetCat === 'logos' ? 'Logos' : 'Posts';
            toast.success(`Copiado com sucesso para ${catName}`);
        } else {
            console.error('Erro ao exportar layout:', error);
            const localModel: GridModel = { ...newModel, id: `custom_${Date.now()}` as any };
            const updated = [...customLayouts, localModel];
            setCustomLayouts(updated);
            localStorage.setItem('custom_label_layouts', JSON.stringify(updated));
            toast.success('Copiado para outra categoria (Local)');
        }
    };

    const selectModelId = (modelId: string) => {
        const allModels = [...DEFAULT_LAYOUT_MODELS, ...customLayouts];
        const model = allModels.find(m => m.id === modelId);
        if (model) {
            setCurrentModel(model);
            selectLayout(model);

            if (model.type === 'round') {
                setLastSelectedRoundModelId(modelId);
            } else {
                setLastSelectedRectModelId(modelId);
            }
        }
    };

    const handleTypeChange = (type: LabelType) => {
        const newConfig = { ...config, type };
        setConfig(newConfig);

        const defaultKey = `${selectedCategory}_${type}`;
        const targetId = defaultLayoutIds[defaultKey] || (type === 'round' ? lastSelectedRoundModelId : lastSelectedRectModelId);
        
        const allModels = [...DEFAULT_LAYOUT_MODELS, ...customLayouts];
        const targetModel = allModels.find(m => m.id === targetId) || 
                          (type === 'round' 
                              ? DEFAULT_LAYOUT_MODELS.find(m => m.category === (selectedCategory || 'logos') && m.type === 'round') 
                              : DEFAULT_LAYOUT_MODELS.find(m => m.category === (selectedCategory || 'logos') && m.type === 'rect'));
        
        if (targetModel) {
            setCurrentModel(targetModel);
            selectLayout(targetModel);
        }
    };

    useEffect(() => {
        localStorage.setItem('lastSelectedRoundModelId', lastSelectedRoundModelId);
    }, [lastSelectedRoundModelId]);

    useEffect(() => {
        localStorage.setItem('lastSelectedRectModelId', lastSelectedRectModelId);
    }, [lastSelectedRectModelId]);

    return {
        config,
        setConfig,
        DEFAULT_LAYOUT_MODELS,
        customLayouts,
        setCustomLayouts,
        savedArtConfigs,
        setSavedArtConfigs,
        artVersion,
        setArtVersion,
        layoutModels,
        currentModel,
        setCurrentModel,
        editingGridModel,
        setEditingGridModel,
        selectLayout,
        selectModelId,
        handleTypeChange,
        handleDuplicateLayout,
        toggleDefaultLayout,
        handleDeleteLayout,
        confirmDeleteLayout,
        handleCopyToCategory,
        applyPresetWithConfig,
        modelToDelete,
        setModelToDelete,
    };
};
