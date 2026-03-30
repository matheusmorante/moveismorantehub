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
        if (container) container.innerHTML = "";
    }, [scannerId]);

    const startScanner = useCallback(async () => {
        if (!isOpen || initInProgressRef.current) return;
        
        initInProgressRef.current = true;
        setIsInitializing(true);
        setError(null);
        
        try {
            // VERIFICAÇÃO DE SEGURANÇA (HTTPS)
            if (!window.isSecureContext && window.location.hostname !== "localhost") {
                throw new Error("⚠️ SEGURANÇA: Site detectado como inseguro (HTTP). No celular, a câmera SÓ abre via HTTPS. Se estiver testando no Vercel, certifique-se de que o cadeado está ativo no topo.");
            }

            await stopScanner();
            await new Promise(r => setTimeout(r, 1200)); 

            const readerElem = document.getElementById(scannerId);
            if (!readerElem) throw new Error("Área do sensor não carregada.");

            const qrScanner = new Html5Qrcode(scannerId);
            scannerRef.current = qrScanner;

            // CONFIGURAÇÃO MAIS FLEXÍVEL (Sem restrição de aspecto ou FPS exagerado)
            const config = {
                fps: 15,
                qrbox: { width: 250, height: 250 },
                // Removido aspectRatio fixo para evitar rejeição do hardware de celulares antigos
            };

            const cameras = await Html5Qrcode.getCameras().catch(() => []);
            
            if (cameras && cameras.length > 0) {
                // Seleção inteligente: Prioriza a traseira (back), senão pega qualquer uma
                const backCamera = cameras.find(c => 
                    c.label.toLowerCase().includes('back') || 
                    c.label.toLowerCase().includes('traseira') ||
                    c.label.toLowerCase().includes('rear')
                );
                
                const selectedCameraId = backCamera ? backCamera.id : cameras[0].id;
                
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
                // Tenta pelo modo genérico do navegador se a lista estiver vazia
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
            console.error("Critical Scanner Failure:", err);
            let msg = err?.message || String(err);
            
            if (msg.includes("Permission") || msg.includes("allowed") || msg.includes("denied")) {
                msg = "🛑 PERMISSÃO BLOQUEADA: Vá nos ajustes do seu celular e libere o acesso à câmera para este site/navegador.";
            } else if (msg.includes("NotFound") || msg.includes("Requested device not found")) {
                msg = "📵 CÂMERA OCUPADA OU INEXISTENTE: Outro app (WhatsApp, Zoom, Instagram) pode estar usando a câmera agora. Feche tudo e tente novamente.";
            } else if (msg.includes("Webcam Error")) {
                msg = "⚠️ ERRO DE HARDWARE: O navegador não conseguiu conversar com o sensor. Dê F5 e tente novamente.";
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
                    <div className="text-left">
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{title}</h3>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">
                            LOGÍSTICA MÓVEIS MORANTE
                        </p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-500 shadow-sm transition-all active:scale-95">
                        <i className="bi bi-x-lg text-lg" />
                    </button>
                </div>

                <div className="p-8">
                    <div className={`relative w-full rounded-[2.5rem] overflow-hidden bg-black border-2 border-slate-200 dark:border-slate-700 shadow-2xl ${showManualInput ? 'hidden' : 'block'}`} style={{ minHeight: '340px' }}>
                        
                        <div id={scannerId} className="absolute inset-0 w-full h-full bg-slate-950" />

                        {isInitializing && (
                            <div className="absolute inset-0 z-20 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center text-white">
                                <div className="w-16 h-16 border-[6px] border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-6" />
                                <h4 className="text-xs font-black uppercase tracking-widest mb-2">Sincronizando Sensor</h4>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em] leading-relaxed">
                                    Aguarde a liberação do Hardware...
                                </p>
                            </div>
                        )}

                        {error && (
                            <div className="absolute inset-0 z-30 bg-slate-900 flex flex-col items-center justify-center p-8 text-center overflow-y-auto">
                                <div className="p-6 bg-black/60 rounded-[2rem] border border-rose-500/30 mb-8 w-full">
                                    <i className="bi bi-shield-lock-fill text-rose-500 text-3xl mb-4" />
                                    <p className="text-[12px] font-bold text-rose-100 select-all leading-relaxed uppercase tracking-wide">
                                        {error}
                                    </p>
                                </div>
                                <div className="flex flex-col w-full gap-3">
                                    <button onClick={() => startScanner()} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all">
                                        REPETIR TENTATIVA
                                    </button>
                                    <button 
                                        onClick={() => setShowManualInput(true)} 
                                        className="w-full py-5 bg-slate-800 text-slate-300 rounded-2xl font-black uppercase tracking-widest text-[9px] border border-slate-700 active:scale-95 transition-all"
                                    >
                                        ENTRADA POR CÓDIGO (MANUAL)
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
                                CONFIRMAR
                            </button>
                        </div>
                    )}

                    <div className="mt-10 pt-8 border-t border-slate-50 dark:border-slate-800">
                        <button 
                            onClick={() => setShowManualInput(!showManualInput)}
                            className="w-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-500 transition-colors flex items-center justify-center gap-3"
                        >
                            <i className={`bi ${showManualInput ? 'bi-camera-fill' : 'bi-keyboard-fill'} text-lg`} />
                            {showManualInput ? 'SCANNER DE CÂMERA' : 'USAR ENTRADA MANUAL'}
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
