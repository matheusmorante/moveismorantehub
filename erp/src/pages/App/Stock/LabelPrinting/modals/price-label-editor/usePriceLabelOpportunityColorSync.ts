import { useEffect } from 'react';

interface UsePriceLabelOpportunityColorSyncParams {
  selectedOppId: string;
  oppColorsMap: Record<string, Record<string, string>>;
  defaultBgColor: string;
  setTitleColor: (color: string) => void;
  setDeColor: (color: string) => void;
  setNormalPriceColor: (color: string) => void;
  setPorColor: (color: string) => void;
  setCurrencyColor: (color: string) => void;
  setPriceColor: (color: string) => void;
  setCentsColor: (color: string) => void;
  setInstallmentsColor: (color: string) => void;
  setBgColor: (color: string) => void;
}

export function usePriceLabelOpportunityColorSync({
  selectedOppId,
  oppColorsMap,
  defaultBgColor,
  setTitleColor,
  setDeColor,
  setNormalPriceColor,
  setPorColor,
  setCurrencyColor,
  setPriceColor,
  setCentsColor,
  setInstallmentsColor,
  setBgColor,
}: UsePriceLabelOpportunityColorSyncParams) {
  useEffect(() => {
    if (!selectedOppId) return;
    const baseColors = oppColorsMap.none || oppColorsMap.default || {};
    const currentOppColors = { ...baseColors, ...(oppColorsMap[selectedOppId] || {}) };

    setTitleColor(currentOppColors['title'] || '#000000');
    setDeColor(currentOppColors['deText'] || '#000000');
    setNormalPriceColor(currentOppColors['normalPrice'] || '#000000');
    setPorColor(currentOppColors['porText'] || '#000000');
    setCurrencyColor(currentOppColors['currencySymbol'] || '#000000');
    setPriceColor(currentOppColors['promoPrice'] || '#1e3a8a');
    setCentsColor(currentOppColors['cents'] || '#000000');
    setInstallmentsColor(currentOppColors['installments'] || '#000000');
    const savedBackground = currentOppColors['background'];
    setBgColor(
      savedBackground && savedBackground !== 'transparent' ? savedBackground : defaultBgColor
    );
  }, [selectedOppId, oppColorsMap, defaultBgColor, setBgColor, setCentsColor, setCurrencyColor, setDeColor, setInstallmentsColor, setNormalPriceColor, setPorColor, setPriceColor, setTitleColor]);
}
