import React from 'react';
import { PreviewProductPicker } from './PreviewProductPicker';
import type { PostCampaign } from '../types/postCreator';

interface PostCampaignToolbarProps {
  campaigns: PostCampaign[];
  campaignId: string;
  operationBusy: boolean;
  onSelectCampaign: (id: string) => void;
  onOpenManager: () => void;
  editorSearch: string;
  editorProducts: any[];
  selectedProduct: any;
  listLoading: boolean;
  selectionLoading: boolean;
  resultsSearch: string;
  listError: string | null;
  onSearchProduct: (value: string) => void;
  onSelectProduct: (id: string) => void;
  editorTab: 'elements' | 'prompt_assets';
  onChangeEditorTab: (tab: 'elements' | 'prompt_assets') => void;
}

export const PostCampaignToolbar: React.FC<PostCampaignToolbarProps> = ({
  campaigns,
  campaignId,
  operationBusy,
  onSelectCampaign,
  onOpenManager,
  editorSearch,
  editorProducts,
  selectedProduct,
  listLoading,
  selectionLoading,
  resultsSearch,
  listError,
  onSearchProduct,
  onSelectProduct,
  editorTab,
  onChangeEditorTab,
}) => (
  <>
    {/* Barra de Configuração Responsiva */}
    <div className="mb-4 grid gap-3 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 sm:p-4 md:grid-cols-2 items-end">
      {/* Campanha */}
      <div className="text-xs font-semibold text-slate-300">
        <label htmlFor="post-campaign-select" className="block mb-1">
          Campanha
        </label>
        <div className="flex gap-2">
          <select
            id="post-campaign-select"
            value={campaignId}
            aria-label="Campanha selecionada"
            disabled={operationBusy}
            onChange={(event) => onSelectCampaign(event.target.value)}
            className="min-w-0 flex-1 rounded-lg bg-slate-950 px-3 py-2 text-xs text-slate-100 border border-slate-800 focus:outline-none focus:border-indigo-500"
          >
            {campaigns
              .filter((item) => item.active)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}{item.persistedRemotely === false ? ' (rascunho local)' : ''}
                </option>
              ))}
          </select>
          <button
            disabled={operationBusy}
            onClick={onOpenManager}
            className="shrink-0 rounded-lg border border-indigo-400/40 bg-indigo-950/30 px-2.5 py-1.5 text-[11px] font-bold text-indigo-300 hover:bg-indigo-900/50 transition-colors"
            title="Gerenciar Campanhas"
          >
            Gerenciar
          </button>
        </div>
      </div>

      {/* Produto para Preview */}
      <div className="text-xs font-semibold text-slate-300">
        <PreviewProductPicker
          search={editorSearch}
          products={editorProducts}
          selected={selectedProduct}
          loading={listLoading}
          selectionLoading={selectionLoading}
          resultsSearch={resultsSearch}
          searchError={listError ?? undefined}
          onSearch={onSearchProduct}
          onSelect={onSelectProduct}
        />
      </div>
    </div>

    {/* Abas do Editor de Posts */}
    <div className="mb-4 flex flex-wrap sm:flex-nowrap rounded-xl bg-slate-900 border border-slate-800 p-1 gap-1">
      <button
        type="button"
        onClick={() => onChangeEditorTab('elements')}
        className={`flex-1 py-2 px-3.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
          editorTab === 'elements'
            ? 'bg-indigo-600 text-white shadow-md'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`}
      >
        <span>📦 Elementos da Campanha</span>
      </button>
      <button
        type="button"
        onClick={() => onChangeEditorTab('prompt_assets')}
        className={`flex-1 py-2 px-3.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
          editorTab === 'prompt_assets'
            ? 'bg-indigo-600 text-white shadow-md'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`}
      >
        <span>📋 Preview de Prompt + Assets</span>
      </button>
    </div>
  </>
);
