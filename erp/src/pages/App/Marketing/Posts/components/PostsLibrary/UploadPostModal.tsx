import React, { useCallback, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { PostCampaign } from '../../types/postCreator';
import { ProductPostFormat, productPostFormatLabel } from '../../types/postSpecification';
import { productPostsService } from '../../services/productPostsService';

interface UploadPostModalProps {
  campaigns: PostCampaign[];
  /** Se fornecido, o produto já está selecionado e não pode ser alterado. */
  preselectedProductId?: string;
  preselectedProductName?: string;
  onClose: () => void;
  onUploaded: () => void;
  /** Necessário quando productId não está pré-selecionado — lista para busca */
  onSearchProducts?: (query: string) => Promise<Array<{ id: string; name: string; slug: string }>>;
}

type StepKey = 'product' | 'campaign' | 'format' | 'image' | 'confirm';

interface FormState {
  productId: string;
  productName: string;
  campaignId: string;
  format: ProductPostFormat | '';
  file: File | null;
  previewUrl: string;
  ratioMessage: string;
  ratioValid: boolean;
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
  const [productResults, setProductResults] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const step: StepKey = (() => {
    if (!preselectedProductId && !form.productId) return 'product';
    if (!form.format) return 'format';
    if (!form.file) return 'image';
    return 'confirm';
  })();

  const handleSearchProduct = useCallback(async (q: string) => {
    setProductQuery(q);
    if (!q.trim() || !onSearchProducts) { setProductResults([]); return; }
    setSearching(true);
    try {
      const results = await onSearchProducts(q);
      setProductResults(results);
    } finally {
      setSearching(false);
    }
  }, [onSearchProducts]);

  const handleFileChange = async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    const validation = await productPostsService.validateImageRatio(file);

    const suggestedFormat = validation.format ?? form.format;

    setForm(prev => ({
      ...prev,
      file,
      previewUrl,
      ratioValid: validation.valid,
      ratioMessage: validation.message ?? '',
      format: suggestedFormat || prev.format,
    }));

    if (!validation.valid && validation.message) {
      toast.warn(validation.message);
    } else if (validation.format) {
      toast.info(`Formato detectado automaticamente: ${productPostFormatLabel[validation.format]}`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) void handleFileChange(file);
  };

  const handleUpload = async () => {
    if (!form.productId || !form.format || !form.file) return;
    setUploading(true);
    try {
      await productPostsService.uploadPost({
        productId: form.productId,
        file: form.file,
        format: form.format as ProductPostFormat,
        campaignId: form.campaignId || null,
      });
      toast.success('Post adicionado à Biblioteca!');
      onUploaded();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar o post.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 className="font-bold text-white">Adicionar post à Biblioteca</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="space-y-5 p-5">
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
                  <button onClick={() => setForm(prev => ({ ...prev, productId: '', productName: '' }))} className="text-xs text-slate-400 hover:text-red-400">Trocar</button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={productQuery}
                    onChange={e => void handleSearchProduct(e.target.value)}
                    placeholder="Buscar produto..."
                    className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none ring-1 ring-slate-700 focus:ring-indigo-500"
                  />
                  {productResults.length > 0 && (
                    <ul className="absolute top-full z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
                      {productResults.map(p => (
                        <li key={p.id}>
                          <button
                            onClick={() => { setForm(prev => ({ ...prev, productId: p.id, productName: p.name })); setProductResults([]); }}
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
              value={form.campaignId}
              onChange={e => setForm(prev => ({ ...prev, campaignId: e.target.value }))}
              className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-white outline-none ring-1 ring-slate-700 focus:ring-indigo-500"
            >
              <option value="">— Sem campanha específica —</option>
              {campaigns.filter(c => c.active).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Formato */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">Formato *</label>
            <div className="flex gap-2">
              {(['FEED_4_5', 'STORY_STATUS_9_16'] as ProductPostFormat[]).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setForm(prev => ({ ...prev, format: fmt }))}
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
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/40 p-6 text-center transition hover:border-indigo-500/60 hover:bg-slate-800"
            >
              {form.previewUrl ? (
                <img src={form.previewUrl} alt="preview" className="max-h-40 rounded-lg object-contain" />
              ) : (
                <>
                  <span className="text-3xl">🖼️</span>
                  <p className="text-xs text-slate-400">Clique ou arraste a imagem aqui</p>
                  <p className="text-[10px] text-slate-600">Feed 4:5 ou Story/Status 9:16 — proporção detectada automaticamente</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void handleFileChange(f); }}
            />
            {form.ratioMessage && (
              <p className={`mt-1.5 text-[10px] ${form.ratioValid ? 'text-emerald-400' : 'text-amber-400'}`}>
                {form.ratioMessage}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-800 px-5 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white">Cancelar</button>
          <button
            onClick={() => void handleUpload()}
            disabled={!form.productId || !form.format || !form.file || uploading}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {uploading ? 'Enviando…' : 'Adicionar à Biblioteca'}
          </button>
        </div>
      </div>
    </div>
  );
}
