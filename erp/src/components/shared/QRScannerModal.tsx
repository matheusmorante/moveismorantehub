import React, { useEffect, useRef, useState, useCallback, useId } from "react";
import { Html5Qrcode } from "html5-qrcode";

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
    const [error, setError] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(false);
    const [showManualInput, setShowManualInput] = useState(false);
    const [manualCode, setManualCode] = useState("");
    const [availableCameras, setAvailableCameras] = useState<any[]>([]);
    
    const uniqueId = useId().replace(/:/g, "");
    const scannerId = `qr-reader-${uniqueId}`;
    
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const initInProgressRef = useRef(false);

    const stopScanner = useCallback(async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
            } catch (err) {
                console.warn("Erro ao parar scanner:", err);
            } finally {
                scannerRef.current = null;
            }
        }
        
        const container = document.getElementById(scannerId);
        if (container) {
            container.innerHTML = "";
        }
    }, [scannerId]);

    const startScanner = useCallback(async () => {
        if (!isOpen || initInProgressRef.current) return;
        
        initInProgressRef.current = true;
        setIsInitializing(true);
        setError(null);
        
        try {
            await stopScanner();
            await new Promise(r => setTimeout(r, 1200)); 

            const readerElem = document.getElementById(scannerId);
            if (!readerElem) throw new Error("Área do sensor não carregada.");

            const qrScanner = new Html5Qrcode(scannerId);
            scannerRef.current = qrScanner;

            const config = {
                fps: 20,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
            };

            // ETAPA NOVA: Listar câmeras reais do hardware
            let cameras = [];
            try {
                cameras = await Html5Qrcode.getCameras();
                setAvailableCameras(cameras);
            } catch (e) {
                console.warn("Falha ao listar câmeras:", e);
            }

            if (cameras && cameras.length > 0) {
                // Tenta achar a traseira pelo rótulo, senão pega a última da lista (geralmente a melhor)
                const backCamera = cameras.find(c => 
                    c.label.toLowerCase().includes('back') || 
                    c.label.toLowerCase().includes('traseira') ||
                    c.label.toLowerCase().includes('environment')
                );
                
                const selectedCameraId = backCamera ? backCamera.id : cameras[cameras.length - 1].id;
                
                console.log(`[Scanner] Tentando Câmera ID: ${selectedCameraId} (${backCamera?.label || 'Padrão'})`);
                
                await qrScanner.start(
                    selectedCameraId,
                    config,
                    (text) => {
                        if (navigator.vibrate) try { navigator.vibrate(50); } catch {}
                        onScan(text);
                        if (closeOnScan) onClose();
                    },
                    () => {}
                );
            } else {
                // FALLBACK AGRESSIVO: Se não listar, tenta pelo modo genérico
                console.log("[Scanner] Nenhuma câmera listada, tentando modo genérico...");
                await qrScanner.start(
                    { facingMode: "environment" },
                    config,
                    (text) => {
                        onScan(text);
                        if (closeOnScan) onClose();
                    },
                    () => {}
                );
            }

        } catch (err: any) {
            console.error("Critical Device Error:", err);
            let msg = err?.message || String(err);
            
            if (msg.includes("Permission") || msg.includes("allowed")) {
                msg = "Acesso negado. Por favor, libere a câmera no cadeado ao lado do endereço do site (barra de busca do navegador).";
            } else if (msg.includes("NotFound") || msg.includes("device not found")) {
                msg = "Nenhuma câmera encontrada ou ela está sendo usada por outro aplicativo (WhatsApp, Zoom, etc).";
            }
            
            setError(msg);
        } finally {
            setIsInitializing(false);
            initInProgressRef.current = false;
        }
    }, [isOpen, onScan, onClose, closeOnScan, stopScanner, scannerId]);

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
    }, [isOpen, startScanner, stopScanner]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-3xl animate-fade-in" onClick={onClose} />
            
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800">
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{title}</h3>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">
                            {isInitializing ? 'Detectando Hardware...' : error ? 'Erro de Dispositivo' : 'Sensor Preparado'}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-500 shadow-sm transition-all active:scale-95">
                        <i className="bi bi-x-lg text-lg" />
                    </button>
                </div>

                <div className="p-8">
                    <div className={`relative w-full rounded-[2.5rem] overflow-hidden bg-black border-2 border-slate-200 dark:border-slate-700 shadow-2xl ${showManualInput ? 'hidden' : 'block'}`} style={{ minHeight: '340px' }}>
                        
                        <div id={scannerId} className="absolute inset-0 w-full h-full bg-slate-900" />

                        {isInitializing && (
                            <div className="absolute inset-0 z-20 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center text-white">
                                <div className="w-16 h-16 border-[6px] border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-6" />
                                <h4 className="text-xs font-black uppercase tracking-widest mb-2">Conectando ao Sensor</h4>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight leading-relaxed">
                                    Se solicitado, autorize o acesso à câmera no topo da tela.
                                </p>
                            </div>
                        )}

                        {error && (
                            <div className="absolute inset-0 z-30 bg-slate-900 flex flex-col items-center justify-center p-8 text-center overflow-y-auto">
                                <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-6">
                                    <i className="bi bi-camera-video-off text-4xl text-rose-500" />
                                </div>
                                <div className="p-5 bg-black/60 rounded-2xl border border-rose-500/20 mb-8 w-full">
                                    <p className="text-[11px] font-mono text-rose-300 select-all leading-relaxed ltr break-all italic">
                                        {error}
                                    </p>
                                </div>
                                <div className="flex flex-col w-full gap-3">
                                    <button onClick={() => startScanner()} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all">
                                        TENTAR RECONECTAR
                                    </button>
                                    <button 
                                        onClick={() => setShowManualInput(true)} 
                                        className="w-full py-4 bg-slate-800 text-slate-300 rounded-2xl font-black uppercase tracking-widest text-[9px] border border-slate-700 active:scale-95 transition-all"
                                    >
                                        DIGITAR CÓDIGO MANUALMENTE
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {showManualInput && (
                        <div className="space-y-6 animate-fade-in py-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-left">Código do Produto / SKU</label>
                                <input 
                                    autoFocus
                                    type="text"
                                    value={manualCode}
                                    onChange={(e) => setManualCode(e.target.value)}
                                    placeholder="Digite o código..."
                                    className="w-full px-8 py-6 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-3xl outline-none focus:border-emerald-500 transition-all font-bold text-2xl text-center"
                                />
                            </div>
                            <button 
                                onClick={() => {
                                    if (manualCode.trim()){
                                        onScan(manualCode.trim());
                                        if (closeOnScan) onClose();
                                        setManualCode("");
                                    }
                                }} 
                                className="w-full py-6 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
                            >
                                CONFIRMAR CÓDIGO
                            </button>
                        </div>
                    )}

                    <div className="mt-10 pt-8 border-t border-slate-50 dark:border-slate-800">
                        <button 
                            onClick={() => setShowManualInput(!showManualInput)}
                            className="w-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-500 transition-colors flex items-center justify-center gap-3"
                        >
                            <i className={`bi ${showManualInput ? 'bi-camera-fill' : 'bi-keyboard-fill'} text-lg`} />
                            {showManualInput ? 'VOLTAR PARA CÂMERA' : 'DIFICULDADE? DIGITE MANUALMENTE'}
                        </button>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                #${scannerId} button { display: none !important; }
                #${scannerId} img { display: none !important; }
                #${scannerId} { background: black !important; }
                #${scannerId} video { 
                    width: 100% !important; 
                    height: 100% !important; 
                    object-fit: cover !important;
                    border-radius: 2rem !important;
                }
            `}} />
        </div>
    );
};

export default QRScannerModal;
