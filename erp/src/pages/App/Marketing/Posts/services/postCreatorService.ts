import { supabase } from '@/pages/utils/supabaseConfig';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import {
  CampaignElementModel,
  ElementModel,
  ElementType,
  PostCampaign,
  PostPreviewCache,
} from '../types/postCreator';
import { localPostCreator, writeLocal } from './postCreatorLocalStore';
import { previewIdsToPrune, previewsForContext } from './previewHistory';

const now = () => new Date().toISOString();
const sortNewest = <T extends { createdAt: string }>(items: T[]) =>
  [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
const fallbackCampaign: PostCampaign = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Campanha Padrão',
  description: 'Campanha padrão que reúne modelos visuais reutilizáveis.',
  active: true,
  createdAt: now(),
  updatedAt: now(),
};
const defaultGlobalGuidelines = `COMPOSIÇÃO GERAL
- Preservar informações comerciais exatamente como fornecidas; preço, nome, parcelamento, logo e selo são renderizados deterministicamente.
- Manter área comercial legível, sem sobrepor produto ou fotos.

FOTOS DO PRODUTO
- A variação principal usa FOTO 1 como PRIMARY: maior destaque visual.
- A FOTO 2 da variação principal é SECONDARY: menor, próxima da foto principal e nunca uma duplicação da FOTO 1.
- Cada outra variação usa somente sua FOTO 1 como miniatura representativa.
- As fotos das outras variações ficam em galeria horizontal, com borda branca fina e sem texto dentro das imagens.
- Nunca misturar fotos de variações diferentes ou inventar fotos.`;

function modelFromRow(row: any): ElementModel {
  return {
    id: row.id,
    name: row.name,
    elementType: row.element_type,
    contentKind: row.content_kind,
    opportunityId: row.opportunity_id,
    prompt: row.prompt || '',
    referenceFiles: row.reference_files || [],
    generatedAssetUrl: row.generated_asset_url,
    generationInputHash: row.generation_input_hash,
    generationVersion: row.generation_version || 1,
    status: row.status || 'NO_PREVIEW',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function campaignFromRow(row: any): PostCampaign {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    generalGuidelines: row.general_guidelines,
    active: row.active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function previewFromRow(row: any): PostPreviewCache {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    productId: row.product_id,
    format: row.format,
    inputHash: row.input_hash,
    imageUrl: row.image_url,
    status: row.status || 'UPDATED',
    accepted: row.accepted === true,
    pinned: row.pinned === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function normalizePreview(preview: PostPreviewCache): PostPreviewCache {
  return { ...preview, accepted: preview.accepted === true, pinned: preview.pinned === true };
}
function storePreviews(previews: PostPreviewCache[]) {
  try {
    writeLocal('previews', previews);
  } catch {
    /* O banco continua sendo a fonte persistente se o limite do navegador for atingido. */
  }
}

export type PostWriteOptions = { confirm?: boolean; isCurrent?: () => boolean };
async function confirmedWrite(query: PromiseLike<any>, expected: Record<string, unknown>, options: PostWriteOptions, label: string, removing = false) {
  if (options.isCurrent && !options.isCurrent()) throw Object.assign(new Error('A campanha ou a sessão mudou. Reabra a operação.'), { knownFailure: true });
  let result;
  try { result = await withTimeout(query, 20_000, null, label); }
  catch { throw Object.assign(new Error(label + ' não foi confirmado. Confira antes de repetir.'), { uncertain: true }); }
  if (!result) throw Object.assign(new Error(label + ' não foi confirmado. Confira antes de repetir.'), { uncertain: true });
  if (result.error) {
    const knownFailure = /^(22|23|42)/.test(result.error.code || '') || /^PGRST20[0-5]$/.test(result.error.code || '');
    throw Object.assign(new Error(result.error.message || label + ' recusado pelo servidor.'), { knownFailure, uncertain: !knownFailure });
  }
  const row = removing ? result.data?.length === 1 && result.data[0] : result.data;
  const matches = row && Object.entries(expected).every(([key, value]) => {
    if (value === undefined) return true;
    if (key.endsWith('_at')) return Date.parse(row[key]) === Date.parse(String(value));
    if (key === 'reference_files') {
      const fields = (references: any) => Array.isArray(references) ? references.map((item) => [item.id, item.name, item.fileUrl, item.mimeType]) : null;
      return JSON.stringify(fields(row[key])) === JSON.stringify(fields(value));
    }
    return row[key] === value;
  });
  if (!matches) throw Object.assign(new Error('O recibo de ' + label.toLowerCase() + ' não corresponde à operação. Confira antes de repetir.'), { uncertain: true });
  if (options.isCurrent && !options.isCurrent()) throw Object.assign(new Error('O contexto mudou durante a operação. Confira o resultado antes de repetir.'), { uncertain: true });
}
function cacheConfirmed(write: () => void) { try { write(); } catch { /* O recibo remoto permanece válido quando o cache local está indisponível. */ } }

export const postCreatorService = {
  async globalGuidelines(options: { confirm?: boolean } = {}): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('post_creator_global_rules')
        .select('guidelines')
        .eq('id', true)
        .maybeSingle();
      if (!error && typeof data?.guidelines === 'string') return data.guidelines;
      if (options.confirm && (error || data !== null)) throw new Error('A consulta das regras não foi confirmada.');
    } catch (error) { if (options.confirm) throw error; }
    return (
      localStorage.getItem('morante_post_creator_global_guidelines') || defaultGlobalGuidelines
    );
  },
  async saveGlobalGuidelines(guidelines: string, options: PostWriteOptions = {}): Promise<void> {
    const payload = { id: true, guidelines, updated_at: now() };
    if (options.confirm) {
      await confirmedWrite(supabase.from('post_creator_global_rules').upsert(payload).select().single(), payload, options, 'Salvar regras globais');
      cacheConfirmed(() => localStorage.setItem('morante_post_creator_global_guidelines', guidelines));
      return;
    }
    localStorage.setItem('morante_post_creator_global_guidelines', guidelines);
    await supabase.from('post_creator_global_rules').upsert(payload).then(() => undefined, () => undefined);
  },
  async campaigns(options: { confirm?: boolean } = {}): Promise<PostCampaign[]> {
    try {
      const { data, error } = await supabase
        .from('post_creator_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        const values = data.map(campaignFromRow);
        if (options.confirm) { const merged = [...values.map((item) => ({ ...item, persistedRemotely: true })), ...localPostCreator.campaigns().filter((item) => item.persistedRemotely !== true && !values.some((remote) => remote.id === item.id)).map((item) => ({ ...item, persistedRemotely: false }))]; cacheConfirmed(() => writeLocal('campaigns', merged)); return merged; }
        if (!values.length)
          await supabase.from('post_creator_campaigns').upsert({
            id: fallbackCampaign.id,
            name: fallbackCampaign.name,
            description: fallbackCampaign.description,
            active: true,
            created_at: fallbackCampaign.createdAt,
            updated_at: fallbackCampaign.updatedAt,
          });
        writeLocal('campaigns', values.length ? values : [fallbackCampaign]);
        return values.length ? values : [fallbackCampaign];
      }
      if (options.confirm) throw new Error('A consulta das campanhas não foi confirmada.');
    } catch (error) { if (options.confirm) throw error; }
    const values = localPostCreator.campaigns();
    return values.length ? values : [fallbackCampaign];
  },
  async saveCampaign(value: Partial<PostCampaign>, options: PostWriteOptions = {}): Promise<PostCampaign> {
    const existing = localPostCreator.campaigns().find((item) => item.id === value.id);
    const saved: PostCampaign = {
      ...fallbackCampaign,
      ...existing,
      ...value,
      id: value.id || crypto.randomUUID(),
      name: value.name?.trim() || 'Nova campanha',
      updatedAt: now(),
      createdAt: existing?.createdAt || now(),
    };
    const cache = () => writeLocal('campaigns', [saved, ...localPostCreator.campaigns().filter((item) => item.id !== saved.id)]);
    const payload = { id: saved.id, name: saved.name, description: saved.description, general_guidelines: saved.generalGuidelines, active: saved.active, created_at: saved.createdAt, updated_at: saved.updatedAt };
    if (options.confirm) {
      await confirmedWrite(supabase.from('post_creator_campaigns').upsert(payload).select().single(), payload, options, 'Salvar campanha'); saved.persistedRemotely = true; cacheConfirmed(cache);
    } else { cache(); await supabase.from('post_creator_campaigns').upsert(payload).then(() => undefined, () => undefined); }
    return saved;
  },
  async removeCampaign(id: string, options: PostWriteOptions = {}): Promise<void> {
    const cache = () => { writeLocal('campaigns', localPostCreator.campaigns().filter((item) => item.id !== id)); writeLocal('links', localPostCreator.links().filter((item) => item.campaignId !== id)); };
    if (options.confirm) {
      await confirmedWrite(supabase.from('post_creator_campaigns').delete().eq('id', id).select('id'), { id }, options, 'Excluir campanha', true); cacheConfirmed(cache);
    } else { cache(); await supabase.from('post_creator_campaigns').delete().eq('id', id).then(() => undefined, () => undefined); }
  },
  async models(options: { confirm?: boolean } = {}): Promise<ElementModel[]> {
    const local = localPostCreator.models();
    try {
      const { data, error } = await supabase
        .from('post_creator_element_models')
        .select('*')
        .order('created_at', { ascending: false });
      if (options.confirm && !error && Array.isArray(data)) { const values = data.map(modelFromRow); const merged = [...values.map((item) => ({ ...item, persistedRemotely: true })), ...local.filter((item) => item.persistedRemotely !== true && !values.some((remote) => remote.id === item.id)).map((item) => ({ ...item, persistedRemotely: false }))]; cacheConfirmed(() => writeLocal('models', merged)); return merged; }
      if (!error && data && data.length > 0) {
        const values = data.map(modelFromRow);
        // Combinar: modelos do banco têm precedência, mas modelos locais que não estão no banco são preservados
        const merged = [...values, ...local.filter((l) => !values.some((v) => v.id === l.id))];
        writeLocal('models', merged);
        return merged;
      }
      if (options.confirm) throw new Error('A consulta dos modelos não foi confirmada.');
    } catch (error) { if (options.confirm) throw error; }
    return local;
  },
  async saveModel(value: ElementModel, options: PostWriteOptions = {}): Promise<ElementModel> {
    const saved: ElementModel = { ...value, updatedAt: now(), createdAt: value.createdAt || now() };
    const cache = () => writeLocal('models', [saved, ...localPostCreator.models().filter((item) => item.id !== saved.id)]);
    const payload = { id: saved.id, name: saved.name, element_type: saved.elementType, content_kind: saved.contentKind, opportunity_id: saved.opportunityId || null, prompt: saved.prompt, reference_files: saved.referenceFiles, generated_asset_url: saved.generatedAssetUrl, generation_input_hash: saved.generationInputHash, generation_version: saved.generationVersion, status: saved.status, created_at: saved.createdAt, updated_at: saved.updatedAt };
    if (options.confirm) {
      await confirmedWrite(supabase.from('post_creator_element_models').upsert(payload).select().single(), payload, options, 'Salvar modelo'); saved.persistedRemotely = true; cacheConfirmed(cache);
    } else { cache(); await supabase.from('post_creator_element_models').upsert(payload).then(() => undefined, () => undefined); }
    return saved;
  },
  async links(campaignId: string, options: { confirm?: boolean } = {}): Promise<CampaignElementModel[]> {
    const local = localPostCreator.links().filter((item) => item.campaignId === campaignId);
    try {
      const { data, error } = await supabase
        .from('post_creator_campaign_element_models')
        .select('*')
        .eq('campaign_id', campaignId);
      if (!error && data && (data.length > 0 || options.confirm)) {
        const values = data.map((row: any) => ({
          campaignId: row.campaign_id,
          elementModelId: row.element_model_id,
          elementType: row.element_type,
          opportunityId: row.opportunity_id,
          active: row.active,
          createdAt: row.created_at,
        }));
        const merged = [
          ...values,
          ...local.filter(
            (l) =>
              !values.some(
                (v) => v.elementModelId === l.elementModelId && v.elementType === l.elementType
              )
          ),
        ];
        const others = localPostCreator.links().filter((item) => item.campaignId !== campaignId);
        if (options.confirm) { const confirmed = [...values.map((item) => ({ ...item, persistedRemotely: true })), ...local.filter((item) => item.persistedRemotely !== true && !values.some((remote) => remote.elementModelId === item.elementModelId && remote.elementType === item.elementType)).map((item) => ({ ...item, active: false, persistedRemotely: false }))]; cacheConfirmed(() => writeLocal('links', [...others, ...confirmed])); return confirmed; }
        writeLocal('links', [...others, ...merged]);
        return merged;
      }
      if (options.confirm) throw new Error('A consulta dos vínculos não foi confirmada.');
    } catch (error) { if (options.confirm) throw error; }
    return local;
  },
  async linkModel(link: CampaignElementModel, options: PostWriteOptions = {}): Promise<void> {
    const next = [
      ...localPostCreator
        .links()
        .filter(
          (item) =>
            !(item.campaignId === link.campaignId && item.elementModelId === link.elementModelId)
        ),
      link,
    ];
    const payload = { campaign_id: link.campaignId, element_model_id: link.elementModelId, element_type: link.elementType, opportunity_id: link.opportunityId || null, active: link.active, created_at: link.createdAt };
    if (options.confirm) {
      await confirmedWrite(supabase.from('post_creator_campaign_element_models').upsert(payload).select().single(), payload, options, 'Vincular modelo'); next[next.length - 1] = { ...link, persistedRemotely: true }; cacheConfirmed(() => writeLocal('links', next));
    } else { writeLocal('links', next); await supabase.from('post_creator_campaign_element_models').upsert(payload).then(() => undefined, () => undefined); }
  },

  async activate(
    campaignId: string,
    elementType: ElementType,
    modelId: string,
    opportunityId?: string | null
  ): Promise<void> {
    const links = localPostCreator
      .links()
      .map((link) =>
        link.campaignId === campaignId &&
        link.elementType === elementType &&
        (elementType !== 'BADGE' || link.opportunityId === opportunityId)
          ? { ...link, active: link.elementModelId === modelId }
          : link
      );
    writeLocal('links', links);
    let disable = supabase
      .from('post_creator_campaign_element_models')
      .update({ active: false })
      .eq('campaign_id', campaignId)
      .eq('element_type', elementType);
    if (elementType === 'BADGE')
      disable = opportunityId
        ? disable.eq('opportunity_id', opportunityId)
        : disable.is('opportunity_id', null);
    await disable.then(() => undefined, () => undefined);
    await supabase
      .from('post_creator_campaign_element_models')
      .update({ active: true })
      .eq('campaign_id', campaignId)
      .eq('element_model_id', modelId)
      .then(() => undefined, () => undefined);
  },
  async unlink(campaignId: string, modelId: string): Promise<void> {
    writeLocal(
      'links',
      localPostCreator
        .links()
        .filter((link) => !(link.campaignId === campaignId && link.elementModelId === modelId))
    );
    await supabase
      .from('post_creator_campaign_element_models')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('element_model_id', modelId)
      .then(() => undefined, () => undefined);
  },
  async previewHistory(
    campaignId: string,
    productId: string,
    format: PostPreviewCache['format']
  ): Promise<PostPreviewCache[]> {
    try {
      const { data, error } = await supabase
        .from('post_creator_previews')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('product_id', productId)
        .eq('format', format)
        .order('created_at', { ascending: false });
      if (!error && data) {
        const history = data.map(previewFromRow);
        const others = localPostCreator
          .previews()
          .map(normalizePreview)
          .filter(
            (item) =>
              item.campaignId !== campaignId ||
              item.productId !== productId ||
              item.format !== format
          );
        storePreviews([...history, ...others]);
        return history;
      }
    } catch {
      /* fallback local */
    }
    return previewsForContext(
      localPostCreator.previews().map(normalizePreview),
      campaignId,
      productId,
      format
    );
  },
  async preview(
    inputHash: string,
    campaignId?: string,
    productId?: string,
    format?: PostPreviewCache['format']
  ): Promise<PostPreviewCache | undefined> {
    const values =
      campaignId && productId && format
        ? await this.previewHistory(campaignId, productId, format)
        : localPostCreator.previews().map(normalizePreview);
    return values.find(
      (preview) => preview.inputHash === inputHash && preview.status === 'UPDATED'
    );
  },
  async savePreview(preview: PostPreviewCache): Promise<void> {
    const normalized = normalizePreview(preview);
    storePreviews([
      normalized,
      ...localPostCreator
        .previews()
        .map(normalizePreview)
        .filter((item) => item.id !== normalized.id),
    ]);
    const { error } = await supabase.from('post_creator_previews').upsert({
      id: normalized.id,
      campaign_id: normalized.campaignId,
      product_id: normalized.productId,
      format: normalized.format,
      input_hash: normalized.inputHash,
      image_url: normalized.imageUrl,
      status: normalized.status,
      accepted: normalized.accepted,
      pinned: normalized.pinned,
      created_at: normalized.createdAt,
      updated_at: normalized.updatedAt,
    });
    if (error) throw error;
    await this.prunePreviewHistory(normalized.campaignId, normalized.productId, normalized.format);
  },
  async acceptPreview(preview: PostPreviewCache): Promise<void> {
    const changedAt = now();
    const values = localPostCreator
      .previews()
      .map(normalizePreview)
      .map((item) =>
        item.campaignId === preview.campaignId &&
        item.productId === preview.productId &&
        item.format === preview.format
          ? { ...item, accepted: item.id === preview.id, updatedAt: changedAt }
          : item
      );
    storePreviews(values);
    const context = supabase
      .from('post_creator_previews')
      .update({ accepted: false, updated_at: changedAt })
      .eq('campaign_id', preview.campaignId)
      .eq('product_id', preview.productId)
      .eq('format', preview.format);
    const { error: clearError } = await context;
    if (clearError) throw clearError;
    const { error } = await supabase
      .from('post_creator_previews')
      .update({ accepted: true, updated_at: changedAt })
      .eq('id', preview.id);
    if (error) throw error;
  },
  async pinPreview(preview: PostPreviewCache, pinned: boolean): Promise<void> {
    const changedAt = now();
    storePreviews(
      localPostCreator
        .previews()
        .map(normalizePreview)
        .map((item) => (item.id === preview.id ? { ...item, pinned, updatedAt: changedAt } : item))
    );
    const { error } = await supabase
      .from('post_creator_previews')
      .update({ pinned, updated_at: changedAt })
      .eq('id', preview.id);
    if (error) throw error;
  },
  async removePreview(preview: PostPreviewCache): Promise<void> {
    storePreviews(localPostCreator.previews().filter((item) => item.id !== preview.id));
    const { error } = await supabase.from('post_creator_previews').delete().eq('id', preview.id);
    if (error) throw error;
  },
  async prunePreviewHistory(
    campaignId: string,
    productId: string,
    format: PostPreviewCache['format']
  ): Promise<void> {
    const history = previewsForContext(
      localPostCreator.previews().map(normalizePreview),
      campaignId,
      productId,
      format
    );
    const ids = previewIdsToPrune(history);
    if (!ids.length) return;
    storePreviews(localPostCreator.previews().filter((item) => !ids.includes(item.id)));
    const { error } = await supabase.from('post_creator_previews').delete().in('id', ids);
    if (error) throw error;
  },
  sortNewest,
};
