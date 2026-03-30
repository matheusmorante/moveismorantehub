import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { getSettings } from "@/pages/utils/settingsService";

/**
 * QRScannerModal - BARCODE OPTIMIZED (v7)
 * - BARCODE API ACCELERATION (Native Detection)
 * - Improved focus and sensitivity.
 * - Auto-vibration on success.
 */

interface QRScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (decodedText: string) => void;
    title?: string;
    closeOnScan?: boolean;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ 
    isOpen, 
    onClose: parentOnClose, 
    onScan: parentOnScan, 
    title = "Escanear Código",
    closeOnScan = true
}) => {
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<string>("Iniciando...");
    const [isInitializing, setIsInitializing] = useState(false);
    const [showManualInput, setShowManualInput] = useState(false);
    const [manualCode, setManualCode] = useState("");
    
    // Configurações dinâmicas
    const configSettings = getSettings().scannerConfig;
    
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const lastScanTimeRef = useRef<number>(0); // Para controlar o delay de 500ms
    const mountPointId = "barcode-scanner-v7";

    // Função para gerar o som de "Bip" (Pibe) usando Web Audio API
    const playBeep = () => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Tom agudo (Bip)
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // Volume baixo/médio

            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1); 
            oscillator.stop(audioCtx.currentTime + 0.1);
        } catch (e) {
            console.warn("Audio Context falhou (esperado se não houver interação prévia).");
        }
    };

    const stopScanner = useCallback(async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
            } catch (err) {
                console.warn("[Scanner] Cleanup issue:", err);
            } finally {
                const mount = document.getElementById(mountPointId);
                if (mount) mount.innerHTML = "";
                scannerRef.current = null;
            }
        }
    }, []);

    const startScanner = useCallback(async () => {
        if (!isOpen) return;
        
        setIsInitializing(true);
        setError(null);
        setStep("Otimizando Sensores...");

        try {
            await stopScanner();
            await new Promise(r => setTimeout(r, 600));
            
            const mount = document.getElementById(mountPointId);
            if (!mount) throw new Error("Recipiente de vídeo não encontrado no DOM.");

            setStep("Buscando Câmeras...");
            const cameras = await Html5Qrcode.getCameras().catch(() => []);

            const formats = [
                Html5QrcodeSupportedFormats.EAN_13, // Prioridade 1
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.QR_CODE
            ];

            const config = { 
                fps: 25, 
                qrbox: (w: number, h: number) => ({ 
                    width: Math.floor(w * 0.95), 
                    height: Math.floor(h * 0.3) 
                }),
                aspectRatio: 1.7777778, 
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true 
                },
                videoConstraints: {
                    facingMode: "environment",
                    focusMode: "continuous",
                    width: { ideal: 1920 }, 
                    height: { ideal: 1080 },
                    advanced: [{
                        focusMode: "continuous",
                        whiteBalanceMode: "continuous",
                        exposureMode: "continuous",
                        zoom: 1.0 
                    }] as any
                }
            };

            const scanner = new Html5Qrcode(mountPointId, { 
                formatsToSupport: formats,
                verbose: false
            });
            scannerRef.current = scanner;

            if (cameras.length > 0) {
                const backCamera = cameras.find(c => /back|rear|traseir|extern/i.test(c.label)) || cameras[0];
                await scanner.start(backCamera.id, config, onSuccess, () => {});
            } else {
                await scanner.start({ facingMode: "environment" }, config, onSuccess, () => {});
            }

            setStep("Aguardando Detecção...");
            setError(null);
        } catch (err: any) {
            console.error("[Scanner v7 Failure]:", err);
            setError("Não foi possível acessar a câmera traseira. Certifique-se de estar em HTTPS.");
        } finally {
            setIsInitializing(false);
        }
    }, [isOpen]);

    const onSuccess = (text: string) => {
        const now = Date.now();
        const scanDelay = configSettings?.delay || 1500;
        
        // Delay configurável para evitar dupla leitura
        if (now - lastScanTimeRef.current < scanDelay) return;
        
        lastScanTimeRef.current = now;

        // Bip de sucesso (Pibe!) se habilitado
        if (configSettings?.enableBeep !== false) {
            playBeep();
        }

        // Vibração (Feedback háptico) se habilitado
        if (configSettings?.vibrate !== false && navigator.vibrate) {
            try { navigator.vibrate(80); } catch (e) {}
        }
        
        console.log("[Scanner v7] Código detectado:", text);
        parentOnScan(text);
        if (closeOnScan) handleClose();
    };

    const handleClose = async () => {
        await stopScanner();
        parentOnClose();
    };

    useEffect(() => {
        if (isOpen) {
            startScanner();
        } else {
            stopScanner();
        }
        return () => { stopScanner(); };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md" onClick={handleClose} />
            
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up-custom border border-white/10">
                <div className="px-6 pt-6 flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase italic tracking-tighter">{title}</h3>
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">
                            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-ping mr-2" />
                            {step}
                        </p>
                    </div>
                    <button onClick={handleClose} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl hover:text-rose-500 transition-colors">
                        <i className="bi bi-x-lg" />
                    </button>
                </div>

                <div className="p-6">
                    {!showManualInput ? (
                        <div className="space-y-6">
                            <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-black border border-slate-200 dark:border-slate-800 shadow-inner">
                                <div id={mountPointId} className="w-full h-full" />
                                
                                {/* Scanner Overlay Effects */}
                                <div className="absolute inset-0 pointer-events-none opacity-40">
                                    <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl" />
                                    <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl" />
                                    <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl" />
                                    <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-blue-500 rounded-br-2xl" />
                                </div>

                                {/* Overlay Laser Line (Scanning Animation) */}
                                <div className="absolute inset-x-0 h-full pointer-events-none overflow-hidden flex flex-col justify-center">
                                    <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,1)] animate-sweep" />
                                </div>

                                {isInitializing && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-30 p-6 text-center">
                                        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">{step}</p>
                                    </div>
                                )}

                                {error && (
                                    <div className="absolute inset-0 z-40 bg-slate-900 flex flex-col items-center justify-center p-8 text-center text-white">
                                        <i className="bi bi-exclamation-triangle text-3xl text-amber-500 mb-4" />
                                        <p className="text-xs font-black uppercase opacity-80 mb-2">Ops! Falha na Inicialização</p>
                                        <p className="text-[10px] font-bold opacity-60 mb-6 max-w-[200px]">{error}</p>
                                        <button onClick={startScanner} className="px-8 py-3 bg-blue-600 rounded-full font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-transform">
                                            Recarregar Scanner
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setShowManualInput(true)} className="py-4 bg-slate-50 dark:bg-slate-800/50 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors">
                                    <i className="bi bi-keyboard text-base" /> Digitar SKU
                                </button>
                                <button onClick={handleClose} className="py-4 bg-rose-50 text-rose-500 rounded-2xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors">
                                    <i className="bi bi-x-circle text-base" /> Cancelar
                                </button>
                            </div>

                            <p className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                Posicione o código no meio da linha
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (manualCode.trim()) {
                                parentOnScan(manualCode.trim());
                                if (closeOnScan) handleClose();
                            }
                        }} className="space-y-6 py-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Código do Produto</label>
                                <input 
                                    autoFocus
                                    type="text"
                                    inputMode="numeric"
                                    value={manualCode}
                                    onChange={(e) => setManualCode(e.target.value)}
                                    placeholder="Ex: 789123..."
                                    className="w-full px-6 py-5 bg-slate-100 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-3xl outline-none focus:border-blue-500 font-black text-2xl tracking-tighter"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button type="submit" className="flex-[2] py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 hover:bg-blue-700 transition-colors">
                                    Confirmar SKU
                                </button>
                                <button type="button" onClick={() => setShowManualInput(false)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-colors">
                                    Câmera
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                #${mountPointId} video { 
                    width: 100% !important; 
                    height: 100% !important; 
                    object-fit: cover !important; 
                }
                #${mountPointId} button { display: none !important; }
                
                @keyframes sweep {
                    0% { transform: translateY(-70px); opacity: 0.2; }
                    50% { opacity: 1; }
                    100% { transform: translateY(70px); opacity: 0.2; }
                }
                .animate-sweep {
                    animation: sweep 2s infinite ease-in-out;
                }

                @keyframes slide-up-custom { 
                    from { opacity: 0; transform: translateY(50px); } 
                    to { opacity: 1; transform: translateY(0); } 
                }
                .animate-slide-up-custom { animation: slide-up-custom 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}} />
        </div>,
        document.body
    );
};

export default QRScannerModal;

