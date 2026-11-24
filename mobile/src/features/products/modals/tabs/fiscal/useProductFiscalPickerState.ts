import { useEffect, useState } from 'react';

interface Options {
  canConfigureProductTaxes: boolean;
  itemType: string;
}

export const useProductFiscalPickerState = ({
  canConfigureProductTaxes,
  itemType,
}: Options) => {
  const [showCfopPicker, setShowCfopPicker] = useState(false);
  const [showCestPicker, setShowCestPicker] = useState(false);
  const [showCsosnPicker, setShowCsosnPicker] = useState(false);
  const [showOrigemPicker, setShowOrigemPicker] = useState(false);
  const [showPisPicker, setShowPisPicker] = useState(false);
  const [showCofinsPicker, setShowCofinsPicker] = useState(false);

  useEffect(() => {
    if (!canConfigureProductTaxes) {
      setShowCfopPicker(false);
      setShowCestPicker(false);
      setShowCsosnPicker(false);
      setShowOrigemPicker(false);
      setShowPisPicker(false);
      setShowCofinsPicker(false);
    }
    if (itemType !== 'service') setShowCfopPicker(false);
    if (itemType === 'service') {
      setShowCestPicker(false);
      setShowOrigemPicker(false);
    }
  }, [canConfigureProductTaxes, itemType]);

  return {
    showCfopPicker,
    setShowCfopPicker,
    showCestPicker,
    setShowCestPicker,
    showCsosnPicker,
    setShowCsosnPicker,
    showOrigemPicker,
    setShowOrigemPicker,
    showPisPicker,
    setShowPisPicker,
    showCofinsPicker,
    setShowCofinsPicker,
  };
};
