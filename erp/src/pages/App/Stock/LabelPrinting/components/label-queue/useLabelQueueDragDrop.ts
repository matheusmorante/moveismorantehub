import { useState } from 'react';

export const useLabelQueueDragDrop = (
  labelItems: any[],
  setLabelItems: React.Dispatch<React.SetStateAction<any[]>>
) => {
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIdx(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIdx(null);
    const sourceIndexStr = e.dataTransfer.getData('text/plain');
    if (sourceIndexStr) {
      const sourceIndex = parseInt(sourceIndexStr, 10);
      if (sourceIndex !== targetIndex && sourceIndex >= 0 && sourceIndex < labelItems.length) {
        const newItems = [...labelItems];
        const [movedItem] = newItems.splice(sourceIndex, 1);
        newItems.splice(targetIndex, 0, movedItem);
        setLabelItems(newItems);
      }
    }
  };

  return {
    dragOverIdx,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
};
