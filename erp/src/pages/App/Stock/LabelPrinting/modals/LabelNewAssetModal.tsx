import type React from 'react';

interface LabelNewAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  newLogoImage: string;
  newLogoName: string;
  setNewLogoName: (name: string) => void;
  onConfirm: () => void;
}

export const LabelNewAssetModal: React.FC<LabelNewAssetModalProps> = ({
  isOpen,
  onClose,
  newLogoImage,
  newLogoName,
  setNewLogoName,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div
        role="button"
        tabIndex={0}
        aria-label="Cancelar criação de novo ativo"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-fade-in"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
            onClose();
          }
        }}
      />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 animate-in zoom-in-95 duration-300">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
            <i className="bi bi-image text-xl" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">
              Confirmar Novo Ativo
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              Dê um nome para este logotipo / rótulo
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="aspect-square w-full rounded-[2rem] bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden p-4 group">
            <img
              src={newLogoImage || ''}
              alt="Preview"
              className="w-full h-full object-contain transition-transform group-hover:scale-110"
            />
          </div>

          <div>
            <label
              htmlFor="new-asset-name-input"
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block px-2"
            >
              Nome do Ativo
            </label>
            <input
              id="new-asset-name-input"
              type="text"
              value={newLogoName}
              onChange={(e) => setNewLogoName(e.target.value.toUpperCase())}
              placeholder="EX: LOGO MORANTE PRINCIPAL"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 border border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-[1.5] px-6 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all text-center cursor-pointer"
            >
              Salvar na Biblioteca
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabelNewAssetModal;
