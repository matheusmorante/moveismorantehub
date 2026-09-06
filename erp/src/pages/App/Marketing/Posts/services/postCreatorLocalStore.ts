import { CampaignElementModel, ElementModel, PostCampaign, PostPreviewCache } from '../types/postCreator';

const key = (name: string) => `morante_post_creator_${name}_v1`;
export function readLocal<T>(name: string): T[] { try { const value = JSON.parse(localStorage.getItem(key(name)) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } }
export function writeLocal<T>(name: string, values: T[]) { localStorage.setItem(key(name), JSON.stringify(values)); }
export const localPostCreator = {
  campaigns: () => readLocal<PostCampaign>('campaigns'), models: () => readLocal<ElementModel>('models'),
  links: () => readLocal<CampaignElementModel>('links'), previews: () => readLocal<PostPreviewCache>('previews'),
};
