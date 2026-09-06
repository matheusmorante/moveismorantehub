import React, { useEffect, useMemo, useState } from 'react';
import { PostModelAsset, PostModelExtra, PostTemplate } from '../types/postTemplate';
import { usePostEditor } from './Editor/usePostEditor';
import { generatePostModelPreview } from '../services/postModelPreviewGenerator';
import {
  extractProductImagesFromProduct,
  resolveModelAssets,
  validateGenerationPreFlight,
} from '../services/postModelAssetResolver';
import {
  assemblePreviewPrompt,
} from '../services/postModelPreviewGenerator';
import { postGenerationGuidelines } from '../services/postGenerationGuidelines';
import {
  GenerationContextData,
  GenerationContextModal,
} from './GenerationContextModal';

interface Props {
  value?: PostTemplate;
  onClose: () => void;
  onSave: (value: Partial<PostTemplate>) => Promise<void>;
}

const readFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export function ModelFormModal({ value, onClose, onSave }: Props) {
  const editor = usePostEditor();
  const [name, setName] = useState(value?.name || '');
  const [description] = useState('');
  const [prompt, setPrompt] = useState(value?.imagePrompt || '');
  const [format, setFormat] = useState<'4:5' | '9:16'>(
    value?.aspectRatio === '9:16' ? '9:16' : '4:5'
  );
  const [assets, setAssets] = useState<PostModelAsset[]>(value?.assets || []);
  const [extras, setExtras] = useState<PostModelExtra[]>(value?.extras || []);
  const [saving, setSaving] = useState(false);

  // Estados do Preview e Debug
  const [previewImage, setPreviewImage] = useState<string>();
  const [previewHash, setPreviewHash] = useState('');
  const [previewStatus, setPreviewStatus] = useState<'updated' | 'stale' | 'incomplete' | 'none'>('none');
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [debugModalOpen, setDebugModalOpen] = useState(false);
  const [productResultsOpen, setProductResultsOpen] = useState(false);

  useEffect(() => {
    setName(value?.name || '');
    setPrompt(value?.imagePrompt || '');
    setAssets(value?.assets || []);
    setExtras(value?.extras || []);
  }, [value?.id]);

  const draft: PostTemplate = useMemo(
    () => ({
      ...(value || {}),
      id: value?.id || 'new',
      name,
      description,
      imagePrompt: prompt,
      formats: [format],
      aspectRatio: format,
      assets,
      extras,
      version: value?.version || 1,
      status: value?.status || 'ACTIVE',
      category: value?.category || 'Promoção',
      width: 1080,
      height: format === '9:16' ? 1920 : 1350,
      fields: value?.fields || [],
      layout: value?.layout || [],
      reservedAreas: value?.reservedAreas || [],
      imageRules: value?.imageRules || { preserveProduct: true, generateEnvironment: true, fit: 'contain' },
      generationConfig: value?.generationConfig || { provider: 'gemini', model: 'gemini-2.5-flash-image', referenceImageRequired: true },
      createdAt: value?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as PostTemplate),
    [value, name, description, prompt, format, assets, extras]
  );

  // Extração semântica das imagens do produto (Regras 4 e 5)
  const productImages = useMemo(() => {
    if (!editor.product && !editor.data) return { primary: '', variations: [] };
    return extractProductImagesFromProduct(editor.product || editor.data);
  }, [editor.product, editor.data]);

  const resolvedAssets = useMemo(
    () => resolveModelAssets(draft, editor.opportunity?.name),
    [draft, editor.opportunity?.name]
  );

  // Hash completo para controle de cache e invalidação (Regra 17)
  const currentHash = useMemo(() => {
    const guidelines = postGenerationGuidelines.get();
    return JSON.stringify({
      prompt,
      format,
      opportunity: editor.opportunity?.name || '',
      productName: editor.data?.name || '',
      productPrice: editor.data?.price || '',
      guidelines: guidelines.content,
      primaryImage: productImages.primary,
      secondaryImage: productImages.secondary || '',
      variationImages: productImages.variations,
      assets: assets.map((a) => [a.id, a.name, a.fileUrl]),
      referenceUrl: resolvedAssets.primaryVisualReference?.fileUrl || '',
    });
  }, [prompt, format, editor.opportunity?.name, editor.data, productImages, assets, resolvedAssets]);

  // Recupera preview salvo no localStorage
  useEffect(() => {
    const key = `morante_post_model_preview:${draft.id}:${editor.product?.id || ''}:${format}`;
    try {
      const cached = JSON.parse(localStorage.getItem(key) || 'null');
      if (cached?.image) {
        setPreviewImage(cached.image);
        setPreviewHash(cached.hash || '');
        setPreviewStatus(cached.hash === currentHash ? 'updated' : 'stale');
      } else {
        setPreviewImage(undefined);
        setPreviewHash('');
        setPreviewStatus('none');
      }
    } catch {
      setPreviewImage(undefined);
      setPreviewHash('');
      setPreviewStatus('none');
    }
  }, [editor.product?.id, draft.id, format, currentHash]);

  // Monta contexto completo para depuração / inspeção (Regra 13)
  const currentDebugData: GenerationContextData = useMemo(() => {
    let finalPromptStr = '';
    try {
      if (editor.data && prompt.trim()) {
        finalPromptStr = assemblePreviewPrompt({
          template: draft,
          product: {
            name: editor.data.name,
            price: editor.data.price,
            oldPrice: editor.data.oldPrice,
              installmentValue: (editor.data as any).installmentValue,
            mainImageUrl: productImages.primary,
            category: editor.product?.category,
            description: editor.product?.description,
          },
          format,
          opportunityName: editor.opportunity?.name,
          images: productImages,
          assets: resolvedAssets,
        });
      }
    } catch (e: any) {
      finalPromptStr = `[Erro na validação do prompt]: ${e.message}`;
    }

    return {
      productName: editor.data?.name || 'Nenhum produto selecionado',
      productPrice: editor.data?.price || '—',
      productOldPrice: editor.data?.oldPrice,
      opportunityName: editor.opportunity?.name,
      resolvedOpportunity: /queima|salvados/i.test(editor.opportunity?.name || '')
        ? 'QUEIMA_DOS_SALVADOS'
        : 'SEM_OPORTUNIDADE',
      format,
      hasPrimaryImage: !!productImages.primary,
      hasSecondaryImage: !!productImages.secondary,
      variationImagesCount: productImages.variations.length,
      hasPrimaryVisualReference: !!resolvedAssets.primaryVisualReference,
      hasLogoAsset: !!resolvedAssets.logoAsset,
      hasOpportunityAsset: !!resolvedAssets.opportunityAsset,
      hasInstallmentAsset: !!resolvedAssets.installmentAsset,
      finalPrompt: finalPromptStr || prompt,
    };
  }, [draft, editor.data, editor.product, editor.opportunity, format, productImages, resolvedAssets, prompt]);

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const added = await Promise.all(
      [...files]
        .filter((file) => /^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type) || file.type === 'application/pdf')
        .map(async (file) => ({
          id: crypto.randomUUID(),
          name: file.name,
          fileUrl: await readFile(file),
          mimeType: file.type,
        }))
    );
    setAssets((current) => [...current, ...added]);
  };

  const generatePreview = async () => {
    if (!editor.data || !prompt.trim()) return;
    setPreviewBusy(true);
    setPreviewError('');

    try {
      const result = await generatePostModelPreview({
        model: draft,
        product: {
          name: editor.data.name,
          price: editor.data.price,
          oldPrice: editor.data.oldPrice,
          installmentValue: (editor.data as any).installmentValue,
          mainImageUrl: productImages.primary,
          category: editor.product?.category,
          description: editor.product?.description,
        },
        productId: editor.product?.id || '',
        format,
        opportunity: editor.opportunity?.name,
        images: productImages,
      });

      const key = `morante_post_model_preview:${draft.id}:${editor.product?.id || ''}:${format}`;
      localStorage.setItem(
        key,
        JSON.stringify({
          image: result.imageUrl,
          hash: currentHash,
          generatedAt: new Date().toISOString(),
          provider: 'gemini',
        })
      );

      setPreviewImage(result.imageUrl);
      setPreviewHash(currentHash);
      setPreviewStatus('updated');
    } catch (error: any) {
      setPreviewError(error.message || 'Não foi possível gerar um novo preview.');
      setPreviewStatus('incomplete');
    } finally {
      setPreviewBusy(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !prompt.trim()) return;
    setSaving(true);
    try {
      await onSave(draft);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn">
      <form
        onSubmit={submit}
        className="max-h-[94vh] w-full max-w-6xl overflow-hidden rounded-xl border border-slate-700 bg-slate-900 text-white shadow-2xl flex flex-col"
      >
        <header className="flex items-center justify-between border-b border-slate-700 p-5 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">
              {value ? 'Editar modelo de post' : 'Novo modelo de post'}
            </h2>
            <p className="text-xs text-slate-400">
              Instruções de IA, referências visuais oficiais e preview de teste multimodal.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-lg"
          >
            ✕
          </button>
        </header>

        <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1fr_1.1fr]">
          {/* Coluna Esquerda: Formulário de Configuração */}
          <div className="overflow-y-auto p-5 space-y-4 border-r border-slate-800">
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-300">
                Nome do Modelo *
              </label>
              <input
                required
                className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                placeholder="Ex: Queima dos Salvados — Produto Promocional"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-semibold text-slate-300">
                Produto para Testar Preview
              </label>
              <input
                className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                placeholder="Buscar produto por nome..."
                value={editor.search}
                onFocus={() => setProductResultsOpen(true)}
                onChange={(e) => { editor.setSearch(e.target.value); setProductResultsOpen(true); }}
              />
              {productResultsOpen && <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-1 shadow-xl">
                {editor.products.filter((p) => p.id).map((p) => <button key={p.id} type="button" onClick={() => { void editor.selectProduct(p.id!); setProductResultsOpen(false); }} className="block w-full rounded px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800">{p.name || p.title}</button>)}
                {!editor.loading && editor.products.length === 0 && <p className="p-3 text-center text-xs text-slate-500">Nenhum produto encontrado.</p>}
              </div>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">Oportunidade</label>
              <div className="mt-1 flex h-9 items-center rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-amber-300 font-medium">
                {editor.opportunity?.name || ''}
              </div>
            </div>

            <div>
              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Prompt do Modelo *
                </label>
              </div>
              <textarea
                required
                rows={10}
                className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-xs leading-relaxed text-white focus:border-indigo-500 outline-none font-mono"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Instruções de layout e estética para a geração..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Arquivos e Referências do Modelo ({assets.length})
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {assets.map((asset) => (
                  <article
                    key={asset.id}
                    className="overflow-hidden rounded border border-slate-700 bg-slate-950 text-[11px] text-slate-300"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-2 py-1.5"><span className="truncate font-medium" title={asset.name}>{asset.name}</span><button type="button" onClick={() => setAssets((curr) => curr.filter((a) => a.id !== asset.id))} className="text-slate-400 hover:text-rose-300">×</button></div>
                    {asset.mimeType === 'application/pdf' || /\.pdf$/i.test(asset.name) ? <div className="flex h-20 items-center justify-center gap-2 text-rose-300"><i className="bi bi-file-earmark-pdf text-2xl" /><b>PDF</b></div> : <img src={asset.fileUrl} alt={asset.name} className="h-20 w-full object-contain p-1" />}
                  </article>
                ))}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition-colors">
                <span>+ Adicionar referências</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => void addFiles(e.target.files)}
                />
              </label>
            </div>

            <footer className="pt-3 flex gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar modelo'}
              </button>
            </footer>
          </div>

          {/* Coluna Direita: Preview e Inspeção de Debug */}
          <aside className="flex flex-col items-center justify-between bg-slate-950/80 p-5 overflow-y-auto">
            <div className="w-full flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <b className="text-xs uppercase tracking-wider text-slate-400">Preview Multimodal</b>
                {previewStatus === 'updated' && (
                  <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                    ✓ Atualizado
                  </span>
                )}
                {previewStatus === 'stale' && (
                  <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
                    ⚠ Desatualizado
                  </span>
                )}
                {previewStatus === 'incomplete' && (
                  <span className="rounded bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[11px] font-semibold text-rose-400">
                    ⚠ Resultado incompleto
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setDebugModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-indigo-300 hover:bg-slate-800 hover:text-indigo-200 transition-colors"
              >
                <span>[Ver contexto da geração]</span>
              </button>
            </div>

            <div className="my-auto flex flex-col items-center justify-center p-2 text-center w-full">
              {previewImage ? (
                <div className="relative group max-w-full">
                  <img
                    src={previewImage}
                    alt="Preview do post gerado"
                    className="max-h-[58vh] max-w-full rounded-lg shadow-xl object-contain border border-slate-800"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-800 p-8 max-w-sm">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Nenhum preview gerado para este produto.
                    <br />
                    Selecione um produto ao lado e gere uma arte para validar o modelo.
                  </p>
                </div>
              )}

              {previewError && (
                <div className="mt-3 w-full max-w-md rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs text-rose-300">
                  {previewError}
                </div>
              )}
            </div>

            <div className="w-full pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">
                {productImages.primary ? (
                  <>
                    Variações: <strong className="text-white">{productImages.variations.length}</strong>
                    {productImages.secondary ? ' · 2ª foto inclusa' : ''}
                  </>
                ) : (
                  'Selecione um produto com foto'
                )}
              </span>

              <button
                type="button"
                disabled={!editor.data || !productImages.primary || previewBusy}
                onClick={() => void generatePreview()}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors disabled:opacity-50 shadow-lg"
              >
                {previewBusy ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Gerando preview...</span>
                  </>
                ) : (
                  <span>✨ {previewImage ? 'Gerar novo preview' : 'Gerar preview com IA'}</span>
                )}
              </button>
            </div>
          </aside>
        </div>
      </form>

      {/* Modal de Debug / Inspeção do Contexto da Geração */}
      {debugModalOpen && (
        <GenerationContextModal
          data={currentDebugData}
          onClose={() => setDebugModalOpen(false)}
        />
      )}
    </div>
  );
}
