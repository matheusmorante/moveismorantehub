import React from 'react';
import { calculateLabelPhysicalSize } from '../utils/LabelPhysicalGeometry';
import {
  LabelQueueCard,
  LabelQueueEmptyState,
  useLabelQueueDragDrop,
  useLabelQueueImageUpload,
} from './label-queue';

interface LabelQueueProps {
  labelItems: any[];
  setLabelItems: React.Dispatch<React.SetStateAction<any[]>>;
  printingMode: 'simple' | 'advanced';
  config: any;
  products?: any[];
  onSelectProduct?: (index: number, product: any) => void;
  onReplaceProduct?: (index: number, product: any, variation?: any) => void;
  selectedCategory?: string | null;
}

const LabelQueue: React.FC<LabelQueueProps> = ({
  labelItems,
  setLabelItems,
  printingMode,
  config,
  products = [],
  onSelectProduct,
  onReplaceProduct,
  selectedCategory,
}) => {
  const {
    imageBusy,
    imageError,
    handleImageChange,
  } = useLabelQueueImageUpload({
    labelItems,
    setLabelItems,
    selectedCategory,
    printingMode,
  });

  const {
    dragOverIdx,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useLabelQueueDragDrop(labelItems, setLabelItems);

  const labelPhysicalSize = calculateLabelPhysicalSize(config || {});
  const isPriceQueue = selectedCategory === 'precos';
  const shouldShowThumbnail = (item: any) =>
    selectedCategory !== 'identificacao' && (!isPriceQueue || item.printingMode !== 'advanced');

  const updateItem = (idx: number, updates: any) => {
    const newItems = [...labelItems];
    newItems[idx] = { ...newItems[idx], ...updates };
    setLabelItems(newItems);
  };

  const removeItem = (idx: number) => {
    setLabelItems((prev) => prev.filter((_, i) => i !== idx));
  };

  if (labelItems.length === 0) {
    return <LabelQueueEmptyState imageError={imageError} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {imageError && <p role="alert" className="text-sm text-red-600">{imageError}</p>}
      {imageBusy && (
        <p role="status" className="flex items-center gap-2 text-sm text-blue-600">
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"
          />
          Lendo imagem da etiqueta…
        </p>
      )}
      {labelItems.map((item, idx) => (
        <LabelQueueCard
          key={idx}
          item={item}
          idx={idx}
          isPriceQueue={isPriceQueue}
          shouldShowThumbnail={shouldShowThumbnail(item)}
          labelPhysicalSize={labelPhysicalSize}
          selectedCategory={selectedCategory}
          imageBusy={imageBusy}
          dragOverIdx={dragOverIdx}
          products={products}
          onSelectProduct={onSelectProduct}
          onReplaceProduct={onReplaceProduct}
          updateItem={updateItem}
          removeItem={removeItem}
          handleImageChange={handleImageChange}
          handleDragStart={handleDragStart}
          handleDragOver={handleDragOver}
          handleDragLeave={handleDragLeave}
          handleDrop={handleDrop}
        />
      ))}
    </div>
  );
};

export default LabelQueue;
