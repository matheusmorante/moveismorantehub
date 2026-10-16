import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { labelImageUploadFormSchema, labelImageQueryFormSchema, labelImageDeleteFormSchema, labelImageSelectionFormSchema } from '../../../../../../../shared-utils/labelImageFormSchemas';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import type { CategoryType } from '../hooks/useLabelCategory';
import {
  createLabelImage,
  deleteLabelImage,
  fetchLabelImages,
} from '../services/labelImageService';
import type { LabelImage } from '../types/LabelImage.types';
export type { LabelImage } from '../types/LabelImage.types';

export interface LabelImageModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSelect: (image: string) => void | Promise<void>;
  readonly currentCategory: CategoryType | null;
}

export const LabelImageModal: React.FC<LabelImageModalProps> = (props) => props.isOpen
  ? <LabelImageLibrary {...props} key={props.currentCategory ?? 'none'} /> : null;

const LabelImageLibrary: React.FC<LabelImageModalProps> = ({
  onClose,
  onSelect,
  currentCategory,
}) => {
  const [images, setImages] = useState<readonly LabelImage[]>([]);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState('');
  const [error, setError] = useState(''), [queryError, setQueryError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const uploadForm = useZodForm(labelImageUploadFormSchema, { files: [], name: '', category: currentCategory ?? 'logos' });
  const deleteForm = useZodForm(labelImageDeleteFormSchema, { id: 0 });
  const selectForm = useZodForm(labelImageSelectionFormSchema, { id: 0, image: '' });
  const { validateValues: validateQuery } = useZodForm(labelImageQueryFormSchema, { sort: 'newest' });
  const mounted = useRef(false), locked = useRef(false), querying = useRef(false), replayBlocked = useRef(false), request = useRef(0);
  const readerRef = useRef<FileReader | null>(null);
  const uploading = busy === 'upload';
  const disabled = Boolean(busy) || loading || blocked || Boolean(queryError);
  const close = () => { if (!locked.current) onClose(); };
  const fail = (message: string) => { if (mounted.current) { setError(message); toast.error(message); } };
  const invalid = (errors: Parameters<typeof flattenFormErrors>[0]) => fail(Object.values(flattenFormErrors(errors))[0] || 'Confira os dados da imagem.');

  const fetchImages = useCallback(async () => {
    if (querying.current || locked.current) return false;
    querying.current = true; const revision = ++request.current;
    const current = () => mounted.current && revision === request.current;
    setLoading(true); setQueryError('');
    try {
      const values = await validateQuery({ sort: 'newest' });
      if (!current()) return false;
      if (!values) throw new Error('Consulta inválida.');
      const result = await withTimeout(fetchLabelImages(values).then((rows) => ({ rows })), 15_000, null, 'etiquetas:biblioteca');
      if (!current()) return false;
      if (!result) throw new Error('Consulta sem confirmação.');
      setImages(result.rows); return true;
    } catch { if (current()) setQueryError('Não foi possível carregar a biblioteca. Tente novamente.'); return false; }
    finally { if (current()) { querying.current = false; setLoading(false); } }
  }, [validateQuery]);

  useEffect(() => {
    const requests = request;
    mounted.current = true; void fetchImages();
    return () => { mounted.current = false; requests.current++; querying.current = false; readerRef.current?.abort(); };
  }, [fetchImages]);

  const runMutation = async (operation: string, task: () => Promise<unknown>) => {
    if (!mounted.current || locked.current || replayBlocked.current || querying.current || queryError) return;
    locked.current = true; setBusy(operation); setError('');
    try { await task(); }
    catch (cause) {
      if (!mounted.current) return;
      if ((cause as { uncertain?: boolean })?.uncertain) {
        replayBlocked.current = true; setBlocked(true);
        fail('A alteração não foi confirmada. Recarregue e confira o resultado. Feche a biblioteca antes de tentar novamente.');
      } else fail(cause instanceof Error ? cause.message : 'Não foi possível concluir a operação. Confira os dados e as permissões.');
    } finally { locked.current = false; if (mounted.current) setBusy(''); }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target, file = input.files?.[0];
    if (!file) return;
    try { await runMutation('upload', () => uploadForm.validateAndRun({ files: [file], name: file.name.replace(/\.[^.]+$/, '').toUpperCase(), category: currentCategory ?? 'logos' }, async (values) => {
      if (!mounted.current) return;
      const reader = new FileReader(); readerRef.current = reader;
      try {
        const read = new Promise<string>((resolve, reject) => {
          reader.onload = () => typeof reader.result === 'string' && reader.result ? resolve(reader.result) : reject(new Error('A imagem não pôde ser lida.'));
          reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
          reader.onabort = () => reject(new Error('Leitura da imagem interrompida.'));
          reader.readAsDataURL(values.files[0]);
        });
        const readResult = await withTimeout(read.then((image) => ({ image })), 10_000, null, 'etiquetas:ler-imagem');
        if (!mounted.current) return;
        if (!readResult) throw new Error('A leitura demorou demais. Selecione a imagem novamente.');
        const result = await withTimeout(createLabelImage({ name: values.name, image: readResult.image, category: values.category }).then((image) => ({ image })), 20_000, null, 'etiquetas:salvar-imagem');
        if (!mounted.current) return;
        if (!result?.image?.id) throw { uncertain: true };
        setImages((previous) => [result.image, ...previous]); toast.success('Imagem adicionada com sucesso!');
      } finally { reader.abort(); reader.onload = null; reader.onerror = null; reader.onabort = null; if (readerRef.current === reader) readerRef.current = null; }
    }, invalid)); } finally { input.value = ''; }
  };

  const handleDelete = async (event: React.MouseEvent, id: number) => {
    event.stopPropagation();
    await runMutation('delete', () => deleteForm.validateAndRun({ id }, async (values) => {
      if (!mounted.current || !window.confirm('Excluir esta imagem permanentemente?')) return;
      const result = await withTimeout(deleteLabelImage(values.id).then(() => ({ done: true })), 20_000, null, 'etiquetas:excluir-imagem');
      if (!mounted.current) return;
      if (!result) throw { uncertain: true };
      setImages((previous) => previous.filter((image) => image.id !== values.id)); toast.success('Imagem removida com sucesso.');
    }, invalid));
  };

  const handleSelect = async (image: LabelImage) => runMutation('select', () => selectForm.validateAndRun({ id: image.id, image: image.image }, async (values) => {
    if (!mounted.current) return;
    const result = await withTimeout(Promise.resolve(onSelect(values.image)).then(() => ({ done: true })), 15_000, null, 'etiquetas:selecionar-imagem');
    if (mounted.current && !result) throw { uncertain: true };
  }, invalid));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="label-image-modal-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
      }}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm border-0 cursor-default"
        onClick={close}
        disabled={Boolean(busy)}
        aria-label="Fechar biblioteca de imagens de etiqueta"
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-5xl h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        <header className="px-10 py-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h2
              id="label-image-modal-title"
              className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight"
            >
              Biblioteca de Imagens
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Gerencie seus Logotipos e Rótulos Customizados
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={Boolean(busy)}
            aria-label="Fechar"
            className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all flex items-center justify-center"
          >
            <i className="bi bi-x-lg text-lg" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
          {queryError && <p role="alert" className="mb-4 text-sm text-red-600">{queryError}</p>}
          {(loading || busy) && <p role="status" className="mb-4 flex items-center gap-2 text-sm text-blue-600">
            <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            {loading ? 'Carregando biblioteca…' : uploading ? 'Lendo e salvando imagem…' : busy === 'delete' ? 'Excluindo imagem…' : 'Selecionando imagem…'}
          </p>}
          <button type="button" disabled={loading || Boolean(busy)} onClick={() => void fetchImages()} className="mb-4 text-sm text-blue-600 disabled:opacity-50">Recarregar biblioteca</button>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {/* Dropzone / Upload Button */}
            <label className="aspect-square border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10 hover:border-blue-400 transition-all group relative overflow-hidden">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-sm">
                {uploading ? (
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent animate-spin rounded-full" />
                ) : (
                  <i className="bi bi-cloud-arrow-up text-2xl" />
                )}
              </div>
              <div className="text-center">
                <span className="block text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-tight">
                  Nova Imagem
                </span>
                <span className="block text-[8px] text-slate-400 font-bold uppercase mt-1">
                  Carregar Arquivo
                </span>
              </div>
              <input
                type="file"
                hidden
                accept="image/*"
                aria-label="Carregar imagem de etiqueta"
                onChange={handleUpload}
                disabled={disabled}
              />
            </label>

            {loading ? (
              Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-slate-50 dark:bg-slate-800 animate-pulse rounded-[2.5rem]"
                />
              ))
            ) : images.length === 0 && !queryError ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300 pointer-events-none">
                <i className="bi bi-images text-6xl mb-4 opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest opacity-50">
                  Sua biblioteca está vazia
                </p>
              </div>
            ) : (
              images.map((img) => (
                <div
                  key={img.id}
                  className="group relative aspect-square bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 transition-all cursor-pointer"
                >
                  <button
                    type="button"
                    className="w-full h-full p-6 flex items-center justify-center relative z-10"
                    aria-label={`Selecionar imagem ${img.name}`}
                    disabled={disabled}
                    onClick={() => void handleSelect(img)}
                  >
                    <img
                      src={img.image}
                      alt={img.name}
                      className="max-w-full max-h-full object-contain drop-shadow-md"
                    />
                  </button>

                  {/* Overlay Ações - Bottom Style */}
                  <div className="absolute inset-x-0 bottom-0 p-3 flex gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-20 bg-gradient-to-t from-slate-900/60 to-transparent">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => void handleSelect(img)}
                      className="flex-1 h-9 bg-blue-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95"
                    >
                      Selecionar
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={(e) => handleDelete(e, img.id)}
                      aria-label={`Excluir ${img.name}`}
                      className="w-9 h-9 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all flex items-center justify-center"
                    >
                      <i className="bi bi-trash3-fill text-xs" />
                    </button>
                  </div>

                  {/* Label flutuante */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-full border border-slate-100 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <p className="text-[7px] font-black text-slate-800 dark:text-white uppercase truncate max-w-[80px]">
                      {img.name}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <footer className="px-10 py-6 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between shrink-0">
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">
            Tip: Clique em uma imagem para adicionar à sua fila de impressão.
          </p>
          <button
            type="button"
            onClick={close}
            disabled={Boolean(busy)}
            className="px-6 py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
          >
            Fechar Biblioteca
          </button>
        </footer>
      </div>
    </div>
  );
};

export default LabelImageModal;
