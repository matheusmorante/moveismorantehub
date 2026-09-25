import React, { useState, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { GridModel } from '../modals/LabelGridModelModal';
import { LabelItemConfig } from '../components/LabelGrid';
import { publishPriceLabelTemplateUpdate } from '../services/priceLabelTemplateSync';
import { useLabelCategory } from './useLabelCategory';
import { useLabelProducts } from './useLabelProducts';
import { useLabelQueue } from './useLabelQueue';
import { useLabelLayouts } from './useLabelLayouts';
import { useLabelModalsAndAssets } from './useLabelModalsAndAssets';
import { useLabelPreview } from './useLabelPreview';

/**
 * useLabelPrintingState - Fachada Orquestradora de Estado para Impressão de Etiquetas
 * Composição coesa desacoplada em submódulos especializados conforme SOLID e Clean Code.
 */
export const useLabelPrintingState = () => {
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const isProductContext = !!location.state?.product || !!searchParams.get('productId');

    // 1. Categoria e Modo de Impressão
    const {
        selectedCategory,
        setSelectedCategory,
        printingMode,
        setPrintingMode,
        catFromUrl,
    } = useLabelCategory(isProductContext);

    // 2. Layouts e Configurações de Template
    const layouts = useLabelLayouts({
        selectedCategory,
        catFromUrl,
        isProductContext
    });

    // 3. Catálogo de Produtos
    const productsHook = useLabelProducts({
        locationState: location.state,
        productIdParam: searchParams.get('productId')
    });

    // 4. Filas de Impressão e Ações de Renderização
    const queue = useLabelQueue({
        selectedCategory,
        printingMode,
        config: layouts.config
    });

    // 5. Modais, Assets e Imagens Customizadas
    const modalsAndAssets = useLabelModalsAndAssets({
        selectedCategory,
        config: layouts.config,
        onAddLogoItem: (item) => queue.setLogoItems((prev: any) => [...prev, item]),
        onAddLabelItem: (item) => queue.setLabelItems((prev: any) => [...prev, item])
    });

    // 6. Preview, Zoom, Canvas, Download e Paginação
    const preview = useLabelPreview({
        config: layouts.config,
        selectedCategory,
        selectedProduct: productsHook.selectedProductToAdd
    });

    // Refs e Modais Auxiliares
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const [modelToCopy, setModelToCopy] = useState<GridModel | null>(null);

    // Upload de logo / imagem para fila
    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            if (selectedCategory === 'logos') {
                modalsAndAssets.setNewLogoImage(base64);
                modalsAndAssets.setNewLogoName(file.name.split('.')[0].toUpperCase().substring(0, 30));
                modalsAndAssets.setIsNewLogoModalOpen(true);
            } else {
                modalsAndAssets.setSelectedImage(base64);
                if (selectedCategory === 'precos') {
                    const newItem: LabelItemConfig = {
                        name: '',
                        price: '',
                        sku: '',
                        quantity: 1,
                        image: base64,
                        imageFit: 'contain'
                    };
                    queue.setLabelItems((prev: any) => [...prev, newItem]);
                }
                toast.success('Imagem adicionada à fila.');
            }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    return {
        // Categoria e modo
        selectedCategory,
        setSelectedCategory,
        printingMode,
        setPrintingMode,

        // Layouts e configurações
        config: layouts.config,
        setConfig: layouts.setConfig,
        DEFAULT_LAYOUT_MODELS: layouts.DEFAULT_LAYOUT_MODELS,
        customLayouts: layouts.customLayouts,
        setCustomLayouts: layouts.setCustomLayouts,
        savedArtConfigs: layouts.savedArtConfigs,
        setSavedArtConfigs: layouts.setSavedArtConfigs,
        artVersion: layouts.artVersion,
        setArtVersion: layouts.setArtVersion,
        layoutModels: layouts.layoutModels,
        currentModel: layouts.currentModel,
        editingGridModel: layouts.editingGridModel,
        setEditingGridModel: layouts.setEditingGridModel,
        selectLayout: layouts.selectLayout,
        selectModelId: layouts.selectModelId,
        handleTypeChange: layouts.handleTypeChange,
        handleDuplicateLayout: layouts.handleDuplicateLayout,
        toggleDefaultLayout: layouts.toggleDefaultLayout,
        handleDeleteLayout: layouts.handleDeleteLayout,
        confirmDeleteLayout: layouts.confirmDeleteLayout,
        handleCopyToCategory: layouts.handleCopyToCategory,
        applyPresetWithConfig: layouts.applyPresetWithConfig,
        modelToDelete: layouts.modelToDelete,
        setModelToDelete: layouts.setModelToDelete,

        // Produtos
        products: productsHook.products,
        selectedProductToAdd: productsHook.selectedProductToAdd,
        setSelectedProductToAdd: productsHook.setSelectedProductToAdd,
        productAddQty: productsHook.productAddQty,
        setProductAddQty: productsHook.setProductAddQty,
        fetchAllProducts: productsHook.fetchAllProducts,
        hasMoreProducts: productsHook.hasMoreProducts,

        // Fila e Impressão
        labelItems: queue.labelItems,
        setLabelItems: queue.setLabelItems,
        logoItems: queue.logoItems,
        setLogoItems: queue.setLogoItems,
        handleProductSelect: queue.handleProductSelect,
        handleAddBlankLabel: queue.handleAddBlankLabel,
        isPrinting: queue.isPrinting,
        printLabels: queue.handlePrintLabels,

        // Preview, Paginação e Download
        isDownloading: preview.isDownloading,
        handleDownloadImage: preview.handleDownloadImage,
        gridRef: preview.gridRef,
        cellImages: preview.cellImages,
        handleCellClick: preview.handleCellClick,
        currentPage: preview.currentPage,
        setCurrentPage: preview.setCurrentPage,
        previewContainerRef: preview.previewContainerRef,
        previewScaleRef: preview.previewScaleRef,
        previewZoom: preview.previewZoom,
        setPreviewZoom: preview.setPreviewZoom,
        isPreviewFullscreen: preview.isPreviewFullscreen,
        setIsPreviewFullscreen: preview.setIsPreviewFullscreen,
        cellInputRef: preview.cellInputRef,

        // Modais e Assets
        layoutModalOpen: modalsAndAssets.layoutModalOpen,
        setLayoutModalOpen: modalsAndAssets.setLayoutModalOpen,
        gridModalOpen: modalsAndAssets.gridModalOpen,
        setGridModalOpen: modalsAndAssets.setGridModalOpen,
        isModelManagerModalOpen: modalsAndAssets.isModelManagerModalOpen,
        setIsModelManagerModalOpen: modalsAndAssets.setIsModelManagerModalOpen,
        isImageModalOpen: modalsAndAssets.isImageModalOpen,
        setIsImageModalOpen: modalsAndAssets.setIsImageModalOpen,
        isNewLogoModalOpen: modalsAndAssets.isNewLogoModalOpen,
        setIsNewLogoModalOpen: modalsAndAssets.setIsNewLogoModalOpen,
        newLogoName: modalsAndAssets.newLogoName,
        setNewLogoName: modalsAndAssets.setNewLogoName,
        newLogoImage: modalsAndAssets.newLogoImage,
        setNewLogoImage: modalsAndAssets.setNewLogoImage,
        selectedImage: modalsAndAssets.selectedImage,
        setSelectedImage: modalsAndAssets.setSelectedImage,
        customLabels: modalsAndAssets.customLabels,
        setCustomLabels: modalsAndAssets.setCustomLabels,
        editingLabel: modalsAndAssets.editingLabel,
        setEditingLabel: modalsAndAssets.setEditingLabel,
        labelFormName: modalsAndAssets.labelFormName,
        setLabelFormName: modalsAndAssets.setLabelFormName,
        labelFormImage: modalsAndAssets.labelFormImage,
        setLabelFormImage: modalsAndAssets.setLabelFormImage,
        availableLogos: modalsAndAssets.availableLogos,
        setAvailableLogos: modalsAndAssets.setAvailableLogos,
        handleConfirmNewLogo: modalsAndAssets.handleConfirmNewLogo,
        handleDeleteAvailableLogo: modalsAndAssets.handleDeleteAvailableLogo,
        handleAddLogoToQueue: modalsAndAssets.handleAddLogoToQueue,
        handleSaveCustomLabel: modalsAndAssets.handleSaveCustomLabel,
        handleDeleteCustomLabel: modalsAndAssets.handleDeleteCustomLabel,
        isPriceLabelArtEditorOpen: modalsAndAssets.isPriceLabelArtEditorOpen,
        setIsPriceLabelArtEditorOpen: modalsAndAssets.setIsPriceLabelArtEditorOpen,
        isAssetManagerModalOpen: modalsAndAssets.isAssetManagerModalOpen,
        setIsAssetManagerModalOpen: modalsAndAssets.setIsAssetManagerModalOpen,
        isLabelModalOpen: modalsAndAssets.isLabelModalOpen,
        setIsLabelModalOpen: modalsAndAssets.setIsLabelModalOpen,

        // Sincronização externa de templates
        publishPriceLabelTemplateUpdate,

        // Cópia de layouts
        isCopyModalOpen,
        setIsCopyModalOpen,
        modelToCopy,
        setModelToCopy,

        // Refs extras
        logoInputRef,
        handleLogoUpload
    };
};
