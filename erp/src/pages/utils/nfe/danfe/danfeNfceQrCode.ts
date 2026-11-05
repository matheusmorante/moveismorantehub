import bwipjs from 'bwip-js';
import { normalizeFiscalIdentifier } from '../../../../../../shared-utils/fiscalIdentifiers.js';

/** Gera o SVG do QR Code em alta definição usando bwip-js. */
export function generateQrCodeSvg(qrCodeText: string): string {
  if (!qrCodeText) return '';
  try {
    const toSVG = (bwipjs as unknown as { toSVG: (options: Record<string, unknown>) => string }).toSVG;
    return toSVG({
      bcid: 'qrcode',
      text: qrCodeText,
      scale: 4,
      padding: 4,
    });
  } catch {
    return '';
  }
}

export function getQrPayload(qrCode: string): { accessKey: string; version: string; environment: string } | null {
  try {
    const url = new URL(qrCode);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    const values = url.searchParams.get('p')?.split('|') || [];
    if (values.length < 3) return null;
    return {
      accessKey: normalizeFiscalIdentifier(values[0]),
      version: values[1],
      environment: values[2],
    };
  } catch {
    return null;
  }
}
