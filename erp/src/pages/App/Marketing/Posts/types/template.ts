import { Layer } from './layer';

export type AspectRatioType = '4:5' | '1:1' | '9:16' | '16:9';
export type PostLayoutFormat = Extract<AspectRatioType, '4:5' | '9:16'>;
export interface TemplateLayout {
  aspectRatio: PostLayoutFormat;
  targetWidth: number;
  targetHeight: number;
  layers: Layer[];
}
export interface TemplateEditorSettings {
  environmentPrompts?: Record<string, string>;
  modelProductId?: string;
  photoOverrides?: Record<string, string>;
  sampleSlogan?: string;
}

export interface MarketingTemplate {
  id: string;
  name: string;
  aspectRatio: AspectRatioType;
  targetWidth: number; // e.g. 1080
  targetHeight: number; // e.g. 1350
  campaignId?: string | null;
  layers: Layer[];
  backgroundColor: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
  persistedRemotely?: boolean;
  editorSettings?: TemplateEditorSettings;
  /** Layouts responsivos do mesmo template. Campos legados acima refletem o layout ativo. */
  layouts?: Partial<Record<PostLayoutFormat, TemplateLayout>>;
}

export interface AmbientedImageRecord {
  id: string;
  productId: string;
  variationId?: string | null;
  originalImageUrl: string;
  ambientedImageUrl: string;
  promptUsed?: string;
  createdAt: string;
}
