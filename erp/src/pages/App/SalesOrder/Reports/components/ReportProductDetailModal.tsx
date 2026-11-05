import type { ABCResult } from '../utils/salesReportCalculations';

interface ReportProductDetailModalProps {
  result: ABCResult;
  monthCount: number;
  onClose: () => void;
}

const ReportProductDetailModal = ({ result, monthCount, onClose }: ReportProductDetailModalProps) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center px-6">
    <div
      className="absolute inset-0 bg-slate-950/40 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    ></div>
    <div className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-12 rounded-[4rem] shadow-2xl w-full max-w-[550px] flex flex-col gap-10 animate-scale-in">
      <button
        onClick={onClose}
        className="absolute top-8 right-8 w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm"
      >
        <i className="bi bi-x-lg text-lg"></i>
      </button>

      <div className="flex justify-between items-start pr-12">
        <div className="flex-1">
          <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.4em] mb-4">
            Análise Estratégica
          </h4>
          <p className="text-3xl font-black text-slate-800 dark:text-slate-100 leading-[1.1] tracking-tighter">
            {result.product}
          </p>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-3">
            {result.supplier}
          </p>
        </div>
        <div
          className={`w-20 h-20 rounded-[2rem] flex items-center justify-center font-black text-3xl shadow-inner ${result.classification === 'A' ? 'bg-blue-50 text-blue-600' : result.classification === 'B' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-300'}`}
        >
          {result.classification}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-50 dark:bg-slate-955 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">
            Giro Período
          </span>
          <span className="text-2xl font-black text-slate-800 dark:text-blue-500">
            {result.totalQuantity}{' '}
            <span className="text-[10px] font-bold opacity-40 uppercase ml-1">un.</span>
          </span>
        </div>
        <div className="bg-slate-50 dark:bg-slate-955 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">
            Preço de Custo
          </span>
          <span className="text-2xl font-black text-amber-600">
            {(result.avgCost || 0).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </span>
        </div>
        <div className="bg-slate-50 dark:bg-slate-955 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">
            Giro Mensal
          </span>
          <span className="text-2xl font-black text-indigo-600">
            {(result.totalQuantity / (monthCount || 1)).toFixed(1)}{' '}
            <span className="text-[10px] font-bold opacity-40 uppercase ml-1">un.</span>
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-end py-5 border-b border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
            Faturamento Período
          </span>
          <span className="text-xl font-black text-slate-800 dark:text-slate-100">
            {result.totalRevenue.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </span>
        </div>
        <div className="flex justify-between items-end py-5 border-b border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
            Lucro Total Acumulado
          </span>
          <span className="text-xl font-black text-emerald-600">
            {result.totalProfit.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </span>
        </div>
        <div className="flex justify-between items-end p-8 bg-indigo-600 rounded-[2.5rem] shadow-2xl shadow-indigo-500/30 mt-4">
          <span className="text-[11px] font-black text-white/70 uppercase tracking-widest">
            Lucro Médio/Mês
          </span>
          <span className="text-2xl font-black text-white">
            {result.monthlyProfit.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center p-5 bg-slate-50 dark:bg-slate-955 rounded-[1.5rem] border border-slate-100 dark:border-slate-800">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
          Participação no Lucro Total:{' '}
          <span className="text-indigo-600 ml-1">
            {result.accumulatedPercentage.toFixed(2)}%
          </span>
        </p>
      </div>
    </div>
  </div>
);

export default ReportProductDetailModal;
