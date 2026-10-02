import type React from 'react';
import { toast } from 'react-toastify';
import LabelAssetLibraryModal from '../modals/LabelAssetLibraryModal';
import LabelCopyCategoryModal from '../modals/LabelCopyCategoryModal';
import LabelCustomDesignModal from '../modals/LabelCustomDesignModal';
import LabelDeleteConfirmModal from '../modals/LabelDeleteConfirmModal';
import LabelGridModelModal from '../modals/LabelGridModelModal';
import LabelImageModal from '../modals/LabelImageModal';
import LabelModelManagerModal from '../modals/LabelModelManagerModal';
import LabelNewAssetModal from '../modals/LabelNewAssetModal';
import PriceLabelArtEditorModal from '../modals/PriceLabelArtEditorModal';
import {
  findIdenticalGridModel,
  saveGridModelWithFallback,
} from '../services/labelGridModelPersistence';
import { persistPriceLabelArtwork } from '../services/labelLayoutService';
import type { ModalsSectionProps } from '../types/LabelPrintingSections.types';
import type { LabelConfig } from '../utils/LabelConstants';
import { DEFAULT_LAYOUT_MODELS } from '../utils/LabelConstants';

export const ModalsSection: React.FC<ModalsSectionProps> = (props) => {
  const {
    gridModalOpen,
    setGridModalOpen,
    layoutModels,
    customLayouts,
    config,
    setConfig,
    isModelManagerModalOpen,
    setIsModelManagerModalOpen,
    isImageModalOpen,
    setIsImageModalOpen,
    editingLabel,
    labelFormName,
    setLabelFormName,
    labelFormImage,
    setLabelFormImage,
    handleSaveCustomLabel,
    isPriceLabelArtEditorOpen,
    setIsPriceLabelArtEditorOpen,
    setSavedArtConfigs,
    savedArtConfigs,
    setArtVersion,
    isAssetManagerModalOpen,
    setIsAssetManagerModalOpen,
    selectedCategory,
    setLogoItems,
    isNewLogoModalOpen,
    setIsNewLogoModalOpen,
    newLogoName,
    setNewLogoName,
    newLogoImage,
    editingGridModel,
    setEditingGridModel,
    selectedImage,
    setCustomLayouts,
    selectLayout,
    isCopyModalOpen,
    setIsCopyModalOpen,
    modelToCopy,
    handleCopyToCategory,
    modelToDelete,
    setModelToDelete,
    confirmDeleteLayout,
    handleLogoUpload,
    handleConfirmNewLogo,
    availableLogos,
    handleAddLogoToQueue,
    handleDeleteAvailableLogo,
    isLabelModalOpen,
    setIsLabelModalOpen,
    handleDeleteLayout,
    setSelectedImage,
    publishPriceLabelTemplateUpdate,
    selectedProductToAdd,
  } = props;

  return (
    <>
      <LabelGridModelModal
        isOpen={gridModalOpen}
        onClose={() => {
          setGridModalOpen(false);
          setEditingGridModel(null);
        }}
        editingModel={editingGridModel}
        currentCategory={selectedCategory}
        previewImage={selectedImage}
        onSave={async (newModel) => {
          const isSystemDefault = editingGridModel
            ? DEFAULT_LAYOUT_MODELS.some((m) => m.id === editingGridModel.id)
            : false;
          const existingOverride = isSystemDefault
            ? customLayouts.find((c) => c.baseModelId === editingGridModel?.id)
            : null;
          const targetId =
            existingOverride?.id ?? (isSystemDefault ? null : (editingGridModel?.id ?? null));

          const identicalLayout = findIdenticalGridModel(
            customLayouts,
            newModel,
            targetId,
            editingGridModel?.id
          );

          if (identicalLayout) {
            toast.info(`Este modelo de etiqueta já existe (como "${identicalLayout.name}").`);
            setGridModalOpen(false);
            setEditingGridModel(null);
            return;
          }

          const { finalModel, updatedLayouts, savedToDb, resultError } =
            await saveGridModelWithFallback({
              newModel,
              editingGridModel,
              customLayouts,
              selectedCategory,
            });

          setCustomLayouts(updatedLayouts);

          if (
            finalModel &&
            (editingGridModel?.id === config.layoutId || config.layoutId === finalModel.id)
          ) {
            selectLayout(finalModel);
          }

          if (savedToDb) {
            toast.success('Modelo atualizado no banco!');
          } else {
            const errorDetails =
              typeof resultError === 'object' && resultError !== null
                ? (resultError as { message?: unknown; status?: unknown })
                : {};
            const quota =
              (typeof errorDetails.message === 'string' &&
                errorDetails.message.toLowerCase().includes('quota')) ||
              errorDetails.status === 402;
            toast.warning(
              <div className="flex flex-col gap-1">
                <p className="font-bold text-[10px] uppercase tracking-widest text-slate-800">
                  Salvo Localmente
                </p>
                <p className="text-[9px] opacity-70">
                  {quota ? 'Limite de dados (Quota) atingido. ' : 'Falha na rede. '}
                  As alterações foram salvas neste computador.
                </p>
              </div>,
              { autoClose: 9000 }
            );
          }

          setGridModalOpen(false);
          setEditingGridModel(null);
        }}
      />

      <LabelCopyCategoryModal
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        modelToCopy={modelToCopy}
        selectedCategory={selectedCategory}
        handleCopyToCategory={handleCopyToCategory}
      />

      <LabelDeleteConfirmModal
        isOpen={Boolean(modelToDelete)}
        modelToDelete={modelToDelete}
        onClose={() => setModelToDelete(null)}
        onConfirm={confirmDeleteLayout}
      />

      <LabelNewAssetModal
        isOpen={isNewLogoModalOpen}
        onClose={() => setIsNewLogoModalOpen(false)}
        newLogoImage={newLogoImage}
        newLogoName={newLogoName}
        setNewLogoName={setNewLogoName}
        onConfirm={handleConfirmNewLogo}
      />

      <LabelAssetLibraryModal
        isOpen={isAssetManagerModalOpen}
        onClose={() => setIsAssetManagerModalOpen(false)}
        availableLogos={availableLogos}
        onUploadLogo={handleLogoUpload}
        onSelectLogo={handleAddLogoToQueue}
        onDeleteLogo={handleDeleteAvailableLogo}
      />

      <LabelCustomDesignModal
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        editingLabel={editingLabel}
        labelFormName={labelFormName}
        setLabelFormName={setLabelFormName}
        labelFormImage={labelFormImage}
        setLabelFormImage={setLabelFormImage}
        availableLogos={availableLogos}
        handleSaveCustomLabel={handleSaveCustomLabel}
      />

      <LabelModelManagerModal
        isOpen={isModelManagerModalOpen}
        onClose={() => setIsModelManagerModalOpen(false)}
        selectedCategory={selectedCategory}
        layoutModels={layoutModels}
        customLayouts={customLayouts}
        config={config}
        selectLayout={selectLayout}
        setEditingGridModel={setEditingGridModel}
        setGridModalOpen={setGridModalOpen}
        handleDeleteLayout={handleDeleteLayout}
      />

      <LabelImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        currentCategory={selectedCategory}
        onSelect={(image) => {
          if (selectedCategory === 'logos') {
            setLogoItems((prev) => [
              ...prev,
              { image, quantity: 1, imageFit: config.imageFit || 'contain', name: 'DA BIBLIOTECA' },
            ]);
          } else {
            setSelectedImage(image);
          }
          setIsImageModalOpen(false);
          toast.success('Imagem selecionada da biblioteca!');
        }}
      />

      <PriceLabelArtEditorModal
        isOpen={isPriceLabelArtEditorOpen}
        onClose={() => {
          setIsPriceLabelArtEditorOpen(false);
          setArtVersion((prev) => prev + 1);
          if (location.pathname === '/templates/price-label' && window.opener) window.close();
        }}
        config={{
          ...config,
          artConfig:
            savedArtConfigs[String(config.layoutId || 'preco_2x5_restored')] ||
            savedArtConfigs['preco_2x5_restored'] ||
            config.artConfig,
        }}
        onArtConfigLoaded={(loadedArtConfig) => {
          const layoutId = String(config.layoutId || 'preco_2x5_restored');
          setSavedArtConfigs((prev) => ({
            ...prev,
            [layoutId]: loadedArtConfig,
            preco_2x5_restored: loadedArtConfig,
          }));
          setConfig((prev) => ({ ...prev, artConfig: loadedArtConfig }));
          setArtVersion((prev) => prev + 1);
        }}
        onSaveConfig={async (updated: Partial<LabelConfig>) => {
          const layoutId = String(config.layoutId || 'preco_2x5_restored');
          await persistPriceLabelArtwork({
            layoutId,
            category: selectedCategory,
            updated,
          });

          if (updated.artConfig) {
            const artConfig = updated.artConfig;
            setSavedArtConfigs((prev) => ({
              ...prev,
              [layoutId]: artConfig,
              preco_2x5_restored: artConfig,
            }));
            publishPriceLabelTemplateUpdate({
              layoutId,
              artConfig,
            });
          }
          setConfig((prev) => ({
            ...prev,
            ...updated,
            artConfig: updated.artConfig || prev.artConfig,
          }));
          setArtVersion((prev) => prev + 1);
        }}
        initialProduct={
          selectedProductToAdd
            ? {
                name: selectedProductToAdd.description,
                price: String(selectedProductToAdd.unitPrice || ''),
                promoPrice:
                  selectedProductToAdd.promoPrice === undefined
                    ? ''
                    : String(selectedProductToAdd.promoPrice),
                sku: selectedProductToAdd.sku || selectedProductToAdd.code || '',
              }
            : undefined
        }
      />
    </>
  );
};
