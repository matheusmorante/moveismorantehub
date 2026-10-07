import React from 'react';
import { MeasurementInput } from '@/components/MeasurementInput';

interface PaperOption {
  readonly id: string;
  readonly name: string;
  readonly w: number;
  readonly h: number;
}

interface LabelGridModelSettingsPanelState {
  readonly name: string;
  readonly generatedName: string;
  readonly paperSize: string;
  readonly paperOptions: readonly PaperOption[];
  readonly customWidth: number;
  readonly customHeight: number;
  readonly columns: number;
  readonly rows: number;
  readonly imageScale: number;
  readonly gapH: number;
  readonly gapV: number;
  readonly marginT: number;
  readonly marginB: number;
  readonly marginL: number;
  readonly marginR: number;
}

interface LabelGridModelSettingsPanelHandlers {
  readonly onNameChange: (value: string) => void;
  readonly onPaperSizeChange: (value: string) => void;
  readonly onCustomWidthChange: (value: number) => void;
  readonly onCustomHeightChange: (value: number) => void;
  readonly onColumnsChange: (value: number) => void;
  readonly onRowsChange: (value: number) => void;
  readonly onDecreaseImageScale: () => void;
  readonly onImageScaleChange: (value: number) => void;
  readonly onIncreaseImageScale: () => void;
  readonly onGapHChange: (value: number) => void;
  readonly onGapVChange: (value: number) => void;
  readonly onMarginTChange: (value: number) => void;
  readonly onMarginBChange: (value: number) => void;
  readonly onMarginLChange: (value: number) => void;
  readonly onMarginRChange: (value: number) => void;
}

interface LabelGridModelSettingsPanelProps {
  readonly state: LabelGridModelSettingsPanelState;
  readonly handlers: LabelGridModelSettingsPanelHandlers;
}

export const LabelGridModelSettingsPanel: React.FC<LabelGridModelSettingsPanelProps> = ({
  state,
  handlers,
}) => (
  <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3 lg:col-span-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          Nome do Modelo
        </p>
        <span className="text-[9px] text-slate-400 font-bold">
          Personalize o nome para identificar facilmente
        </span>
      </div>
      <input
        type="text"
        value={state.name}
        onChange={(event) => handlers.onNameChange(event.target.value)}
        placeholder={state.generatedName}
        className="w-full bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-blue-500 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-800 dark:text-white outline-none transition-all"
      />
      <p className="text-[9px] text-slate-400 italic">
        Deixe em branco para usar o nome padrão gerado pela grade: <b>{state.generatedName}</b>
      </p>
    </div>

    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-4">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Papel</p>
      <select
        value={state.paperSize}
        onChange={(event) => handlers.onPaperSizeChange(event.target.value)}
        className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl p-4 text-sm font-black outline-none"
      >
        {state.paperOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      {state.paperSize === 'Custom' && (
        <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
          <input
            type="number"
            step="0.1"
            placeholder="L"
            value={state.customWidth}
            onChange={(event) =>
              handlers.onCustomWidthChange(parseFloat(event.target.value) || 0)
            }
            className="w-full bg-slate-100 rounded-xl p-3 text-center font-black"
          />
          <input
            type="number"
            step="0.1"
            placeholder="H"
            value={state.customHeight}
            onChange={(event) =>
              handlers.onCustomHeightChange(parseFloat(event.target.value) || 0)
            }
            className="w-full bg-slate-100 rounded-xl p-3 text-center font-black"
          />
        </div>
      )}
    </div>

    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-4">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
        Grade de Impressão
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">
            Colunas
          </label>
          <input
            type="number"
            value={state.columns}
            onChange={(event) => handlers.onColumnsChange(parseInt(event.target.value) || 1)}
            className="w-full bg-slate-100 rounded-xl p-3 text-center font-black"
          />
        </div>
        <div>
          <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">
            Linhas
          </label>
          <input
            type="number"
            value={state.rows}
            onChange={(event) => handlers.onRowsChange(parseInt(event.target.value) || 1)}
            className="w-full bg-slate-100 rounded-xl p-3 text-center font-black"
          />
        </div>
      </div>
    </div>

    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          Escala da Imagem (Zoom)
        </p>
        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
          x{Number(state.imageScale).toFixed(2)}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={handlers.onDecreaseImageScale}
          className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-500 transition-all flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm"
        >
          <i className="bi bi-dash-lg" />
        </button>
        <input
          type="range"
          min="0.1"
          max="10"
          step="0.01"
          value={state.imageScale}
          onChange={(event) => handlers.onImageScaleChange(parseFloat(event.target.value))}
          className="flex-1 accent-blue-600 cursor-pointer h-2 bg-slate-100 rounded-lg appearance-none"
        />
        <button
          onClick={handlers.onIncreaseImageScale}
          className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-500 transition-all flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm"
        >
          <i className="bi bi-plus-lg" />
        </button>
      </div>
      <p className="text-[7px] text-slate-400 italic">
        Ajuste o zoom com precisão. Clique nos botões para ajuste fino (0.01) ou deslize para
        mudanças rápidas.
      </p>
    </div>

    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-4">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
        Distância entre Etiquetas (Gaps mm)
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">
            Horizontal
          </label>
          <input
            type="number"
            step="0.1"
            value={state.gapH}
            onChange={(event) => handlers.onGapHChange(parseFloat(event.target.value) || 0)}
            className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl p-3 text-center font-black"
          />
        </div>
        <div>
          <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">
            Vertical
          </label>
          <input
            type="number"
            step="0.1"
            value={state.gapV}
            onChange={(event) => handlers.onGapVChange(parseFloat(event.target.value) || 0)}
            className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl p-3 text-center font-black"
          />
        </div>
      </div>
    </div>

    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-4 lg:col-span-3">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
        Margens do Papel (Sangria mm)
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">
            Topo (T)
          </label>
          <MeasurementInput
            unit="mm"
            showBadge={false}
            value={state.marginT}
            onChangeValue={(value) => handlers.onMarginTChange(value || 0)}
            className="w-full bg-transparent text-center font-black text-blue-600 outline-none"
          />
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">
            Base (B)
          </label>
          <MeasurementInput
            unit="mm"
            showBadge={false}
            value={state.marginB}
            onChangeValue={(value) => handlers.onMarginBChange(value || 0)}
            className="w-full bg-transparent text-center font-black text-blue-600 outline-none"
          />
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">
            Esq. (L)
          </label>
          <MeasurementInput
            unit="mm"
            showBadge={false}
            value={state.marginL}
            onChangeValue={(value) => handlers.onMarginLChange(value || 0)}
            className="w-full bg-transparent text-center font-black text-blue-600 outline-none"
          />
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">
            Dir. (R)
          </label>
          <MeasurementInput
            unit="mm"
            showBadge={false}
            value={state.marginR}
            onChangeValue={(value) => handlers.onMarginRChange(value || 0)}
            className="w-full bg-transparent text-center font-black text-blue-600 outline-none"
          />
        </div>
      </div>
      <p className="text-[7px] text-slate-400 italic text-center">
        Para modelos 1x1 (térmicos), deixe todos em 0 para não ter bordas brancas.
      </p>
    </div>
  </div>
);
