import { supabase } from '@/pages/utils/supabaseConfig';
import { PostTemplate } from '../types/postTemplate';
import { compositionLayers } from './compositionDefaults';
import { dbRowToTemplate, templateToDbRow } from './postTemplateMapper';

const STORAGE_KEY = 'morante_post_templates_v2';
const DELETED_KEY = 'morante_post_templates_deleted_v2';
const now = () => new Date().toISOString();

const createBaseTemplate = (name: string, aspectRatio: PostTemplate['aspectRatio'], description: string): PostTemplate => ({
  id: crypto.randomUUID(),
  version: 1,
  name,
  slug: name.toLowerCase().replaceAll(' ', '-'),
  description,
  status: 'ACTIVE',
  category: 'Promoção',
  aspectRatio,
  width: 1080,
  height: aspectRatio === '9:16' ? 1920 : aspectRatio === '4:5' ? 1350 : 1080,
  imagePrompt: 'Use exatamente {{product.name}} como referência. Preserve forma, cor, materiais e proporções. Crie um ambiente comercial elegante, sem textos, marcas, preços ou selos.',
  fields: [
    { key: 'title', label: 'Título', type: 'text', required: true, maxLength: 80, source: 'name' },
    { key: 'price', label: 'Preço', type: 'currency', required: true, source: 'price' },
    { key: 'oldPrice', label: 'Preço anterior', type: 'currency', source: 'oldPrice' },
    { key: 'installment', label: 'Parcelamento', type: 'text' },
  ],
  layout: compositionLayers,
  reservedAreas: [
    { region: 'top-left', reason: 'título' },
    { region: 'bottom-right', reason: 'preço' },
  ],
  imageRules: { preserveProduct: true, generateEnvironment: true, fit: 'contain' },
  generationConfig: { provider: 'gemini', model: 'gemini-2.5-flash-image', referenceImageRequired: true },
  createdAt: now(),
  updatedAt: now(),
});

const defaultQueima: PostTemplate = {
  ...createBaseTemplate(
    'Queima dos Salvados — Produto Promocional',
    '4:5',
    'Modelo promocional para divulgação de móveis, com produto em destaque, preço forte, parcelamento e variações.'
  ),
  id: 'system-queima-salvados-promocional',
  slug: 'queima-dos-salvados-produto-promocional',
  formats: ['4:5', '9:16'],
  imagePrompt: `Crie um post promocional profissional para loja de móveis. Use {{product.name}} como produto principal, grande, fiel e facilmente identificável. Fundo escuro e quente, com marrom/preto, iluminação comercial e detalhes em vermelho, amarelo, laranja e branco. Preserve integralmente geometria, cor, material, portas, gavetas, puxadores, pés e proporções. Não gere textos, preços, logos, cartões ou selos: estes devem usar os assets fornecidos. Para 4:5, deixe produto à esquerda/centro e área comercial à direita; para 9:16, adapte verticalmente sem esticar o feed. Quando houver ambiente, seja residencial e coerente com a categoria do produto.`,
  assets: [
    { id: 'morante-logo', name: 'Logo Móveis Morante', description: 'Usar no topo esquerdo, sem redesenho.', fileUrl: '/images/logo-morante.png', mimeType: 'image/png' },
    { id: 'queima-badge', name: 'Selo Queima dos Salvados', description: 'Usar no topo direito como referência e asset oficial.', fileUrl: '/assets/queima-salvados-original.png', mimeType: 'image/png' },
  ],
  extras: [
    { id: 'visual-priority', name: 'Prioridade visual', type: 'TEXT', textValue: 'Produto e preço promocional devem receber o maior destaque.' },
    { id: 'product-preservation', name: 'Preservação do produto', type: 'TEXT', textValue: 'Nunca modificar características físicas do móvel.' },
    { id: 'identity', name: 'Identidade', type: 'TEXT', textValue: 'Fundo escuro/quente com vermelho, amarelo, branco e tons de marrom.' },
    { id: 'variations', name: 'Variações', type: 'TEXT', textValue: 'Mostrar somente fotos com borda branca, sem textos.' },
    { id: 'installments', name: 'Parcelamento', type: 'TEXT', textValue: 'Usar dados reais e assets oficiais disponíveis.' },
  ],
};

export const defaultTemplates: PostTemplate[] = [
  defaultQueima,
  createBaseTemplate('Oferta Clean', '1:1', 'Oferta com título e preço claros.'),
  createBaseTemplate('Preço em Destaque', '1:1', 'Produto com preço comercial destacado.'),
  createBaseTemplate('Story Promoção', '9:16', 'Modelo vertical para Stories.'),
  createBaseTemplate('Produto Fundo Branco', '1:1', 'Produto central com apresentação limpa.'),
];

const getDeletedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
};

const markAsDeletedLocally = (id: string) => {
  const set = getDeletedIds();
  set.add(id);
  localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(set)));
};

const unmarkAsDeletedLocally = (id: string) => {
  const set = getDeletedIds();
  set.delete(id);
  localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(set)));
};

const readLocal = (): PostTemplate[] => {
  const deletedIds = getDeletedIds();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data: PostTemplate[] = raw ? JSON.parse(raw) : [];
    const validSaved = Array.isArray(data) ? data.filter((item) => !deletedIds.has(item.id)) : [];

    // Inclui defaults somente se nunca tiverem sido excluídos nem salvos
    const nonOverriddenDefaults = defaultTemplates.filter(
      (def) => !deletedIds.has(def.id) && !validSaved.some((s) => s.id === def.id)
    );

    return [...validSaved, ...nonOverriddenDefaults];
  } catch {
    return defaultTemplates.filter((def) => !deletedIds.has(def.id));
  }
};

const writeLocal = (items: PostTemplate[]) => {
  const deletedIds = getDeletedIds();
  const cleaned = items.filter((item) => !deletedIds.has(item.id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
};

export const postTemplateService = {
  list: async (): Promise<PostTemplate[]> => {
    const deletedIds = getDeletedIds();

    try {
      const { data, error } = await supabase
        .from('post_templates')
        .select('*')
        .eq('deleted', false)
        .order('created_at', { ascending: false });

      if (!error && data) {
        if (data.length > 0) {
          const templates = data.map(dbRowToTemplate).filter((item) => !deletedIds.has(item.id));
          writeLocal(templates);
          return templates;
        }

        // Se o banco estiver vazio pela primeira vez, faz seed com os defaults
        const initial = defaultTemplates.filter((def) => !deletedIds.has(def.id));
        for (const tpl of initial) {
          await supabase.from('post_templates').upsert(templateToDbRow(tpl));
        }
        writeLocal(initial);
        return initial;
      }
    } catch (err) {
      console.warn('[postTemplateService] Erro ao sincronizar com o Supabase, usando cache local:', err);
    }

    return readLocal();
  },

  save: async (value: Partial<PostTemplate>): Promise<PostTemplate> => {
    const current = readLocal();
    const old = current.find((item) => item.id === value.id);
    const id = value.id || crypto.randomUUID();

    const saved: PostTemplate = {
      ...(old || defaultTemplates[0]),
      ...value,
      id,
      version: (old?.version || 0) + 1,
      updatedAt: now(),
      createdAt: old?.createdAt || now(),
    } as PostTemplate;

    unmarkAsDeletedLocally(id);
    const updated = [saved, ...current.filter((item) => item.id !== id)];
    writeLocal(updated);

    try {
      await supabase.from('post_templates').upsert(templateToDbRow(saved));
    } catch (err) {
      console.warn('[postTemplateService] Erro ao salvar template no Supabase:', err);
    }

    return saved;
  },

  remove: async (id: string): Promise<void> => {
    markAsDeletedLocally(id);
    const remaining = readLocal().filter((item) => item.id !== id);
    writeLocal(remaining);

    try {
      await supabase
        .from('post_templates')
        .update({ deleted: true, deleted_at: now() })
        .eq('id', id);
    } catch (err) {
      console.warn('[postTemplateService] Erro ao marcar modelo como deletado no Supabase:', err);
    }
  },
};
