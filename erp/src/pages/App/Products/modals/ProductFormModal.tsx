import type React from 'react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { getTestArtifactContext } from '../../../../../../shared-utils/testArtifactContext';
import type Product from '../../../types/product.type';
import './ProductFormModal.css';
import { getProfileRoles, isStockistOnlyProfile } from '@/pages/utils/accessRoles';
import { isProductDraft } from '@/pages/utils/productService/productDraftSnapshot';
import { readTestArtifactIdentity } from '../../../../../../shared-utils/testArtifactPolicy';
import { ProductFormFooter } from '../components/form/ProductFormFooter';
import { ProductFormHeader } from '../components/form/ProductFormHeader';
import { ProductFormTabContent } from '../components/form/ProductFormTabContent';
import { ProductFormSubModals } from '../components/form/ProductFormSubModals';
import { useProductDraftCapture } from '../hooks/form/useProductDraftCapture';
import { useProductFormModal } from '../hooks/form/useProductFormModal';

export interface ProductFormModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly product?: Product | null;
  readonly initialData?: Partial<Product> | null;
  readonly initialTab?: 'geral' | 'ambientes' | 'estoque' | 'variacoes' | 'ecommerce' | 'fiscal';
  readonly openAddVariationOnOpen?: boolean;
  readonly onSuccess?: (newProduct: Product) => void | boolean | Promise<void | boolean>;
  readonly onDraftSaved?: () => void;
  readonly onSave?: (savedProduct?: Product) => void | Promise<void>;
  readonly isQuickRegister?: boolean;
}

/**
 * Modal principal de criação e edição de produtos.
 * Segue os princípios de Clean Code e SOLID:
 * - Responsabilidade Única (SRP): Atua exclusivamente como casca visual (apresentação),
 *   delegando toda a orquestração e regras para `useProductFormModal`.
 * - Composição modular de abas, cabeçalho, rodapé e submodais especializados.
 */
const ProductFormModal: React.FC<ProductFormModalProps> = (props) => {
  const { isOpen, onClose, product, onSuccess } = props;
  const { profile, isAdministrator } = useAuth();
  const isStockistOnly = isStockistOnlyProfile(profile);

  const testContext = getTestArtifactContext();
  const existingTestIdentity = props.product ? readTestArtifactIdentity(props.product) : null;
  const canMarkTestArtifact = Boolean(
    isAdministrator &&
      testContext &&
      (!product || isProductDraft(product)) &&
      (!existingTestIdentity ||
        (existingTestIdentity.runId === testContext.runId &&
          existingTestIdentity.ownerId === testContext.ownerId))
  );

  const profileRoles = profile ? getProfileRoles(profile) : [];
  const canConfigureProductTaxes = profileRoles.some(
    (role) => role !== 'seller' && role !== 'stockist'
  );

  const {
    activeTab,
    setActiveTab,
    activeEcommerceSubTab,
    setActiveEcommerceSubTab,
    loading,
    saveResult,
    setSaveResult,
    validationErrors,
    setValidationErrors,
    isCategorySearchOpen,
    setIsCategorySearchOpen,
    suppliers,
    availableCategories,
    isConversionModalOpen,
    setIsConversionModalOpen,
    formData,
    setFormData,
    isTestArtifact,
    setIsTestArtifact,
    canMarkTestArtifact: canToggleTestArtifact,
    isService,
    isDraftProduct,
    isRegisteredProduct,
    ecomStatus,
    pricing,
    ai,
    jev,
    variations,
    draft,
    images,
    navigateToRequirementField,
    handleSubmit,
    handleCloseWithAutoSave,
    handleCategorySelect,
    handleCloseVariationModal,
    handleSaveVariation,
    handleReplaceImageGlobal,
    handleConvertProduct,
    scheduleDraftAutoSave,
    deletingVariationId,
    handleDeleteVariation,
    handleNextStep,
    isLastStep,
  } = useProductFormModal({
    ...props,
    isStockistOnly,
    canMarkTestArtifact,
  });

  const {
    handleDraftFieldBlurCapture,
    handleDraftSelectChangeCapture,
    handleDraftSearchOptionClickCapture,
  } = useProductDraftCapture({
    editingVariationId: variations.editingVariationId,
    scheduleDraftAutoSave,
  });

  const [isAiCharacteristicsModalOpen, setIsAiCharacteristicsModalOpen] = useState(false);
  const [aiCharacteristicsInitialMode, setAiCharacteristicsInitialMode] = useState<'web_search' | 'descriptive_text'>('web_search');


  // As características só existem no contexto de uma categoria.
  // Se a categoria for removida enquanto a aba estiver aberta, volta ao cadastro geral.
  useEffect(() => {
    if (activeTab === 'technical' && (!formData.categoryIds || formData.categoryIds.length === 0)) {
      setActiveTab('geral');
    }
  }, [activeTab, formData.categoryIds, setActiveTab]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-form-title"
      tabIndex={-1}
      className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[1000010] flex items-center justify-center p-0 m-0 bg-white dark:bg-slate-900 overflow-hidden"
    >
      <button
        type="button"
        aria-label="Fechar formulário de produto"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-default border-0 p-0 m-0 w-full h-full"
        onClick={handleCloseWithAutoSave}
      />

      <div
        onPaste={isStockistOnly ? undefined : images.handlePaste}
        onBlurCapture={handleDraftFieldBlurCapture}
        onChangeCapture={handleDraftSelectChangeCapture}
        onClickCapture={handleDraftSearchOptionClickCapture}
        className="product-form-fullscreen relative bg-white dark:bg-slate-900 w-full h-full m-0 p-0 rounded-none shadow-none flex flex-col overflow-hidden animate-in fade-in duration-200 border-0"
      >
        <ProductFormHeader
          product={product}
          isDraftProduct={isDraftProduct}
          isStockistOnly={isStockistOnly}
          formData={formData}
          ecomStatus={ecomStatus}
          isService={isService}
          navigateToRequirementField={navigateToRequirementField}
          handleCloseWithAutoSave={handleCloseWithAutoSave}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          validationErrors={validationErrors}
        />

        <ProductFormTabContent
          activeTab={activeTab}
          isService={isService}
          isStockistOnly={isStockistOnly}
          isRegisteredProduct={isRegisteredProduct}
          canConfigureProductTaxes={canConfigureProductTaxes}
          formData={formData}
          setFormData={setFormData}
          validationErrors={validationErrors}
          setValidationErrors={setValidationErrors}
          availableCategories={availableCategories}
          suppliers={suppliers}
          ai={ai}
          pricing={pricing}
          jev={jev}
          variations={variations}
          images={images}
          activeEcommerceSubTab={activeEcommerceSubTab}
          setActiveEcommerceSubTab={setActiveEcommerceSubTab}
          onOpenCategorySearch={() => setIsCategorySearchOpen(true)}
          scheduleDraftAutoSave={scheduleDraftAutoSave}
          deletingVariationId={deletingVariationId}
          handleDeleteVariation={handleDeleteVariation}
          onOpenAiCharacteristicsModal={(mode = 'web_search') => {
            setAiCharacteristicsInitialMode(mode);
            setIsAiCharacteristicsModalOpen(true);
          }}
        />

        <ProductFormFooter
          isDraftProduct={isDraftProduct}
          autoSaveStatus={draft.autoSaveStatus}
          loading={loading}
          isAiProcessing={ai.isAiProcessing}
          isLastStep={isLastStep}
          canMarkTestArtifact={canToggleTestArtifact}
          isTestArtifact={isTestArtifact}
          onTestArtifactChange={setIsTestArtifact}
          onClose={handleCloseWithAutoSave}
          onNextStep={handleNextStep}
          onSubmit={() => handleSubmit()}
        />

        <ProductFormSubModals
          formData={formData}
          setFormData={setFormData}
          variations={variations}
          isStockistOnly={isStockistOnly}
          canToggleTestArtifact={canToggleTestArtifact}
          isTestArtifact={isTestArtifact}
          setIsTestArtifact={setIsTestArtifact}
          handleCloseVariationModal={handleCloseVariationModal}
          handleSaveVariation={handleSaveVariation}
          handleReplaceImageGlobal={handleReplaceImageGlobal}
          isCategorySearchOpen={isCategorySearchOpen}
          setIsCategorySearchOpen={setIsCategorySearchOpen}
          availableCategories={availableCategories}
          handleCategorySelect={handleCategorySelect}
          isConversionModalOpen={isConversionModalOpen}
          setIsConversionModalOpen={setIsConversionModalOpen}
          handleConvertProduct={handleConvertProduct}
          saveResult={saveResult}
          setSaveResult={setSaveResult}
          onSuccess={onSuccess}
          onSave={props.onSave}
          onClose={onClose}
          isAiCharacteristicsModalOpen={isAiCharacteristicsModalOpen}
          setIsAiCharacteristicsModalOpen={setIsAiCharacteristicsModalOpen}
          aiCharacteristicsInitialMode={aiCharacteristicsInitialMode}
        />
      </div>
    </div>,
    document.body
  );
};

export default ProductFormModal;
