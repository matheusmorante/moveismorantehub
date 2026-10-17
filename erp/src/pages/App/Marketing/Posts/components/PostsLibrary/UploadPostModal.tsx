import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { withTimeout } from '../../../../../../../../shared-utils/withTimeout';
import { submittedSearchFormSchema } from '../../../../../../../../shared-utils/lookupFormSchemas';
import type { ProductPost } from '../../types/postSpecification';
import { toast } from 'react-toastify';
import { PostCampaign } from '../../types/postCreator';
import { ProductPostFormat, productPostFormatLabel } from '../../types/postSpecification';
import { productPostsService } from '../../services/productPostsService';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { postUploadFormSchema } from '../../../../../../../../shared-utils/marketingFormSchemas';
import { storefrontImageUploadFormSchema } from '../../../../../../../../shared-utils/storefrontProductFormSchemas';

interface UploadPostModalProps {
  campaigns: PostCampaign[];
  /** Se fornecido, o produto já está selecionado e não pode ser alterado. */
  preselectedProductId?: string;
  preselectedProductName?: string;
  onClose: () => void;
  onUploaded: () => void | boolean | Promise<void | boolean>;
  /** Necessário quando productId não está pré-selecionado — lista para busca */
  onSearchProducts?: (query: string) => Promise<Array<{ id: string; name: string; slug: string }>>;
}

interface FormState {
  productId: string;
  productName: string;
  campaignId: string;
  format: ProductPostFormat | '';
  file: File | null;
  previewUrl: string;
  ratioMessage: string;
  ratioValid: boolean;
  detectedFormat: ProductPostFormat | null;
}

const INITIAL: FormState = {
  productId: '',
  productName: '',
  campaignId: '',
  format: '',
  file: null,
  previewUrl: '',
  ratioMessage: '',
  ratioValid: false,
  detectedFormat: null,
};

export function UploadPostModal({
  campaigns,
  preselectedProductId,
  preselectedProductName,
  onClose,
  onUploaded,
  onSearchProducts,
}: UploadPostModalProps) {
  const [form, setForm] = useState<FormState>({
    ...INITIAL,
    productId: preselectedProductId ?? '',
    productName: preselectedProductName ?? '',
  });
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState<
    Array<{ id: string; name: string; slug: string }>
  >([]);
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadForm = useZodForm(postUploadFormSchema, { productId: form.productId, campaignId: form.campaignId, format: form.format || 'FEED_4_5', file: form.file as File, ratioValid: form.ratioValid, detectedFormat: form.detectedFormat });
  const fileForm = useZodForm(storefrontImageUploadFormSchema, { files: [] });

  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const active = useRef(true), inFlight = useRef(false), uncertain = useRef(false);
  const savedPost = useRef<ProductPost | null>(null);
  const attemptId = useRef<string | undefined>(undefined);
  const { user } = useAuth();
  const context = useRef({ productId: preselectedProductId, userId: user?.id });
  if (context.current.productId !== preselectedProductId || context.current.userId !== user?.id) context.current = { productId: preselectedProductId, userId: user?.id };
  const searchSequence = useRef(0);
  const { enqueueAndRun: searchProduct } = useZodForm(submittedSearchFormSchema, { search: productQuery });
  const campaignSource = useRef(campaigns); campaignSource.current = campaigns;
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    setForm({ ...INITIAL, productId: preselectedProductId || '', productName: preselectedProductName || '' });
    savedPost.current = null; attemptId.current = undefined; uncertain.current = false; setErrorMessage('');
  }, [preselectedProductId, preselectedProductName, user?.id]);
  useEffect(() => { const url = form.previewUrl; return () => { if (url) URL.revokeObjectURL(url); }; }, [form.previewUrl]);
  const showError = (message: string) => { setErrorMessage(message); toast.error(message); };
  const close = () => { if (!inFlight.current) onClose(); };
  const handleSearchProduct = useCallback(async (q: string) => {
    if (inFlight.current || savedPost.current) return;
    const sequence = ++searchSequence.current, scope = context.current;
    setProductQuery(q); setProductResults([]);
    if (!q.trim() || !onSearchProducts) { setSearching(false); return; }
    setSearching(true);
    const current = () => active.current && context.current === scope && sequence === searchSequence.current;
    try {
      await searchProduct({ search: q }, async (values) => {
        if (!current()) return;
        const results = await withTimeout(onSearchProducts(values.search), 15_000, null, 'Buscar produto da arte');
        if (!current()) return;
        if (!Array.isArray(results)) throw new Error('A busca não foi confirmada. Tente novamente.');
        setProductResults(results);
      }, (errors) => { if (current()) showError(Object.values(flattenFormErrors(errors))[0]); });
    } catch (error) { if (current()) showError(error instanceof Error ? error.message : 'Falha ao buscar o produto.'); }
    finally { if (current()) setSearching(false); }
  }, [onSearchProducts, searchProduct]);

  const handleFileChange = async (file: File) => {
    if (inFlight.current || savedPost.current || uncertain.current) return;
    inFlight.current = true; setUploading(true); setErrorMessage(''); setStatusMessage('Conferindo proporção da imagem...');
    const scope = context.current, current = () => active.current && context.current === scope;
    try {
      await fileForm.validateAndRun({ files: [file] }, async (values) => {
        const validation = await withTimeout(productPostsService.validateImageRatio(values.files[0]), 12_000, null, 'Proporção da arte');
        if (!current()) return;
        if (!validation) throw new Error('A conferência da imagem demorou demais. Selecione novamente.');
        const previewUrl = URL.createObjectURL(values.files[0]);
        setForm((prev) => ({ ...prev, file: values.files[0], previewUrl, ratioValid: validation.valid, detectedFormat: validation.format, ratioMessage: validation.message || '', format: validation.format || prev.format }));
        if (!validation.valid) showError(validation.message || 'A proporção da imagem não corresponde ao formato do post.');
      }, (errors) => { if (current()) showError(Object.values(flattenFormErrors(errors))[0]); });
    } catch (error) { if (current()) showError(error instanceof Error ? error.message : 'Não foi possível conferir a imagem.'); }
    finally { inFlight.current = false; if (active.current) { setUploading(false); setStatusMessage(''); } }
  };
  const handleDrop = (event: React.DragEvent) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file && !inFlight.current) void handleFileChange(file); };

  const handleUpload = async () => {
    if (inFlight.current) return;
    if (!user?.id) { showError('Aguarde a confirmação da sessão.'); return; }
    if (uncertain.current) { showError('Há um upload sem confirmação. Confira a biblioteca antes de repetir.'); return; }
    inFlight.current = true; setUploading(true); setErrorMessage('');
    const scope = context.current;
    const current = () => active.current && context.current === scope;
    let writing = false;
    try {
      await uploadForm.validateAndRun({ productId: form.productId, campaignId: form.campaignId, format: form.format as ProductPostFormat, file: form.file as File, ratioValid: form.ratioValid, detectedFormat: form.detectedFormat }, async (values) => {
        const stillEligible = () => current() && (!values.campaignId || campaignSource.current.some((campaign) => campaign.id === values.campaignId && campaign.active));
        if (!stillEligible()) throw new Error('A campanha ou o produto mudou. Revise a seleção.');
        if (!savedPost.current) {
          setStatusMessage('Enviando arquivo e confirmando a biblioteca...'); writing = true;
          attemptId.current ||= crypto.randomUUID();
          const saved = await withTimeout(productPostsService.uploadPost({ productId: values.productId, postId: attemptId.current, file: values.file, format: values.format, campaignId: values.campaignId || null }, { isCurrent: stillEligible }), 65_000, null, 'Upload da arte');
          if (!saved || saved.id !== attemptId.current || saved.productId !== values.productId || saved.format !== values.format || saved.campaignId !== (values.campaignId || null)) throw Object.assign(new Error('O registro da arte não foi confirmado. Confira a biblioteca antes de repetir.'), { uncertain: true });
          if (!current()) return false;
          savedPost.current = saved;
        }
        setStatusMessage('Arte salva. Atualizando a biblioteca...');
        const refreshed = await withTimeout(Promise.resolve(onUploaded()).then((result) => result !== false), 50_000, false, 'Atualizar biblioteca após upload');
        if (!current()) return false;
        if (!refreshed) throw new Error('A arte foi salva, mas a lista não foi atualizada. Tente atualizar novamente.');
        toast.success('Post adicionado à Biblioteca!'); onClose(); return true;
      }, (errors) => { if (current()) showError(Object.values(flattenFormErrors(errors))[0]); });
    } catch (error) {
      if (writing && !savedPost.current && (!error || typeof error !== 'object' || !('knownFailure' in error) || error.knownFailure !== true)) uncertain.current = true;
      if (current()) showError(error instanceof Error ? error.message : 'Não foi possível confirmar o upload.');
    } finally { inFlight.current = false; if (active.current) { setUploading(false); setStatusMessage(''); } }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 className="font-bold text-white">Adicionar post à Biblioteca</h2>
          <button onClick={close}
            disabled={uploading} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        {errorMessage && <p role="alert" className="px-5 text-sm text-red-300">{errorMessage}</p>}
        {statusMessage && <p role="status" className="px-5 text-sm text-indigo-200"><i className="bi bi-arrow-repeat animate-spin inline-block mr-2" aria-hidden="true" />{statusMessage}</p>}
        <fieldset disabled={uploading || Boolean(savedPost.current) || uncertain.current} className="min-w-0 space-y-5 p-5">
          {/* Produto */}
          {preselectedProductId ? (
            <div className="rounded-lg bg-slate-800/60 px-3 py-2">
              <span className="text-xs text-slate-400">Produto:</span>
              <p className="font-semibold text-white">{form.productName}</p>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Produto *</label>
              {form.productId ? (
                <div className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2">
                  <span className="text-sm text-white">{form.productName}</span>
                  <button
                    onClick={() => setForm((prev) => ({ ...prev, productId: '', productName: '' }))}
                    className="text-xs text-slate-400 hover:text-red-400"
                  >
                    Trocar
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={productQuery}
                    onChange={(e) => void handleSearchProduct(e.target.value)}
                    placeholder="Buscar produto..."
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none ring-1 ring-slate-700 focus:ring-indigo-500"
                  />
                  {productResults.length > 0 && (
                    <ul className="absolute top-full z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
                      {productResults.map((p) => (
                        <li key={p.id}>
                          <button
                            onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                productId: p.id,
                                productName: p.name,
                              }));
                              setProductResults([]);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-700"
                          >
                            {p.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {searching && <p className="mt-1 text-xs text-slate-500">Buscando…</p>}
                </div>
              )}
            </div>
          )}

          {/* Campanha (opcional) */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">
              Campanha <span className="text-slate-500">(opcional)</span>
            </label>
            <select
              aria-label="Campanha da arte"
              value={form.campaignId}
              onChange={(e) => setForm((prev) => ({ ...prev, campaignId: e.target.value }))}
              className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-white outline-none ring-1 ring-slate-700 focus:ring-indigo-500"
            >
              <option value="">— Sem campanha específica —</option>
              {campaigns
                .filter((c) => c.active)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Formato */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">Formato *</label>
            <div className="flex gap-2">
              {(['FEED_4_5', 'STORY_STATUS_9_16'] as ProductPostFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setForm((prev) => ({ ...prev, format: fmt }))}
                  className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition ${form.format === fmt ? 'border-indigo-500 bg-indigo-600/30 text-white' : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'}`}
                >
                  {productPostFormatLabel[fmt]}
                </button>
              ))}
            </div>
          </div>

          {/* Upload */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">Imagem *</label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => { if (!inFlight.current && !savedPost.current) fileInputRef.current?.click(); }}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/40 p-6 text-center transition hover:border-indigo-500/60 hover:bg-slate-800"
            >
              {form.previewUrl ? (
                <img
                  src={form.previewUrl}
                  alt="preview"
                  className="max-h-40 rounded-lg object-contain"
                />
              ) : (
                <>
                  <span className="text-3xl">🖼️</span>
                  <p className="text-xs text-slate-400">Clique ou arraste a imagem aqui</p>
                  <p className="text-[10px] text-slate-600">
                    Feed 4:5 ou Story/Status 9:16 — proporção detectada automaticamente
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              aria-label="Arquivo da arte"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFileChange(f);
              }}
            />
            {form.ratioMessage && (
              <p
                className={`mt-1.5 text-[10px] ${form.ratioValid ? 'text-emerald-400' : 'text-amber-400'}`}
              >
                {form.ratioMessage}
              </p>
            )}
          </div>
        </fieldset>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-800 px-5 py-4">
          <button
            onClick={close}
            disabled={uploading}
            className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white"
          >
            Cancelar
          </button>
          <button
            onClick={() => void handleUpload()}
            disabled={!form.productId || !form.format || !form.file || uploading}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {uploading ? 'Aguarde…' : savedPost.current ? 'Atualizar Biblioteca' : 'Adicionar à Biblioteca'}
          </button>
        </div>
      </div>
    </div>
  );
}
