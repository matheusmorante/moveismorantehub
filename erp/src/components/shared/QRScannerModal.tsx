import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";

/**
 * QRScannerModal - THE RIGHT WAY
 * 1. Absolute Isolation from React Virtual DOM to prevent removeChild errors.
 * 2. Robust camera management with forced manual cleanup.
 * 3. Automatic fallback logic for environment/user cameras.
 */

interface QRScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (decodedText: string) => void;
    title?: string;
    closeOnScan?: boolean;
}

const SCANNER_DIV_ID = "qr-reader-container";

const QRScannerModal: React.FC<QRScannerModalProps> = ({ 
    isOpen, 
    onClose, 
    onScan: parentOnScan, 
    title = "Escanear Código",
    closeOnScan = true
}) => {
    const [error, setError] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(false);
    const [showManualInput, setShowManualInput] = useState(false);
    const [manualCode, setManualCode] = useState("");
    
    // Low-level refs for library management
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const isActiveRef = useRef(false);

    // Manual Input Handler
    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualCode.trim()) {
            parentOnScan(manualCode.trim());
            if (closeOnScan) handleClose();
            setManualCode("");
        }
    };

    const handleClose = async () => {
        await stopScanner();
        onClose();
    };

    const stopScanner = async () => {
        if (html5QrCodeRef.current) {
            try {
                // Check if it's actually running before stopping
                if (html5QrCodeRef.current.getState() !== Html5QrcodeScannerState.NOT_STARTED) {
                    await html5QrCodeRef.current.stop();
                }
            } catch (err) {
                console.warn("[Scanner] Critical stop cleanup:", err);
            } finally {
                // ABSOLUTE CLEANUP: Ensure DOM is cleared manually to avoid React crashes
                const element = document.getElementById(SCANNER_DIV_ID);
                if (element) element.innerHTML = "";
                
                html5QrCodeRef.current = null;
                isActiveRef.current = false;
            }
        }
    };

    const startScanner = async () => {
        if (isActiveRef.current || !isOpen) return;
        
        setIsInitializing(true);
        setError(null);
        isActiveRef.current = true;

        try {
            // Give DOM time to mount properly
            await new Promise(r => setTimeout(r, 600));
            
            const element = document.getElementById(SCANNER_DIV_ID);
            if (!element) throw new Error("Célula de visualização não encontrada.");

            const scanner = new Html5Qrcode(SCANNER_DIV_ID);
            html5QrCodeRef.current = scanner;

            const config = {
                fps: 20,
                qrbox: { width: 250, height: 200 },
                aspectRatio: 1.0,
            };

            const onScanSuccess = (text: string) => {
                if (navigator.vibrate) try { navigator.vibrate(50); } catch (e) {}
                parentOnScan(text);
                if (closeOnScan) handleClose();
            };

            // Main attempt: Environment (back camera)
            try {
                await scanner.start(
                    { facingMode: "environment" },
                    config,
                    onScanSuccess,
                    () => {} // Silent failures for frames
                );
            } catch (envCheckErr) {
                console.log("[Scanner] Environment camera failed, trying fallback...", envCheckErr);
                // Fallback attempt: User/Any available camera
                await scanner.start(
                    { facingMode: "user" },
                    config,
                    onScanSuccess,
                    () => {}
                );
            }

            setError(null);
        } catch (err: any) {
            console.error("[Scanner] Initialization Error:", err);
            isActiveRef.current = false;
            
            if (err?.name === "NotAllowedError" || String(err).includes("Permission")) {
                setError("Permissão de câmera negada. Ative-a nas configurações do seu navegador.");
            } else if (err?.name === "NotFoundError") {
                setError("Câmera não encontrada neste dispositivo.");
            } else {
                setError("Erro ao acessar sensor de vídeo. Tente reiniciar o modo scanner.");
            }
        } finally {
            setIsInitializing(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            startScanner();
        } else {
            stopScanner();
            setError(null);
            setShowManualInput(false);
        }
        
        return () => {
            stopScanner();
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop Layer */}
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-fade-in" onClick={handleClose} />
            
            {/* Modal Body */}
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden animate-slide-up">
                
                {/* Header */}
                <div className="p-8 pb-4 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                            <i className="bi bi-qr-code-scan text-xl" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{title}</h3>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">
                                {showManualInput ? "Modo Digitação" : "Modo Sensor Óptico"}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all">
                        <i className="bi bi-x-lg text-lg" />
                    </button>
                </div>

                <div className="p-8">
                    {!showManualInput ? (
                        <>
                            {/* CAMERA CONTAINER - TOTALLY EMPTY FOR REACT */}
                            <div className="relative w-full min-h-[300px] rounded-[2rem] overflow-hidden bg-slate-950 shadow-inner">
                                <div id={SCANNER_DIV_ID} className="absolute inset-0 w-full h-full" />
                                
                                {/* Overlay Layers Not Controlled by Camera Library */}
                                {isInitializing && (
                                    <div className="absolute inset-0 z-10 bg-slate-950 flex flex-col items-center justify-center">
                                        <div className="w-12 h-12 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin mb-4" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Acessando Hardware...</p>
                                    </div>
                                )}

                                {error && (
                                    <div className="absolute inset-0 z-20 bg-slate-900/95 flex flex-col items-center justify-center p-8 text-center text-white">
                                        <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-6">
                                            <i className="bi bi-camera-video-off text-3xl" />
                                        </div>
                                        <p className="font-bold text-sm mb-6 leading-relaxed">{error}</p>
                                        <div className="flex flex-col w-full gap-3">
                                            <button onClick={startScanner} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-blue-500/20">
                                                Tentar Novamente
                                            </button>
                                            <button onClick={() => setShowManualInput(true)} className="w-full py-4 bg-slate-800 text-slate-300 rounded-2xl font-black uppercase tracking-widest text-[11px]">
                                                Digitar Código
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Animated Scan Line Overlay */}
                                {!error && !isInitializing && (
                                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent z-10 animate-scan-line pointer-events-none" />
                                )}
                            </div>

                            <button 
                                onClick={() => setShowManualInput(true)}
                                className="w-full mt-8 py-5 border-2 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:border-blue-500 hover:text-blue-500 transition-all flex items-center justify-center gap-3 active:scale-95"
                            >
                                <i className="bi bi-keyboard text-lg" />
                                Digitar manualmente
                            </button>
                        </>
                    ) : (
                        <form onSubmit={handleManualSubmit} className="space-y-6 pt-4 animate-fade-in">
                            <div className="flex flex-col gap-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Código de Barras / SKU</label>
                                <div className="relative">
                                    <i className="bi bi-upc-scan absolute left-6 top-1/2 -translate-y-1/2 text-xl text-blue-500" />
                                    <input 
                                        autoFocus
                                        type="text"
                                        value={manualCode}
                                        onChange={(e) => setManualCode(e.target.value)}
                                        placeholder="EX: 7891234567890"
                                        className="w-full pl-16 pr-8 py-6 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-3xl outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-all font-black text-2xl tracking-tighter"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex gap-4">
                                <button type="submit" disabled={!manualCode.trim()} className="flex-[2] py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50 transition-all">
                                    Bipar Manualmente
                                </button>
                                <button type="button" onClick={() => setShowManualInput(false)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-3xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all">
                                    Voltar
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes scan-line {
                    0% { top: 10%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 90%; opacity: 0; }
                }
                .animate-scan-line {
                    animation: scan-line 2s infinite linear;
                }
                #${SCANNER_DIV_ID} button { display: none !important; }
                #${SCANNER_DIV_ID} video { 
                    width: 100% !important; 
                    height: 100% !important; 
                    object-fit: cover !important; 
                    border-radius: 1.5rem !important;
                }
                #${SCANNER_DIV_ID}__scan_region { width: 100% !important; height: 100% !important; }
            `}} />
        </div>
    );
};

export default QRScannerModal;
