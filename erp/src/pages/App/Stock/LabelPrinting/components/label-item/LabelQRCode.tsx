import React, { useEffect, useRef, useState } from 'react';
import bwipjs from 'bwip-js';

export const QRCodeCanvas: React.FC<{ text: string }> = ({ text }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (canvasRef.current && text) {
      try {
        bwipjs.toCanvas(canvasRef.current, {
          bcid: 'qrcode',
          text: text.trim(),
          scale: 3,
          backgroundcolor: 'ffffff',
        });
        setError(false);
      } catch (e: unknown) {
        console.error('QRCode error:', e);
        setError(true);
      }
    }
  }, [text]);

  if (error) {
    return (
      <div className="text-[10px] font-black text-rose-500 uppercase px-2 py-1 bg-rose-50 rounded italic">
        Formato Inválido
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ maxWidth: '100%', height: 'auto', maxHeight: '100%', display: 'block' }}
    />
  );
};

export const QRPreviewPlaceholder: React.FC = () => (
  <div
    aria-label="Espaço reservado para o QR Code"
    title="O QR Code real será gerado ao imprimir"
    style={{
      width: '30mm',
      height: '30mm',
      border: '1px solid #94a3b8',
      background: '#ffffff',
      color: '#64748b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
    }}
  >
    <i className="bi bi-qr-code" aria-hidden="true" style={{ fontSize: '10mm' }} />
  </div>
);
