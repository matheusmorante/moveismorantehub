import type React from 'react';
import { toast } from 'react-toastify';
import type { CategoryType } from '../hooks/useLabelCategory';
import type { GridModel } from '../types/LabelGridModelTypes';
import type { LabelConfig } from '../utils/LabelConstants';
import { calculateLabelDimensions } from '../utils/LabelUtils';

interface LabelModelManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: CategoryType | null;
  layoutModels: GridModel[];
  customLayouts: GridModel[];
  config: LabelConfig;
  selectLayout: (model: GridModel) => void;
  setEditingGridModel: (model: GridModel | null) => void;
  setGridModalOpen: (open: boolean) => void;
  handleDeleteLayout: (id: string) => Promise<void> | void;
}

export const LabelModelManagerModal: React.FC<LabelModelManagerModalProps> = ({
  isOpen,
  onClose,
  selectedCategory,
  layoutModels,
  customLayouts,
  config,
  selectLayout,
  setEditingGridModel,
  setGridModalOpen,
  handleDeleteLayout,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-950 w-full h-full md:w-[95vw] md:h-[92vh] rounded-none md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up border-0 md:border border-white/20 dark:border-slate-800/50">
        {/* Header do Modal */}
        <div className="px-6 py-5 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <i className="bi bi-grid-3x3-gap-fill text-xl" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">
                  Gerenciador de Modelos de Etiqueta
                </h2>
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-black uppercase rounded-full">
                  {selectedCategory === 'precos'
                    ? 'Etiquetas de Preço'
                    : selectedCategory === 'identificacao'
                      ? 'Etiquetas de Identificação'
                      : 'Logotipos e Artes'}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-400">
                Escolha um modelo de grade, crie novos formatos customizados ou edite as
                especificações da folha
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setEditingGridModel(null);
                setGridModalOpen(true);
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <i className="bi bi-plus-lg text-sm" />
              <span>Novo Modelo</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <i className="bi bi-x-lg text-base" />
            </button>
          </div>
        </div>

        {/* Conteúdo / Lista de Modelos em Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {layoutModels.map((model) => {
              const dims = calculateLabelDimensions(model);
              const isActive = config.layoutId === model.id;
              const isCustom = customLayouts.some((c) => c.id === model.id);

              return (
                <div
                  key={model.id}
                  className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between gap-4 bg-white dark:bg-slate-900 ${
                    isActive
                      ? 'border-blue-500 shadow-xl shadow-blue-500/10 ring-4 ring-blue-500/10 dark:ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700 hover:shadow-lg'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isActive ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
                        >
                          <i className={`bi ${model.icon || 'bi-grid-1x2-fill'} text-lg`} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase text-slate-800 dark:text-slate-100 tracking-tight">
                            {model.name}
                          </h4>
                          <span className="text-[10px] font-bold text-slate-400">
                            {model.paperSize} &bull; {dims.width} x {dims.height} mm
                          </span>
                        </div>
                      </div>

                      {isActive && (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[9px] font-black uppercase rounded-lg flex items-center gap-1">
                          <i className="bi bi-check-circle-fill text-[10px]" /> Ativo
                        </span>
                      )}
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between">
                        <span>Capacidade:</span>
                        <strong className="text-slate-700 dark:text-slate-200">
                          {model.columns * model.rows} etiquetas/folha
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Grade:</span>
                        <strong className="text-slate-700 dark:text-slate-200">
                          {model.columns} colunas x {model.rows} linhas
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Margens T/B/L/R:</span>
                        <span className="text-slate-600 dark:text-slate-300">
                          {model.marginT}/{model.marginB}/{model.marginL}/{model.marginR} mm
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        selectLayout(model);
                        setGridModalOpen(false);
                        onClose();
                        toast.success(`Modelo "${model.name}" selecionado!`);
                      }}
                      className={`flex-1 py-2.5 px-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 active:scale-95'
                      }`}
                    >
                      <i className={`bi ${isActive ? 'bi-check-lg' : 'bi-check2-circle'}`} />
                      {isActive ? 'Selecionado' : 'Usar Modelo'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingGridModel(model);
                        setGridModalOpen(true);
                      }}
                      className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-2xl transition-colors cursor-pointer"
                      title="Editar Especificações"
                    >
                      <i className="bi bi-pencil-fill text-xs" />
                    </button>

                    {isCustom && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`Excluir modelo "${model.name}"?`)) {
                            await handleDeleteLayout(model.id);
                          }
                        }}
                        className="p-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-600 rounded-2xl transition-colors cursor-pointer"
                        title="Excluir Modelo"
                      >
                        <i className="bi bi-trash3-fill text-xs" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabelModelManagerModal;
