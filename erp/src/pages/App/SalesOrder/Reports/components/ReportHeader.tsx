import React from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { REPORT_PRINT_STYLES } from './reportPrintStyles';

interface ReportHeaderProps {
  isPublicMode: boolean;
  reportName: string;
  reportSource: 'erp' | 'csv';
  totalProfit: number;
  monthCount: number;
  reportStartDate: Date | null;
  reportEndDate: Date | null;
  avgTurnoverPerItem: number;
  avgProfitPerItem: number;
  viewMode: 'product' | 'supplier';
  setViewMode: (mode: 'product' | 'supplier') => void;
  reportType: 'abc' | 'matrix';
  setReportType: (type: 'abc' | 'matrix') => void;
  abcBasis: 'revenue' | 'profit';
  setAbcBasis: (basis: 'revenue' | 'profit') => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  onShareWhatsApp: () => void;
  onOpenConfig: () => void;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  isPublicMode,
  reportName,
  reportSource,
  totalProfit,
  monthCount,
  reportStartDate,
  reportEndDate,
  avgTurnoverPerItem,
  avgProfitPerItem,
  viewMode,
  setViewMode,
  reportType,
  setReportType,
  abcBasis,
  setAbcBasis,
  showFilters,
  onToggleFilters,
  onShareWhatsApp,
  onOpenConfig,
}) => (
  <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm print:hidden">
    {/* Linha 1: Identidade e Métricas Rápidas */}
    <div className="px-6 py-6 pb-2">
      <div className="max-w-[1800px] mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          {!isPublicMode && (
            <Link
              to="/sales-order/reports"
              className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all border border-slate-100 dark:border-slate-800"
            >
              <i className="bi bi-arrow-left text-lg"></i>
            </Link>
          )}
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight uppercase">
              {isPublicMode && <i className="bi bi-shield-check text-emerald-500 mr-2"></i>}
              {reportName}
            </h1>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {reportSource === 'erp' ? 'VIA ERP' : 'VIA CSV'}:
              </span>
              <span className="text-sm font-black text-emerald-600">
                {totalProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Amostragem:
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-blue-600">
                  {monthCount} {monthCount === 1 ? 'mês' : 'meses'}
                </span>
                {reportStartDate &&
                  reportEndDate &&
                  !isNaN(reportStartDate.getTime()) &&
                  !isNaN(reportEndDate.getTime()) && (
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                      {format(reportStartDate, 'MM/yyyy')} — {format(reportEndDate, 'MM/yyyy')}
                    </span>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Indicadores de Meta no Header */}
        <div className="hidden lg:flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Giro Mensal Médio
            </span>
            <span className="text-sm font-black text-slate-700 dark:text-slate-300">
              {avgTurnoverPerItem.toFixed(1)}{' '}
              <span className="text-[10px] opacity-40 uppercase ml-1">un/mês</span>
            </span>
          </div>
          <div className="h-8 w-px bg-slate-100 dark:bg-slate-800"></div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Lucro Mensal Médio
            </span>
            <span className="text-sm font-black text-slate-700 dark:text-slate-300">
              {avgProfitPerItem.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* Linha 2: Abas de Navegação Principal */}
    <div className="px-6">
      <div className="max-w-[1800px] mx-auto flex border-b border-transparent">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('product')}
            className={`px-6 py-4 flex items-center gap-3 transition-all relative group ${viewMode === 'product' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <i
              className={`bi bi-box-seam ${viewMode === 'product' ? 'text-indigo-600' : 'text-slate-300 group-hover:text-indigo-400'} text-lg transition-colors`}
            ></i>
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">
              Desempenho dos Produtos
            </span>
            {viewMode === 'product' && (
              <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-full animate-fade-in"></div>
            )}
          </button>
          <button
            onClick={() => setViewMode('supplier')}
            className={`px-6 py-4 flex items-center gap-3 transition-all relative group ${viewMode === 'supplier' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <i
              className={`bi bi-truck ${viewMode === 'supplier' ? 'text-indigo-600' : 'text-slate-300 group-hover:text-indigo-400'} text-lg transition-colors`}
            ></i>
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">
              Desempenho por Fornecedor
            </span>
            {viewMode === 'supplier' && (
              <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-full animate-fade-in"></div>
            )}
          </button>
        </div>
      </div>
    </div>

    {/* Linha 3: Controles de Refinamento e Ações */}
    <div className="bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 px-6 py-3">
      <div className="max-w-[1800px] mx-auto flex justify-between items-center">
        <div className="flex items-center gap-4">
          {viewMode === 'product' && (
            <div className="flex p-1 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <button
                onClick={() => setReportType('abc')}
                className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${reportType === 'abc' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <i className="bi bi-graph-up-arrow mr-2 text-xs"></i>
                Curva ABC Matriz
              </button>
              <button
                onClick={() => setReportType('matrix')}
                className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${reportType === 'matrix' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <i className="bi bi-grid-3x3-gap-fill mr-2 text-xs"></i>
                Matriz de Giro
              </button>
            </div>
          )}

          {viewMode === 'product' && (
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setAbcBasis('revenue')}
                className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${abcBasis === 'revenue' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                Por Faturamento
              </button>
              <button
                onClick={() => setAbcBasis('profit')}
                className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${abcBasis === 'profit' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                Por Lucratividade
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="h-10 px-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-all font-black text-[9px] uppercase tracking-widest hover:border-indigo-200 shadow-sm"
            title="Imprimir / Exportar PDF"
          >
            <i className="bi bi-printer-fill text-sm"></i>
            <span className="hidden sm:inline">Imprimir / PDF</span>
          </button>

          {!isPublicMode && (
            <>
              <button
                onClick={onShareWhatsApp}
                className="h-10 px-5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-2 hover:bg-emerald-600 hover:text-white transition-all font-black text-[9px] uppercase tracking-widest shadow-sm"
                title="Compartilhar pelo WhatsApp"
              >
                <i className="bi bi-whatsapp text-sm"></i>
                <span className="hidden sm:inline">Compartilhar</span>
              </button>
              <button
                onClick={onOpenConfig}
                className="h-10 px-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-all font-black text-[9px] uppercase tracking-widest hover:border-indigo-200 shadow-sm"
              >
                <i className="bi bi-gear-wide-connected text-sm"></i>
                <span className="hidden sm:inline">Configurar</span>
              </button>
              <button
                onClick={onToggleFilters}
                className={`h-10 px-5 rounded-xl border font-black text-[9px] uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 ${showFilters ? 'bg-amber-600 border-amber-500 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600'}`}
              >
                <i className="bi bi-funnel-fill text-sm"></i>
                <span className="hidden sm:inline">Filtros</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>

    <style>{REPORT_PRINT_STYLES}</style>
  </header>
);
