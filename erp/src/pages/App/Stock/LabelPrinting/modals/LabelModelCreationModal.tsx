import React, { useState, useRef, useCallback, useEffect } from 'react';

export interface LabelModelCreationModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly onApply: (imageDataUrl: string, scale: number) => void;
}

export interface CropArea {
    x: number;
    y: number;
    w: number;
    h: number;
}

const MIN_CROP = 20;

export const LabelModelCreationModal: React.FC<LabelModelCreationModalProps> = ({ isOpen, onClose, onApply }) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [scale, setScale] = useState<number>(1);
    const [scaleInput, setScaleInput] = useState<number>(100);
    const [crop, setCrop] = useState<CropArea>({ x: 20, y: 20, w: 200, h: 200 });
    const [dragging, setDragging] = useState<'move' | 'resize' | null>(null);
    const [dragStart, setDragStart] = useState<{ mx: number; my: number; crop: CropArea } | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [imgNaturalSize, setImgNaturalSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!isOpen) {
            setImageSrc(null);
            setPreviewUrl(null);
            setScale(1);
            setScaleInput(100);
            setCrop({ x: 20, y: 20, w: 200, h: 200 });
        }
    }, [isOpen]);

    // Sync scale slider and number input
    const handleScaleSlider = (val: number) => {
        setScale(val);
        setScaleInput(Math.round(val * 100));
    };
    const handleScaleInput = (val: number) => {
        const clamped = Math.max(10, Math.min(500, val));
        setScale(clamped / 100);
        setScaleInput(clamped);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const src = ev.target?.result as string;
            setImageSrc(src);
            setPreviewUrl(null);
        };
        reader.readAsDataURL(file);
    };

    // Crop dragging logic
    const onMouseDownMove = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging('move');
        setDragStart({ mx: e.clientX, my: e.clientY, crop: { ...crop } });
    };

    const onMouseDownResize = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging('resize');
        setDragStart({ mx: e.clientX, my: e.clientY, crop: { ...crop } });
    };

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!dragging || !dragStart || !containerRef.current) return;
        const dx = e.clientX - dragStart.mx;
        const dy = e.clientY - dragStart.my;
        const bounds = containerRef.current.getBoundingClientRect();

        if (dragging === 'move') {
            const newX = Math.max(0, Math.min(bounds.width - dragStart.crop.w, dragStart.crop.x + dx));
            const newY = Math.max(0, Math.min(bounds.height - dragStart.crop.h, dragStart.crop.y + dy));
            setCrop(prev => ({ ...prev, x: newX, y: newY }));
        } else if (dragging === 'resize') {
            const newW = Math.max(MIN_CROP, Math.min(bounds.width - dragStart.crop.x, dragStart.crop.w + dx));
            const newH = Math.max(MIN_CROP, Math.min(bounds.height - dragStart.crop.y, dragStart.crop.h + dy));
            setCrop(prev => ({ ...prev, w: newW, h: newH }));
        }
    }, [dragging, dragStart]);

    const onMouseUp = useCallback(() => {
        setDragging(null);
        setDragStart(null);
    }, []);

    // Generate cropped image on canvas
    const generateCroppedImage = useCallback(() => {
        if (!imageSrc || !imgRef.current || !canvasRef.current || !containerRef.current) return;
        const img = imgRef.current;
        const container = containerRef.current;
        const canvas = canvasRef.current;

        const renderedW = img.clientWidth;
        const renderedH = img.clientHeight;
        const naturalW = imgNaturalSize.w || img.naturalWidth || renderedW;
        const naturalH = imgNaturalSize.h || img.naturalHeight || renderedH;

        const offsetLeft = (container.clientWidth - renderedW) / 2;
        const offsetTop = (container.clientHeight - renderedH) / 2;

        const cropInImgX = Math.max(0, crop.x - offsetLeft);
        const cropInImgY = Math.max(0, crop.y - offsetTop);
        const cropInImgW = Math.min(renderedW - cropInImgX, crop.w);
        const cropInImgH = Math.min(renderedH - cropInImgY, crop.h);

        const scaleX = naturalW / renderedW;
        const scaleY = naturalH / renderedH;

        const sx = cropInImgX * scaleX;
        const sy = cropInImgY * scaleY;
        const sw = cropInImgW * scaleX;
        const sh = cropInImgH * scaleY;

        canvas.width = Math.max(1, Math.round(sw));
        canvas.height = Math.max(1, Math.round(sh));

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const nativeImg = new Image();
        nativeImg.crossOrigin = 'anonymous';
        nativeImg.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(nativeImg, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/png');
            setPreviewUrl(dataUrl);
        };
        nativeImg.src = imageSrc;
    }, [imageSrc, crop, imgNaturalSize]);

    const handleApply = () => {
        if (!previewUrl && imageSrc) {
            generateCroppedImage();
            setTimeout(() => {
                if (canvasRef.current) {
                    const dataUrl = canvasRef.current.toDataURL('image/png');
                    onApply(dataUrl, scale);
                    onClose();
                }
            }, 100);
        } else if (previewUrl) {
            onApply(previewUrl, scale);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="label-model-creation-title"
            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
            className="fixed inset-0 z-[400] flex items-center justify-center p-4"
        >
            <button 
                type="button"
                className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm border-0 cursor-default" 
                onClick={onClose} 
                aria-label="Fechar criador de modelo de etiqueta"
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[92vh] rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div>
                        <h3 id="label-model-creation-title" className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                            <i className="bi bi-stars mr-2 text-blue-500" />
                            Criar Modelo de Etiqueta
                        </h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Upload · Recorte · Escala</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Fechar" className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                        <i className="bi bi-x-lg text-lg" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6">

                    {/* Upload Zone */}
                    {!imageSrc ? (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 transition-colors cursor-pointer group"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                <i className="bi bi-cloud-arrow-up" />
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">Clique para carregar a arte / modelo</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">PNG, JPG ou WEBP de alta resolução</p>
                            </div>
                        </button>
                    ) : (
                        <div className="space-y-4">
                            {/* Toolbar above crop */}
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Área de Recorte</span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setImageSrc(null); setPreviewUrl(null); }}
                                        className="text-[9px] font-black uppercase text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                                    >
                                        <i className="bi bi-arrow-left" /> Trocar imagem
                                    </button>
                                    <button
                                        type="button"
                                        onClick={generateCroppedImage}
                                        className="text-[9px] font-black uppercase text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                                    >
                                        <i className="bi bi-crop" /> Pré-visualizar Recorte
                                    </button>
                                </div>
                            </div>

                            {/* Image with crop overlay */}
                            <div
                                ref={containerRef}
                                className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 select-none cursor-crosshair"
                                style={{ maxHeight: '320px' }}
                                onMouseMove={onMouseMove}
                                onMouseUp={onMouseUp}
                                onMouseLeave={onMouseUp}
                            >
                                <img
                                    ref={imgRef}
                                    src={imageSrc}
                                    alt="Para recorte"
                                    className="w-full h-full object-contain max-h-[320px]"
                                    onLoad={e => {
                                        const img = e.target as HTMLImageElement;
                                        setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                                    }}
                                    draggable={false}
                                />

                                {/* Dark overlay outside crop */}
                                <div className="absolute inset-0 pointer-events-none" style={{
                                    background: `rgba(0,0,0,0.5)`,
                                    WebkitMaskImage: `polygon(0% 0%, 0% 100%, ${crop.x}px 100%, ${crop.x}px ${crop.y}px, ${crop.x + crop.w}px ${crop.y}px, ${crop.x + crop.w}px ${crop.y + crop.h}px, ${crop.x}px ${crop.y + crop.h}px, ${crop.x}px 100%, 100% 100%, 100% 0%)`,
                                }} />

                                {/* Crop box */}
                                <div
                                    className="absolute border-2 border-blue-400 shadow-[0_0_0_1px_rgba(59,130,246,0.3)]"
                                    style={{
                                        left: crop.x, top: crop.y,
                                        width: crop.w, height: crop.h,
                                        cursor: 'move',
                                    }}
                                    onMouseDown={onMouseDownMove}
                                >
                                    {/* Corner handles */}
                                    <div
                                        className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-500 border border-white rounded-full cursor-se-resize"
                                        onMouseDown={onMouseDownResize}
                                    />
                                    {/* Center badge */}
                                    <span className="absolute top-1 left-1 bg-blue-600/80 text-white text-[8px] font-mono px-1 rounded pointer-events-none">
                                        {Math.round(crop.w)}x{Math.round(crop.h)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    {/* Scale Controls */}
                    {imageSrc && (
                        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Escala da Etiqueta</span>
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number"
                                        min={10}
                                        max={500}
                                        value={scaleInput}
                                        onChange={e => handleScaleInput(Number(e.target.value))}
                                        className="w-14 text-right text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5"
                                    />
                                    <span className="text-xs font-mono text-slate-400">%</span>
                                </div>
                            </div>
                            <input
                                type="range"
                                min={0.1}
                                max={3}
                                step={0.05}
                                value={scale}
                                onChange={e => handleScaleSlider(Number(e.target.value))}
                                className="w-full accent-blue-600 cursor-pointer"
                            />
                        </div>
                    )}

                    {/* Preview Box */}
                    {previewUrl && (
                        <div className="flex items-center gap-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-emerald-200 shrink-0 flex items-center justify-center p-1">
                                <img src={previewUrl} alt="Preview do recorte" className="max-w-full max-h-full object-contain" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Recorte Pronto!</p>
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">Clique em Aplicar para carregar na grade de impressão.</p>
                            </div>
                        </div>
                    )}

                    {/* Hidden canvas for export */}
                    <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Footer */}
                <div className="px-8 py-5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleApply}
                        disabled={!imageSrc}
                        className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <i className="bi bi-check-lg" />
                        Aplicar ao Grid
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LabelModelCreationModal;
