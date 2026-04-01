import React, { useState } from 'react';
import { toast } from 'react-toastify';

export interface GridModel {
    id: string;
    name: string;
    columns: number;
    rows: number;
    marginT: number;
    marginB: number;
    marginL: number;
    marginR: number;
    gapH: number;
    gapV: number;
    paperSize: string;
    paperWidth?: number;
    paperHeight?: number;
    icon: string;
    category?: 'identificacao' | 'precos' | 'logos' | 'posts';
    type?: 'round' | 'rect';
}

interface LabelGridModelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (model: GridModel) => void;
    editingModel?: GridModel | null;
    currentCategory?: 'identificacao' | 'precos' | 'logos' | 'posts' | null;
    existingModels?: GridModel[];
}

const PAPER_OPTIONS = [
    { id: 'A4', name: 'Folha A4 (210x297mm)', w: 210, h: 297 },
    { id: 'A3', name: 'Folha A3 (297x420mm)', w: 297, h: 420 },
    { id: 'A5', name: 'Folha A5 (148x210mm)', w: 148, h: 210 },
    { id: 'Letter', name: 'Carta (216x279mm)', w: 216, h: 279 },
    { id: 'Custom', name: 'Tamanho Personalizado', w: 0, h: 0 },
];

const LabelGridModelModal: React.FC<LabelGridModelModalProps> = ({ isOpen, onClose, onSave, editingModel, currentCategory, existingModels }) => {
    const [name, setName] = useState('');
    const [paperSize, setPaperSize] = useState('A4');
    const [customWidth, setCustomWidth] = useState(210);
    const [customHeight, setCustomHeight] = useState(297);
    const [columns, setColumns] = useState(3);
    const [rows, setRows] = useState(7);
    const [marginT, setMarginT] = useState(10);
    const [marginB, setMarginB] = useState(10);
    const [marginL, setMarginL] = useState(10);
    const [marginR, setMarginR] = useState(10);
    const [gapH, setGapH] = useState(2);
    const [gapV, setGapV] = useState(2);
    const [layoutType, setLayoutType] = useState<'round' | 'rect'>('rect');

    const formatLabel = layoutType === 'round' ? 'Redonda' : 'Retangular';

    const generatedName = currentCategory === 'logos'
        ? `${columns * rows} Etiquetas (${formatLabel}) (${columns}x${rows})`
        : `${columns * rows} ${columns * rows === 1 ? 'Etiqueta' : 'Etiquetas'} (${columns}x${rows})`;

    const isDuplicate = existingModels?.some(m => 
        m.id !== editingModel?.id && 
        (m.category === currentCategory || (!m.category && currentCategory === 'identificacao')) &&
        m.columns === columns &&
        m.rows === rows &&
        m.marginT === marginT &&
        m.marginB === marginB &&
        m.marginL === marginL &&
        m.marginR === marginR &&
        m.gapH === gapH &&
        m.gapV === gapV &&
        m.paperSize === paperSize &&
        (m.type === layoutType || (!m.type && layoutType === 'rect'))
    );

    React.useEffect(() => {
        if (editingModel) {
            setPaperSize(editingModel.paperSize);
            setColumns(editingModel.columns);
            setRows(editingModel.rows);
            setMarginT(editingModel.marginT);
            setMarginB(editingModel.marginB);
            setMarginL(editingModel.marginL);
            setMarginR(editingModel.marginR);
            setGapH(editingModel.gapH);
            setGapV(editingModel.gapV);
            setLayoutType(editingModel.type || 'rect');
            if (editingModel.paperWidth) setCustomWidth(editingModel.paperWidth);
            if (editingModel.paperHeight) setCustomHeight(editingModel.paperHeight);
        } else {
            setPaperSize('A4');
            setColumns(2);
            setRows(3);
            setMarginT(10); setMarginB(10); setMarginL(10); setMarginR(10);
            setGapH(5); setGapV(5);
            setLayoutType(currentCategory === 'logos' ? 'round' : 'rect');
            setCustomWidth(210);
            setCustomHeight(297);
        }
    }, [editingModel, isOpen, currentCategory]);

    const handleSave = () => {
        const newModel: GridModel = {
            id: editingModel?.id || `custom_${Date.now()}`,
            name: generatedName,
            columns,
            rows,
            marginT,
            marginB,
            marginL,
            marginR,
            gapH,
            gapV,
            paperSize,
            paperWidth: paperSize === 'Custom' ? customWidth : undefined,
            paperHeight: paperSize === 'Custom' ? customHeight : undefined,
            icon: layoutType === 'round' ? 'bi-circle' : 'bi-grid-fill',
            category: editingModel?.category || (currentCategory as any) || 'identificacao',
            type: layoutType
        };

        onSave(newModel);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-all duration-500" onClick={onClose} />
            
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[95vh] rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-500">
                
                {/* Header */}
                <div className="px-8 md:px-12 py-8 border-b border-slate-50 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <i className="bi bi-grid-3x3-gap-fill text-2xl" />
                        </div>
                        <div>
                            <p className="text-[9px] text-slate-400 uppercase tracking-[0.4em] font-black mb-1">Título do Layout</p>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">
                                {generatedName}
                            </h3>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-14 h-14 flex items-center justify-center rounded-3xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all group">
                        <i className="bi bi-x-lg text-xl group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                {/* Main Content Body - Coluna Única Rolável */}
                <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-12 custom-scrollbar bg-white dark:bg-slate-900">
                    <div className="max-w-4xl mx-auto space-y-12">
                        
                        {/* Section: Base Info & Grid Matrix Side-by-Side */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <section className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                        <i className="bi bi-pennant-fill text-sm" />
                                    </div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Formato Base</h4>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block px-1">Tamanho da Folha</label>
                                        <div className="relative">
                                            <select 
                                                value={paperSize}
                                                onChange={e => setPaperSize(e.target.value)}
                                                className="w-full bg-slate-100/50 dark:bg-slate-800 border-none rounded-[1.5rem] px-8 py-5 text-sm font-black text-slate-800 dark:text-white shadow-inner focus:ring-4 focus:ring-blue-500/10 transition-all outline-none appearance-none"
                                            >
                                                {PAPER_OPTIONS.map(opt => (
                                                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                                                ))}
                                            </select>
                                            <i className="bi bi-chevron-down absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    {currentCategory === 'logos' && (
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block px-1">Formato da Etiqueta</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button 
                                                    onClick={() => setLayoutType('round')}
                                                    className={`flex items-center justify-center gap-3 py-4 rounded-[1.5rem] border-2 transition-all font-black text-xs uppercase ${layoutType === 'round' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                                                >
                                                    <i className="bi bi-circle" /> Redonda
                                                </button>
                                                <button 
                                                    onClick={() => setLayoutType('rect')}
                                                    className={`flex items-center justify-center gap-3 py-4 rounded-[1.5rem] border-2 transition-all font-black text-xs uppercase ${layoutType === 'rect' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                                                >
                                                    <i className="bi bi-square" /> Retangular
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {paperSize === 'Custom' && (
                                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top duration-300">
                                            <input type="number" value={customWidth} onChange={e => setCustomWidth(parseInt(e.target.value) || 0)} className="w-full bg-slate-100/50 dark:bg-slate-800 border-none rounded-2xl p-5 text-xs font-black text-center shadow-inner outline-none" placeholder="L (mm)" />
                                            <input type="number" value={customHeight} onChange={e => setCustomHeight(parseInt(e.target.value) || 0)} className="w-full bg-slate-100/50 dark:bg-slate-800 border-none rounded-2xl p-5 text-xs font-black text-center shadow-inner outline-none" placeholder="A (mm)" />
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500">
                                        <i className="bi bi-grid-3x3 text-sm" />
                                    </div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Grade & Matriz</h4>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block px-4">Colunas</label>
                                            <input type="number" value={columns} onChange={e => setColumns(parseInt(e.target.value) || 1)} className="w-full bg-blue-50/50 dark:bg-blue-900/20 border-none rounded-2xl p-4 text-xl font-black text-center text-blue-600 outline-none shadow-sm" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block px-4">Espaç. H (mm)</label>
                                            <input type="number" value={gapH} onChange={e => setGapH(parseInt(e.target.value) || 0)} className="w-full bg-slate-100/50 dark:bg-slate-800 border-none rounded-2xl p-3 text-xs font-black text-center shadow-inner outline-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block px-4">Linhas</label>
                                            <input type="number" value={rows} onChange={e => setRows(parseInt(e.target.value) || 1)} className="w-full bg-blue-50/50 dark:bg-blue-900/20 border-none rounded-2xl p-4 text-xl font-black text-center text-blue-600 outline-none shadow-sm" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block px-4">Espaç. V (mm)</label>
                                            <input type="number" value={gapV} onChange={e => setGapV(parseInt(e.target.value) || 0)} className="w-full bg-slate-100/50 dark:bg-slate-800 border-none rounded-2xl p-3 text-xs font-black text-center shadow-inner outline-none" />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="h-px bg-slate-50 dark:bg-slate-800/50" />

                        {/* Section: Margins */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500">
                                    <i className="bi bi-box-arrow-in-down-left text-sm" />
                                </div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Margens Internas</h4>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    ['T', 'Topo'], 
                                    ['B', 'Base'], 
                                    ['L', 'Esquerda'], 
                                    ['R', 'Direita']
                                ].map(([key, label]) => (
                                    <div key={key}>
                                        <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block px-4">{label} (mm)</label>
                                        <input 
                                            type="number"
                                            onChange={e => {
                                                const val = parseInt(e.target.value) || 0;
                                                if (key === 'T') setMarginT(val);
                                                if (key === 'B') setMarginB(val);
                                                if (key === 'L') setMarginL(val);
                                                if (key === 'R') setMarginR(val);
                                            }}
                                            value={key === 'T' ? marginT : key === 'B' ? marginB : key === 'L' ? marginL : marginR}
                                            className="w-full bg-emerald-50/50 dark:bg-emerald-900/20 border-none rounded-2xl p-4 text-sm font-black text-center text-emerald-600 outline-none shadow-sm"
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>

                        <div className="h-px bg-slate-50 dark:bg-slate-800/50" />

                        {/* Section: Visualização do Resultado ao final */}
                        <section className="space-y-10 py-10">
                            <div className="flex flex-col items-center">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="h-px w-24 bg-slate-100 dark:bg-slate-800" />
                                    <h4 className="text-xs font-black uppercase tracking-[0.5em] text-slate-400">Visualização do Resultado</h4>
                                    <div className="h-px w-24 bg-slate-100 dark:bg-slate-800" />
                                </div>
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Renderização Técnica em Tempo Real</p>
                            </div>

                            <div className="bg-slate-50/50 dark:bg-slate-950/30 rounded-[3rem] p-12 md:p-20 flex flex-col items-center justify-center border border-slate-100 dark:border-slate-800 shadow-inner overflow-hidden relative">
                                {/* Grid Grid Backdrop */}
                                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                                
                                <div className="perspective-[1000px] relative z-10">
                                    {(() => {
                                        const opt = PAPER_OPTIONS.find(o => o.id === paperSize);
                                        const pW = opt?.id === 'Custom' ? customWidth : (opt?.w || 210);
                                        const pH = opt?.id === 'Custom' ? customHeight : (opt?.h || 297);
                                        
                                        // Calcular escala para caber na largura do modal
                                        const containerWidth = 600; 
                                        const scale = containerWidth / Math.max(pW, 1);

                                        const paperPxW = pW * scale;
                                        const paperPxH = pH * scale;

                                        return (
                                            <div className="relative flex flex-col items-center gap-12">
                                                <div 
                                                    className="bg-white shadow-[0_60px_120px_-40px_rgba(0,0,0,0.15)] dark:shadow-[0_60px_120px_-40px_rgba(0,0,0,0.6)] relative border border-slate-100 ring-4 ring-white/50"
                                                    style={{ width: paperPxW, height: paperPxH }}
                                                >
                                                    <div 
                                                        className="absolute inset-0 pointer-events-none"
                                                        style={{
                                                            top: marginT * scale,
                                                            bottom: marginB * scale,
                                                            left: marginL * scale,
                                                            right: marginR * scale,
                                                            display: 'grid',
                                                            gridTemplateColumns: `repeat(${columns}, 1fr)`,
                                                            gridTemplateRows: `repeat(${rows}, 1fr)`,
                                                            columnGap: gapH * scale,
                                                            rowGap: gapV * scale,
                                                        }}
                                                    >
                                                        {Array.from({ length: Math.min(columns * rows, 100) }).map((_, i) => (
                                                            <div key={i} className="border border-indigo-500/10 bg-indigo-500/5 rounded-[2px]" />
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex gap-4">
                                                    <div className="px-6 py-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3">
                                                        <i className="bi bi-aspect-ratio text-slate-400" />
                                                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">{pW} × {pH} mm</span>
                                                    </div>
                                                    <div className="px-6 py-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3">
                                                        <i className="bi bi-grid-fill text-indigo-500" />
                                                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">{columns} col × {rows} lin</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-12 py-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div className="hidden md:flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                            <i className="bi bi-check-circle-fill" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-tight">Layout pronto para<br/>aplicação técnica</span>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button onClick={onClose} className="flex-1 md:flex-none px-12 py-5 text-slate-500 font-extrabold text-[11px] uppercase tracking-widest hover:text-red-500 transition-colors">
                            Abandonar
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={!name}
                            className="flex-1 md:flex-none px-20 py-5 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 disabled:opacity-50 text-white rounded-[1.8rem] font-black text-[11px] uppercase tracking-[0.1em] shadow-[0_20px_40px_-10px_rgba(79,70,229,0.4)] hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-4"
                        >
                            <i className="bi bi-save-fill text-sm" />
                            {editingModel ? 'Aplicar Alterações' : 'Salvar Modelo'}
                        </button>
                    </div>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #f1f5f9;
                    border-radius: 20px;
                    border: 3px solid transparent;
                    background-clip: content-box;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1e293b;
                }
            ` }} />
        </div>
    );
};

export default LabelGridModelModal;
