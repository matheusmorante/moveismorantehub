import { Dispatch, SetStateAction } from 'react';
import Product from '../../../../types/product.type';
import { LabelItemConfig, LogoItemConfig } from '../components/LabelGrid';
import { GridModel } from '../modals/LabelGridModelModal';
import { LabelConfig, CustomLabel } from '../utils/LabelConstants';

export interface HeaderSectionProps {
    selectedCategory: string;
    printingMode: 'simple' | 'advanced';
    setPrintingMode: (mode: 'simple' | 'advanced') => void;
    config: LabelConfig;
    setGridModalOpen: (open: boolean) => void;
    setIsModelManagerModalOpen: (open: boolean) => void;
    DEFAULT_LAYOUT_MODELS: GridModel[];
    customLayouts: GridModel[];
}

export interface QueueSectionProps {
    selectedCategory: string | null;
    printingMode: 'simple' | 'advanced';
    products: Product[];
    selectedProductToAdd: Product | null;
    setSelectedProductToAdd: (product: Product | null) => void;
    productAddQty: number;
    setProductAddQty: (qty: number) => void;
    handleProductSelect: (product: Product, quantity: number, skipModal?: boolean) => void;
    labelItems: LabelItemConfig[];
    setLabelItems: Dispatch<SetStateAction<LabelItemConfig[]>>;
    logoItems: LogoItemConfig[];
    setLogoItems: Dispatch<SetStateAction<LogoItemConfig[]>>;
    isDownloading: boolean;
    handleAddBlankLabel?: (qty: number) => void;
    cellInputRef?: React.RefObject<HTMLInputElement>;
    handleLogoUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    setIsAssetManagerModalOpen?: (open: boolean) => void;
}

export interface PreviewSectionProps {
    config: LabelConfig;
    printingMode: 'simple' | 'advanced';
    artVersion: number;
    savedArtConfigs: Record<string, any>;
    selectedImage: string | null;
    cellImages: Record<number, string | null>;
    handleCellClick: (idx: number) => void;
    labelItems: LabelItemConfig[];
    logoItems: LogoItemConfig[];
    currentPage: number;
    setCurrentPage: (page: number) => void;
    handleDownloadImage: () => void;
    printLabels: () => void;
    isDownloading: boolean;
    selectedCategory: string | null;
    previewContainerRef: React.RefObject<HTMLDivElement>;
    previewScaleRef: React.RefObject<HTMLDivElement>;
    gridRef: React.RefObject<HTMLDivElement>;
    previewZoom: number;
    setPreviewZoom: Dispatch<SetStateAction<number>>;
    isPreviewFullscreen: boolean;
}

export interface PrintPortalSectionProps {
    config: LabelConfig;
    selectedCategory: string | null;
    logoItems: LogoItemConfig[];
    labelItems: LabelItemConfig[];
    savedArtConfigs: Record<string, any>;
    printingMode: 'simple' | 'advanced';
    artVersion: number;
    selectedImage: string | null;
    cellImages: Record<number, string | null>;
}

export interface ModalsSectionProps {
    editingGridModel: any;
    setEditingGridModel: (m: any) => void;
    selectLayout: (model: any, artConfig?: any) => void;
    isCopyModalOpen: boolean;
    setIsCopyModalOpen: (b: boolean) => void;
    modelToCopy: any;
    handleCopyToCategory: (model: any, cat: any) => void;
    modelToDelete: any;
    setModelToDelete: (m: any) => void;
    confirmDeleteLayout: () => void;
    logoInputRef: any;
    handleLogoUpload: (e: any) => void;
    handleConfirmNewLogo: () => void;
    availableLogos: any[];
    handleAddLogoToQueue: (logo: any) => void;
    handleDeleteAvailableLogo: (logo: any) => void;
    isLabelModalOpen: boolean;
    setIsLabelModalOpen: (b: boolean) => void;
    handleDeleteLayout: (id: string) => void;
    setSelectedImage: (img: string | null) => void;
    publishPriceLabelTemplateUpdate: (payload?: any) => void;
    selectedProductToAdd: any;
    setCustomLayouts: (updater: any) => void;
    selectedImage: string | null;
    gridModalOpen: boolean;
    setGridModalOpen: (open: boolean) => void;
    layoutModels: GridModel[];
    customLayouts: GridModel[];
    config: LabelConfig;
    setConfig: Dispatch<SetStateAction<LabelConfig>>;
    applyPresetWithConfig: (preset: any, config: LabelConfig) => void;
    isModelManagerModalOpen: boolean;
    setIsModelManagerModalOpen: (open: boolean) => void;
    setCustomLabels: Dispatch<SetStateAction<CustomLabel[]>>;
    currentModel: GridModel | undefined;
    isImageModalOpen: boolean;
    setIsImageModalOpen: (open: boolean) => void;
    editingLabel: { product: Product; quantity: number } | null;
    setEditingLabel: Dispatch<SetStateAction<{ product: Product; quantity: number } | null>>;
    labelFormName: string;
    setLabelFormName: (val: string) => void;
    labelFormImage: string | null;
    setLabelFormImage: (val: string | null) => void;
    handleSaveCustomLabel: () => void;
    isPriceLabelArtEditorOpen: boolean;
    setIsPriceLabelArtEditorOpen: (open: boolean) => void;
    setSavedArtConfigs: Dispatch<SetStateAction<Record<string, any>>>;
    savedArtConfigs: Record<string, any>;
    artVersion: number;
    setArtVersion: Dispatch<SetStateAction<number>>;
    isAssetManagerModalOpen: boolean;
    setIsAssetManagerModalOpen: (open: boolean) => void;
    selectedCategory: string | null;
    logoItems: LogoItemConfig[];
    setLogoItems: Dispatch<SetStateAction<LogoItemConfig[]>>;
    isNewLogoModalOpen: boolean;
    setIsNewLogoModalOpen: (open: boolean) => void;
    newLogoName: string;
    setNewLogoName: (val: string) => void;
    newLogoImage: string | null;
    setNewLogoImage: (val: string | null) => void;
    handleSaveNewLogo: () => void;
}
