import React, { useEffect, useId, useRef, useState } from 'react';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { labelPreviewDigitFormSchema } from '../../../../../../../shared-utils/labelArtworkFormSchemas';

export interface PriceLabelTestValuesModalProps {
  isOpen: boolean;
  onClose: () => void;
  testDezenaD1: number;
  setTestDezenaD1: (val: number) => void;
  testDezenaD2: number;
  setTestDezenaD2: (val: number) => void;
  testCentenaD1: number;
  setTestCentenaD1: (val: number) => void;
  testCentenaD2: number;
  setTestCentenaD2: (val: number) => void;
  testCentenaD3: number;
  setTestCentenaD3: (val: number) => void;
  testMilharD1: number;
  setTestMilharD1: (val: number) => void;
  testMilharD2: number;
  setTestMilharD2: (val: number) => void;
  testMilharD3: number;
  setTestMilharD3: (val: number) => void;
  testMilharD4: number;
  setTestMilharD4: (val: number) => void;
  testNormalD1: number;
  setTestNormalD1: (val: number) => void;
  testNormalD2: number;
  setTestNormalD2: (val: number) => void;
  testNormalD3: number;
  setTestNormalD3: (val: number) => void;
}

export const PriceLabelTestValuesModal: React.FC<PriceLabelTestValuesModalProps> = (props) => (
  props.isOpen ? <PriceLabelTestValuesForm {...props} /> : null
);

const PriceLabelTestValuesForm: React.FC<PriceLabelTestValuesModalProps> = ({
  onClose,
  testDezenaD1,
  setTestDezenaD1,
  testDezenaD2,
  setTestDezenaD2,
  testCentenaD1,
  setTestCentenaD1,
  testCentenaD2,
  setTestCentenaD2,
  testCentenaD3,
  setTestCentenaD3,
  testMilharD1,
  setTestMilharD1,
  testMilharD2,
  setTestMilharD2,
  testMilharD3,
  setTestMilharD3,
  testMilharD4,
  setTestMilharD4,
  testNormalD1,
  setTestNormalD1,
  testNormalD2,
  setTestNormalD2,
  testNormalD3,
  setTestNormalD3,
}) => {
  const { enqueueAndRun } = useZodForm(labelPreviewDigitFormSchema, { field: 'testDezenaD1', digit: testDezenaD1 });
  const [error, setError] = useState('');
  const active = useRef(true);
  const closed = useRef(false);
  const titleId = useId();
  const errorId = useId();
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const isCurrent = () => active.current && !closed.current;
  const close = () => { if (!isCurrent()) return; closed.current = true; onClose(); };
  const setters = {
    testDezenaD1: setTestDezenaD1, testDezenaD2: setTestDezenaD2,
    testCentenaD1: setTestCentenaD1, testCentenaD2: setTestCentenaD2, testCentenaD3: setTestCentenaD3,
    testMilharD1: setTestMilharD1, testMilharD2: setTestMilharD2, testMilharD3: setTestMilharD3, testMilharD4: setTestMilharD4,
    testNormalD1: setTestNormalD1, testNormalD2: setTestNormalD2, testNormalD3: setTestNormalD3,
  };
  const changeDigit = (field: keyof typeof setters, digit: number) => {
    if (!isCurrent()) return;
    void enqueueAndRun({ field, digit }, (values) => {
      if (!isCurrent()) return false;
      setters[values.field](values.digit);
      setError('');
      return true;
    }, (errors) => {
      if (isCurrent()) setError(Object.values(flattenFormErrors(errors))[0] ?? 'Use um dígito entre 0 e 9.');
    }).catch(() => { if (isCurrent()) setError('Não foi possível aplicar o dígito da prévia.'); });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}
      style={{ zIndex: 10000 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Topo do Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg font-black">
              <i className="bi bi-sliders" />
            </div>
            <div>
              <h3 id={titleId} className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">
                Simulador / Teste de Numeração
              </h3>
              <p className="text-xs text-slate-500 font-bold">
                Arraste as bolinhas para testar como os números se comportam na arte
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Fechar teste de numeração"
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center cursor-pointer transition"
          >
            <i className="bi bi-x-lg text-sm" />
          </button>
        </div>

        {error && <p id={errorId} role="alert" className="mb-4 text-sm text-red-700 dark:text-red-300">{error}</p>}
        {/* Conteúdo com Sliders */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-1">
          {/* SEÇÃO 1: PREÇO PRINCIPAL */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2">
              <i className="bi bi-hash text-sm" />
              Preço Principal (Dezena, Centena, Milhar)
            </h4>

            {/* DEZENA */}
            <div className="space-y-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Dezena:
                </span>
                <span className="text-sm font-black font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded-lg">
                  {testDezenaD1}
                  {testDezenaD2}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400">
                    1º Dígito: {testDezenaD1}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="9"
                    value={testDezenaD1}
                    onChange={(e) => changeDigit('testDezenaD1', e.currentTarget.valueAsNumber)}
                    step="1"
                    aria-label="Dezena: 1º dígito"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400">
                    2º Dígito: {testDezenaD2}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="9"
                    value={testDezenaD2}
                    onChange={(e) => changeDigit('testDezenaD2', e.currentTarget.valueAsNumber)}
                    step="1"
                    aria-label="Dezena: 2º dígito"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* CENTENA */}
            <div className="space-y-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Centena:
                </span>
                <span className="text-sm font-black font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded-lg">
                  {testCentenaD1}
                  {testCentenaD2}
                  {testCentenaD3}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400">
                    1º Dígito: {testCentenaD1}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="9"
                    value={testCentenaD1}
                    onChange={(e) => changeDigit('testCentenaD1', e.currentTarget.valueAsNumber)}
                    step="1"
                    aria-label="Centena: 1º dígito"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400">
                    2º Dígito: {testCentenaD2}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="9"
                    value={testCentenaD2}
                    onChange={(e) => changeDigit('testCentenaD2', e.currentTarget.valueAsNumber)}
                    step="1"
                    aria-label="Centena: 2º dígito"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400">
                    3º Dígito: {testCentenaD3}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="9"
                    value={testCentenaD3}
                    onChange={(e) => changeDigit('testCentenaD3', e.currentTarget.valueAsNumber)}
                    step="1"
                    aria-label="Centena: 3º dígito"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* MILHAR */}
            <div className="space-y-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Milhar:
                </span>
                <span className="text-sm font-black font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded-lg">
                  {testMilharD1}.{testMilharD2}
                  {testMilharD3}
                  {testMilharD4}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <span className="text-[9px] font-bold text-slate-400">1º D: {testMilharD1}</span>
                  <input
                    type="range"
                    min="0"
                    max="9"
                    value={testMilharD1}
                    onChange={(e) => changeDigit('testMilharD1', e.currentTarget.valueAsNumber)}
                    step="1"
                    aria-label="Milhar: 1º dígito"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400">2º D: {testMilharD2}</span>
                  <input
                    type="range"
                    min="0"
                    max="9"
                    value={testMilharD2}
                    onChange={(e) => changeDigit('testMilharD2', e.currentTarget.valueAsNumber)}
                    step="1"
                    aria-label="Milhar: 2º dígito"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400">3º D: {testMilharD3}</span>
                  <input
                    type="range"
                    min="0"
                    max="9"
                    value={testMilharD3}
                    onChange={(e) => changeDigit('testMilharD3', e.currentTarget.valueAsNumber)}
                    step="1"
                    aria-label="Milhar: 3º dígito"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400">4º D: {testMilharD4}</span>
                  <input
                    type="range"
                    min="0"
                    max="9"
                    value={testMilharD4}
                    onChange={(e) => changeDigit('testMilharD4', e.currentTarget.valueAsNumber)}
                    step="1"
                    aria-label="Milhar: 4º dígito"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: PREÇO ANTIGO (normalPrice) */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <i className="bi bi-tag text-sm" />
              Preço Anterior / Antigo ("DE")
            </h4>

            <div className="space-y-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Valor Antigo R$:
                </span>
                <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-lg">
                  R$ {testNormalD1}
                  {testNormalD2}
                  {testNormalD3},00
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400">
                    1º Dígito: {testNormalD1}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="9"
                    value={testNormalD1}
                    onChange={(e) => changeDigit('testNormalD1', e.currentTarget.valueAsNumber)}
                    step="1"
                    aria-label="Preço anterior: 1º dígito"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400">
                    2º Dígito: {testNormalD2}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="9"
                    value={testNormalD2}
                    onChange={(e) => changeDigit('testNormalD2', e.currentTarget.valueAsNumber)}
                    step="1"
                    aria-label="Preço anterior: 2º dígito"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400">
                    3º Dígito: {testNormalD3}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="9"
                    value={testNormalD3}
                    onChange={(e) => changeDigit('testNormalD3', e.currentTarget.valueAsNumber)}
                    step="1"
                    aria-label="Preço anterior: 3º dígito"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-4 shrink-0 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-bold">
            * Ao fechar, os valores originais serão restaurados automaticamente
          </span>
          <button
            type="button"
            onClick={close}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-md active:scale-95 transition-all"
          >
            Concluir Teste
          </button>
        </div>
      </div>
    </div>
  );
};
