import type React from 'react';
import { useRef } from 'react';
import type { LabelLogoAsset } from '../types/LabelGridItem.types';

interface LabelAssetLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableLogos: LabelLogoAsset[];
  onUploadLogo: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectLogo: (logo: Pick<LabelLogoAsset, 'image' | 'name'>) => void;
  onDeleteLogo: (id: string) => void;
  isBusy?: boolean;
  isUploading?: boolean;
  error?: string;
}

export const LabelAssetLibraryModal: React.FC<LabelAssetLibraryModalProps> = ({
  isOpen,
  onClose,
  availableLogos,
  onUploadLogo,
  onSelectLogo,
  onDeleteLogo,
  isBusy = false,
  isUploading = false,
  error = '',
}) => {
  const localInputRef = useRef<HTMLInputElement>(null);
  const close = () => { if (!isBusy) onClose(); };

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Biblioteca de ativos" onKeyDown={(event) => { if (event.key === 'Escape') close(); }} className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <input
        type="file"
        ref={localInputRef}
        className="hidden"
        accept="image/*"
        aria-label="Carregar ativo de etiqueta"
        disabled={isBusy}
        onChange={onUploadLogo}
      />
      <div
        role="button"
        tabIndex={0}
        aria-label="Fechar biblioteca de ativos"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in"
        onClick={close}
        onKeyDown={(e) => {
          if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
            close();
          }
        }}
      />
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 lg:p-10 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-[1.5rem] bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-500/20">
              <i className="bi bi-images text-2xl" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">
                Biblioteca de Logotipos / Rótulos
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                Gerencie seus ativos visuais para etiquetas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={isBusy}
            aria-label="Fechar ativos"
            className="w-12 h-12 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors"
          >
            <i className="bi bi-x-lg text-lg" />
          </button>
        </div>
        {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
        {isBusy && <p role="status" className="mb-4 flex items-center gap-2 text-sm text-blue-600"><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />{isUploading ? 'Lendo imagem do ativo…' : 'Atualizando ativos…'}</p>}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Ativos Disponíveis ({availableLogos.length})
              </h4>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => localInputRef.current?.click()}
                className="px-5 py-3 bg-indigo-600 text-white rounded-2xl hover:scale-105 active:scale-95 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 flex items-center gap-2 cursor-pointer"
              >
                <i className="bi bi-cloud-arrow-up-fill" />
                Subir Novo Logotipo/Rótulo
              </button>
            </div>

            {availableLogos.length === 0 ? (
              <div className="py-20 text-center bg-slate-50 dark:bg-slate-950/20 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                <i className="bi bi-image text-4xl text-slate-200 mb-4 block" />
                <p className="text-[10px] font-black text-slate-400 uppercase">
                  Sua biblioteca está vazia
                </p>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => localInputRef.current?.click()}
                  className="mt-4 text-[9px] font-black uppercase text-indigo-600 hover:underline cursor-pointer"
                >
                  Carregar meu primeiro ativo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {availableLogos.map((logo) => (
                  <div
                    key={logo.id}
                    className="group relative bg-white dark:bg-slate-800 rounded-[2rem] p-4 border border-slate-100 dark:border-slate-700 hover:border-indigo-500 hover:shadow-xl transition-all"
                  >
                    <div className="aspect-square rounded-[1.5rem] overflow-hidden bg-slate-50 dark:bg-slate-900 mb-3 relative">
                      <img src={logo.image} alt="" className="w-full h-full object-contain p-2" />
                      <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLogo(logo);
                          }}
                          className="px-4 py-2 rounded-xl bg-white text-indigo-600 text-[9px] font-black uppercase hover:scale-110 active:scale-95 transition-all shadow-lg cursor-pointer"
                        >
                          Selecionar
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteLogo(logo.id);
                          }}
                          className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg cursor-pointer"
                          title="Deletar permanentemente"
                        >
                          <i className="bi bi-trash3-fill" />
                        </button>
                      </div>
                    </div>
                    <div className="px-1 truncate">
                      <p className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">
                        {logo.name || 'SEM NOME'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800 text-center">
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
            Os ativos selecionados serão adicionados à fila de impressão principal
          </p>
        </div>
      </div>
    </div>
  );
};

export default LabelAssetLibraryModal;
