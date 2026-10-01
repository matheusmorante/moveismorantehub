import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import labelMdf from '../../../../../assets/label_mdf.png';
import logoMorante from '../../../../../assets/logo-morante.svg';
import { CustomLabel, LabelConfig } from '../utils/LabelConstants';
import type { LabelItemConfig, LabelLogoAsset, LogoItemConfig } from '../types/LabelGridItem.types';
import type { CategoryType } from './useLabelCategory';
import {
  getAvailableLabelLogos,
  getCustomLabels,
  saveAvailableLabelLogos,
  saveCustomLabels,
} from '../services/labelStorageService';

interface UseLabelModalsAndAssetsProps {
  selectedCategory: CategoryType | null;
  config: LabelConfig;
  onAddLogoItem: (item: LogoItemConfig) => void;
  onAddLabelItem: (item: LabelItemConfig) => void;
}

export const useLabelModalsAndAssets = ({
  selectedCategory,
  config,
  onAddLogoItem,
  onAddLabelItem,
}: UseLabelModalsAndAssetsProps) => {
  const location = useLocation();

  // Modais
  const [layoutModalOpen, setLayoutModalOpen] = useState(false);
  const [gridModalOpen, setGridModalOpen] = useState(false);
  const [isModelManagerModalOpen, setIsModelManagerModalOpen] = useState(false);
  const [isPriceLabelArtEditorOpen, setIsPriceLabelArtEditorOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isNewLogoModalOpen, setIsNewLogoModalOpen] = useState(false);
  const [isAssetManagerModalOpen, setIsAssetManagerModalOpen] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

  // Form inputs de logos
  const [newLogoName, setNewLogoName] = useState('');
  const [newLogoImage, setNewLogoImage] = useState('');

  // Imagem selecionada
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Custom Labels
  const [customLabels, setCustomLabels] = useState<CustomLabel[]>(getCustomLabels);
  const [editingLabel, setEditingLabel] = useState<CustomLabel | null>(null);
  const [labelFormName, setLabelFormName] = useState('');
  const [labelFormImage, setLabelFormImage] = useState('');

  // Logos disponíveis
  const [availableLogos, setAvailableLogos] = useState<LabelLogoAsset[]>(() => {
    const defaultLogos: LabelLogoAsset[] = [
      { id: 'logo_mdf_std', image: labelMdf, name: '100% MDF' },
      { id: 'logo_morante_std', image: logoMorante, name: 'MÓVEIS MORANTE' },
    ];
    return getAvailableLabelLogos(defaultLogos);
  });

  useEffect(() => {
    if (location.pathname === '/templates/price-label') {
      setIsPriceLabelArtEditorOpen(true);
    }
  }, [location.pathname]);

  const handleConfirmNewLogo = () => {
    if (!newLogoName.trim()) {
      toast.error('Informe um nome para a imagem.');
      return;
    }

    const newLogo = {
      id: `logo_${Date.now()}`,
      image: newLogoImage,
      name: newLogoName.trim(),
    };

    const updated = [...availableLogos, newLogo];
    setAvailableLogos(updated);
    saveAvailableLabelLogos(updated);

    setIsNewLogoModalOpen(false);
    setNewLogoName('');
    setNewLogoImage('');
    toast.success('Logotipo adicionado ao seu banco de imagens!');
  };

  const handleDeleteAvailableLogo = (id: string) => {
    if (!window.confirm('Excluir este logotipo do seu banco de imagens?')) return;
    const updated = availableLogos.filter((l) => l.id !== id);
    setAvailableLogos(updated);
    saveAvailableLabelLogos(updated);
    toast.info('Imagem removida do banco.');
  };

  const handleAddLogoToQueue = (logo: Pick<LabelLogoAsset, 'image' | 'name'>) => {
    if (selectedCategory === 'logos') {
      const newItem: LogoItemConfig = {
        image: logo.image,
        quantity: 1,
        imageFit: config.imageFit || 'contain',
        scale: config.imageScale || 1,
        rotation: 0,
        name: logo.name,
        price: '',
        promoPrice: '',
        sku: '',
        extraFields: config.extraFields ? JSON.parse(JSON.stringify(config.extraFields)) : [],
      };
      onAddLogoItem(newItem);
    } else {
      const newItem: LabelItemConfig = {
        image: logo.image,
        quantity: 1,
        imageFit: config.imageFit || 'cover',
        scale: config.imageScale || 1,
        rotation: 0,
        name: logo.name,
        price: '',
        promoPrice: '',
        sku: '',
        extraFields: config.extraFields ? JSON.parse(JSON.stringify(config.extraFields)) : [],
        showName: false,
        isLogoOnly: true,
      };
      onAddLabelItem(newItem);
    }
    setIsAssetManagerModalOpen(false);
    toast.success(`${logo.name} adicionado à fila.`);
  };

  const handleSaveCustomLabel = () => {
    if (!labelFormName.trim() || !labelFormImage) {
      toast.error('Preencha o nome e selecione uma imagem.');
      return;
    }

    const newLabel: CustomLabel = {
      id: editingLabel?.id || `label_${Date.now()}`,
      name: labelFormName.trim().toUpperCase(),
      image: labelFormImage,
      extraFields:
        editingLabel?.extraFields || config.extraFields
          ? JSON.parse(JSON.stringify(config.extraFields))
          : [],
    };

    let updated: CustomLabel[];
    if (editingLabel) {
      updated = customLabels.map((l) => (l.id === editingLabel.id ? newLabel : l));
    } else {
      updated = [...customLabels, newLabel];
    }

    setCustomLabels(updated);
    saveCustomLabels(updated);

    setIsLabelModalOpen(false);
    setEditingLabel(null);
    setLabelFormName('');
    setLabelFormImage('');
    toast.success(editingLabel ? 'Rótulo atualizado!' : 'Rótulo criado com sucesso!');
  };

  const handleDeleteCustomLabel = (id: string) => {
    if (!window.confirm('Excluir este rótulo permanentemente?')) return;
    const updated = customLabels.filter((l) => l.id !== id);
    setCustomLabels(updated);
    saveCustomLabels(updated);
    toast.info('Rótulo removido.');
  };

  return {
    layoutModalOpen,
    setLayoutModalOpen,
    gridModalOpen,
    setGridModalOpen,
    isModelManagerModalOpen,
    setIsModelManagerModalOpen,
    isPriceLabelArtEditorOpen,
    setIsPriceLabelArtEditorOpen,
    isImageModalOpen,
    setIsImageModalOpen,
    isNewLogoModalOpen,
    setIsNewLogoModalOpen,
    isAssetManagerModalOpen,
    setIsAssetManagerModalOpen,
    isLabelModalOpen,
    setIsLabelModalOpen,
    newLogoName,
    setNewLogoName,
    newLogoImage,
    setNewLogoImage,
    selectedImage,
    setSelectedImage,
    customLabels,
    setCustomLabels,
    editingLabel,
    setEditingLabel,
    labelFormName,
    setLabelFormName,
    labelFormImage,
    setLabelFormImage,
    availableLogos,
    setAvailableLogos,
    handleConfirmNewLogo,
    handleDeleteAvailableLogo,
    handleAddLogoToQueue,
    handleSaveCustomLabel,
    handleDeleteCustomLabel,
  };
}
