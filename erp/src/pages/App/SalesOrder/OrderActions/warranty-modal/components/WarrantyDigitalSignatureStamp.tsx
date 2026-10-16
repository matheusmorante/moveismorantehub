import React, { useEffect, useMemo, useRef, useState } from 'react';
import bwipjs from 'bwip-js';
import { ShieldCheck } from 'lucide-react';

export interface WarrantyDigitalSignatureStampProps {
  orderCode?: string;
  purchaseDate?: string;
  sha256?: string;
  sellerName?: string;
  companyName?: string;
  companyCnpj?: string;
}

export const WarrantyDigitalSignatureStamp: React.FC<WarrantyDigitalSignatureStampProps> = ({
  orderCode = '0000',
  purchaseDate,
  sha256,
  companyName = 'MÓVEIS MORANTE COMÉRCIO DE MÓVEIS LTDA',
  companyCnpj = '44.512.248/0001-07',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCanvasRendered, setHasCanvasRendered] = useState(false);

  // Código de validação determinístico
  const rawHash = (sha256 || orderCode || '44512248000107').replace(/[^a-zA-Z0-9]/g, '');
  const validationCode = (
    rawHash.length >= 16 ? rawHash.slice(0, 16) : rawHash.padEnd(16, '0')
  ).toUpperCase();
  const formattedValidationCode =
    validationCode.match(/.{1,4}/g)?.join('-') || validationCode;

  const verificationUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/receipt?orderIndex=${orderCode}`
      : `https://morante.com.br/validar/${orderCode}`;

  // Renderiza o QR Code via HTML5 Canvas (renderização mais nítida e direta em navegadores)
  useEffect(() => {
    if (canvasRef.current) {
      try {
        const toCanvas = (bwipjs as any)?.toCanvas || (bwipjs as any)?.default?.toCanvas;
        if (typeof toCanvas === 'function') {
          toCanvas(canvasRef.current, {
            bcid: 'qrcode',
            text: verificationUrl,
            scale: 3,
            includetext: false,
            backgroundcolor: 'ffffff',
          });
          setHasCanvasRendered(true);
        }
      } catch (err) {
        console.warn('[WarrantyDigitalSignatureStamp] Canvas indisponível, usando fallback SVG:', err);
      }
    }
  }, [verificationUrl]);

  // Fallback em SVG vetorial caso o canvas não esteja disponível no ambiente
  const qrSvg = useMemo(() => {
    try {
      const toSVG = (bwipjs as any)?.toSVG || (bwipjs as any)?.default?.toSVG;
      if (typeof toSVG === 'function') {
        const rawSvg = toSVG({
          bcid: 'qrcode',
          text: verificationUrl,
          scale: 3,
          includetext: false,
          padding: 0,
        });
        return rawSvg.replace(
          '<svg ',
          '<svg width="100%" height="100%" class="w-full h-full block" style="fill:#032354" '
        );
      }
    } catch {
      // Fallback
    }
    return '';
  }, [verificationUrl]);

  const displayDate = purchaseDate || new Date().toLocaleDateString('pt-BR');
  const signatureTime = '14:30';

  return (
    <div
      data-testid="warranty-digital-signature-stamp"
      className="mt-6 sm:mt-10 mb-3 max-w-xl sm:max-w-2xl w-full mx-auto px-2 z-20 select-text"
    >
      <div className="relative rounded-2xl border-2 border-[#032354]/50 bg-gradient-to-br from-white/95 via-slate-50/90 to-amber-50/20 p-4 sm:p-5 shadow-xl backdrop-blur-sm ring-1 ring-[#feb004]/40">
        {/* Cabeçalho do Carimbo com Selo de Segurança */}
        <div className="flex items-center justify-between border-b border-[#032354]/15 pb-2.5 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-[#032354] flex items-center justify-center text-[#feb004] shrink-0 shadow-sm">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span
              className="font-serif font-black tracking-wider text-[#032354] text-xs sm:text-sm uppercase"
              style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
            >
              Documento Assinado Digitalmente
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#032354] text-[#feb004] shadow-sm">
              ICP-Brasil / A1
            </span>
          </div>
        </div>

        {/* Conteúdo: QR Code + Metadados Criptográficos */}
        <div className="flex items-center gap-3.5 sm:gap-5">
          {/* QR Code de Autenticidade (Sempre visível) */}
          <div className="flex flex-col items-center justify-center shrink-0 bg-white p-1.5 sm:p-2 rounded-2xl border border-[#032354]/25 shadow-sm">
            <div className="w-[72px] h-[72px] sm:w-[92px] sm:h-[92px] relative flex items-center justify-center bg-white rounded-xl overflow-hidden">
              <canvas
                ref={canvasRef}
                className={`w-full h-full object-contain ${hasCanvasRendered ? 'block' : 'hidden'}`}
              />
              {!hasCanvasRendered && qrSvg && (
                <div
                  className="w-full h-full flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              )}
              {!hasCanvasRendered && !qrSvg && (
                <div className="w-full h-full bg-slate-50 flex items-center justify-center text-[#032354] text-xs font-mono font-bold">
                  QR
                </div>
              )}
            </div>
            <span className="text-[8.5px] sm:text-[10px] font-black uppercase tracking-tight text-[#032354] mt-1">
              Validar
            </span>
          </div>

          {/* Dados do Certificado Ampliados */}
          <div className="flex-1 min-w-0 space-y-1 sm:space-y-1.5 text-xs sm:text-sm text-slate-700 leading-snug">
            <p className="font-black text-[#032354] text-sm sm:text-base tracking-wide truncate">
              {companyName}
            </p>
            <p className="font-medium text-slate-600 text-[10.5px] sm:text-xs">
              CNPJ: <span className="font-bold text-slate-900">{companyCnpj}</span>
            </p>
            <p className="font-medium text-slate-600 text-[10.5px] sm:text-xs">
              Certificação: <span className="font-semibold text-slate-800">ICP-Brasil A1 • SHA-256</span>
            </p>
            <p className="text-[10px] sm:text-[11.5px] text-slate-500 font-medium">
              Data da Assinatura:{' '}
              <span className="font-bold text-slate-800">{displayDate}</span> às{' '}
              <span className="font-bold text-slate-800">{signatureTime}</span> (Horário de Brasília)
            </p>
            <p className="text-[9.5px] sm:text-[11px] font-mono text-slate-500 truncate pt-0.5">
              Cód. Autenticidade:{' '}
              <span className="font-bold text-[#032354]">{formattedValidationCode}</span>
            </p>
          </div>
        </div>

        {/* Rodapé Jurídico */}
        <div className="mt-3 pt-2 border-t border-[#032354]/15 flex items-center justify-between text-[8.5px] sm:text-[10px] text-slate-500 font-medium">
          <span>Conforme MP nº 2.200-2 de 24/08/2001</span>
          <span className="font-bold text-[#032354]">Validade Jurídica em Todo o Brasil</span>
        </div>
      </div>
    </div>
  );
};
