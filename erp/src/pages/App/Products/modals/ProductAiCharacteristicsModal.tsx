import React from 'react';
import type { Product } from '../../../../types/product.type';
import { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';
import {
  CharacteristicsQuotaBar,
  ProductAiModalHeader,
  ProductAiModeTabs,
  ProductAiWebSearchForm,
  ProductAiDescriptiveTextForm,
  ProductAiReviewPhase,
  useProductAiCharacteristicsModal,
} from './characteristicsAi';

export interface ProductAiCharacteristicsModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly formData: Partial<Product>;
  readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  readonly availableAttributes?: readonly TechnicalFieldDefinition[];
  readonly categoryName?: string;
  readonly initialMode?: 'web_search' | 'descriptive_text';
  readonly onCharacteristicsApplied?: () => void;
}

export const ProductAiCharacteristicsModal: React.FC<ProductAiCharacteristicsModalProps> = (props) => {
  const { isOpen, onClose, formData } = props;
  const {
    activeMode,
    setActiveMode,
    phase,
    isAnalyzing,
    suggestedResult,
    selectedKeys,
    editedValues,
    stats,
    isHourlyLimitReached,
    isBlocked,
    productName,
    brand,
    model,
    description,
    effectiveCategory,
    hasCategory,
    images,
    hasName,
    hasDescription,
    hasBrand,
    hasModel,
    isPrerequisitesMet,
    webSearchForm,
    descriptiveTextForm,
    handleStartWebSearch,
    handleStartDescriptiveTextAnalysis,
    handleToggleKey,
    handleSelectAll,
    handleEditValue,
    selectedCount,
    handleApplyCharacteristics,
    handleReturnToModeSelection,
  } = useProductAiCharacteristicsModal(props);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-characteristics-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-4xl bg-white dark:bg-slate-900 sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <ProductAiModalHeader
          phase={phase}
          activeMode={activeMode}
          isAnalyzing={isAnalyzing}
          onClose={onClose}
        />

        {/* Barra de Consumo / Cota */}
        <CharacteristicsQuotaBar
          stats={stats}
          isHourlyLimitReached={isHourlyLimitReached}
          isBlocked={isBlocked}
        />

        {/* Seletor de Modo (visível na fase de escolha de tipo de preenchimento) */}
        {phase === 'input' && (
          <ProductAiModeTabs
            activeMode={activeMode}
            onChangeMode={setActiveMode}
          />
        )}

        {/* Conteúdo Dinâmico */}
        {phase === 'input' ? (
          activeMode === 'web_search' ? (
            <ProductAiWebSearchForm
              form={webSearchForm}
              onSubmit={handleStartWebSearch}
              onCancel={onClose}
              isAnalyzing={isAnalyzing}
              isBlocked={isBlocked}
              productName={productName}
              effectiveCategory={effectiveCategory}
              brand={brand}
              model={model}
              hasName={hasName}
              hasCategory={hasCategory}
              hasBrand={hasBrand}
              hasModel={hasModel}
              hasDescription={hasDescription}
              imageCount={images.length}
              isPrerequisitesMet={isPrerequisitesMet}
            />
          ) : (
            <ProductAiDescriptiveTextForm
              form={descriptiveTextForm}
              onSubmit={handleStartDescriptiveTextAnalysis}
              onCancel={onClose}
              isAnalyzing={isAnalyzing}
              isBlocked={isBlocked}
            />
          )
        ) : (
          <ProductAiReviewPhase
            suggestedResult={suggestedResult}
            formData={formData}
            selectedKeys={selectedKeys}
            onToggleKey={handleToggleKey}
            onSelectAll={handleSelectAll}
            editedValues={editedValues}
            onEditValue={handleEditValue}
            hasCategory={hasCategory}
            selectedCount={selectedCount}
            onReturnToModeSelection={handleReturnToModeSelection}
            onApplyCharacteristics={handleApplyCharacteristics}
          />
        )}
      </div>
    </div>
  );
};

export default ProductAiCharacteristicsModal;
