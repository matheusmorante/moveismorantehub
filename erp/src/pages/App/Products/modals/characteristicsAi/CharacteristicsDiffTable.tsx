import React from 'react';
import type { Product } from '@/pages/types/product.type';
import type { ProductAiSuggestedCharacteristics } from '../../../../../../shared-utils/productAiFormSchemas';

export interface CharacteristicsDiffTableProps {
  readonly suggestedResult: ProductAiSuggestedCharacteristics | null;
  readonly formData: Partial<Product>;
  readonly selectedKeys: Record<string, boolean>;
  readonly onToggleKey: (key: string) => void;
  readonly onSelectAll: (select: boolean) => void;
  readonly editedValues: Record<string, any>;
  readonly onEditValue: (key: string, value: any) => void;
  readonly hasCategory?: boolean;
}

export interface DiffRowItem {
  key: string;
  group: 'Geral' | 'Dimensões' | 'Especificações Técnicas';
  label: string;
  currentValue: any;
  suggestedValue: any;
  isFilledInErp: boolean;
  confidence: 'alta' | 'media' | 'baixa';
}

export const CharacteristicsDiffTable: React.FC<CharacteristicsDiffTableProps> = ({
  suggestedResult,
  formData,
  selectedKeys,
  onToggleKey,
  onSelectAll,
  editedValues,
  onEditValue,
  hasCategory = true,
}) => {
  const identifiedProduct = suggestedResult?.identifiedProduct;
  const sources = identifiedProduct?.sources || suggestedResult?.sources || [];
  const divergences = identifiedProduct?.divergences;

  const hasErpValue = (val: any) =>
    val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '0';

  // Montagem da lista unificada de campos sugeridos (Gerais, Dimensões e Técnicos)
  const rows: DiffRowItem[] = React.useMemo(() => {
    if (!suggestedResult) return [];

    const items: DiffRowItem[] = [];
    const conf = suggestedResult.itemConfidence || {};

    // 1. Campos Gerais do Produto
    if (identifiedProduct?.name) {
      items.push({
        key: '__field_name__',
        group: 'Geral',
        label: 'Nome do Produto',
        currentValue: formData.name || formData.title,
        suggestedValue: identifiedProduct.name,
        isFilledInErp: hasErpValue(formData.name || formData.title),
        confidence: identifiedProduct.confidence || 'alta',
      });
    }

    if (identifiedProduct?.brand) {
      const currentBrand =
        formData.brand || formData.technicalValues?.Marca || formData.technicalValues?.marca;
      items.push({
        key: '__field_brand__',
        group: 'Geral',
        label: 'Marca / Fabricante',
        currentValue: currentBrand,
        suggestedValue: identifiedProduct.brand,
        isFilledInErp: hasErpValue(currentBrand),
        confidence: identifiedProduct.confidence || 'alta',
      });
    }

    if (identifiedProduct?.model) {
      const currentModel =
        formData.technicalValues?.Modelo || formData.technicalValues?.modelo || formData.line;
      items.push({
        key: '__field_model__',
        group: 'Geral',
        label: 'Modelo / Linha',
        currentValue: currentModel,
        suggestedValue: identifiedProduct.model,
        isFilledInErp: hasErpValue(currentModel),
        confidence: identifiedProduct.confidence || 'alta',
      });
    }

    if (suggestedResult.description) {
      items.push({
        key: '__field_description__',
        group: 'Geral',
        label: 'Descrição Detalhada',
        currentValue: formData.description,
        suggestedValue: suggestedResult.description,
        isFilledInErp: hasErpValue(formData.description),
        confidence: 'alta',
      });
    }

    // 2. Dimensões e Peso
    if (suggestedResult.height !== undefined && Number(suggestedResult.height) > 0) {
      items.push({
        key: '__field_height__',
        group: 'Dimensões',
        label: 'Altura (cm)',
        currentValue: formData.height,
        suggestedValue: suggestedResult.height,
        isFilledInErp: hasErpValue(formData.height),
        confidence: conf['Altura'] || 'alta',
      });
    }

    if (suggestedResult.width !== undefined && Number(suggestedResult.width) > 0) {
      items.push({
        key: '__field_width__',
        group: 'Dimensões',
        label: 'Largura (cm)',
        currentValue: formData.width,
        suggestedValue: suggestedResult.width,
        isFilledInErp: hasErpValue(formData.width),
        confidence: conf['Largura'] || 'alta',
      });
    }

    if (suggestedResult.depth !== undefined && Number(suggestedResult.depth) > 0) {
      items.push({
        key: '__field_depth__',
        group: 'Dimensões',
        label: 'Profundidade (cm)',
        currentValue: formData.depth,
        suggestedValue: suggestedResult.depth,
        isFilledInErp: hasErpValue(formData.depth),
        confidence: conf['Profundidade'] || 'alta',
      });
    }

    if (suggestedResult.weight !== undefined && Number(suggestedResult.weight) > 0) {
      items.push({
        key: '__field_weight__',
        group: 'Dimensões',
        label: 'Peso (kg)',
        currentValue: formData.weight,
        suggestedValue: suggestedResult.weight,
        isFilledInErp: hasErpValue(formData.weight),
        confidence: conf['Peso'] || 'alta',
      });
    }

    // 3. Características Técnicas
    const techVals = suggestedResult.technicalValues || {};
    const currentTech = formData.technicalValues || {};

    Object.entries(techVals).forEach(([key, val]) => {
      items.push({
        key,
        group: 'Especificações Técnicas',
        label: key,
        currentValue: currentTech[key],
        suggestedValue: val,
        isFilledInErp: hasErpValue(currentTech[key]),
        confidence: conf[key] || 'alta',
      });
    });

    return items;
  }, [suggestedResult, formData, identifiedProduct]);

  const totalCount = rows.length;
  const selectedCount = rows.filter((r) => Boolean(selectedKeys[r.key])).length;

  const renderConfidenceBadge = (confidence?: 'alta' | 'media' | 'baixa') => {
    const level = confidence || 'alta';
    if (level === 'alta') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <i className="bi bi-shield-check text-xs" />
          Alta
        </span>
      );
    }
    if (level === 'media') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
          <i className="bi bi-shield text-xs" />
          Média
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
        <i className="bi bi-shield-exclamation text-xs" />
        Baixa
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. Cabeçalho de Identificação do Produto */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 via-slate-50 to-blue-50/40 dark:from-slate-800/50 dark:via-slate-800/40 dark:to-blue-950/20 border border-slate-200 dark:border-slate-700/80 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Produto Identificado pela IA
            </span>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>{identifiedProduct?.name || 'Sugestão de Preenchimento Concluída'}</span>
            </h4>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
              <span>
                Marca: <strong>{identifiedProduct?.brand || '-'}</strong>
              </span>
              <span>•</span>
              <span>
                Modelo: <strong>{identifiedProduct?.model || '-'}</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-bold text-slate-400">Confiança Geral</span>
            {renderConfidenceBadge(identifiedProduct?.confidence)}
          </div>
        </div>

        {/* Fontes utilizadas */}
        {sources && sources.length > 0 && (
          <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Fontes Consultadas:
            </span>
            <div className="flex flex-wrap gap-2">
              {sources.map((source, idx) => (
                <span
                  key={`${source.title}-${idx}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300"
                >
                  <i className="bi bi-globe text-blue-500" />
                  <span className="truncate max-w-[220px]">{source.title}</span>
                  {source.uri && (
                    <a
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      title="Abrir fonte em nova aba"
                    >
                      <i className="bi bi-box-arrow-up-right text-[10px]" />
                    </a>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Alerta de Divergências */}
        {divergences && divergences.trim().length > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-700/70 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <i className="bi bi-exclamation-triangle-fill text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <strong className="block font-bold">Aviso de Divergência entre Fontes:</strong>
              <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">{divergences}</p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Banner de Aviso quando sem categoria */}
      {!hasCategory && (
        <div className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-3">
          <i className="bi bi-info-circle-fill text-lg text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="space-y-0.5">
            <strong>Categoria ainda não selecionada no produto</strong>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              Exibindo todas as características encontradas pela pesquisa. Para aplicar as características técnicas ao formulário,
              selecione a categoria na aba Informações Básicas para validação dos atributos permitidos.
              Seus dados básicos e dimensões já poderão ser aplicados normalmente!
            </p>
          </div>
        </div>
      )}

      {/* 3. Barra de Seleção em Lote */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
          <i className="bi bi-check2-circle text-base text-emerald-600 dark:text-emerald-400" />
          <span>
            {selectedCount} de {totalCount} campos selecionados para preenchimento
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectAll(true)}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Marcar todos
          </button>
          <button
            type="button"
            onClick={() => onSelectAll(false)}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Desmarcar todos
          </button>
        </div>
      </div>

      {/* 4. Lista Responsiva: Cards no Celular / Tabela no Computador */}

      {/* Versão Desktop (Tabela) */}
      <div className="hidden md:block border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="py-3 px-3 w-12 text-center">Aplicar</th>
              <th className="py-3 px-3 min-w-[140px]">Campo / Característica</th>
              <th className="py-3 px-3 min-w-[120px]">Valor Atual (ERP)</th>
              <th className="py-3 px-3 min-w-[200px] text-blue-600 dark:text-blue-400">
                Valor Sugerido (Editável)
              </th>
              <th className="py-3 px-3 w-28 text-center">Confiança</th>
              <th className="py-3 px-3 w-32 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {rows.map((row) => {
              const formattedCurrent = Array.isArray(row.currentValue)
                ? row.currentValue.join(', ')
                : row.isFilledInErp
                  ? String(row.currentValue)
                  : '-';

              const suggestedVal =
                editedValues[row.key] !== undefined ? editedValues[row.key] : row.suggestedValue;
              const formattedSuggested = Array.isArray(suggestedVal)
                ? suggestedVal.join(', ')
                : String(suggestedVal ?? '');

              const isSelected = Boolean(selectedKeys[row.key]);

              return (
                <tr
                  key={row.key}
                  className={`transition-colors ${
                    isSelected
                      ? 'bg-amber-50/30 dark:bg-amber-950/15'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                >
                  <td className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleKey(row.key)}
                      aria-label={`Selecionar ${row.label}`}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                    />
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{row.label}</span>
                      <span className="text-[10px] text-slate-400">{row.group}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-500 dark:text-slate-400 italic">
                    <span className="line-clamp-2" title={formattedCurrent}>
                      {formattedCurrent}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    {row.key === '__field_description__' ? (
                      <textarea
                        rows={3}
                        value={formattedSuggested}
                        onChange={(e) => onEditValue(row.key, e.target.value)}
                        placeholder="Descrição sugerida..."
                        className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-y"
                      />
                    ) : (
                      <input
                        type="text"
                        value={formattedSuggested}
                        onChange={(e) => onEditValue(row.key, e.target.value)}
                        placeholder="Valor sugerido..."
                        className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                      />
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {renderConfidenceBadge(row.confidence)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {row.isFilledInErp ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/70 px-2 py-0.5 rounded-full"
                        title="Este campo já possui valor no cadastro. Por segurança, inicia desmarcado para evitar sobrescrita acidental."
                      >
                        <i className="bi bi-exclamation-circle" />
                        Já preenchido
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full">
                        <i className="bi bi-plus-circle" />
                        Sugerido
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Versão Mobile (Cards Responsivos) */}
      <div className="block md:hidden space-y-3">
        {rows.map((row) => {
          const formattedCurrent = Array.isArray(row.currentValue)
            ? row.currentValue.join(', ')
            : row.isFilledInErp
              ? String(row.currentValue)
              : '';

          const suggestedVal =
            editedValues[row.key] !== undefined ? editedValues[row.key] : row.suggestedValue;
          const formattedSuggested = Array.isArray(suggestedVal)
            ? suggestedVal.join(', ')
            : String(suggestedVal ?? '');

          const isSelected = Boolean(selectedKeys[row.key]);

          return (
            <div
              key={row.key}
              className={`p-4 rounded-2xl border transition-all space-y-3 ${
                isSelected
                  ? 'border-amber-400 bg-amber-50/20 dark:bg-amber-950/20 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-800 dark:text-slate-100">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleKey(row.key)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 dark:border-slate-600"
                  />
                  <div>
                    <span>{row.label}</span>
                    <span className="text-[10px] text-slate-400 block font-normal">{row.group}</span>
                  </div>
                </label>
                <div className="flex items-center gap-1.5">
                  {row.isFilledInErp ? (
                    <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 rounded-md">
                      Já preenchido
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded-md">
                      Sugerido
                    </span>
                  )}
                  {renderConfidenceBadge(row.confidence)}
                </div>
              </div>

              {row.isFilledInErp && (
                <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2">
                  <span>Valor atual no cadastro:</span>
                  <strong className="truncate max-w-[180px]">{formattedCurrent}</strong>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Valor Sugerido (Toque para editar):
                </label>
                {row.key === '__field_description__' ? (
                  <textarea
                    rows={3}
                    value={formattedSuggested}
                    onChange={(e) => onEditValue(row.key, e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
                  />
                ) : (
                  <input
                    type="text"
                    value={formattedSuggested}
                    onChange={(e) => onEditValue(row.key, e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Justificativa Técnica / Raciocínio */}
      {suggestedResult?.reasoning && (
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
          <strong className="text-slate-800 dark:text-slate-200 block mb-1">
            <i className="bi bi-lightbulb mr-1 text-amber-500" /> Síntese da Consulta:
          </strong>
          {suggestedResult.reasoning}
        </div>
      )}
    </div>
  );
};

export default CharacteristicsDiffTable;
