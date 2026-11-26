import { useState } from 'react';

export function usePriceLabelInstallmentsState() {
  const [showInstallments, setShowInstallments] = useState(false);
  const [installments, setInstallments] = useState('Em até 10x sem juros no cartão');
  const [installmentsFontSizeTens, setInstallmentsFontSizeTens] = useState<number>(12);
  const [installmentsFontSizeHundreds, setInstallmentsFontSizeHundreds] = useState<number>(12);
  const [installmentsFontSizeThousands, setInstallmentsFontSizeThousands] = useState<number>(12);
  const [installmentsColor, setInstallmentsColor] = useState('#000000');
  const [installmentsFontFamily, setInstallmentsFontFamily] = useState<string>(
    'Inter, system-ui, sans-serif'
  );
  const [installmentsPos, setInstallmentsPos] = useState({ x: 0, y: 0 });
  const [installmentsRotation, setInstallmentsRotation] = useState<number>(0);

  return {
    showInstallments,
    setShowInstallments,
    installments,
    setInstallments,
    installmentsFontSizeTens,
    setInstallmentsFontSizeTens,
    installmentsFontSizeHundreds,
    setInstallmentsFontSizeHundreds,
    installmentsFontSizeThousands,
    setInstallmentsFontSizeThousands,
    installmentsColor,
    setInstallmentsColor,
    installmentsFontFamily,
    setInstallmentsFontFamily,
    installmentsPos,
    setInstallmentsPos,
    installmentsRotation,
    setInstallmentsRotation,
  };
}
