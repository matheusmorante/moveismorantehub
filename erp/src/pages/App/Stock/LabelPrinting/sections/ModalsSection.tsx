import type React from 'react';
import { useEffect, useRef } from 'react';
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
import { persistPriceLabelArtwork } from '../services/labelLayoutService';
import type { ModalsSectionProps } from '../types/LabelPrintingSections.types';
import type { LabelConfig } from '../utils/LabelConstants';

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
    selectLayout,
    isCopyModalOpen,
    setIsCopyModalOpen,
    modelToCopy,
    handleCopyToCategory,
    handleSaveGridModel,
    modelToDelete,
    setModelToDelete,
    confirmDeleteLayout,
    layoutsBusy,
    layoutsError,
    layoutsBlocked,
    handleLogoUpload,
    handleConfirmNewLogo,
    assetsSaving,
    assetError,
    imageUploading,
    imageUploadError,
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

  const artworkOwnerKey = JSON.stringify([String(config.layoutId || 'preco_2x5_restored'), selectedCategory, isPriceLabelArtEditorOpen]);
  const artworkOwner = useRef({ key: artworkOwnerKey });
  if (artworkOwner.current.key !== artworkOwnerKey) artworkOwner.current = { key: artworkOwnerKey };
  const currentArtworkOwner = artworkOwner.current;
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const artworkIsCurrent = () => active.current && artworkOwner.current === currentArtworkOwner && isPriceLabelArtEditorOpen;

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
        currentType={config.type}
        previewImage={selectedImage}
        isPersisting={layoutsBusy}
        error={layoutsError}
        blocked={layoutsBlocked}
        onSave={handleSaveGridModel}
      />

      <LabelCopyCategoryModal
        isSaving={layoutsBusy}
        error={layoutsError}
        blocked={layoutsBlocked}
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        modelToCopy={modelToCopy}
        selectedCategory={selectedCategory}
        handleCopyToCategory={handleCopyToCategory}
      />

      <LabelDeleteConfirmModal
        isSaving={layoutsBusy}
        error={layoutsError}
        blocked={layoutsBlocked}
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
        isSaving={assetsSaving}
        error={assetError}
      />

      <LabelAssetLibraryModal
        isBusy={Boolean(imageUploading || assetsSaving)}
        isUploading={imageUploading}
        error={imageUploadError || assetError}
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
        isSaving={assetsSaving}
        error={assetError}
      />

      <LabelModelManagerModal
        isSaving={layoutsBusy}
        error={layoutsError}
        blocked={layoutsBlocked}
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
          category: selectedCategory ?? config.category ?? 'precos',
          artConfig:
            savedArtConfigs[String(config.layoutId || 'preco_2x5_restored')] ||
            savedArtConfigs['preco_2x5_restored'] ||
            config.artConfig,
        }}
        onArtConfigLoaded={(loadedArtConfig, stillCurrent = () => true) => {
          if (!artworkIsCurrent() || !stillCurrent()) return;
          const layoutId = String(config.layoutId || 'preco_2x5_restored');
          setSavedArtConfigs((prev) => ({
            ...prev,
            [layoutId]: loadedArtConfig,
            preco_2x5_restored: loadedArtConfig,
          }));
          setConfig((prev) => ({ ...prev, artConfig: loadedArtConfig }));
          setArtVersion((prev) => prev + 1);
        }}
        onSaveConfig={async (updated: Partial<LabelConfig>, stillCurrent = () => true) => {
          const isCurrent = () => artworkIsCurrent() && stillCurrent();
          if (!isCurrent()) return false;
          const layoutId = String(config.layoutId || 'preco_2x5_restored');
          const confirmed = await persistPriceLabelArtwork({
            layoutId,
            category: selectedCategory,
            updated,
            isCurrent,
          });
          if (!confirmed || !isCurrent()) return false;

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
          return true;
        }}
        initialProduct={
          selectedProductToAdd
            ? {
                name: selectedProductToAdd.description,
                price: String(selectedProductToAdd.unitPrice ?? ''),
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
