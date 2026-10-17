import React, { useState } from 'react';
import { toast } from 'react-toastify';
import type Product from '../../../../types/product.type';
import { aiService } from '../../../../utils/aiService';
import { validateProductDescriptionPrerequisites } from './productDescriptionPrerequisites';
import { ProductDescriptionInformativeModal } from '../../modals/descriptionAi/ProductDescriptionInformativeModal';
export { validateProductDescriptionPrerequisites };

export interface ProductDescriptionTabProps {
  readonly formData: Partial<Product>;
  readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  readonly categoryName?: string;
  readonly onImprove?: () => void;
  readonly improving?: boolean;
  readonly showImprove?: boolean;
}

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
    setIsInformativeModalOpen(false);
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
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
            Descrição do produto
          </h3>
          <p className="text-xs font-semibold text-slate-400">
            Descreva o produto, seus diferenciais e informações importantes para o catálogo.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsInformativeModalOpen(true)}
          disabled={isGenerating}
          title="Gerar descrição com IA"
          aria-label="Gerar descrição com IA"
          className="w-8 h-8 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-xs hover:shadow-md flex items-center justify-center transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <i className="bi bi-stars text-base" />
        </button>
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

      {/* Modal para geração da descrição com IA (Características ou Texto Informativo) */}
      <ProductDescriptionInformativeModal
        isOpen={isInformativeModalOpen}
        onClose={() => setIsInformativeModalOpen(false)}
        onSubmit={handleGenerateFromInformativeText}
        onGenerateFromCharacteristics={handleGenerateFromCharacteristics}
        formData={formData}
        isGenerating={isGenerating}
      />
    </div>
  );
}
