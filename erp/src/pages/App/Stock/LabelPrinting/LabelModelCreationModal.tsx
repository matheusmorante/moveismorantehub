import React, { useState, useRef, useCallback, useEffect } from 'react';

interface LabelModelCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (imageDataUrl: string, scale: number) => void;
}

interface CropArea {
    x: number;
    y: number;
    w: number;
    h: number;
}

const MIN_CROP = 20;

const LabelModelCreationModal: React.FC<LabelModelCreationModalProps> = ({ isOpen, onClose, onApply }) => {
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
            // Reset crop to center when image changes
            setCrop({ x: 20, y: 20, w: 200, h: 200 });
        };
        reader.readAsDataURL(file);
    };

    const getContainerRect = () => containerRef.current?.getBoundingClientRect();
    const getImgRect = () => imgRef.current?.getBoundingClientRect();

    const clampCrop = (c: CropArea, imgW: number, imgH: number): CropArea => ({
        x: Math.max(0, Math.min(c.x, imgW - MIN_CROP)),
        y: Math.max(0, Math.min(c.y, imgH - MIN_CROP)),
        w: Math.max(MIN_CROP, Math.min(c.w, imgW - c.x)),
        h: Math.max(MIN_CROP, Math.min(c.h, imgH - c.y)),
    });

    const onMouseDown = useCallback((e: React.MouseEvent, mode: 'move' | 'resize') => {
        e.preventDefault();
        setDragging(mode);
        setDragStart({ mx: e.clientX, my: e.clientY, crop: { ...crop } });
    }, [crop]);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!dragging || !dragStart) return;
        const imgRect = getImgRect();
        if (!imgRect) return;
        const dx = e.clientX - dragStart.mx;
        const dy = e.clientY - dragStart.my;
        const imgW = imgRect.width;
        const imgH = imgRect.height;

        if (dragging === 'move') {
            const newCrop = clampCrop({
                ...dragStart.crop,
                x: dragStart.crop.x + dx,
                y: dragStart.crop.y + dy,
            }, imgW, imgH);
            setCrop(newCrop);
        } else if (dragging === 'resize') {
            const newW = Math.max(MIN_CROP, dragStart.crop.w + dx);
            const newH = Math.max(MIN_CROP, dragStart.crop.h + dy);
            const newCrop = clampCrop({
                ...dragStart.crop,
                w: newW,
                h: newH,
            }, imgW, imgH);
            setCrop(newCrop);
        }
    }, [dragging, dragStart]);

    const onMouseUp = useCallback(() => {
        setDragging(null);
        setDragStart(null);
    }, []);

    const generateCroppedImage = useCallback(() => {
        if (!imageSrc || !imgRef.current || !canvasRef.current) return;
        const img = imgRef.current;
        const imgRect = img.getBoundingClientRect();
        const scaleX = img.naturalWidth / imgRect.width;
        const scaleY = img.naturalHeight / imgRect.height;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const cropW = crop.w * scaleX;
        const cropH = crop.h * scaleY;
        canvas.width = cropW;
        canvas.height = cropH;

        const htmlImg = new Image();
        htmlImg.onload = () => {
            ctx.drawImage(htmlImg, crop.x * scaleX, crop.y * scaleY, cropW, cropH, 0, 0, cropW, cropH);
            const dataUrl = canvas.toDataURL('image/png');
            setPreviewUrl(dataUrl);
        };
        htmlImg.src = imageSrc;
    }, [imageSrc, crop]);

    const handleApply = () => {
        if (!previewUrl) {
            generateCroppedImage();
            // Give time to render
            setTimeout(() => {
                if (canvasRef.current) {
                    const dataUrl = canvasRef.current.toDataURL('image/png');
                    onApply(dataUrl, scale);
                    onClose();
                }
            }, 100);
        } else {
            onApply(previewUrl, scale);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[92vh] rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                            <i className="bi bi-stars mr-2 text-blue-500" />
                            Criar Modelo de Etiqueta
                        </h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Upload · Recorte · Escala</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                        <i className="bi bi-x-lg text-lg" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6">

                    {/* Upload Zone */}
                    {!imageSrc ? (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] p-16 flex flex-col items-center gap-4 hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group cursor-pointer"
                        >
                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <i className="bi bi-image text-3xl text-blue-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-base font-black text-slate-700 dark:text-slate-200">Selecionar Imagem</p>
                                <p className="text-xs text-slate-400 mt-1">PNG, JPG, SVG, WebP</p>
                            </div>
                        </button>
                    ) : (
                        <>
                            {/* Crop Area */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Área de Recorte</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setImageSrc(null); setPreviewUrl(null); }}
                                            className="text-[9px] font-black uppercase text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                                        >
                                            <i className="bi bi-arrow-left" /> Trocar imagem
                                        </button>
                                        <button
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
                                            cursor: dragging === 'move' ? 'grabbing' : 'grab',
                                        }}
                                        onMouseDown={e => onMouseDown(e, 'move')}
                                    >
                                        {/* Grid lines */}
                                        <div className="absolute inset-0 pointer-events-none" style={{
                                            backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)',
                                            backgroundSize: '33.33% 33.33%',
                                        }} />

                                        {/* Corner handles */}
                                        {[
                                            'top-0 left-0', 'top-0 right-0',
                                            'bottom-0 left-0', 'bottom-0 right-0'
                                        ].map((pos, i) => (
                                            <div key={i} className={`absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-sm -translate-x-1 -translate-y-1 ${pos}`} />
                                        ))}

                                        {/* Resize handle BR */}
                                        <div
                                            className="absolute bottom-0 right-0 w-5 h-5 bg-blue-500 rounded-tl-lg cursor-se-resize flex items-center justify-center"
                                            onMouseDown={e => { e.stopPropagation(); onMouseDown(e, 'resize'); }}
                                        >
                                            <i className="bi bi-arrows-angle-expand text-white text-[8px]" />
                                        </div>
                                    </div>
                                </div>

                                <p className="text-[9px] text-slate-400 text-center">
                                    Arraste o quadro para mover · arraste o canto azul para redimensionar
                                </p>
                            </div>

                            {/* Preview */}
                            {previewUrl && (
                                <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Pré-visualização do Recorte</p>
                                    <div className="flex items-center justify-center">
                                        <img
                                            src={previewUrl}
                                            alt="Preview"
                                            className="max-h-32 max-w-full object-contain rounded-xl border border-slate-200 dark:border-slate-700 shadow-md"
                                            style={{ transform: `scale(${scale})`, transformOrigin: 'center', transition: 'transform 0.2s' }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Scale */}
                            <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Escala na Etiqueta</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={10} max={500} step={1}
                                            value={scaleInput}
                                            onChange={e => handleScaleInput(parseInt(e.target.value) || 100)}
                                            className="w-16 text-center text-xs font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-400"
                                        />
                                        <span className="text-[10px] font-black text-slate-400">%</span>
                                    </div>
                                </div>
                                <input
                                    type="range" min={0.1} max={5} step={0.05}
                                    value={scale}
                                    onChange={e => handleScaleSlider(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                                <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase">
                                    <span>10%</span><span>100%</span><span>500%</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <p className="text-[9px] text-slate-400 font-medium">
                        {imageSrc ? 'Clique em Pré-visualizar antes de aplicar' : 'Selecione uma imagem para começar'}
                    </p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-3 text-slate-400 hover:text-slate-600 font-black text-xs uppercase tracking-widest transition-all">
                            Cancelar
                        </button>
                        <button
                            onClick={handleApply}
                            disabled={!imageSrc}
                            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-200/50 flex items-center gap-2"
                        >
                            <i className="bi bi-check-circle-fill" />
                            Aplicar à Etiqueta
                        </button>
                    </div>
                </div>

                {/* Hidden canvas for crop generation */}
                <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
    );
};

export default LabelModelCreationModal;
