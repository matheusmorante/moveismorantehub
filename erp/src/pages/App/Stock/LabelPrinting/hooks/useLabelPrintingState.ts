import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { labelLocalImageUploadFormSchema } from '../../../../../../../shared-utils/labelImageFormSchemas';
import { readImageFile } from '../../../../../../../shared-utils/readImageFile';
import type { GridModel } from '../types/LabelGridModelTypes';
import type { LabelItemConfig } from '../types/LabelGridItem.types';
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
  const fillSheetParam = searchParams.get('fillSheet') === '1';

  const isProductContext = !!location.state?.product || !!searchParams.get('productId');

  // 1. Categoria e Modo de Impressão
  const { selectedCategory, setSelectedCategory, printingMode, setPrintingMode, catFromUrl } =
    useLabelCategory(isProductContext);

  // 2. Layouts e Configurações de Template
  const layouts = useLabelLayouts({
    selectedCategory,
    catFromUrl,
    isProductContext,
  });

  // 3. Catálogo de Produtos
  const productsHook = useLabelProducts({
    locationState: location.state,
    productIdParam: searchParams.get('productId'),
    variationIdParam: searchParams.get('variationId'),
    autoAddProductParam: searchParams.get('autoAddProduct') === 'true',
  });

  // 4. Filas de Impressão e Ações de Renderização
  const queue = useLabelQueue({
    selectedCategory,
    printingMode,
    config: layouts.config,
  });

  // 5. Modais, Assets e Imagens Customizadas
  const modalsAndAssets = useLabelModalsAndAssets({
    selectedCategory,
    config: layouts.config,
    onAddLogoItem: (item) => queue.setLogoItems((prev: any) => [...prev, item]),
    onAddLabelItem: (item) => queue.setLabelItems((prev: any) => [...prev, item]),
  });

  // 6. Preview, Zoom, Canvas, Download e Paginação
  const preview = useLabelPreview({
    config: layouts.config,
    selectedCategory,
    selectedProduct: productsHook.selectedProductToAdd,
  });

  // 7. Processa produto inicial enviado via navegação (ex: variações ou lote de produtos)
  const initialProcessedRef = useRef(false);

  useEffect(() => {
    if (initialProcessedRef.current) return;
    const stateProduct = location.state?.product;
    const batchProducts = location.state?.batchProducts;

    if (stateProduct) {
      initialProcessedRef.current = true;
      const fillSheet = Boolean(location.state?.fillSheet);
      // Calcula a quantidade máxima de etiquetas por folha do modelo ativo/padrão
      const modelCols = layouts.currentModel?.columns || layouts.config.columns || 2;
      const modelRows = layouts.currentModel?.rows || layouts.config.rows || 5;
      const sheetCapacity = modelCols * modelRows;
      const qty = fillSheet
        ? Math.max(sheetCapacity, location.state?.quantity || 1)
        : location.state?.quantity || 1;
      queue.handleProductSelect(stateProduct, qty);
    } else if (Array.isArray(batchProducts) && batchProducts.length > 0) {
      initialProcessedRef.current = true;
      batchProducts.forEach((p: any) => {
        queue.handleProductSelect(p, p.labelQty || p.quantity || 1);
      });
    } else if (productsHook.initialProduct) {
      initialProcessedRef.current = true;
      const modelCols = layouts.currentModel?.columns || layouts.config.columns || 2;
      const modelRows = layouts.currentModel?.rows || layouts.config.rows || 5;
      const sheetCapacity = modelCols * modelRows;
      queue.handleProductSelect(
        productsHook.initialProduct,
        fillSheetParam ? Math.max(sheetCapacity, 10) : 1
      );
    }
  }, [
    location.state,
    layouts.currentModel,
    layouts.config.columns,
    layouts.config.rows,
    productsHook.initialProduct,
    fillSheetParam,
  ]);

  // Refs e Modais Auxiliares
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [modelToCopy, setModelToCopy] = useState<GridModel | null>(null);
  const uploadForm = useZodForm(labelLocalImageUploadFormSchema, { files: [], category: selectedCategory });
  const [imageUploading, setImageUploading] = useState(false), [imageUploadError, setImageUploadError] = useState('');
  const activeImageRead = useRef<AbortController | null>(null), uploadMounted = useRef(false);
  const uploadOwnerKey = JSON.stringify([location.pathname, selectedCategory, modalsAndAssets.isAssetManagerModalOpen]);
  const uploadOwner = useRef(uploadOwnerKey); uploadOwner.current = uploadOwnerKey;
  useEffect(() => { uploadMounted.current = true; return () => { uploadMounted.current = false; activeImageRead.current?.abort(); }; }, []);
  useEffect(() => { setImageUploadError(''); return () => activeImageRead.current?.abort(); }, [uploadOwnerKey]);

  // Upload de logo / imagem para fila
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activeImageRead.current || modalsAndAssets.assetsSaving) return;
    const input = e.target;
    const controller = new AbortController(); activeImageRead.current = controller;
    setImageUploading(true); setImageUploadError('');
    const current = () => uploadMounted.current && !controller.signal.aborted && uploadOwner.current === uploadOwnerKey;
    const fail = (message: string) => { if (current()) { setImageUploadError(message); toast.error(message); } };
    try {
    return await uploadForm.validateAndRun({ files: [file], category: selectedCategory }, async (values) => {
      if (!current()) return;
      const selectedFile = values.files[0];
      const base64 = await readImageFile(selectedFile, controller.signal);
      if (!current()) return;
      if (values.category === 'logos') {
        modalsAndAssets.setNewLogoImage(base64);
        modalsAndAssets.setNewLogoName(selectedFile.name.split('.')[0].toUpperCase().substring(0, 30));
        modalsAndAssets.setIsNewLogoModalOpen(true);
      } else {
        modalsAndAssets.setSelectedImage(base64);
        if (values.category === 'precos') {
          const newItem: LabelItemConfig = {
            name: '',
            price: '',
            sku: '',
            quantity: 1,
            image: base64,
            imageFit: 'contain',
          };
          queue.setLabelItems((prev: any) => [...prev, newItem]);
        }
        toast.success('Imagem adicionada à fila.');
      }
    }, (errors) => fail(Object.values(flattenFormErrors(errors))[0] || 'Confira a imagem.'));
    } catch (cause) {
      fail(cause instanceof Error ? cause.message : 'Não foi possível ler a imagem.');
    } finally {
      input.value = '';
      if (activeImageRead.current === controller) { activeImageRead.current = null; if (uploadMounted.current) setImageUploading(false); }
    }
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
    handleSaveGridModel: layouts.handleSaveGridModel,
    toggleDefaultLayout: layouts.toggleDefaultLayout,
    handleDeleteLayout: layouts.handleDeleteLayout,
    confirmDeleteLayout: layouts.confirmDeleteLayout,
    layoutsBusy: layouts.layoutsBusy,
    layoutsLoading: layouts.layoutsLoading,
    layoutsQueryError: layouts.layoutsQueryError,
    layoutPreferenceError: layouts.layoutPreferenceError,
    layoutsError: layouts.layoutsError,
    layoutsBlocked: layouts.layoutsBlocked,
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
    assetsSaving: modalsAndAssets.assetsSaving,
    assetError: modalsAndAssets.assetError,
    imageUploading,
    imageUploadError,
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
    handleLogoUpload,
  };
};
