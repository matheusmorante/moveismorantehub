import React, { useState } from 'react';
import { ElementModel, ElementType, elementLabel } from '../types/postCreator';
import {
  PostProductImagesSpec,
  PostProductImagesValidation,
} from '../../types/postSpecification';
import { PromptImagesStrip } from './PromptPreview/PromptImagesStrip';

type Opportunity = { id: string; name: string };

type Props = {
  campaignName?: string;
  models: ElementModel[];
  opportunities: Opportunity[];
  onCreate: (type: ElementType, opportunityId?: string) => void;
  onEdit: (model: ElementModel) => void;
  onView: (model: ElementModel) => void;
  hasProductOpportunity?: boolean;
  product?: any | null;
  productImages?: PostProductImagesSpec | null;
  imagesValidation?: PostProductImagesValidation | null;
  opportunityName?: string | null;
  opportunityBadgeUrl?: string | null;
  onChangePrimary?: (url: string) => void;
  onChangeOpenView?: (url: string | null) => void;
  onChangeVariation?: (variationId: string, url: string) => void;
  onResetOverrides?: () => void;
  hasManualOverrides?: boolean;
};

// Elementos mantidos na aba de Elementos da Campanha
const CAMPAIGN_ELEMENTS: Array<{ type: ElementType; icon: string }> = [
  { type: 'BADGE', icon: '🏷️' },
  { type: 'LOGO', icon: '🏢' },
  { type: 'INSTALLMENT', icon: '💳' },
  { type: 'FOOTER', icon: '📋' },
];

const card = (
  model: ElementModel | undefined,
  onEdit: (model: ElementModel) => void,
  onView: (model: ElementModel) => void,
) => {
  const imageUrl = model?.generatedAssetUrl || model?.referenceFiles?.[0]?.fileUrl;
  return model ? (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onView(model)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') onView(model);
      }}
      className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-750 bg-slate-900 p-2.5 hover:border-slate-600 transition"
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-12 w-16 rounded object-contain bg-slate-950 p-0.5" />
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
};

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

  // Contagem restrita aos 3 elementos oficiais
  const totalConfigured = models.filter(m => CAMPAIGN_ELEMENTS.some(e => e.type === m.elementType)).length;

  return (
    <aside className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-lg">
      {/* Cabeçalho da Biblioteca */}
      <div className="border-b border-slate-800 p-3.5 sm:p-4 flex items-center justify-between gap-2">
        <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white truncate">
          Elementos da campanha{campaignName ? ` — ${campaignName}` : ''}
        </h2>
        <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded shrink-0">
          {totalConfigured} de {CAMPAIGN_ELEMENTS.length} configurados
        </span>
      </div>

      {/* Lista com os 3 Elementos da Campanha */}
      <div className="divide-y divide-slate-800">
        {CAMPAIGN_ELEMENTS.map(item => renderElementRow(item.type, item.icon))}
      </div>
    </aside>
  );

  function renderElementRow(type: ElementType, icon: string) {
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
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <span className="text-slate-500 group-hover:text-indigo-400 text-xs transition">
              {expanded ? '▾' : '▸'}
            </span>
            <span className="text-base shrink-0">{icon}</span>
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
