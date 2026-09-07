import React, { useMemo, useState } from 'react';
import { ELEMENT_TYPES, ElementModel, ElementType, elementLabel } from '../types/postCreator';

type Opportunity = { id: string; name: string };

type Props = {
  campaignName?: string;
  models: ElementModel[];
  opportunities: Opportunity[];
  onCreate: (type: ElementType, opportunityId?: string) => void;
  onEdit: (model: ElementModel) => void;
  onView: (model: ElementModel) => void;
  hasProductOpportunity?: boolean;
};

// Agrupamento visual conceitual (sem alterar regras de negócio)
const ELEMENT_GROUPS = [
  {
    name: 'Conteúdo',
    icon: '✍️',
    types: ['TITLE', 'PRODUCT_NAME', 'PRODUCT_SLOGAN_TITLE', 'PRODUCT_SLOGAN_SIDE', 'PRODUCT_SLOGAN'] as ElementType[],
  },
  {
    name: 'Comercial',
    icon: '🏷️',
    types: ['PRICE', 'OLD_PRICE', 'INSTALLMENT', 'BADGE'] as ElementType[],
  },
  {
    name: 'Visual, Cores & Marca',
    icon: '🎨',
    types: ['POST_REFERENCE', 'COLOR_THEME', 'BACKGROUND', 'LOGO', 'HEADER', 'FOOTER'] as ElementType[],
  },
  {
    name: 'Estrutura do Produto',
    icon: '📦',
    types: ['OPEN_VIEW', 'VARIATION_GALLERY'] as ElementType[],
  },
  {
    name: 'Ação',
    icon: '⚡',
    types: ['CTA'] as ElementType[],
  },
];

const card = (
  model: ElementModel | undefined,
  onEdit: (model: ElementModel) => void,
  onView: (model: ElementModel) => void,
) =>
  model ? (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onView(model)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') onView(model);
      }}
      className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-750 bg-slate-900 p-2.5 hover:border-slate-600 transition"
    >
      {model.generatedAssetUrl ? (
        <img src={model.generatedAssetUrl} alt="" className="h-12 w-16 rounded object-contain bg-slate-950 p-0.5" />
      ) : (
        <div className="flex h-12 w-16 items-center justify-center rounded bg-slate-800 text-[10px] text-slate-500">
          Sem foto
        </div>
      )}
      <div className="min-w-0 flex-1">
        <b className="block truncate text-xs text-white" title={model.name}>
          {model.name}
        </b>
        <span className="text-[10px] text-slate-400">
          {model.status === 'UPDATED' ? 'Atualizado' : model.status}
        </span>
      </div>
      <button
        type="button"
        onClick={event => {
          event.stopPropagation();
          onEdit(model);
        }}
        className="rounded border border-indigo-500/70 bg-indigo-950/40 px-2.5 py-1 text-[11px] font-bold text-indigo-300 hover:bg-indigo-900/60 transition"
      >
        Editar
      </button>
    </article>
  ) : null;

export function CampaignElementsPanel({
  campaignName,
  models,
  opportunities,
  onCreate,
  onEdit,
  onView,
  hasProductOpportunity = true,
}: Props) {
  const [open, setOpen] = useState<ElementType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Busca rápida de elementos
  const filteredTypes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return null;
    return ELEMENT_TYPES.filter(type => {
      const label = elementLabel[type].toLowerCase();
      const matchLabel = label.includes(query);
      const matchModel = models.some(m => m.elementType === type && m.name.toLowerCase().includes(query));
      return matchLabel || matchModel;
    });
  }, [searchQuery, models]);

  // Contagem para o cabeçalho compacto
  const totalConfigured = models.length;

  return (
    <aside className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-lg">
      {/* Cabeçalho da Biblioteca */}
      <div className="border-b border-slate-800 p-3.5 sm:p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white truncate">
            Biblioteca de elementos{campaignName ? ` — ${campaignName}` : ''}
          </h2>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded shrink-0">
            {totalConfigured} configurados
          </span>
        </div>

        {/* Input de Busca de Elementos */}
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar elemento na campanha..."
            className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Lista com Grupos Conceituais e Accordions */}
      <div className="divide-y divide-slate-800 max-h-[700px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
        {filteredTypes ? (
          // Modo busca ativa (lista direta dos resultados)
          <div className="p-2 space-y-1">
            {filteredTypes.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-500">Nenhum elemento encontrado para &quot;{searchQuery}&quot;.</p>
            ) : (
              filteredTypes.map(type => renderElementRow(type))
            )}
          </div>
        ) : (
          // Modo normal por grupos conceituais
          ELEMENT_GROUPS.map(group => {
            return (
              <div key={group.name} className="py-1">
                <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-950/40 flex items-center gap-1.5">
                  <span>{group.icon}</span>
                  <span>{group.name}</span>
                </div>
                {group.types.map(type => renderElementRow(type))}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );

  function renderElementRow(type: ElementType) {
    const items = models.filter(item => item.elementType === type);
    const expanded = open === type;
    const isConfigured = items.length > 0;
    const isBadge = type === 'BADGE';
    const isBadgeNotApplicable = isBadge && !hasProductOpportunity;

    return (
      <section key={type} className="border-b border-slate-800/60 last:border-0">
        <button
          type="button"
          onClick={() => setOpen(expanded ? null : type)}
          className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs sm:text-sm hover:bg-slate-800/50 transition group"
        >
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className="text-slate-500 group-hover:text-indigo-400 text-xs transition">
              {expanded ? '▾' : '▸'}
            </span>
            <span className="font-semibold text-slate-200 truncate">{elementLabel[type]}</span>
          </div>

          {/* Badge discreto de estado */}
          <div className="shrink-0 text-right">
            {isBadgeNotApplicable ? (
              <span className="text-[10px] font-medium text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded">
                Não aplicável
              </span>
            ) : isConfigured ? (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                Configurado ✓
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 bg-slate-800/30 px-2 py-0.5 rounded">
                Não preenchido
              </span>
            )}
          </div>
        </button>

        {expanded && (
          <div className="bg-slate-950/50 p-3 border-t border-slate-800/60">
            {type === 'BADGE' ? (
              <div className="space-y-2">
                {isBadgeNotApplicable && (
                  <div className="rounded bg-slate-900 border border-slate-800 p-2 mb-2 text-[11px] text-slate-400 flex items-center gap-2">
                    <span>ℹ️</span>
                    <span>
                      O produto atual não possui oportunidade correspondente vinculada. O selo será omitido do prompt.
                    </span>
                  </div>
                )}
                {opportunities.map(opportunity => {
                  const model = items.find(item => item.opportunityId === opportunity.id);
                  return (
                    <section key={opportunity.id} className="rounded-lg border border-slate-800 p-2.5 bg-slate-900/40">
                      <h3 className="mb-2 text-xs font-bold text-slate-200">{opportunity.name}</h3>
                      {card(model, onEdit, onView) || (
                        <div>
                          <p className="text-xs text-slate-500">Sem selo configurado para esta oportunidade.</p>
                          <button
                            type="button"
                            onClick={() => onCreate('BADGE', opportunity.id)}
                            className="mt-2 rounded border border-indigo-400 px-2 py-1 text-[10px] font-bold text-indigo-300 hover:bg-indigo-950/60"
                          >
                            + Configurar selo
                          </button>
                        </div>
                      )}
                    </section>
                  );
                })}
                {!opportunities.length && (
                  <p className="text-xs text-slate-500">Nenhuma oportunidade ativa cadastrada no ERP.</p>
                )}
              </div>
            ) : items[0] ? (
              card(items[0], onEdit, onView)
            ) : (
              <div className="space-y-2 py-1">
                <p className="text-xs text-slate-500">Nenhum prompt configurado para este elemento nesta campanha.</p>
                <button
                  type="button"
                  onClick={() => onCreate(type)}
                  className="rounded border border-indigo-400 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:bg-indigo-950/60 transition"
                >
                  + Configurar prompt
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    );
  }
}
