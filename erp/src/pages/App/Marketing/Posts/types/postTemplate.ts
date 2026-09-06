import { AspectRatioType } from './template';
import { Layer } from './layer';

export type PostFieldType = 'text' | 'textarea' | 'currency' | 'number' | 'boolean' | 'select' | 'image' | 'badge' | 'color' | 'automatic';
export interface PostTemplateField { key: string; label: string; type: PostFieldType; required?: boolean; maxLength?: number; source?: 'name' | 'price' | 'oldPrice' | 'image' | 'category' | 'description'; }
export const POST_MODEL_FORMATS = ['4:5', '9:16'] as const;
export interface PostTemplate { id: string; version: number; name: string; slug: string; description: string; status: 'ACTIVE' | 'INACTIVE'; category: string; aspectRatio: AspectRatioType; formats?: Array<'4:5' | '9:16'>; width: number; height: number; imagePrompt: string; promptNodes?: PromptNode[]; assets?: PostModelAsset[]; extras?: PostModelExtra[]; fields: PostTemplateField[]; layout: Layer[]; reservedAreas: Array<{ region: string; reason: string }>; imageRules: { preserveProduct: boolean; generateEnvironment: boolean; fit: 'contain' | 'cover'; }; generationConfig: { provider: 'gemini'; model: string; referenceImageRequired: boolean }; createdAt: string; updatedAt: string; }
export interface PostModelAsset { id: string; name: string; description?: string; fileUrl: string; mimeType: string; }
export interface PostModelExtra { id: string; name: string; type: 'TEXT' | 'FILE'; textValue?: string; fileId?: string; }
export type PromptNode = { type: 'text'; content: string } | { type: 'file_reference'; fileId: string; label: string; role: 'VISUAL_REFERENCE' | 'REQUIRED_ASSET' | 'LAYOUT_EXAMPLE' | 'LOGO' | 'BADGE' | 'INSTALLMENT' | 'TYPOGRAPHY' | 'PALETTE' | 'OTHER' };
export interface GeneratedPost { id: string; productId: string; templateId: string; templateVersion: number; inputData: Record<string, string>; generatedImage?: string; finalImage?: string; status: 'DRAFT' | 'GENERATED' | 'FAILED'; createdAt: string; }
