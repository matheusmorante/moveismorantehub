import { useState, useEffect } from 'react';
import Item from '../../../types/items.type';

export interface UseBodyRowPricingProps {
  item: Item;
  idx: number;
  onChange: (idx: number, key: keyof Item, value: string | number) => void;
  onBatchChange: (idx: number, changes: Partial<Item>) => void;
}

export function useBodyRowPricing({
  item,
  idx,
  onChange,
  onBatchChange,
}: UseBodyRowPricingProps) {
  // Valores calculados com arredondamento preciso para evitar dízimas de ponto flutuante
  const discountInValue =
    item.discountType === 'fixed'
      ? item.unitDiscount
      : Math.round(((item.unitPrice * item.unitDiscount) / 100) * 100) / 100;

  const discountInPercent =
    item.discountType === 'percentage'
      ? item.unitDiscount
      : item.unitPrice > 0
        ? Math.round((item.unitDiscount / item.unitPrice) * 100 * 100) / 100
        : 0;

  const initialSubtotal = Math.round((item.unitPrice - discountInValue) * 100) / 100;

  // Estados locais temporários para digitação livre sem disparar recálculos prematuros
  const [tempUnitPrice, setTempUnitPrice] = useState(item.unitPrice || 0);
  const [tempDiscountValue, setTempDiscountValue] = useState(discountInValue);
  const [tempDiscountPercent, setTempDiscountPercent] = useState(discountInPercent);
  const [tempSubtotal, setTempSubtotal] = useState(initialSubtotal);
  const [tempObservation, setTempObservation] = useState(item.observation || '');

  // Sincronizar estados locais apenas quando os valores persistidos mudam externamente
  useEffect(() => {
    setTempUnitPrice(item.unitPrice || 0);
    setTempDiscountValue(discountInValue);
    setTempDiscountPercent(discountInPercent);
    setTempSubtotal(initialSubtotal);
    setTempObservation(item.observation || '');
  }, [item.unitPrice, discountInValue, discountInPercent, initialSubtotal, item.observation]);

  const commitObservation = () => {
    if ((item.observation || '') !== tempObservation) {
      onChange(idx, 'observation', tempObservation);
    }
  };

  const commitUnitPrice = () => {
    const newUnitPrice = Math.max(0, Math.round(tempUnitPrice * 100) / 100);
    if (item.discountType === 'percentage') {
      const percentVal = Math.min(100, Math.max(0, item.unitDiscount || 0));
      const calculatedDiscountVal = Math.round(((newUnitPrice * percentVal) / 100) * 100) / 100;
      const calculatedSubtotal = Math.max(
        0,
        Math.round((newUnitPrice - calculatedDiscountVal) * 100) / 100
      );
      setTempUnitPrice(newUnitPrice);
      setTempDiscountValue(calculatedDiscountVal);
      setTempSubtotal(calculatedSubtotal);
      onBatchChange(idx, { unitPrice: newUnitPrice });
    } else {
      const discountVal = item.unitDiscount || 0;
      const effectiveDiscount = Math.min(discountVal, newUnitPrice);
      const calculatedPercent =
        newUnitPrice > 0
          ? Math.min(100, Math.round((effectiveDiscount / newUnitPrice) * 100 * 100) / 100)
          : 0;
      const calculatedSubtotal = Math.max(
        0,
        Math.round((newUnitPrice - effectiveDiscount) * 100) / 100
      );
      setTempUnitPrice(newUnitPrice);
      setTempDiscountPercent(calculatedPercent);
      setTempSubtotal(calculatedSubtotal);
      onBatchChange(idx, { unitPrice: newUnitPrice });
    }
  };

  const commitDiscountPercent = () => {
    const percentVal = Math.min(100, Math.max(0, Math.round(tempDiscountPercent * 100) / 100));
    const currentUnitPrice = item.unitPrice || 0;
    const calculatedDiscountVal = Math.min(
      currentUnitPrice,
      Math.round(((currentUnitPrice * percentVal) / 100) * 100) / 100
    );
    const calculatedSubtotal = Math.max(
      0,
      Math.round((currentUnitPrice - calculatedDiscountVal) * 100) / 100
    );

    setTempDiscountPercent(percentVal);
    setTempDiscountValue(calculatedDiscountVal);
    setTempSubtotal(calculatedSubtotal);

    onBatchChange(idx, {
      discountType: 'percentage',
      unitDiscount: percentVal,
    });
  };

  const commitDiscountValue = () => {
    const currentUnitPrice = item.unitPrice || 0;
    const val = Math.max(0, Math.round(tempDiscountValue * 100) / 100);
    const effectiveDiscount = Math.min(val, currentUnitPrice);
    const calculatedPercent =
      currentUnitPrice > 0
        ? Math.min(100, Math.round((effectiveDiscount / currentUnitPrice) * 100 * 100) / 100)
        : 0;
    const calculatedSubtotal = Math.max(
      0,
      Math.round((currentUnitPrice - effectiveDiscount) * 100) / 100
    );

    setTempDiscountValue(effectiveDiscount);
    setTempDiscountPercent(calculatedPercent);
    setTempSubtotal(calculatedSubtotal);

    onBatchChange(idx, {
      discountType: 'fixed',
      unitDiscount: effectiveDiscount,
    });
  };

  const commitSubtotal = () => {
    const currentUnitPrice = item.unitPrice || 0;
    const val = Math.min(currentUnitPrice, Math.max(0, Math.round(tempSubtotal * 100) / 100));
    if (val >= currentUnitPrice) {
      setTempSubtotal(currentUnitPrice);
      setTempDiscountValue(0);
      setTempDiscountPercent(0);
      onBatchChange(idx, {
        discountType: 'fixed',
        unitDiscount: 0,
      });
    } else {
      const newDiscount = Math.round((currentUnitPrice - val) * 100) / 100;
      const newPercent =
        currentUnitPrice > 0
          ? Math.min(100, Math.round((newDiscount / currentUnitPrice) * 100 * 100) / 100)
          : 0;
      setTempSubtotal(val);
      setTempDiscountValue(newDiscount);
      setTempDiscountPercent(newPercent);
      onBatchChange(idx, {
        discountType: 'fixed',
        unitDiscount: newDiscount,
      });
    }
  };

  return {
    discountInValue,
    discountInPercent,
    initialSubtotal,
    tempUnitPrice,
    setTempUnitPrice,
    commitUnitPrice,
    tempDiscountValue,
    setTempDiscountValue,
    commitDiscountValue,
    tempDiscountPercent,
    setTempDiscountPercent,
    commitDiscountPercent,
    tempSubtotal,
    setTempSubtotal,
    commitSubtotal,
    tempObservation,
    setTempObservation,
    commitObservation,
  };
}

export type BodyRowPricing = ReturnType<typeof useBodyRowPricing>;
