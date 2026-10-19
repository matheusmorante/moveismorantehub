import React from 'react';
import type { LabelConfig } from '../utils/LabelConstants';
import { PriceLabelArtItem } from './PriceLabelArtItem';
import { LabelBarcode } from './label-item/LabelBarcode';
import { QRCodeCanvas, QRPreviewPlaceholder } from './label-item/LabelQRCode';
import {
  formatLabelPrice,
  formatPrice,
  getAlignment,
  getVAlignment,
} from './label-item/labelItemUtils';
import { LabelIdentificationLayout } from './label-item/LabelIdentificationLayout';

export interface LabelItemProps {
  readonly config: LabelConfig;
  readonly image: string | null;
  readonly index: number;
  readonly scale?: number;
  readonly rotation?: number;
  readonly hideBleedBorder?: boolean;
  readonly hideContent?: boolean;
  readonly hidePhysicalBorder?: boolean;
  readonly uuid?: string;
  readonly previewMode?: boolean;
}

export const LabelItem: React.FC<LabelItemProps> = ({
  config,
  image,
  scale,
  rotation,
  hideBleedBorder,
  hideContent,
  hidePhysicalBorder,
  uuid,
  previewMode = false,
}) => {
  const activeScale = scale ?? config.imageScale ?? 1;
  const isRound = config.type === 'round';
  const isPriceLabel = config.category === 'precos';

  const bleedStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundColor: hideContent
      ? 'transparent'
      : isPriceLabel
        ? 'transparent'
        : config.bg_color || 'white',
    boxSizing: 'border-box',
    display: isPriceLabel ? 'block' : 'flex',
    alignItems: isPriceLabel ? undefined : 'center',
    justifyContent: isPriceLabel ? undefined : 'center',
    position: 'relative',
    transform: `rotate(${rotation || 0}deg)`,
    transformOrigin: 'center center',
    zIndex: 5,
    overflow: 'hidden',
    padding: 0,
    margin: 0,
  };

  const labelStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    border: hidePhysicalBorder ? 'none' : isPriceLabel ? 'none' : '1px solid #e2e8f0',
    position: 'relative',
    display: isPriceLabel ? 'block' : 'flex',
    flexDirection: isPriceLabel ? undefined : config.layout === 'horizontal' ? 'row' : 'column',
    alignItems: isPriceLabel ? undefined : 'center',
    justifyContent: isPriceLabel ? undefined : 'flex-start',
    overflow: 'hidden',
    boxSizing: 'border-box',
    borderRadius: isRound ? '50%' : undefined,
    backgroundColor: hideContent
      ? 'transparent'
      : isPriceLabel
        ? 'transparent'
        : config.bg_color || 'white',
    padding: 0,
    margin: 0,
  };

  const hasPromo = !!(config.promoPrice && config.promoPrice !== config.price);
  const isSplit = config.priceFormat === 'split';
  const priceStr = hasPromo ? config.promoPrice || '' : config.price || '';
  const priceDigits = priceStr.replace(/\D/g, '').length;
  let dynamicFontSize = config.nameFontSize || 10;
  if (priceDigits > 5) {
    dynamicFontSize = Math.max(6, (config.nameFontSize || 10) - (priceDigits - 5) * 1.5);
  }
  const safeExtraFields = Array.isArray((config as any).extraFields)
    ? (config as any).extraFields
    : [];

  const elements = [
    {
      id: 'productName',
      pos: {
        x: hasPromo ? (config.promoNamePosX ?? 50) : (config.namePosX ?? 50),
        y: hasPromo ? (config.promoNamePosY ?? 15) : (config.namePosY ?? 15),
      },
      width: hasPromo ? (config.promoNameWidth ?? 80) : (config.nameWidth ?? 80),
      font: hasPromo ? config.promoNameFontSize || 9 : config.nameFontSize || 10,
      color: hasPromo ? config.promoNameColor : config.nameColor,
      bold: hasPromo ? config.promoNameBold : config.nameBold,
      align: hasPromo ? config.promoNameAlign : config.nameAlign,
      valign: hasPromo ? config.promoNameVAlign : config.nameVAlign,
      text: config.text || '',
      bgColor: hasPromo ? config.promoNameBgColor : config.nameBgColor,
      hidden: !config.text && !config.id?.includes('preview'),
    },
    {
      id: 'mainPrice',
      pos: {
        x: hasPromo ? (config.promoPosX ?? 50) : (config.pricePosX ?? 50),
        y: hasPromo ? (config.promoPosY ?? 70) : (config.pricePosY ?? 70),
      },
      width: hasPromo ? (config.promoWidth ?? 80) : (config.priceWidth ?? 80),
      font: dynamicFontSize,
      color: hasPromo ? config.promoPriceColor : config.priceColor,
      bold: hasPromo ? config.promoPriceBold : config.priceBold,
      align: hasPromo ? config.promoPriceAlign : config.priceAlign,
      valign: hasPromo ? config.promoPriceVAlign : config.priceVAlign,
      text: formatLabelPrice(hasPromo ? config.promoPrice || '' : config.price || '', isSplit),
      bgColor: hasPromo ? config.promoBgColor : config.priceBgColor,
      hidden:
        config.category === 'identificacao' ||
        (!config.price && !config.promoPrice && !config.id?.includes('preview')),
    },
    {
      id: 'oldPrice',
      pos: { x: config.oldPricePosX ?? 50, y: config.oldPricePosY ?? 45 },
      width: config.oldPriceWidth ?? 50,
      font: config.oldPriceFontSize || 8,
      color: config.oldPriceColor || '#94a3b8',
      bold: config.oldPriceBold,
      align: config.oldPriceAlign || 'center',
      valign: config.oldPriceVAlign || 'middle',
      text: formatPrice(config.price || ''),
      bgColor: 'transparent',
      hidden: config.category === 'identificacao' || !hasPromo || !config.price,
    },
    {
      id: 'priceSymbol',
      pos: {
        x: hasPromo ? (config.promoPriceSymbolPosX ?? 20) : (config.priceSymbolPosX ?? 20),
        y: hasPromo ? (config.promoPriceSymbolPosY ?? 70) : (config.priceSymbolPosY ?? 70),
      },
      font: hasPromo ? config.promoPriceSymbolFontSize || 8 : config.priceSymbolFontSize || 8,
      color: hasPromo
        ? config.promoPriceSymbolColor || config.promoPriceColor
        : config.priceSymbolColor || config.priceColor,
      bold: hasPromo ? config.promoPriceSymbolBold : config.priceSymbolBold,
      text: 'R$',
      hidden: config.category === 'identificacao' || !isSplit,
      bgColor: 'transparent',
    },
    {
      id: 'priceDecimals',
      pos: {
        x: hasPromo ? (config.promoPriceDecimalsPosX ?? 80) : (config.priceDecimalsPosX ?? 80),
        y: hasPromo ? (config.promoPriceDecimalsPosY ?? 70) : (config.priceDecimalsPosY ?? 70),
      },
      font: hasPromo ? config.promoPriceDecimalsFontSize || 8 : config.priceDecimalsFontSize || 8,
      color: hasPromo
        ? config.promoPriceDecimalsColor || config.promoPriceColor
        : config.priceDecimalsColor || config.priceColor,
      bold: hasPromo ? config.promoPriceDecimalsBold : config.priceDecimalsBold,
      text: ',00',
      hidden: config.category === 'identificacao' || !isSplit,
      bgColor: 'transparent',
    },
    {
      id: 'barcode',
      pos: {
        x: (hasPromo ? config.promoBarcodePosX : config.barcodePosX) ?? 50,
        y: (hasPromo ? config.promoBarcodePosY : config.barcodePosY) ?? 85,
      },
      isBarcode: true,
      hidden: config.category === 'precos',
    },
    ...safeExtraFields.map((f: any) => ({
      ...f,
      pos: { x: f.x, y: f.y },
      font: f.size,
      align: f.align || 'center',
      valign: 'middle',
      hidden: false,
    })),
  ].filter((el) => !el.hidden);

  const isBlank = (config as any).isBlank;
  const isImageMode =
    (config as any).printingMode === 'simple' ||
    config.category === 'logos' ||
    config.category === 'posts';
  const isAdvancedPriceMode =
    config.category === 'precos' && (config as any).printingMode === 'advanced';
  const hasImage = Boolean(image && !isBlank);
  const isLogoOnly = isImageMode || hasImage;

  const renderModularElement = (el: any) => {
    if (el.isBarcode) {
      const barcodeText =
        config.barcode ||
        config.sku ||
        config.code ||
        (config as any).variationId ||
        (config as any).productId ||
        '';
      if (!barcodeText) return null;

      if (config.category === 'identificacao') {
        const qrText = uuid ? `MH:L:${uuid}|${barcodeText}` : barcodeText;
        return (
          <div
            key={el.id}
            style={{
              position: 'absolute',
              left: `${el.pos?.x ?? 50}%`,
              top: `${el.pos?.y ?? 60}%`,
              transform: 'translate(-50%, -50%)',
              width: 'auto',
              height: '60%',
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {previewMode ? <QRPreviewPlaceholder /> : <QRCodeCanvas text={qrText} />}
          </div>
        );
      }

      return (
        <div
          key={el.id}
          style={{
            position: 'absolute',
            left: `${el.pos?.x ?? 50}%`,
            top: `${el.pos?.y ?? 85}%`,
            transform: 'translate(-50%, -50%)',
            width: '80%',
            zIndex: 5,
          }}
        >
          <LabelBarcode text={barcodeText} />
        </div>
      );
    }
    return (
      <div
        key={el.id}
        style={{
          position: 'absolute',
          left: `${el.pos?.x ?? 50}%`,
          top: `${el.pos?.y ?? 20}%`,
          transform: 'translate(-50%, -50%)',
          width: `${el.width ?? 90}%`,
          fontSize: `${el.font ?? 10}px`,
          color: el.color || '#000000',
          fontWeight: el.bold ? 'bold' : 'normal',
          textAlign: (el.align as any) || 'center',
          backgroundColor: el.bgColor || 'transparent',
          display: 'flex',
          alignItems: getVAlignment(el.valign),
          justifyContent: getAlignment(el.align),
          lineHeight: 1.2,
          zIndex: 5,
          padding: '1px 2px',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          textDecoration: el.id === 'oldPrice' ? 'line-through' : 'none',
        }}
      >
        {el.text}
      </div>
    );
  };

  return (
    <div
      className="label-item-bleed-container"
      style={{ ...bleedStyle, border: hideBleedBorder ? 'none' : undefined }}
    >
      {hasImage && (
        <img
          src={image!}
          alt=""
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '100%',
            height: '100%',
            objectFit: (config.imageFit as any) || 'contain',
            zIndex: 1,
            transform: `translate(-50%, -50%) scale(${activeScale})`,
            transition: 'transform 0.2s ease-out',
            opacity: 1,
          }}
        />
      )}
      <div className="label-item-container" style={labelStyle}>
        {isAdvancedPriceMode && !isBlank && !hideContent ? (
          <PriceLabelArtItem config={config} />
        ) : config.category === 'identificacao' && !isBlank && !hideContent ? (
          <LabelIdentificationLayout
            config={config}
            previewMode={previewMode}
            uuid={uuid}
          />
        ) : (
          !hasImage && !isLogoOnly && !hideContent && !isBlank && elements.map(renderModularElement)
        )}
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
                @media print {
                    .label-item-bleed-container, .label-item-container {
                        border: none !important;
                        outline: none !important;
                    }
                }
            `,
        }}
      />
    </div>
  );
};

export default LabelItem;
