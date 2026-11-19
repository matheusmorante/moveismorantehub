import { useState, useEffect, useRef } from 'react';
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
  type PendingField = 'unitPrice' | 'discountValue' | 'discountPercent' | 'subtotal' | 'observation';
  const pendingFieldRef = useRef<PendingField | null>(null);
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
  const [tempUnitPrice, setTempUnitPriceState] = useState(item.unitPrice || 0);
  const [tempDiscountValue, setTempDiscountValueState] = useState(discountInValue);
  const [tempDiscountPercent, setTempDiscountPercentState] = useState(discountInPercent);
  const [tempSubtotal, setTempSubtotalState] = useState(initialSubtotal);
  const [tempObservation, setTempObservationState] = useState(item.observation || '');

  const setTempUnitPrice = (value: number) => {
    pendingFieldRef.current = 'unitPrice';
    setTempUnitPriceState(value);
  };
  const setTempDiscountValue = (value: number) => {
    pendingFieldRef.current = 'discountValue';
    setTempDiscountValueState(value);
  };
  const setTempDiscountPercent = (value: number) => {
    pendingFieldRef.current = 'discountPercent';
    setTempDiscountPercentState(value);
  };
  const setTempSubtotal = (value: number) => {
    pendingFieldRef.current = 'subtotal';
    setTempSubtotalState(value);
  };
  const setTempObservation = (value: string) => {
    pendingFieldRef.current = 'observation';
    setTempObservationState(value);
  };

  // Sincronizar estados locais apenas quando os valores persistidos mudam externamente
  useEffect(() => {
    setTempUnitPriceState(item.unitPrice || 0);
    setTempDiscountValueState(discountInValue);
    setTempDiscountPercentState(discountInPercent);
    setTempSubtotalState(initialSubtotal);
    setTempObservationState(item.observation || '');
  }, [item.unitPrice, discountInValue, discountInPercent, initialSubtotal, item.observation]);

  const commitObservation = () => {
    pendingFieldRef.current = null;
    if ((item.observation || '') !== tempObservation) {
      onChange(idx, 'observation', tempObservation);
    }
  };

  const commitUnitPrice = () => {
    pendingFieldRef.current = null;
    const newUnitPrice = Math.max(0, Math.round(tempUnitPrice * 100) / 100);
    if (item.discountType === 'percentage') {
      const percentVal = Math.min(100, Math.max(0, item.unitDiscount || 0));
      const calculatedDiscountVal = Math.round(((newUnitPrice * percentVal) / 100) * 100) / 100;
      const calculatedSubtotal = Math.max(
        0,
        Math.round((newUnitPrice - calculatedDiscountVal) * 100) / 100
      );
      setTempUnitPriceState(newUnitPrice);
      setTempDiscountValueState(calculatedDiscountVal);
      setTempSubtotalState(calculatedSubtotal);
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
      setTempUnitPriceState(newUnitPrice);
      setTempDiscountPercentState(calculatedPercent);
      setTempSubtotalState(calculatedSubtotal);
      onBatchChange(idx, { unitPrice: newUnitPrice });
    }
  };

  const commitDiscountPercent = () => {
    pendingFieldRef.current = null;
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

    setTempDiscountPercentState(percentVal);
    setTempDiscountValueState(calculatedDiscountVal);
    setTempSubtotalState(calculatedSubtotal);

    onBatchChange(idx, {
      discountType: 'percentage',
      unitDiscount: percentVal,
    });
  };

  const commitDiscountValue = () => {
    pendingFieldRef.current = null;
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

    setTempDiscountValueState(effectiveDiscount);
    setTempDiscountPercentState(calculatedPercent);
    setTempSubtotalState(calculatedSubtotal);

    onBatchChange(idx, {
      discountType: 'fixed',
      unitDiscount: effectiveDiscount,
    });
  };

  const commitSubtotal = () => {
    pendingFieldRef.current = null;
    const currentUnitPrice = item.unitPrice || 0;
    const val = Math.min(currentUnitPrice, Math.max(0, Math.round(tempSubtotal * 100) / 100));
    if (val >= currentUnitPrice) {
      setTempSubtotalState(currentUnitPrice);
      setTempDiscountValueState(0);
      setTempDiscountPercentState(0);
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
      setTempSubtotalState(val);
      setTempDiscountValueState(newDiscount);
      setTempDiscountPercentState(newPercent);
      onBatchChange(idx, {
        discountType: 'fixed',
        unitDiscount: newDiscount,
      });
    }
  };

  const commitPendingField = () => {
    switch (pendingFieldRef.current) {
      case 'unitPrice':
        commitUnitPrice();
        break;
      case 'discountValue':
        commitDiscountValue();
        break;
      case 'discountPercent':
        commitDiscountPercent();
        break;
      case 'subtotal':
        commitSubtotal();
        break;
      case 'observation':
        commitObservation();
        break;
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
    commitPendingField,
  };
}

export type BodyRowPricing = ReturnType<typeof useBodyRowPricing>;
