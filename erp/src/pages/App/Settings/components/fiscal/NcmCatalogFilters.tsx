export type NcmFilter =
  | 'all'
  | 'vigentes'
  | 'encerrados'
  | 'alterados'
  | 'com_produtos'
  | 'revisar'
  | 'futuros';
export type StoreFilter = 'active' | 'inactive' | 'all';

const filterOptions: Array<{ id: NcmFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'vigentes', label: 'Vigentes' },
  { id: 'encerrados', label: 'Encerrados' },
  { id: 'alterados', label: 'Alterados' },
  { id: 'com_produtos', label: 'Com produtos' },
  { id: 'revisar', label: 'Precisam revisão' },
  { id: 'futuros', label: 'Futuros' },
];

const storeFilterOptions: Array<{ id: StoreFilter; label: string }> = [
  { id: 'active', label: 'Ativos' },
  { id: 'inactive', label: 'Desativados' },
  { id: 'all', label: 'Todos' },
];

interface Props {
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  filter: NcmFilter;
  onFilterChange: (value: NcmFilter) => void;
  storeFilter: StoreFilter;
  onStoreFilterChange: (value: StoreFilter) => void;
}

export function NcmCatalogFilters({
  searchDraft,
  onSearchDraftChange,
  filter,
  onFilterChange,
  storeFilter,
  onStoreFilterChange,
}: Props) {
  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block w-full lg:max-w-md">
          <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchDraft}
            onChange={(event) => onSearchDraftChange(event.target.value)}
            placeholder="Pesquisar por código ou descrição"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {filterOptions.map((option) => (
            <button
              type="button"
              key={option.id}
              onClick={() => onFilterChange(option.id)}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition ${filter === option.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="mt-3 flex flex-wrap items-center gap-2"
        aria-label="Filtrar por ativação na loja"
      >
        <span className="text-xs font-bold text-slate-500">Uso na loja:</span>
        {storeFilterOptions.map((option) => (
          <button
            type="button"
            key={option.id}
            onClick={() => onStoreFilterChange(option.id)}
            className={`rounded-lg px-3 py-2 text-xs font-bold ${storeFilter === option.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </>
  );
}
