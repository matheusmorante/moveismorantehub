import fs from 'fs';

const oldContent = fs.readFileSync('temp_old_index_utf8.tsx', 'utf8');
const oldLines = oldContent.split('\n');

// Line 1602 is index 1601 (inclusive). Line 2298 is index 2298 (exclusive: slice(1601, 2298) gets up to line 2298)
// Let's verify: line 2298 ends PriceLabelArtEditorModal (`/>`)
const modalsLines = oldLines.slice(1601, 2298);

const header = `import { supabase } from '@/pages/utils/supabaseConfig';
import { GridModel } from '../modals/LabelGridModelModal';
import { DEFAULT_LAYOUT_MODELS } from '../utils/LabelConstants';
import { mapModelToDb, mapDbToModel, calculateLabelDimensions } from '../utils/LabelUtils';
import { toast } from 'react-toastify';
import React from 'react';
import { ModalsSectionProps } from '../types/LabelPrintingSections.types';
import LabelGridModelModal from '../modals/LabelGridModelModal';
import LabelImageModal from '../modals/LabelImageModal';
import PriceLabelArtEditorModal from '../modals/PriceLabelArtEditorModal';

export const ModalsSection: React.FC<ModalsSectionProps> = (props) => {
    const { 
        gridModalOpen, setGridModalOpen, layoutModels, customLayouts, config, 
        setConfig, applyPresetWithConfig, isModelManagerModalOpen, 
        setIsModelManagerModalOpen, setCustomLabels, currentModel, 
        isImageModalOpen, setIsImageModalOpen, editingLabel, setEditingLabel, 
        labelFormName, setLabelFormName, labelFormImage, setLabelFormImage, 
        handleSaveCustomLabel, isPriceLabelArtEditorOpen, 
        setIsPriceLabelArtEditorOpen, setSavedArtConfigs, savedArtConfigs, 
        artVersion, setArtVersion, isAssetManagerModalOpen, 
        setIsAssetManagerModalOpen, selectedCategory, logoItems, setLogoItems, 
        isNewLogoModalOpen, setIsNewLogoModalOpen, newLogoName, setNewLogoName, 
        newLogoImage, setNewLogoImage, handleSaveNewLogo,
        editingGridModel, setEditingGridModel, selectedImage, setCustomLayouts, 
        selectLayout, isCopyModalOpen, setIsCopyModalOpen, modelToCopy, 
        handleCopyToCategory, modelToDelete, setModelToDelete, confirmDeleteLayout, 
        logoInputRef, handleLogoUpload, handleConfirmNewLogo, availableLogos, 
        handleAddLogoToQueue, handleDeleteAvailableLogo, isLabelModalOpen, 
        setIsLabelModalOpen, handleDeleteLayout, setSelectedImage, 
        publishPriceLabelTemplateUpdate, selectedProductToAdd
    } = props;

    return (
        <>
`;

const footer = `
        </>
    );
};
`;

const fullContent = header + modalsLines.join('\n') + footer;
fs.writeFileSync('erp/src/pages/App/Stock/LabelPrinting/sections/ModalsSection.tsx', fullContent, 'utf8');
console.log('ModalsSection re-written successfully!');
