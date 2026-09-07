import type { PostModelAsset, PostModelExtra, PostTemplate } from '../types/postTemplate';

export function buildPostTemplateDraft(input: {
  value?: PostTemplate;
  name: string;
  description: string;
  prompt: string;
  format: '4:5' | '9:16';
  assets: PostModelAsset[];
  extras: PostModelExtra[];
  now: string;
}): PostTemplate {
  const { value, name, description, prompt, format, assets, extras, now } = input;
  return {
    ...(value || {}), id: value?.id || 'new', name, description, imagePrompt: prompt,
    formats: [format], aspectRatio: format, assets, extras, version: value?.version || 1,
    status: value?.status || 'ACTIVE', category: value?.category || 'Promoção', width: 1080,
    height: format === '9:16' ? 1920 : 1350, fields: value?.fields || [], layout: value?.layout || [],
    reservedAreas: value?.reservedAreas || [], imageRules: value?.imageRules || { preserveProduct: true, generateEnvironment: true, fit: 'contain' },
    generationConfig: value?.generationConfig || { provider: 'gemini', model: 'gemini-2.5-flash-image', referenceImageRequired: true },
    createdAt: value?.createdAt || now, updatedAt: now,
  };
}
