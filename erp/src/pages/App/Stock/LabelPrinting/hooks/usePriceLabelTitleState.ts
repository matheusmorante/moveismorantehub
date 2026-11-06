import { useState } from 'react';
import type { PriceLabelArtEditorModalProps } from '../types/PriceLabelArtEditorTypes';

export function usePriceLabelTitleState(
  initialProduct: PriceLabelArtEditorModalProps['initialProduct'],
  config: PriceLabelArtEditorModalProps['config'],
) {
  const [title, setTitle] = useState(
    initialProduct?.name || config.text || 'COLCHÃO DE ESPUMA D28 LARGURA 88',
  );
  const [showTitle, setShowTitle] = useState(true);
  const [titleFontSizeTens, setTitleFontSizeTens] = useState<number>(14);
  const [titleFontSizeHundreds, setTitleFontSizeHundreds] = useState<number>(14);
  const [titleFontSizeThousands, setTitleFontSizeThousands] = useState<number>(14);
  const [titleColor, setTitleColor] = useState('#000000');
  const [titleFontFamily, setTitleFontFamily] = useState<string>('Inter, system-ui, sans-serif');
  const [titlePos, setTitlePos] = useState({ x: 0, y: 0 });
  const [titleRotation, setTitleRotation] = useState<number>(0);
  const [titleWidth, setTitleWidth] = useState<number>(520);

  return {
    title,
    setTitle,
    showTitle,
    setShowTitle,
    titleFontSizeTens,
    setTitleFontSizeTens,
    titleFontSizeHundreds,
    setTitleFontSizeHundreds,
    titleFontSizeThousands,
    setTitleFontSizeThousands,
    titleColor,
    setTitleColor,
    titleFontFamily,
    setTitleFontFamily,
    titlePos,
    setTitlePos,
    titleRotation,
    setTitleRotation,
    titleWidth,
    setTitleWidth,
  };
}
