import {
  FileText,
  Grid3X3,
  Images,
  Info,
  Package,
  Receipt,
} from 'lucide-react-native';
import type React from 'react';
import type { MobileProductFormTabId } from '../domain/mobileProductFormErrorNavigation';
import {
  shouldShowMobileProductCompositionTab,
  shouldShowMobileProductVariationsTab,
} from '../domain/mobileProductVariationMode';

export type TabId = MobileProductFormTabId;

interface Tab {
  id: TabId;
  label: string;
  Icon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  condition?: (formData: any, isStockistOnly: boolean) => boolean;
}

export const TABS: Tab[] = [
  { id: 'geral', label: 'Informações Básicas' },
  {
    id: 'fotos',
    label: 'Fotos',
    Icon: Images,
    condition: (formData, isStockistOnly) => formData.itemType !== 'service' && !isStockistOnly,
  },
  {
    id: 'technical',
    label: 'Características',
    Icon: Info,
    condition: (formData, isStockistOnly) => formData.itemType !== 'service' && !isStockistOnly,
  },
  {
    id: 'description',
    label: 'Descrição',
    Icon: FileText,
    condition: (formData, isStockistOnly) => formData.itemType !== 'service' && !isStockistOnly,
  },
  {
    id: 'estoque',
    label: 'Estoque e Precificação',
    Icon: Package,
    condition: (formData) => formData.itemType !== 'service',
  },
  {
    id: 'variacoes',
    label: 'Variações',
    Icon: Grid3X3,
    condition: (formData) => shouldShowMobileProductVariationsTab(formData),
  },
  {
    id: 'composicao',
    label: 'Composição',
    Icon: Package,
    condition: (formData) => shouldShowMobileProductCompositionTab(formData),
  },
  {
    id: 'fiscal',
    label: 'Tributário / NF',
    Icon: Receipt,
    condition: (formData) => formData.itemType !== 'composition',
  },
];
