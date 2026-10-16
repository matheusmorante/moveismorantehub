import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { labelAssetFormSchema, customLabelAssetFormSchema, labelAssetQueueFormSchema } from '../../../../../../../shared-utils/labelDesignFormSchemas';
import { catalogSelectionFormSchema } from '../../../../../../../shared-utils/catalogFormSchemas';
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
  const logoForm = useZodForm(labelAssetFormSchema, { name: newLogoName, image: newLogoImage });
  const labelForm = useZodForm(customLabelAssetFormSchema, { name: labelFormName, image: labelFormImage, extraFields: [] });
  const selectionForm = useZodForm(catalogSelectionFormSchema, { id: '' });
  const queueForm = useZodForm(labelAssetQueueFormSchema, { category: 'logos', item: { name: '', image: '', quantity: 1 } });
  const [assetsSaving, setAssetsSaving] = useState(false);
  const [assetError, setAssetError] = useState('');
  const locked = useRef(false), mounted = useRef(false);
  const ownerKey = JSON.stringify([location.pathname, selectedCategory, isNewLogoModalOpen, isLabelModalOpen, isAssetManagerModalOpen, editingLabel?.id]);
  const owner = useRef({ key: ownerKey, revision: 0 });
  if (owner.current.key !== ownerKey) owner.current = { key: ownerKey, revision: owner.current.revision + 1 };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setAssetError(''); }, [ownerKey]);

  const runOwned = async (task: (current: () => boolean, fail: (message: string) => void) => Promise<boolean | false>): Promise<boolean> => {
    if (locked.current) return false;
    locked.current = true; setAssetsSaving(true); setAssetError('');
    const revision = owner.current.revision;
    const current = () => mounted.current && revision === owner.current.revision;
    const fail = (message: string) => { if (current()) { setAssetError(message); toast.error(message); } };
    try { return await task(current, fail) === true; }
    catch (error) { fail(error instanceof Error ? error.message : 'Não foi possível concluir a alteração.'); return false; }
    finally { locked.current = false; if (mounted.current) setAssetsSaving(false); }
  };

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

  const handleConfirmNewLogo = async () => {
    if (!isNewLogoModalOpen) return false;
    return runOwned((current, fail) => logoForm.validateAndRun({ name: newLogoName, image: newLogoImage }, (values) => {
    if (!current()) return false;
    const newLogo = {
      id: `logo_${crypto.randomUUID()}`,
      image: values.image,
      name: values.name,
    };

    const updated = [...availableLogos, newLogo];
    if (saveAvailableLabelLogos(updated) !== true) throw new Error('Não foi possível gravar o logotipo neste dispositivo. Libere espaço e tente novamente.');
    setAvailableLogos(updated);

    setIsNewLogoModalOpen(false);
    setNewLogoName('');
    setNewLogoImage('');
    toast.success('Logotipo adicionado ao seu banco de imagens!');
    return true;
    }, (errors) => fail(Object.values(flattenFormErrors(errors))[0] || 'Confira o nome e a imagem.')));
  };

  const handleDeleteAvailableLogo = async (id: string) => {
    if (locked.current) return false;
    return runOwned((current, fail) => selectionForm.validateAndRun({ id }, (values) => {
      if (!current()) return false;
      if (!availableLogos.some((logo) => logo.id === values.id)) throw new Error('Logotipo não encontrado. Reabra a biblioteca.');
      if (['logo_mdf_std', 'logo_morante_std'].includes(values.id)) throw new Error('Este logotipo padrão permanece disponível. Remova apenas imagens que você adicionou.');
      if (!window.confirm('Excluir este logotipo do seu banco de imagens?') || !current()) return false;
      const updated = availableLogos.filter((logo) => logo.id !== values.id);
      if (saveAvailableLabelLogos(updated) !== true) throw new Error('Não foi possível gravar a remoção neste dispositivo.');
      setAvailableLogos(updated); toast.info('Imagem removida do banco.'); return true;
    }, (errors) => fail(Object.values(flattenFormErrors(errors))[0] || 'Selecione um logotipo.')));
  };

  const handleAddLogoToQueue = async (logo: Pick<LabelLogoAsset, 'image' | 'name'>) => runOwned(async (current, fail) => {
    if (!selectedCategory) throw new Error('Selecione uma categoria de etiquetas.');
    const newItem = {
        image: logo.image,
        quantity: 1,
        imageFit: config.imageFit || (selectedCategory === 'logos' ? 'contain' : 'cover'),
        scale: config.imageScale ?? 1,
        rotation: 0,
        name: logo.name,
        price: '',
        promoPrice: '',
        sku: '',
        extraFields: [...(config.extraFields ?? [])],
        ...(selectedCategory !== 'logos' ? { showName: false, isLogoOnly: true } : {}),
      };
    return queueForm.validateAndRun({ category: selectedCategory, item: newItem }, (values) => {
      if (!current()) return false;
      if (values.category === 'logos') onAddLogoItem(values.item as LogoItemConfig);
      else onAddLabelItem(values.item as LabelItemConfig);
      setIsAssetManagerModalOpen(false); toast.success(`${values.item.name} adicionado à fila.`); return true;
    }, (errors) => fail(Object.values(flattenFormErrors(errors))[0] || 'Confira os dados da etiqueta.'));
  });

  const handleSaveCustomLabel = async () => {
    if (!isLabelModalOpen) return false;
    return runOwned((current, fail) => labelForm.validateAndRun({ name: labelFormName, image: labelFormImage,
      extraFields: [...(editingLabel?.extraFields ?? config.extraFields ?? [])] }, (values) => {
    if (!current()) return false;
    if (editingLabel && !customLabels.some((label) => label.id === editingLabel.id)) throw new Error('Rótulo não encontrado. Reabra a biblioteca.');
    const newLabel: CustomLabel = {
      id: editingLabel?.id || `label_${crypto.randomUUID()}`,
      name: values.name.toUpperCase(),
      image: values.image,
      extraFields: values.extraFields,
    };

    let updated: CustomLabel[];
    if (editingLabel) {
      updated = customLabels.map((l) => (l.id === editingLabel.id ? newLabel : l));
    } else {
      updated = [...customLabels, newLabel];
    }

    if (saveCustomLabels(updated) !== true) throw new Error('Não foi possível gravar o rótulo neste dispositivo. Libere espaço e tente novamente.');
    setCustomLabels(updated);

    setIsLabelModalOpen(false);
    setEditingLabel(null);
    setLabelFormName('');
    setLabelFormImage('');
    toast.success(editingLabel ? 'Rótulo atualizado!' : 'Rótulo criado com sucesso!');
    return true;
    }, (errors) => fail(Object.values(flattenFormErrors(errors))[0] || 'Confira os campos do rótulo.')));
  };

  const handleDeleteCustomLabel = async (id: string) => {
    if (locked.current) return false;
    return runOwned((current, fail) => selectionForm.validateAndRun({ id }, (values) => {
      if (!current()) return false;
      if (!customLabels.some((label) => label.id === values.id)) throw new Error('Rótulo não encontrado. Reabra a biblioteca.');
      if (!window.confirm('Excluir este rótulo permanentemente?') || !current()) return false;
      const updated = customLabels.filter((label) => label.id !== values.id);
      if (saveCustomLabels(updated) !== true) throw new Error('Não foi possível gravar a remoção neste dispositivo.');
      setCustomLabels(updated); toast.info('Rótulo removido.'); return true;
    }, (errors) => fail(Object.values(flattenFormErrors(errors))[0] || 'Selecione um rótulo.')));
  };

  return {
    assetsSaving,
    assetError,
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
};
