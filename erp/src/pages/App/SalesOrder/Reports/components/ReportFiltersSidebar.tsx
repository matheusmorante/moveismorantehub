import React from 'react';

interface ReportFiltersSidebarProps {
  readonly showFilters: boolean;
  readonly onClose: () => void;
  readonly searchTerm: string;
  readonly setSearchTerm: (value: string) => void;
  readonly minProfit: number;
  readonly setMinProfit: (value: number) => void;
  readonly maxProfit: number;
  readonly setMaxProfit: (value: number) => void;
  readonly selectedSuppliers: string[];
  readonly setSelectedSuppliers: React.Dispatch<React.SetStateAction<string[]>>;
  readonly allSuppliers: string[];
  readonly refinementMetrics: {
    readonly excluded: number;
    readonly active: number;
  };
  readonly onOpenItemExclusion: () => void;
  readonly onOpenProductReference: () => void;
  readonly sortConfig: { key: string; direction: 'asc' | 'desc' };
  readonly handleSort: (key: string) => void;
}

const ReportFiltersSidebar = ({
  showFilters,
  onClose,
  searchTerm,
  setSearchTerm,
  minProfit,
  setMinProfit,
  maxProfit,
  setMaxProfit,
  selectedSuppliers,
  setSelectedSuppliers,
  allSuppliers,
  refinementMetrics,
  onOpenItemExclusion,
  onOpenProductReference,
  sortConfig,
  handleSort,
}: ReportFiltersSidebarProps) => {
  return (
    <aside
      className={`${showFilters ? 'w-80' : 'w-0'} bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 transition-all duration-300 overflow-hidden flex flex-col`}
    >
      <div className="p-8 flex flex-col gap-8 w-80">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            Filtros Ativos
          </h3>
          <button
            onClick={() => onClose()}
            className="text-slate-300 hover:text-red-500 transition-colors"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="flex flex-col gap-8">
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 block">
              Busca
            </label>
            <div className="relative">
              <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar produtos..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl pl-10 pr-4 py-3 text-[11px] font-bold shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 block">
              Lucratividade Mínima / Máxima
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">
                  Min
                </span>
                <input
                  type="number"
                  value={minProfit || ''}
                  onChange={(e) => setMinProfit(Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl pl-9 pr-2 py-3 text-[11px] font-bold shadow-inner"
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">
                  Max
                </span>
                <input
                  type="number"
                  value={maxProfit || ''}
                  onChange={(e) => setMaxProfit(Number(e.target.value))}
                  placeholder="∞"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl pl-9 pr-2 py-3 text-[11px] font-bold shadow-inner"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Fornecedores
              </label>
              <button
                onClick={() =>
                  selectedSuppliers.length === allSuppliers.length
                    ? setSelectedSuppliers([])
                    : setSelectedSuppliers(allSuppliers)
                }
                className="text-[8px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 transition-colors"
              >
                {selectedSuppliers.length === allSuppliers.length
                  ? 'Desmarcar Todos'
                  : 'Marcar Todos'}
              </button>
            </div>
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
              {allSuppliers.map((s) => (
                <label
                  key={s}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${selectedSuppliers.includes(s) ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-50'}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSuppliers.includes(s)}
                    onChange={(e) =>
                      e.target.checked
                        ? setSelectedSuppliers([...selectedSuppliers, s])
                        : setSelectedSuppliers(selectedSuppliers.filter((x) => x !== s))
                    }
                    className="hidden"
                  />
                  <i
                    className={`bi ${selectedSuppliers.includes(s) ? 'bi-check-circle-fill' : 'bi-circle'} text-lg`}
                  ></i>
                  <span className="text-[11px] font-black truncate">{s}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-8">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-5 block">
              Refinamento de Dados
            </label>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => onOpenItemExclusion()}
                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-800 flex items-center gap-4 hover:border-indigo-500 hover:bg-white dark:hover:bg-slate-900 transition-all group shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform border border-slate-100 dark:border-slate-800">
                  <i className="bi bi-filter-square-fill text-lg"></i>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase">
                    Gerenciar Itens
                  </p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">
                    {refinementMetrics.excluded} excluídos / {refinementMetrics.active} ativos
                  </p>
                </div>
              </button>

              <button
                onClick={() => onOpenProductReference()}
                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-800 flex items-center gap-4 hover:border-emerald-500 hover:bg-white dark:hover:bg-slate-900 transition-all group shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform border border-slate-100 dark:border-slate-800">
                  <i className="bi bi-tag-fill text-lg"></i>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase">
                    Referências
                  </p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">
                    Mapear itens duplicados
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-8">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-5 block">
              Ordenação do Relatório
            </label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { key: 'accumulatedPercentage', label: 'Participação no Lucro' },
                { key: 'giroMensal', label: 'Giro Mensal' },
                { key: 'lucroMensal', label: 'Lucro Mensal' },
                { key: 'product', label: 'Nome do Produto' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => handleSort(opt.key)}
                  className={`flex items-center justify-between p-4 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all ${sortConfig.key === opt.key ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-400 hover:text-indigo-600'}`}
                >
                  {opt.label}
                  {sortConfig.key === opt.key && (
                    <i
                      className={`bi bi-sort-${sortConfig.direction === 'asc' ? 'down' : 'up'}`}
                    ></i>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ReportFiltersSidebar;
