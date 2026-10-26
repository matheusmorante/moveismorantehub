import React from 'react';
import type { LabelConfig } from '../../utils/LabelConstants';
import { QRCodeCanvas, QRPreviewPlaceholder } from './LabelQRCode';

export interface LabelIdentificationLayoutProps {
  config: LabelConfig;
  previewMode?: boolean;
  uuid?: string;
}

export const LabelIdentificationLayout: React.FC<LabelIdentificationLayoutProps> = ({
  config,
  previewMode = false,
  uuid,
}) => {
  const qrSizeMm = Math.max(1, Math.min(36, (config.labelHeight ?? 44) - 8));
  const barcodeValue =
    config.sku ||
    config.barcode ||
    config.code ||
    (config as any).variationId ||
    (config as any).productId ||
    '';

  const qrText = uuid ? `MH:L:${uuid}|${barcodeValue}` : barcodeValue;

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        padding: '4mm',
        boxSizing: 'border-box',
        backgroundColor: 'white',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingRight: '2mm',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: 'black',
            lineHeight: 1.2,
            maxHeight: '3.6em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {config.text || config.name || ''}
        </div>
        <div
          style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', marginTop: '6px' }}
        >
          SKU
        </div>
        <div style={{ fontSize: '12px', color: 'black', fontWeight: 'bold' }}>
          {barcodeValue}
        </div>
      </div>
      <div
        style={{
          width: `${qrSizeMm}mm`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: `${qrSizeMm}mm`,
            height: `${qrSizeMm}mm`,
            backgroundColor: 'white',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {previewMode ? <QRPreviewPlaceholder sizeMm={qrSizeMm} /> : <QRCodeCanvas text={qrText} />}
        </div>
      </div>
    </div>
  );
};
