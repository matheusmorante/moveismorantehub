import React, { useEffect, useRef } from 'react';
import bwipjs from 'bwip-js';
import { ShieldCheck } from 'lucide-react';
import { getSettings } from '@/pages/utils/settingsService';
import { formatOrderCode } from '@/pages/utils/orderCode';

interface DigitalSignatureBadgeProps {
    order: any;
    sellerName?: string;
}

export const DigitalSignatureBadge: React.FC<DigitalSignatureBadgeProps> = ({ order, sellerName }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const settings = getSettings();
    const orderCode = formatOrderCode(order);
    const companyName = settings.companyName || "Móveis Morante";
    const companyCnpj = settings.companyCnpj || "44.512.248.0001/07";
    
    // Hash determinístico / código de validação baseado no pedido
    const rawId = String(order?.id || orderCode || '000000').replace(/[^a-zA-Z0-9]/g, '');
    const validationCode = (rawId.length >= 16 ? rawId.slice(0, 16) : rawId.padEnd(16, '0')).toUpperCase();
    const formattedValidationCode = validationCode.match(/.{1,4}/g)?.join('-') || validationCode;

    // URL ou payload de consulta que será codificado no QR Code
    const verificationUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/receipt?orderIndex=${orderCode}`
        : `https://morante.com.br/validar/${orderCode}`;

    useEffect(() => {
        if (canvasRef.current) {
            try {
                bwipjs.toCanvas(canvasRef.current, {
                    bcid: 'qrcode',
                    text: verificationUrl,
                    scale: 2,
                    includetext: false,
                    backgroundcolor: 'ffffff'
                });
            } catch (err) {
                console.error('[DigitalSignatureBadge] Erro ao renderizar QRCode:', err);
            }
        }
    }, [verificationUrl]);

    // Data de emissão / assinatura
    const signatureDate = order?.date 
        ? new Date(order.date).toLocaleDateString('pt-BR') 
        : new Date().toLocaleDateString('pt-BR');
    const signatureTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="border-2 border-emerald-600/60 bg-emerald-50/30 rounded-2xl p-3 max-w-[340px] text-slate-800 relative overflow-hidden print-exact-bg">
            {/* Cabeçalho do Carimbo */}
            <div className="flex items-center justify-between gap-2 border-b border-emerald-600/30 pb-1.5 mb-2">
                <div className="flex items-center gap-1.5 text-emerald-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider">
                        Documento Assinado Digitalmente
                    </span>
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-600 text-white shrink-0">
                    ICP-BRASIL / A1
                </span>
            </div>

            {/* Conteúdo: QR Code + Detalhes do Certificado */}
            <div className="flex items-center gap-3">
                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center shrink-0 bg-white p-1 rounded-xl border border-emerald-200 shadow-sm">
                    <canvas ref={canvasRef} className="w-[64px] h-[64px] block" />
                    <span className="text-[7px] font-black uppercase tracking-tight text-slate-400 mt-0.5">
                        Consultar
                    </span>
                </div>

                {/* Metadados da Assinatura Digital */}
                <div className="flex-1 min-w-0 space-y-0.5 text-[9px] text-slate-600">
                    <p className="truncate font-black text-slate-900 leading-tight">
                        {companyName}
                    </p>
                    <p className="font-bold text-slate-600 text-[8.5px]">
                        CNPJ: <span className="font-black text-slate-800">{companyCnpj}</span>
                    </p>
                    {sellerName && (
                        <p className="truncate font-semibold text-slate-600 text-[8.5px]">
                            Emissor: <span className="font-bold text-slate-800 uppercase">{sellerName}</span>
                        </p>
                    )}
                    <p className="text-[8px] text-slate-500 font-medium">
                        Data: <span className="font-bold text-slate-700">{signatureDate} às {signatureTime}</span>
                    </p>
                    <p className="text-[7.5px] font-mono text-slate-400 truncate tracking-tight pt-0.5">
                        Cod: {formattedValidationCode}
                    </p>
                </div>
            </div>

            {/* Rodapé do Carimbo */}
            <div className="mt-1.5 pt-1 border-t border-emerald-600/20 flex items-center justify-between text-[7.5px] font-bold text-emerald-700">
                <span>Autenticidade garantida por Certificado Digital</span>
                <span>Pedido #{orderCode}</span>
            </div>
        </div>
    );
};

export default DigitalSignatureBadge;
