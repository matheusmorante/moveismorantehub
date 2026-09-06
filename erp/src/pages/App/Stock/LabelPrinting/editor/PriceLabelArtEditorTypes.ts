import { LabelConfig } from '../LabelConstants';

export interface Opportunity {
  id: string;
  name: string;
  slug?: string;
  badge_color?: string;
  border_color?: string;
}

export interface PriceLabelArtEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LabelConfig;
  onSaveConfig: (updatedConfig: Partial<LabelConfig>) => void | Promise<void>;
  onArtConfigLoaded?: (artConfig: Record<string, any>) => void;
  initialProduct?: {
    name?: string;
    price?: string;
    promoPrice?: string;
    sku?: string;
    opportunities?: any;
  };
}

export type PriceLabelLayerKey =
  | 'title'
  | 'dePricePorGroup'
  | 'deText'
  | 'normalPrice'
  | 'porText'
  | 'currencySymbol'
  | 'promoPrice'
  | 'cents'
  | 'installments'
  | 'background'
  | null;

export const FONT_OPTIONS = [
  { label: 'Padrão (Inter)', value: 'Inter, system-ui, sans-serif' },
  { label: 'Impact (Pesada)', value: 'Impact, sans-serif' },
  { label: 'Oswald (Condensada)', value: 'Oswald, sans-serif' },
  { label: 'Bebas Neue (Alta)', value: '"Bebas Neue", sans-serif' },
  { label: 'Anton (Extra Bold)', value: 'Anton, sans-serif' },
  { label: 'Montserrat (Moderna)', value: 'Montserrat, sans-serif' },
  { label: 'Roboto (Limpa)', value: 'Roboto, sans-serif' },
  { label: 'Poppins (Arredondada)', value: 'Poppins, sans-serif' },
  { label: 'Playfair (Clássica)', value: '"Playfair Display", Georgia, serif' },
  { label: 'Monospace (Digital)', value: 'ui-monospace, monospace' }
];
