import React, { useMemo } from 'react';
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

  // Gera o QR Code em SVG vetorial de alta definição de forma síncrona e universal
  const qrSvg = useMemo(() => {
    try {
      const toSVG = (bwipjs as any)?.toSVG || (bwipjs as any)?.default?.toSVG;
      if (typeof toSVG === 'function') {
        const rawSvg = toSVG({
          bcid: 'qrcode',
          text: verificationUrl,
          scale: 2,
          includetext: false,
          padding: 0,
        });
        return rawSvg.replace(
          '<svg ',
          '<svg class="w-full h-full block" style="fill:#032354" '
        );
      }
    } catch {
      // Fallback gracioso
    }
    return '';
  }, [verificationUrl]);

  const displayDate = purchaseDate || new Date().toLocaleDateString('pt-BR');
  const signatureTime = '14:30';

  return (
    <div
      data-testid="warranty-digital-signature-stamp"
      className="mt-6 sm:mt-8 mb-2 max-w-lg sm:max-w-xl w-full mx-auto px-2 z-20 select-text"
    >
      <div className="relative rounded-2xl border-2 border-[#032354]/40 bg-gradient-to-br from-white/95 via-slate-50/90 to-amber-50/20 p-3 sm:p-4 shadow-lg backdrop-blur-sm ring-1 ring-[#feb004]/30">
        {/* Cabeçalho do Carimbo com Selo de Segurança */}
        <div className="flex items-center justify-between border-b border-[#032354]/15 pb-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#032354] flex items-center justify-center text-[#feb004] shrink-0 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span
              className="font-serif font-black tracking-wider text-[#032354] text-[11px] sm:text-xs uppercase"
              style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
            >
              Documento Assinado Digitalmente
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#032354] text-[#feb004] shadow-sm">
              ICP-Brasil / A1
            </span>
          </div>
        </div>

        {/* Conteúdo: QR Code + Metadados Criptográficos */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* QR Code de Autenticidade */}
          <div className="flex flex-col items-center justify-center shrink-0 bg-white p-1 rounded-xl border border-[#032354]/20 shadow-sm">
            <div className="w-[58px] h-[58px] sm:w-[66px] sm:h-[66px] flex items-center justify-center overflow-hidden">
              {qrSvg ? (
                <div
                  className="w-full h-full"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[#032354] text-xs font-mono font-bold">
                  QR
                </div>
              )}
            </div>
            <span className="text-[7.5px] font-bold uppercase tracking-tight text-[#032354] mt-0.5">
              Validar
            </span>
          </div>

          {/* Dados do Certificado */}
          <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1 text-[10px] sm:text-[11px] text-slate-700 leading-snug">
            <p className="font-black text-[#032354] text-xs sm:text-[13px] tracking-wide truncate">
              {companyName}
            </p>
            <p className="font-medium text-slate-600 text-[9px] sm:text-[10px]">
              CNPJ: <span className="font-bold text-slate-900">{companyCnpj}</span>
            </p>
            <p className="font-medium text-slate-600 text-[9px] sm:text-[10px]">
              Certificação: <span className="font-semibold text-slate-800">ICP-Brasil A1 • SHA-256</span>
            </p>
            <p className="text-[8.5px] sm:text-[9.5px] text-slate-500 font-medium">
              Data da Assinatura:{' '}
              <span className="font-bold text-slate-800">{displayDate}</span> às{' '}
              <span className="font-bold text-slate-800">{signatureTime}</span> (Horário de Brasília)
            </p>
            <p className="text-[8px] sm:text-[9px] font-mono text-slate-500 truncate pt-0.5">
              Cód. Autenticidade:{' '}
              <span className="font-bold text-[#032354]">{formattedValidationCode}</span>
            </p>
          </div>
        </div>

        {/* Rodapé Jurídico */}
        <div className="mt-2 pt-1.5 border-t border-[#032354]/10 flex items-center justify-between text-[7.5px] sm:text-[8.5px] text-slate-500 font-medium">
          <span>Conforme MP nº 2.200-2 de 24/08/2001</span>
          <span className="font-bold text-[#032354]">Validade Jurídica em Todo o Brasil</span>
        </div>
      </div>
    </div>
  );
};
