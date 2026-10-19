import React, { useEffect, useRef, useState } from 'react';
import bwipjs from 'bwip-js';

export interface LabelBarcodeProps {
  text: string;
  height?: number;
}

export const LabelBarcode: React.FC<LabelBarcodeProps> = ({ text, height = 15 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (canvasRef.current && text) {
      try {
        const trimmedText = text.trim();
        const isNumeric = /^\d+$/.test(trimmedText);
        const isEanCompatible =
          isNumeric && (trimmedText.length === 12 || trimmedText.length === 13);
        const bcidType = isEanCompatible ? 'ean13' : 'code128';

        bwipjs.toCanvas(canvasRef.current, {
          bcid: bcidType,
          text: trimmedText,
          scale: 3,
          height,
          includetext: true,
          textxalign: 'center',
          backgroundcolor: 'ffffff',
        });
        setError(false);
      } catch (e: unknown) {
        console.error('Barcode error:', e);
        setError(true);
      }
    }
  }, [text, height]);

  if (error) {
    return (
      <div className="text-[10px] font-black text-rose-500 uppercase px-2 py-1 bg-rose-50 rounded italic">
        Formato Inválido
      </div>
    );
  }

  return (
    <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />
  );
};
