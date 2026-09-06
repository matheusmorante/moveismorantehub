import { supabase } from '@/pages/utils/supabaseConfig';
import { CampaignElementModel, ElementModel, ElementType, PostCampaign, PostPreviewCache } from '../types/postCreator';
import { localPostCreator, writeLocal } from './postCreatorLocalStore';
import { previewIdsToPrune, previewsForContext } from './previewHistory';

const now = () => new Date().toISOString();
const sortNewest = <T extends { createdAt: string }>(items: T[]) => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
const fallbackCampaign: PostCampaign = { id: '00000000-0000-4000-8000-000000000001', name: 'Campanha Padrão', description: 'Campanha padrão que reúne modelos visuais reutilizáveis.', active: true, createdAt: now(), updatedAt: now() };
const defaultGlobalGuidelines = `COMPOSIÇÃO GERAL
- Preservar informações comerciais exatamente como fornecidas; preço, nome, parcelamento, logo e selo são renderizados deterministicamente.
- Manter área comercial legível, sem sobrepor produto ou fotos.

FOTOS DO PRODUTO
- A variação principal usa FOTO 1 como PRIMARY: maior destaque visual.
- A FOTO 2 da variação principal é SECONDARY: menor, próxima da foto principal e nunca uma duplicação da FOTO 1.
- Cada outra variação usa somente sua FOTO 1 como miniatura representativa.
- As fotos das outras variações ficam em galeria horizontal, com borda branca fina e sem texto dentro das imagens.
- Nunca misturar fotos de variações diferentes ou inventar fotos.`;

function modelFromRow(row: any): ElementModel { return { id: row.id, name: row.name, elementType: row.element_type, contentKind: row.content_kind, opportunityId: row.opportunity_id, prompt: row.prompt || '', referenceFiles: row.reference_files || [], generatedAssetUrl: row.generated_asset_url, generationInputHash: row.generation_input_hash, generationVersion: row.generation_version || 1, status: row.status || 'NO_PREVIEW', createdAt: row.created_at, updatedAt: row.updated_at }; }
function campaignFromRow(row: any): PostCampaign { return { id: row.id, name: row.name, description: row.description, generalGuidelines: row.general_guidelines, active: row.active !== false, createdAt: row.created_at, updatedAt: row.updated_at }; }
function previewFromRow(row: any): PostPreviewCache { return { id: row.id, campaignId: row.campaign_id, productId: row.product_id, format: row.format, inputHash: row.input_hash, imageUrl: row.image_url, status: row.status || 'UPDATED', accepted: row.accepted === true, pinned: row.pinned === true, createdAt: row.created_at, updatedAt: row.updated_at }; }
function normalizePreview(preview: PostPreviewCache): PostPreviewCache { return { ...preview, accepted: preview.accepted === true, pinned: preview.pinned === true }; }
function storePreviews(previews: PostPreviewCache[]) { try { writeLocal('previews', previews); } catch { /* O banco continua sendo a fonte persistente se o limite do navegador for atingido. */ } }

export const postCreatorService = {
  async globalGuidelines(): Promise<string> {
    try { const { data, error } = await supabase.from('post_creator_global_rules').select('guidelines').eq('id', true).maybeSingle(); if (!error && data?.guidelines) return data.guidelines; } catch { /* fallback */ }
    return localStorage.getItem('morante_post_creator_global_guidelines') || defaultGlobalGuidelines;
  },
  async saveGlobalGuidelines(guidelines: string): Promise<void> {
    localStorage.setItem('morante_post_creator_global_guidelines', guidelines);
    await supabase.from('post_creator_global_rules').upsert({ id: true, guidelines, updated_at: now() }).then(() => undefined).catch(() => undefined);
  },
  async campaigns(): Promise<PostCampaign[]> {
    try { const { data, error } = await supabase.from('post_creator_campaigns').select('*').order('created_at', { ascending: false }); if (!error && data) { const values = data.map(campaignFromRow); if (!values.length) await supabase.from('post_creator_campaigns').upsert({ id: fallbackCampaign.id, name: fallbackCampaign.name, description: fallbackCampaign.description, active: true, created_at: fallbackCampaign.createdAt, updated_at: fallbackCampaign.updatedAt }); writeLocal('campaigns', values.length ? values : [fallbackCampaign]); return values.length ? values : [fallbackCampaign]; } } catch { /* fallback */ }
    const values = localPostCreator.campaigns(); return values.length ? values : [fallbackCampaign];
  },
  async saveCampaign(value: Partial<PostCampaign>): Promise<PostCampaign> {
    const existing = localPostCreator.campaigns().find(item => item.id === value.id); const saved: PostCampaign = { ...fallbackCampaign, ...existing, ...value, id: value.id || crypto.randomUUID(), name: value.name?.trim() || 'Nova campanha', updatedAt: now(), createdAt: existing?.createdAt || now() };
    writeLocal('campaigns', [saved, ...localPostCreator.campaigns().filter(item => item.id !== saved.id)]);
    await supabase.from('post_creator_campaigns').upsert({ id: saved.id, name: saved.name, description: saved.description, general_guidelines: saved.generalGuidelines, active: saved.active, created_at: saved.createdAt, updated_at: saved.updatedAt }).then(() => undefined).catch(() => undefined); return saved;
  },
  async removeCampaign(id: string): Promise<void> {
    writeLocal('campaigns', localPostCreator.campaigns().filter(item => item.id !== id));
    writeLocal('links', localPostCreator.links().filter(item => item.campaignId !== id));
    await supabase.from('post_creator_campaigns').delete().eq('id', id).then(() => undefined).catch(() => undefined);
  },
  async models(): Promise<ElementModel[]> {
    try { const { data, error } = await supabase.from('post_creator_element_models').select('*').order('created_at', { ascending: false }); if (!error && data) { const values = data.map(modelFromRow); writeLocal('models', values); return values; } } catch { /* fallback */ }
    return localPostCreator.models();
  },
  async saveModel(value: ElementModel): Promise<ElementModel> {
    const saved = { ...value, updatedAt: now(), createdAt: value.createdAt || now() }; writeLocal('models', [saved, ...localPostCreator.models().filter(item => item.id !== saved.id)]);
    await supabase.from('post_creator_element_models').upsert({ id: saved.id, name: saved.name, element_type: saved.elementType, content_kind: saved.contentKind, opportunity_id: saved.opportunityId || null, prompt: saved.prompt, reference_files: saved.referenceFiles, generated_asset_url: saved.generatedAssetUrl, generation_input_hash: saved.generationInputHash, generation_version: saved.generationVersion, status: saved.status, created_at: saved.createdAt, updated_at: saved.updatedAt }).then(() => undefined).catch(() => undefined); return saved;
  },
  async links(campaignId: string): Promise<CampaignElementModel[]> {
    try { const { data, error } = await supabase.from('post_creator_campaign_element_models').select('*').eq('campaign_id', campaignId); if (!error && data) { const values = data.map((row: any) => ({ campaignId: row.campaign_id, elementModelId: row.element_model_id, elementType: row.element_type, opportunityId: row.opportunity_id, active: row.active, createdAt: row.created_at })); const others = localPostCreator.links().filter(item => item.campaignId !== campaignId); writeLocal('links', [...others, ...values]); return values; } } catch { /* fallback */ }
    return localPostCreator.links().filter(item => item.campaignId === campaignId);
  },
  async linkModel(link: CampaignElementModel): Promise<void> {
    const next = [...localPostCreator.links().filter(item => !(item.campaignId === link.campaignId && item.elementModelId === link.elementModelId)), link]; writeLocal('links', next);
    await supabase.from('post_creator_campaign_element_models').upsert({ campaign_id: link.campaignId, element_model_id: link.elementModelId, element_type: link.elementType, opportunity_id: link.opportunityId || null, active: link.active, created_at: link.createdAt }).then(() => undefined).catch(() => undefined);
  },
  async activate(campaignId: string, elementType: ElementType, modelId: string, opportunityId?: string | null): Promise<void> {
    const links = localPostCreator.links().map(link => link.campaignId === campaignId && link.elementType === elementType && (elementType !== 'BADGE' || link.opportunityId === opportunityId) ? { ...link, active: link.elementModelId === modelId } : link); writeLocal('links', links);
    let disable = supabase.from('post_creator_campaign_element_models').update({ active: false }).eq('campaign_id', campaignId).eq('element_type', elementType); if (elementType === 'BADGE') disable = opportunityId ? disable.eq('opportunity_id', opportunityId) : disable.is('opportunity_id', null); await disable.then(() => undefined).catch(() => undefined);
    await supabase.from('post_creator_campaign_element_models').update({ active: true }).eq('campaign_id', campaignId).eq('element_model_id', modelId).then(() => undefined).catch(() => undefined);
  },
  async unlink(campaignId: string, modelId: string): Promise<void> { writeLocal('links', localPostCreator.links().filter(link => !(link.campaignId === campaignId && link.elementModelId === modelId))); await supabase.from('post_creator_campaign_element_models').delete().eq('campaign_id', campaignId).eq('element_model_id', modelId).then(() => undefined).catch(() => undefined); },
  async previewHistory(campaignId: string, productId: string, format: PostPreviewCache['format']): Promise<PostPreviewCache[]> {
    try {
      const { data, error } = await supabase.from('post_creator_previews').select('*').eq('campaign_id', campaignId).eq('product_id', productId).eq('format', format).order('created_at', { ascending: false });
      if (!error && data) {
        const history = data.map(previewFromRow);
        const others = localPostCreator.previews().map(normalizePreview).filter(item => item.campaignId !== campaignId || item.productId !== productId || item.format !== format);
        storePreviews([...history, ...others]);
        return history;
      }
    } catch { /* fallback local */ }
    return previewsForContext(localPostCreator.previews().map(normalizePreview), campaignId, productId, format);
  },
  async preview(inputHash: string, campaignId?: string, productId?: string, format?: PostPreviewCache['format']): Promise<PostPreviewCache | undefined> {
    const values = campaignId && productId && format ? await this.previewHistory(campaignId, productId, format) : localPostCreator.previews().map(normalizePreview);
    return values.find(preview => preview.inputHash === inputHash && preview.status === 'UPDATED');
  },
  async savePreview(preview: PostPreviewCache): Promise<void> {
    const normalized = normalizePreview(preview);
    storePreviews([normalized, ...localPostCreator.previews().map(normalizePreview).filter(item => item.id !== normalized.id)]);
    const { error } = await supabase.from('post_creator_previews').upsert({ id: normalized.id, campaign_id: normalized.campaignId, product_id: normalized.productId, format: normalized.format, input_hash: normalized.inputHash, image_url: normalized.imageUrl, status: normalized.status, accepted: normalized.accepted, pinned: normalized.pinned, created_at: normalized.createdAt, updated_at: normalized.updatedAt });
    if (error) throw error;
    await this.prunePreviewHistory(normalized.campaignId, normalized.productId, normalized.format);
  },
  async acceptPreview(preview: PostPreviewCache): Promise<void> {
    const changedAt = now();
    const values = localPostCreator.previews().map(normalizePreview).map(item => item.campaignId === preview.campaignId && item.productId === preview.productId && item.format === preview.format ? { ...item, accepted: item.id === preview.id, updatedAt: changedAt } : item);
    storePreviews(values);
    const context = supabase.from('post_creator_previews').update({ accepted: false, updated_at: changedAt }).eq('campaign_id', preview.campaignId).eq('product_id', preview.productId).eq('format', preview.format);
    const { error: clearError } = await context;
    if (clearError) throw clearError;
    const { error } = await supabase.from('post_creator_previews').update({ accepted: true, updated_at: changedAt }).eq('id', preview.id);
    if (error) throw error;
  },
  async pinPreview(preview: PostPreviewCache, pinned: boolean): Promise<void> {
    const changedAt = now();
    storePreviews(localPostCreator.previews().map(normalizePreview).map(item => item.id === preview.id ? { ...item, pinned, updatedAt: changedAt } : item));
    const { error } = await supabase.from('post_creator_previews').update({ pinned, updated_at: changedAt }).eq('id', preview.id);
    if (error) throw error;
  },
  async removePreview(preview: PostPreviewCache): Promise<void> {
    storePreviews(localPostCreator.previews().filter(item => item.id !== preview.id));
    const { error } = await supabase.from('post_creator_previews').delete().eq('id', preview.id);
    if (error) throw error;
  },
  async prunePreviewHistory(campaignId: string, productId: string, format: PostPreviewCache['format']): Promise<void> {
    const history = previewsForContext(localPostCreator.previews().map(normalizePreview), campaignId, productId, format);
    const ids = previewIdsToPrune(history);
    if (!ids.length) return;
    storePreviews(localPostCreator.previews().filter(item => !ids.includes(item.id)));
    const { error } = await supabase.from('post_creator_previews').delete().in('id', ids);
    if (error) throw error;
  },
  sortNewest,
};
