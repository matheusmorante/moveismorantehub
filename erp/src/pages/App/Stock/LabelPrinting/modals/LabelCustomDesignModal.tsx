import type React from 'react';
import type { LabelLogoAsset } from '../types/LabelGridItem.types';
import type { CustomLabel } from '../utils/LabelConstants';

interface LabelCustomDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingLabel: CustomLabel | null;
  labelFormName: string;
  setLabelFormName: (name: string) => void;
  labelFormImage: string;
  setLabelFormImage: (image: string) => void;
  availableLogos: LabelLogoAsset[];
  handleSaveCustomLabel: () => void;
}

export const LabelCustomDesignModal: React.FC<LabelCustomDesignModalProps> = ({
  isOpen,
  onClose,
  editingLabel,
  labelFormName,
  setLabelFormName,
  labelFormImage,
  setLabelFormImage,
  availableLogos,
  handleSaveCustomLabel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div
        role="button"
        tabIndex={0}
        aria-label="Cancelar criação de rótulo"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
            onClose();
          }
        }}
      />
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 lg:p-10 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <i className="bi bi-bookmark-plus-fill text-xl" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">
                {editingLabel ? 'Editar Rótulo' : 'Criar Novo Rótulo'}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                Vincule uma imagem ao seu banco de rótulos prontos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 cursor-pointer"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="custom-label-name-input"
                  className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block px-2"
                >
                  Nome do Rótulo
                </label>
                <input
                  id="custom-label-name-input"
                  type="text"
                  value={labelFormName}
                  onChange={(e) => setLabelFormName(e.target.value)}
                  placeholder="EX: RÓTULO VINHO TINTO 750ML"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-outfit"
                />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block px-2">
                  Visualização Atual
                </p>
                <div className="aspect-square w-full rounded-[2.5rem] bg-slate-50 dark:bg-slate-950/40 border-2 border-dashed border-slate-100 dark:border-slate-800 flex items-center justify-center p-6 group">
                  {labelFormImage ? (
                    <img
                      src={labelFormImage}
                      alt=""
                      className="max-w-full max-h-full object-contain transition-transform group-hover:scale-110"
                    />
                  ) : (
                    <div className="text-center">
                      <i className="bi bi-image text-4xl text-slate-200 mb-2 block" />
                      <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
                        Nenhuma imagem selecionada
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block px-2">
                Selecione uma Imagem da Biblioteca
              </p>
              <div className="grid grid-cols-3 gap-3">
                {availableLogos.length === 0 ? (
                  <div className="col-span-3 py-10 text-center bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-relaxed">
                      Sua biblioteca de imagens está vazia.
                      <br />
                      Suba imagens primeiro.
                    </p>
                  </div>
                ) : (
                  availableLogos.map((logo) => (
                    <button
                      type="button"
                      key={logo.id}
                      onClick={() => {
                        setLabelFormImage(logo.image);
                        if (!labelFormName) setLabelFormName(logo.name);
                      }}
                      className={`aspect-square rounded-2xl border-2 p-2 relative overflow-hidden transition-all cursor-pointer ${
                        labelFormImage === logo.image
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-50 dark:border-slate-800 hover:border-slate-200'
                      }`}
                    >
                      <img src={logo.image} alt="" className="w-full h-full object-contain" />
                      {labelFormImage === logo.image && (
                        <div className="absolute top-1 right-1 bg-blue-500 text-white w-4 h-4 rounded-full flex items-center justify-center">
                          <i className="bi bi-check text-[10px]" />
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-8 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-8 py-5 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveCustomLabel}
            className="flex-[1.5] px-8 py-5 bg-blue-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all text-center cursor-pointer"
          >
            {editingLabel ? 'Salvar Alterações' : 'Criar Rótulo Definido'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LabelCustomDesignModal;
