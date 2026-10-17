import React, { useState } from 'react';
import { toast } from 'react-toastify';
import type Product from '../../../../types/product.type';
import { aiService } from '../../../../utils/aiService';
import { getMissingRequiredCharacteristics } from '../../../../utils/technicalValuesService';
import { ProductDescriptionInformativeModal } from '../../modals/descriptionAi/ProductDescriptionInformativeModal';

export interface ProductDescriptionTabProps {
  readonly formData: Partial<Product>;
  readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  readonly categoryName?: string;
  readonly onImprove?: () => void;
  readonly improving?: boolean;
  readonly showImprove?: boolean;
}

/**
 * Validação dos pré-requisitos para geração da descrição por características:
 * - Nome do produto preenchido (mínimo 2 caracteres)
 * - Características obrigatórias mínimas preenchidas (Marca, Modelo, Cor e obrigatórias de catálogo)
 */
export const validateProductDescriptionPrerequisites = (formData: Partial<Product>): string[] => {
  const missing: string[] = [];

  const name = formData.name?.trim() || '';
  if (name.length < 2) {
    missing.push('Nome do produto');
  }

  const techValues = formData.technicalValues || {};
  const hasBrand = Boolean(formData.brand?.trim() || techValues['Marca'] || techValues['marca']);
  if (!hasBrand) {
    missing.push('Marca');
  }

  const hasModel = Boolean(
    formData.model?.trim() ||
    formData.line?.trim() ||
    techValues['Modelo/Linha'] ||
    techValues['Modelo / Linha'] ||
    techValues['modelo/linha'] ||
    techValues['Modelo'] ||
    techValues['modelo'] ||
    techValues['Linha'] ||
    techValues['linha']
  );
  if (!hasModel) {
    missing.push('Modelo');
  }

  const hasColor = Boolean(formData.color?.trim() || techValues['Cor'] || techValues['cor']);
  if (!hasColor) {
    missing.push('Cor');
  }

  const missingFromUtils = getMissingRequiredCharacteristics({
    ...techValues,
    ...(formData.brand ? { Marca: formData.brand } : {}),
    ...(formData.model ? { Modelo: formData.model } : {}),
    ...(formData.color ? { Cor: formData.color } : {}),
  });

  missingFromUtils.forEach((field) => {
    if (!missing.includes(field)) {
      missing.push(field);
    }
  });

  return missing;
};

export default function ProductDescriptionTab({
  formData,
  setFormData,
  categoryName = '',
}: ProductDescriptionTabProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInformativeModalOpen, setIsInformativeModalOpen] = useState(false);

  // Modo 1: Gerar descrição usando as características e dados já preenchidos
  const handleGenerateFromCharacteristics = async () => {
    const missing = validateProductDescriptionPrerequisites(formData);
    if (missing.length > 0) {
      toast.warning(`Para gerar a descrição por características, preencha: ${missing.join(', ')}.`);
      return;
    }

    setIsGenerating(true);
    try {
      const techValues = {
        ...(formData.technicalValues || {}),
        ...(formData.brand ? { Marca: formData.brand } : {}),
        ...(formData.model ? { Modelo: formData.model } : {}),
        ...(formData.color ? { Cor: formData.color } : {}),
      };

      const result = await aiService.improveProductDescription({
        title: formData.name || '',
        currentDescription: formData.description || '',
        brand: formData.brand || String(techValues['Marca'] || ''),
        line:
          formData.line ||
          formData.model ||
          String(
            techValues['Modelo/Linha'] ||
            techValues['Modelo / Linha'] ||
            techValues['Modelo'] ||
            techValues['Linha'] ||
            ''
          ),
        material: formData.material || String(techValues['Material'] || techValues['Estrutura'] || ''),
        width: formData.width,
        height: formData.height,
        depth: formData.depth,
        weight: formData.weight,
        technicalValues: techValues,
      });

      const description = result?.improvedDescription?.trim();
      if (description) {
        setFormData((prev) => ({ ...prev, description }));
        toast.success('Descrição gerada com IA a partir das características! ✨');
      }
    } catch (error: any) {
      console.error('Erro ao gerar descrição com IA:', error);
      toast.error(error?.message || 'Não foi possível gerar a descrição.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Modo 2: Gerar descrição usando texto informativo fornecido no modal
  const handleGenerateFromInformativeText = async (text: string) => {
    setIsInformativeModalOpen(false);
    setIsGenerating(true);
    try {
      const result = await aiService.generateDescriptionFromInformativeText({
        productName: formData.name || 'Produto',
        informativeText: text,
        brand: formData.brand,
        model: formData.model,
        categoryName,
      });

      const description = result?.description?.trim();
      if (description) {
        setFormData((prev) => ({ ...prev, description }));
        toast.success('Descrição gerada com IA a partir do texto informativo! ✨');
      }
    } catch (error: any) {
      console.error('Erro ao gerar descrição a partir do texto informativo:', error);
      toast.error(
        error?.message || 'Não foi possível gerar a descrição a partir do texto informativo.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Barra de Ações de IA na Descrição */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15 dark:via-amber-500/5 border border-amber-200/60 dark:border-amber-800/60">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
            <i className="bi bi-stars text-amber-500 text-sm animate-pulse" />
            <span>Gerar Descrição com IA</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Botão de Estrelinha (somente ícone) - Modo 1: Usar características e dados já preenchidos */}
          <button
            type="button"
            onClick={handleGenerateFromCharacteristics}
            disabled={isGenerating}
            title="Gerar descrição a partir das características e dados preenchidos"
            aria-label="Gerar descrição a partir das características"
            className="w-8 h-8 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-xs hover:shadow-md flex items-center justify-center transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="bi bi-stars text-base" />
          </button>

          {/* Botão com texto informativo - Modo 2: Abrir modal de texto informativo */}
          <button
            type="button"
            onClick={() => setIsInformativeModalOpen(true)}
            disabled={isGenerating}
            title="Gerar descrição a partir de anotações ou texto informativo"
            aria-label="Gerar descrição via texto informativo"
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="bi bi-file-text text-amber-500" />
            <span>Texto informativo</span>
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
          Descrição do produto
        </h3>
        <p className="text-xs font-semibold text-slate-400">
          Descreva o produto, seus diferenciais e informações importantes para o catálogo.
        </p>
      </div>

      {/* Container do Textarea com faixa animada shimmer de loading */}
      <div className="relative w-full rounded-2xl overflow-hidden">
        <textarea
          rows={18}
          aria-label="Descrição detalhada do produto"
          value={formData.description || ''}
          onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
          disabled={isGenerating}
          placeholder="Descreva o produto..."
          className={`w-full min-h-[360px] rounded-2xl border bg-transparent p-4 text-sm font-semibold outline-none resize-y dark:text-slate-200 transition-colors ${
            isGenerating
              ? 'border-amber-400/60 dark:border-amber-500/60 bg-amber-50/20 dark:bg-amber-950/10 cursor-wait'
              : 'border-slate-200 dark:border-slate-800 focus:border-blue-600'
          }`}
        />

        {/* Faixa animada shimmer passando no input da descrição durante a geração */}
        {isGenerating && (
          <div
            data-testid="description-shimmer-indicator"
            className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden flex items-center justify-center bg-amber-500/5 dark:bg-amber-400/5 backdrop-blur-[0.5px]"
          >
            <div className="ncm-input-shimmer absolute inset-0 w-1/2" />
            <div className="relative z-10 flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 shadow-lg border border-amber-200/80 dark:border-amber-700/80 text-xs font-bold text-amber-800 dark:text-amber-300">
              <i className="bi bi-stars text-amber-500 text-sm animate-spin" />
              <span>Gerando descrição com IA...</span>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-2xl">
              <div className="ncm-input-shimmer absolute inset-0 w-1/2" />
            </div>
          </div>
        )}
      </div>

      {/* Modal para inserção de texto informativo (Modo 2) */}
      <ProductDescriptionInformativeModal
        isOpen={isInformativeModalOpen}
        onClose={() => setIsInformativeModalOpen(false)}
        onSubmit={handleGenerateFromInformativeText}
        isGenerating={isGenerating}
      />
    </div>
  );
}
