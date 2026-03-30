import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface QRScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (decodedText: string) => void;
    title?: string;
    closeOnScan?: boolean;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ 
    isOpen, 
    onClose, 
    onScan, 
    title = "Escanear Produto",
    closeOnScan = true
}) => {
    const [scannerInstance, setScannerInstance] = useState<Html5Qrcode | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    const [manualCode, setManualCode] = useState("");
    const [showManualInput, setShowManualInput] = useState(false);

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualCode.trim()) {
            onScan(manualCode.trim());
            if (closeOnScan) {
                onClose();
            }
            setManualCode("");
            setShowManualInput(false);
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
            } catch (err) {
                console.warn("Erro ao parar scanner:", err);
            } finally {
                const container = document.getElementById("qr-reader");
                if (container) container.innerHTML = "";
                scannerRef.current = null;
                setScannerInstance(null);
            }
        }
    };

    const startScanner = async () => {
        if (!isOpen || isInitializing) return;
        
        setIsInitializing(true);
        setError(null);
        setShowManualInput(false);
        
        try {
            await stopScanner();
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const readerElem = document.getElementById("qr-reader");
            if (!readerElem) return; // Silent return if element gone

            const qrCode = new Html5Qrcode("qr-reader");
            scannerRef.current = qrCode;
            setScannerInstance(qrCode);

            const formatsToSupport = [
                Html5QrcodeSupportedFormats.QR_CODE,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_93,
                Html5QrcodeSupportedFormats.ITF,
            ];

            const config = {
                fps: 30, // Higher frequency for faster detection
                qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
                    const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                    // Larger area for barcode detection
                    const width = Math.floor(viewfinderWidth * 0.85);
                    const height = Math.floor(viewfinderHeight * 0.45); // Narrower height for 1D barcodes
                    return { width, height };
                },
                aspectRatio: 1.0,
                formatsToSupport,
                showTorchButtonIfSupported: true,
                rememberLastUsedCamera: true
            };

            await qrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText: string) => {
                    // Feedback visual/tátil
                    if (navigator.vibrate) {
                        try { navigator.vibrate(50); } catch (e) { /* ignore */ }
                    }
                    
                    onScan(decodedText);
                    if (closeOnScan) onClose();
                },
                () => {} 
            );
        } catch (err: any) {
            console.error("Scanner Error:", err);
            setError("Não foi possível iniciar a câmera. Verifique as permissões ou se o dispositivo suporta acesso via navegador.");
        } finally {
            setIsInitializing(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        if (isOpen) {
            startScanner();
        } else {
            stopScanner();
            if (isMounted) {
                setError(null);
                setShowManualInput(false);
            }
        }
        return () => { 
            isMounted = false;
            stopScanner(); 
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-fade-in" onClick={onClose} />
            
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-slide-up">
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                            {title}
                        </h3>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">
                            {showManualInput ? 'Digite o código manualmente' : 'Aponte a câmera para o código'}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 transition-all">
                        <i className="bi bi-x-lg text-xl" />
                    </button>
                </div>

                <div className="p-8">
                    {!showManualInput ? (
                        <div id="qr-reader" className="w-full rounded-3xl overflow-hidden border-4 border-slate-100 dark:border-slate-800 bg-black relative min-h-[320px] flex items-center justify-center">
                            {isInitializing && (
                                <div className="absolute inset-0 z-20 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                                    <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Iniciando Sensor...</p>
                                </div>
                            )}

                            {error && (
                                <div className="absolute inset-0 z-30 bg-slate-900 flex flex-col items-center justify-center p-8 text-center">
                                    <i className="bi bi-camera-video-off text-4xl text-rose-500 mb-4" />
                                    <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest mb-6 leading-relaxed">
                                        {error}
                                    </p>
                                    <div className="flex flex-col w-full gap-3">
                                        <button onClick={startScanner} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all">
                                            Tentar Novamente
                                        </button>
                                        <button onClick={() => setShowManualInput(true)} className="w-full py-3 bg-slate-800 text-white rounded-xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all">
                                            Digitar Código Manualmente
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!error && !isInitializing && (
                                <div className="absolute inset-0 pointer-events-none z-10 border-[30px] border-black/40">
                                    <div className="w-full h-0.5 bg-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-scan-line top-0" />
                                </div>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleManualSubmit} className="space-y-6 py-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Código do Produto / SKU</label>
                                <input 
                                    autoFocus
                                    type="text"
                                    value={manualCode}
                                    onChange={(e) => setManualCode(e.target.value)}
                                    placeholder="Digite ou cole o código..."
                                    className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold text-lg"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button type="submit" className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all">
                                    Confirmar
                                </button>
                                <button type="button" onClick={() => setShowManualInput(false)} className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all">
                                    Voltar
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="mt-8">
                        {!showManualInput && !error && (
                            <button 
                                onClick={() => setShowManualInput(true)}
                                className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-500 transition-colors flex items-center justify-center gap-2"
                            >
                                <i className="bi bi-keyboard" /> Problemas com a câmera? Digite o código
                            </button>
                        )}
                        
                        {!error && !showManualInput && (
                            <div className="mt-4 flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                                <i className="bi bi-info-circle-fill text-blue-500 text-xl" />
                                <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 leading-snug">
                                    Aponte para o código de barras ou PDF. A tela ficará escura até que a câmera seja autorizada pelo navegador.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes scan-line {
                    0% { top: 10%; }
                    50% { top: 90%; }
                    100% { top: 10%; }
                }
                .animate-scan-line {
                    position: absolute;
                    animation: scan-line 3s ease-in-out infinite;
                }
                #qr-reader button {
                    background-color: #3b82f6 !important;
                    color: white !important;
                    border: none !important;
                    padding: 8px 16px !important;
                    border-radius: 12px !important;
                    font-size: 10px !important;
                    font-weight: 900 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.1em !important;
                    cursor: pointer !important;
                    margin-top: 10px !important;
                }
                #qr-reader img {
                    display: none !important;
                }
                #qr-reader__dashboard_section_csr button {
                    display: inline-block !important;
                }
            `}} />
        </div>
    );
};

export default QRScannerModal;
