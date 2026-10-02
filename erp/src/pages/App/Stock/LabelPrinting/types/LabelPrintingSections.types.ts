import type { ChangeEventHandler, Dispatch, RefObject, SetStateAction } from 'react';
import type Product from '../../../../types/product.type';
import type { CategoryType } from '../hooks/useLabelCategory';
import type { PriceLabelTemplateUpdate } from '../services/priceLabelTemplateSync';
import type { CustomLabel, LabelConfig } from '../utils/LabelConstants';
import type { LabelItemConfig, LabelLogoAsset, LogoItemConfig } from './LabelGridItem.types';
import type { GridModel } from './LabelGridModelTypes';

type SavedArtConfig = NonNullable<LabelConfig['artConfig']>;
type SavedArtConfigs = Record<string, SavedArtConfig>;

export interface HeaderSectionProps {
  selectedCategory: CategoryType | null;
  config: LabelConfig;
  setGridModalOpen: (open: boolean) => void;
  setIsModelManagerModalOpen: (open: boolean) => void;
  DEFAULT_LAYOUT_MODELS: GridModel[];
  customLayouts: GridModel[];
}

export interface QueueSectionProps {
  selectedCategory: CategoryType | null;
  printingMode: 'simple' | 'advanced';
  config: LabelConfig;
  products: Product[];
  selectedProductToAdd: Product | null;
  setSelectedProductToAdd: (product: Product | null) => void;
  productAddQty: number;
  setProductAddQty: (quantity: number) => void;
  handleProductSelect: (product: Product, quantity: number, skipModal?: boolean) => void;
  labelItems: LabelItemConfig[];
  setLabelItems: Dispatch<SetStateAction<LabelItemConfig[]>>;
  logoItems: LogoItemConfig[];
  setLogoItems: Dispatch<SetStateAction<LogoItemConfig[]>>;
  isDownloading: boolean;
  handleAddBlankLabel?: (quantity: number) => void;
  cellInputRef?: RefObject<HTMLInputElement>;
  handleLogoUpload?: ChangeEventHandler<HTMLInputElement>;
  setIsAssetManagerModalOpen?: (open: boolean) => void;
}

export interface PreviewSectionProps {
  config: LabelConfig;
  printingMode: 'simple' | 'advanced';
  artVersion: number;
  savedArtConfigs: SavedArtConfigs;
  selectedImage: string | null;
  cellImages: Record<number, string | null>;
  handleCellClick: (index: number) => void;
  labelItems: LabelItemConfig[];
  logoItems: LogoItemConfig[];
  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  handleDownloadImage: () => void;
  printLabels: () => void;
  isPrinting?: boolean;
  isDownloading: boolean;
  selectedCategory: CategoryType | null;
  previewContainerRef: RefObject<HTMLDivElement>;
  previewScaleRef: RefObject<HTMLDivElement>;
  gridRef: RefObject<HTMLDivElement>;
  previewZoom: number;
  setPreviewZoom: Dispatch<SetStateAction<number>>;
  isPreviewFullscreen: boolean;
}

export interface PrintPortalSectionProps {
  config: LabelConfig;
  selectedCategory: CategoryType | null;
  logoItems: LogoItemConfig[];
  labelItems: LabelItemConfig[];
  savedArtConfigs: SavedArtConfigs;
  printingMode: 'simple' | 'advanced';
  artVersion: number;
  selectedImage: string | null;
  cellImages: Record<number, string | null>;
}

export interface ModalsSectionProps {
  editingGridModel: GridModel | null;
  setEditingGridModel: Dispatch<SetStateAction<GridModel | null>>;
  selectLayout: (model: GridModel) => void;
  isCopyModalOpen: boolean;
  setIsCopyModalOpen: Dispatch<SetStateAction<boolean>>;
  modelToCopy: GridModel | null;
  handleCopyToCategory: (model: GridModel, category: CategoryType) => Promise<void>;
  modelToDelete: string | null;
  setModelToDelete: Dispatch<SetStateAction<string | null>>;
  confirmDeleteLayout: () => Promise<void>;
  logoInputRef: RefObject<HTMLInputElement>;
  handleLogoUpload: ChangeEventHandler<HTMLInputElement>;
  handleConfirmNewLogo: () => void;
  availableLogos: LabelLogoAsset[];
  handleAddLogoToQueue: (logo: Pick<LabelLogoAsset, 'image' | 'name'>) => void;
  handleDeleteAvailableLogo: (id: string) => void;
  isLabelModalOpen: boolean;
  setIsLabelModalOpen: Dispatch<SetStateAction<boolean>>;
  isImageModalOpen: boolean;
  setIsImageModalOpen: Dispatch<SetStateAction<boolean>>;
  handleDeleteLayout: (id: string) => Promise<void> | void;
  setSelectedImage: Dispatch<SetStateAction<string | null>>;
  publishPriceLabelTemplateUpdate: (update: PriceLabelTemplateUpdate) => void;
  selectedProductToAdd: Product | null;
  setCustomLayouts: Dispatch<SetStateAction<GridModel[]>>;
  selectedImage: string | null;
  gridModalOpen: boolean;
  setGridModalOpen: Dispatch<SetStateAction<boolean>>;
  layoutModels: GridModel[];
  customLayouts: GridModel[];
  config: LabelConfig;
  setConfig: Dispatch<SetStateAction<LabelConfig>>;
  isModelManagerModalOpen: boolean;
  setIsModelManagerModalOpen: Dispatch<SetStateAction<boolean>>;
  editingLabel: CustomLabel | null;
  labelFormName: string;
  setLabelFormName: Dispatch<SetStateAction<string>>;
  labelFormImage: string;
  setLabelFormImage: Dispatch<SetStateAction<string>>;
  handleSaveCustomLabel: () => void;
  isPriceLabelArtEditorOpen: boolean;
  setIsPriceLabelArtEditorOpen: Dispatch<SetStateAction<boolean>>;
  setSavedArtConfigs: Dispatch<SetStateAction<SavedArtConfigs>>;
  savedArtConfigs: SavedArtConfigs;
  setArtVersion: Dispatch<SetStateAction<number>>;
  isAssetManagerModalOpen: boolean;
  setIsAssetManagerModalOpen: Dispatch<SetStateAction<boolean>>;
  selectedCategory: CategoryType | null;
  setLogoItems: Dispatch<SetStateAction<LogoItemConfig[]>>;
  isNewLogoModalOpen: boolean;
  setIsNewLogoModalOpen: Dispatch<SetStateAction<boolean>>;
  newLogoName: string;
  setNewLogoName: Dispatch<SetStateAction<string>>;
  newLogoImage: string;
}
