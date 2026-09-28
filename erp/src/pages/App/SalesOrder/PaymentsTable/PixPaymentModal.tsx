import React, { useState, useEffect } from 'react';
// import QRCode from 'qrcode.react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { toast } from 'react-toastify';

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  orderId?: string;
  onSuccess: (transaction: any) => void;
}

export const PixPaymentModal: React.FC<PixPaymentModalProps> = ({
  isOpen,
  onClose,
  amount,
  orderId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{
    qrCodeData: string;
    qrCodeImage: string;
    tid: string;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState(1200); // 20 minutos padrão

  const generatePix = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('rede-gateway', {
        body: {
          action: 'create-pix',
          payload: {
            amount: amount * 100, // Rede espera centavos
            orderId: orderId || `ERP-${Date.now()}`,
            paymentMethod: 'pix',
            expiration: 1200, // 20 minutos
          },
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setPixData({
        qrCodeData: data.qrCodeData,
        qrCodeImage: data.qrCodeImage,
        tid: data.tid,
      });
      setTimeLeft(1200);
    } catch (err: any) {
      console.error('Erro Pix:', err);
      toast.error('Falha ao gerar QR Code Pix: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !pixData) {
      generatePix();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!pixData || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [pixData, timeLeft]);

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-zoom-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white text-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <i className="bi bi-qr-code text-2xl"></i>
          </div>
          <h3 className="text-xl font-black italic tracking-tight uppercase">Pagamento via Pix</h3>
          <p className="text-blue-100 text-sm font-bold opacity-80 uppercase tracking-widest mt-1">
            Integração Rede
          </p>
        </div>

        <div className="p-8 flex flex-col items-center">
          {loading ? (
            <div className="py-12 flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 font-bold text-sm uppercase">Gerando QR Code...</p>
            </div>
          ) : pixData ? (
            <>
              <div className="bg-white p-4 rounded-2xl shadow-inner border-2 border-slate-50 mb-6 group relative">
                {/* <QRCode 
                                    value={pixData.qrCodeData} 
                                    size={220} 
                                    renderAs="svg"
                                    imageSettings={{
                                        src: "https://wzpdfmihnwcrgkyagwkd.supabase.co/storage/v1/object/public/public_assets/pix_logo.png",
                                        x: undefined,
                                        y: undefined,
                                        height: 30,
                                        width: 30,
                                        excavate: true,
                                    }}
                                /> */}
                <div className="text-slate-300 text-center font-bold">
                  QR CODE TEST [BUILD ISOLATION]
                </div>
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-all rounded-2xl pointer-events-none"></div>
              </div>

              <div className="text-center mb-6">
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">
                  Valor a pagar
                </p>
                <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">
                  {amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>

              <div className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-6 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                    Tempo restante
                  </span>
                  <span
                    className={`text-sm font-black ${timeLeft < 60 ? 'text-rose-500 animate-pulse' : 'text-blue-600'}`}
                  >
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-1000"
                    style={{ width: `${(timeLeft / 1200) * 100}%` }}
                  ></div>
                </div>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(pixData.qrCodeData);
                  toast.success('Copiado para a área de transferência!');
                }}
                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all mb-3 flex items-center justify-center gap-2"
              >
                <i className="bi bi-clipboard2-check-fill text-lg"></i>
                Copiar Código Pix
              </button>
            </>
          ) : null}

          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={generatePix}
              className="bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all"
            >
              <i className="bi bi-arrow-clockwise mr-2"></i>
              Novo QR
            </button>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/80 p-4 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            A confirmação será automática após o pagamento
          </p>
        </div>
      </div>
    </div>
  );
};
