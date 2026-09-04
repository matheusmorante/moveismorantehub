import React, { useEffect, useRef, useState } from 'react';
import { compressImageToFile } from '@/pages/utils/imageUtils';
import { toast } from 'react-toastify';

type Selection = { x: number; y: number; size: number };
type Corner = 'nw' | 'ne' | 'sw' | 'se';
type Drag = { mode: 'move'; x: number; y: number; selection: Selection } | { mode: 'resize'; x: number; corner: Corner; selection: Selection };

interface SquareImageCropperProps {
    imageUrl: string;
    onCancel: () => void;
    onConfirm: (file: File) => void;
}

export function SquareImageCropper({ imageUrl, onCancel, onConfirm }: SquareImageCropperProps) {
    const [selection, setSelection] = useState<Selection | null>(null);
    const [imageSrc, setImageSrc] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [loadError, setLoadError] = useState<boolean>(false);
    const [isApplying, setIsApplying] = useState<boolean>(false);

    const [paddingPercent, setPaddingPercent] = useState<number>(0);

    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<Drag | null>(null);

    useEffect(() => {
        setSelection(null);
        setLoadError(false);
        setLoading(true);

        let active = true;
        let objectUrl = '';

        async function prepareImage() {
            if (!imageUrl) {
                setLoading(false);
                setLoadError(true);
                return;
            }

            // Se já for data URL ou blob URL local, usa diretamente
            if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
                setImageSrc(imageUrl);
                setLoading(false);
                return;
            }

            const urlsToTry: string[] = [];

            // 1. Se for URL do R2 (.r2.dev), tenta via proxy Vite local (/r2-proxy)
            if (imageUrl.includes('.r2.dev')) {
                try {
                    const pathname = new URL(imageUrl).pathname;
                    urlsToTry.push(`/r2-proxy${pathname}`);
                } catch {
                    const idx = imageUrl.indexOf('.r2.dev');
                    if (idx !== -1) {
                        urlsToTry.push(`/r2-proxy${imageUrl.substring(idx + 7)}`);
                    }
                }
            }

            // 2. Tenta fetch direto
            urlsToTry.push(imageUrl);

            // 3. Fallbacks de proxies públicos com CORS liberado
            urlsToTry.push(`https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}`);
            urlsToTry.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`);

            for (const url of urlsToTry) {
                try {
                    const res = await fetch(url);
                    if (res.ok) {
                        const blob = await res.blob();
                        if (!active) return;
                        objectUrl = URL.createObjectURL(blob);
                        setImageSrc(objectUrl);
                        setLoading(false);
                        return;
                    }
                } catch {
                    // Tenta a próxima URL da lista
                }
            }

            // Fallback final: se tudo falhar, atribui a URL direta
            if (!active) return;
            setImageSrc(imageUrl);
            setLoading(false);
        }

        prepareImage();

        return () => {
            active = false;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [imageUrl]);

    const initializeSelection = () => {
        const container = containerRef.current;
        if (!container || container.clientWidth === 0 || container.clientHeight === 0) return;
        const size = Math.min(container.clientWidth, container.clientHeight);
        setSelection({
            x: (container.clientWidth - size) / 2,
            y: (container.clientHeight - size) / 2,
            size
        });
    };

    // Atualiza/reajusta a seleção quando a margem de moldura muda ou na carga
    useEffect(() => {
        if (!loading && !loadError && imageSrc) {
            // Pequeno timeout para garantir renderização do container
            const timer = setTimeout(() => {
                initializeSelection();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [loading, loadError, imageSrc, paddingPercent]);

    const resize = (pointerX: number, drag: Extract<Drag, { mode: 'resize' }>, container: HTMLDivElement) => {
        const east = drag.corner.endsWith('e');
        const south = drag.corner.startsWith('s');
        const anchorX = east ? drag.selection.x : drag.selection.x + drag.selection.size;
        const anchorY = south ? drag.selection.y : drag.selection.y + drag.selection.size;
        const requested = drag.selection.size + (pointerX - drag.x) * (east ? 1 : -1);
        const maxX = east ? container.clientWidth - anchorX : anchorX;
        const maxY = south ? container.clientHeight - anchorY : anchorY;
        const size = Math.max(60, Math.min(requested, maxX, maxY));
        setSelection({ x: east ? anchorX : anchorX - size, y: south ? anchorY : anchorY - size, size });
    };

    const move = (event: React.PointerEvent<HTMLElement>) => {
        const container = containerRef.current;
        const drag = dragRef.current;
        if (!container || !drag || !selection) return;
        if (drag.mode === 'resize') return resize(event.clientX, drag, container);
        const x = Math.min(Math.max(0, drag.selection.x + event.clientX - drag.x), container.clientWidth - selection.size);
        const y = Math.min(Math.max(0, drag.selection.y + event.clientY - drag.y), container.clientHeight - selection.size);
        setSelection({ ...selection, x, y });
    };

    const finish = async () => {
        const image = imageRef.current;
        const container = containerRef.current;
        if (!image || !container || !selection) return;

        setIsApplying(true);
        try {
            // 1. Criar um canvas temporário do palco quadrado 1080x1080 com o padding configurado
            const stageCanvas = document.createElement('canvas');
            stageCanvas.width = 1080;
            stageCanvas.height = 1080;
            const stageCtx = stageCanvas.getContext('2d');
            if (!stageCtx) throw new Error('Não foi possível obter contexto 2D');

            // Fundo branco da moldura
            stageCtx.fillStyle = '#FFFFFF';
            stageCtx.fillRect(0, 0, 1080, 1080);

            const naturalW = image.naturalWidth || image.clientWidth;
            const naturalH = image.naturalHeight || image.clientHeight;

            // Desenhar a foto centralizada mantendo proporção dentro do padding da moldura
            const innerAvailable = 1080 * (1 - (paddingPercent * 2) / 100);
            const scale = Math.min(innerAvailable / naturalW, innerAvailable / naturalH);
            const drawW = naturalW * scale;
            const drawH = naturalH * scale;
            const drawX = (1080 - drawW) / 2;
            const drawY = (1080 - drawH) / 2;

            stageCtx.drawImage(image, drawX, drawY, drawW, drawH);

            // 2. Extrair a área recortada da seleção proporcional sobre o palco 1080x1080
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = 1080;
            finalCanvas.height = 1080;
            const finalCtx = finalCanvas.getContext('2d');
            if (!finalCtx) throw new Error('Não foi possível obter contexto final 2D');

            finalCtx.fillStyle = '#FFFFFF';
            finalCtx.fillRect(0, 0, 1080, 1080);

            const scaleSelectionX = 1080 / container.clientWidth;
            const scaleSelectionY = 1080 / container.clientHeight;

            finalCtx.drawImage(
                stageCanvas,
                selection.x * scaleSelectionX,
                selection.y * scaleSelectionY,
                selection.size * scaleSelectionX,
                selection.size * scaleSelectionY,
                0,
                0,
                1080,
                1080
            );

            const blob = await new Promise<Blob | null>(resolve => finalCanvas.toBlob(resolve, 'image/png', 1));
            if (blob) {
                const file = new File([blob], `produto-quadrado-${Date.now()}.png`, { type: 'image/png' });
                const compressed = await compressImageToFile(file, { maxMB: 0.3, maxWidth: 1080 });
                onConfirm(compressed);
            }
        } catch (err: any) {
            console.error("Erro ao aplicar recorte/moldura:", err);
            toast.error("Erro ao processar imagem. Tente novamente.");
        } finally {
            setIsApplying(false);
        }
    };

    const startResize = (event: React.PointerEvent<HTMLSpanElement>, corner: Corner) => {
        if (!selection) return;
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { mode: 'resize', x: event.clientX, corner, selection };
    };

    const resetToFull = () => {
        const container = containerRef.current;
        if (!container) return;
        const size = Math.min(container.clientWidth, container.clientHeight);
        setSelection({
            x: (container.clientWidth - size) / 2,
            y: (container.clientHeight - size) / 2,
            size
        });
    };

    return (
        <div className="fixed inset-0 z-[100005] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <i className="bi bi-crop text-blue-600" />
                            Recortar e Ajustar Foto do Produto (1:1)
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            Arraste/redimensione o quadrado de recorte ou adicione moldura branca em volta
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        aria-label="Fechar"
                    >
                        <i className="bi bi-x-lg" />
                    </button>
                </div>

                {/* Barra de Controles Simultâneos */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 dark:bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                    {/* Controle de Moldura Branca */}
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap">
                            <i className="bi bi-bounding-box text-blue-600" />
                            Moldura Branca: <span className="text-blue-600 font-black min-w-[32px]">{paddingPercent}%</span>
                        </span>
                        <input
                            type="range"
                            min="0"
                            max="35"
                            step="5"
                            value={paddingPercent}
                            onChange={(e) => setPaddingPercent(Number(e.target.value))}
                            className="w-28 h-1.5 accent-blue-600 cursor-pointer"
                        />
                        {paddingPercent > 0 && (
                            <button
                                type="button"
                                onClick={() => setPaddingPercent(0)}
                                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline cursor-pointer"
                            >
                                Zerar
                            </button>
                        )}
                    </div>

                    {/* Botões Rápidos de Ação */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={resetToFull}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
                        >
                            <i className="bi bi-arrows-fullscreen text-blue-600 text-[11px]" />
                            Enquadrar Total
                        </button>
                    </div>
                </div>

                {/* Viewport Quadrado 1:1 com Imagem e Recorte Simultâneos */}
                <div className="relative h-[400px] max-h-[50vh] flex items-center justify-center overflow-hidden rounded-2xl bg-slate-950 p-3">
                    {loading && (
                        <div className="flex flex-col items-center gap-2 text-white/70">
                            <i className="bi bi-arrow-clockwise animate-spin text-3xl text-blue-500" />
                            <span className="text-xs font-bold uppercase tracking-wider">Carregando foto...</span>
                        </div>
                    )}

                    {loadError && !loading && (
                        <div className="flex flex-col items-center gap-2 text-red-400 p-6 text-center">
                            <i className="bi bi-exclamation-triangle text-3xl" />
                            <span className="text-xs font-bold">Não foi possível carregar esta foto para recorte.</span>
                        </div>
                    )}

                    {!loading && !loadError && (
                        /* Container Quadrado 1:1 */
                        <div
                            ref={containerRef}
                            className="relative aspect-square h-full max-h-full bg-white rounded-none shadow-2xl flex items-center justify-center overflow-hidden select-none"
                            style={{
                                padding: `${paddingPercent}%`
                            }}
                        >
                            {/* Imagem Proporcional com Moldura Branca */}
                            <img
                                ref={imageRef}
                                src={imageSrc}
                                alt="Imagem para recorte"
                                draggable={false}
                                onLoad={initializeSelection}
                                onError={() => setLoadError(true)}
                                className="w-full h-full object-contain pointer-events-none transition-all duration-150"
                            />

                            {/* Caixa de Recorte 1:1 Sobreposta */}
                            {selection && (
                                <div
                                    className="absolute cursor-move touch-none border-2 border-white shadow-[0_0_0_9999px_rgba(2,6,23,0.75)]"
                                    style={{
                                        left: selection.x,
                                        top: selection.y,
                                        width: selection.size,
                                        height: selection.size
                                    }}
                                    onPointerDown={event => {
                                        event.currentTarget.setPointerCapture(event.pointerId);
                                        dragRef.current = { mode: 'move', x: event.clientX, y: event.clientY, selection };
                                    }}
                                    onPointerMove={move}
                                    onPointerUp={() => { dragRef.current = null; }}
                                    onPointerCancel={() => { dragRef.current = null; }}
                                >
                                    <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-black text-slate-700 shadow-md flex items-center gap-1.5 whitespace-nowrap">
                                        <i className="bi bi-arrows-move text-blue-600" />
                                        Mova ou redimensione
                                    </span>

                                    {(['nw', 'ne', 'sw', 'se'] as Corner[]).map(corner => (
                                        <span
                                            key={corner}
                                            onPointerDown={event => startResize(event, corner)}
                                            onPointerMove={move}
                                            onPointerUp={() => { dragRef.current = null; }}
                                            style={{ cursor: `${corner}-resize` }}
                                            className={`absolute h-4 w-4 touch-none rounded-full border-2 border-blue-600 bg-white shadow-md ${
                                                corner.includes('n') ? '-top-2' : '-bottom-2'
                                            } ${corner.includes('w') ? '-left-2' : '-right-2'}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-1">
                    <div className="text-[11px] text-slate-400 font-medium">
                        Saída: 1080 × 1080 px com qualidade otimizada.
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isApplying}
                            className="rounded-xl px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={finish}
                            disabled={!selection || isApplying || loading || loadError}
                            className="rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                        >
                            {isApplying ? (
                                <>
                                    <i className="bi bi-arrow-clockwise animate-spin text-sm" />
                                    Processando...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-check-lg text-sm" />
                                    Concluir e Salvar
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SquareImageCropper;
