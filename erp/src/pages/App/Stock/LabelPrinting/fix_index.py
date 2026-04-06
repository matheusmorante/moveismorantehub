
import os

file_path = r'c:\Users\mathe\OneDrive\Área de Trabalho\projetos\moveismorantehub\erp\src\pages\App\Stock\LabelPrinting\Index.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = 'labelItems.map((item, idx) => ('
end_marker = '))'
# We want the LAST end marker before ')}' at line 1614 approx.
# Actually, let's find the 'labelItems.map' and then find the corresponding ')}' or similar.

# Let's use a simpler approach: replace from 1398 to 1613.
content_lines = content.split('\n')
# Indexes are 0-based, so line 1398 is index 1397.
# Line 1613 is index 1612.

new_block = """                                                 labelItems.map((item, idx) => (
                                                     <div key={idx} className="p-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300 hover:shadow-md transition-all group">
                                                         {/* Linha Principal (Ribbon) */}
                                                         <div className="flex items-center gap-3">
                                                             {/* Miniatura Troca Rápida */}
                                                             <div className="relative w-11 h-11 shrink-0 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center overflow-hidden p-1 group/thumb">
                                                                 <img 
                                                                     src={item.image || labelMdf} 
                                                                     style={{ transform: `scale(${item.scale || 1})`, objectFit: item.imageFit || 'contain' }} 
                                                                     className="max-w-[85%] max-h-[85%] transition-transform" alt="" 
                                                                 />
                                                                 <label className="absolute inset-0 bg-blue-600/70 text-white opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center cursor-pointer transition-all">
                                                                     <i className="bi bi-pencil-square text-[10px]" />
                                                                     <input 
                                                                         type="file" accept="image/*" className="hidden" 
                                                                         onChange={(e) => {
                                                                             const file = e.target.files?.[0];
                                                                             if (file) {
                                                                                 const reader = new FileReader();
                                                                                 reader.onload = (event) => {
                                                                                     const newItems = [...labelItems];
                                                                                     newItems[idx].image = event.target?.result as string;
                                                                                     setLabelItems(newItems);
                                                                                 };
                                                                                 reader.readAsDataURL(file);
                                                                             }
                                                                         }} 
                                                                     />
                                                                 </label>
                                                             </div>

                                                             <div className="flex-1 flex items-center gap-4 min-w-0">
                                                                 <div className="flex-1">
                                                                     <p className="text-[9px] font-black uppercase text-blue-500 leading-none truncate">Design #{idx + 1}</p>
                                                                     <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">Etiqueta Carregada</p>
                                                                 </div>

                                                                 {/* Inputs Avançados */}
                                                                 {printingMode === 'advanced' && (
                                                                     <div className="flex items-center gap-1.5 shrink-0">
                                                                         <input type="text" value={item.price} onChange={e => { const newItems = [...labelItems]; newItems[idx].price = e.target.value; setLabelItems(newItems); }} className="w-14 bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 border-none rounded-lg px-2 py-1 text-[8px] font-black text-center outline-none" placeholder="Preço" />
                                                                         <input type="text" value={item.promoPrice || ''} onChange={e => { const newItems = [...labelItems]; newItems[idx].promoPrice = e.target.value; setLabelItems(newItems); }} className="w-14 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-600 border-none rounded-lg px-2 py-1 text-[8px] font-black text-center outline-none" placeholder="Promo" />
                                                                         <input type="text" value={item.sku} onChange={e => { const newItems = [...labelItems]; newItems[idx].sku = e.target.value; setLabelItems(newItems); }} className="w-14 bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1 text-[8px] font-black text-center outline-none" placeholder="SKU" />
                                                                     </div>
                                                                 )}
                                                                 
                                                                 {/* Zoom */}
                                                                 <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-100 dark:border-slate-800 shrink-0">
                                                                     <span className="text-[8px] font-black text-slate-400 uppercase">Zoom</span>
                                                                     <input 
                                                                         type="range" min="0.4" max="2.0" step="0.01" value={item.scale || 1}
                                                                         onChange={e => { const newItems = [...labelItems]; newItems[idx].scale = parseFloat(e.target.value); setLabelItems(newItems); }}
                                                                         className="w-12 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                                     />
                                                                     <span className="text-[9px] font-black text-blue-600 min-w-[25px] text-right">{Math.round((item.scale || 1) * 100)}%</span>
                                                                 </div>

                                                                 {/* Quantidade */}
                                                                 <div className="flex items-center gap-2 shrink-0">
                                                                     <span className="text-[8px] font-black text-slate-400 uppercase">Qtd</span>
                                                                     <input 
                                                                         type="number" min="1" value={item.quantity}
                                                                         onChange={e => { const newItems = [...labelItems]; newItems[idx].quantity = Math.max(1, parseInt(e.target.value) || 1); setLabelItems(newItems); }}
                                                                         className="w-10 bg-slate-900 text-white rounded-lg px-2 py-1 text-[9px] font-black text-center outline-none"
                                                                     />
                                                                 </div>
                                                             </div>

                                                             {/* Excluir */}
                                                             <button 
                                                                 onClick={() => setLabelItems(prev => prev.filter((_, i) => i !== idx))}
                                                                 className="w-8 h-8 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0"
                                                             >
                                                                 <i className="bi bi-trash3 text-xs" />
                                                             </button>
                                                         </div>

                                                         {/* Linha Enquadramento (X-Small) - Apenas Modo Simples */}
                                                         {printingMode === 'simple' && (
                                                             <div className="flex items-center gap-4 pl-[56px] pb-0.5">
                                                                 <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/30 p-0.5 rounded-lg border border-slate-100/50 dark:border-slate-800">
                                                                     {[
                                                                         { id: 'contain', label: 'Inteira' },
                                                                         { id: 'cover', label: 'Preencher' },
                                                                         { id: 'fill', label: 'Esticar' }
                                                                     ].map(mode => (
                                                                         <button
                                                                             key={mode.id}
                                                                             onClick={() => { const newItems = [...labelItems]; newItems[idx].imageFit = mode.id as any; setLabelItems(newItems); }}
                                                                             className={`px-3 py-0.5 text-[7px] font-black uppercase rounded-md transition-all ${item.imageFit === mode.id || (!item.imageFit && mode.id === 'contain') ? 'bg-white text-blue-600 shadow-sm shadow-blue-500/10' : 'text-slate-400 hover:text-slate-500'}`}
                                                                         >
                                                                             {mode.label}
                                                                         </button>
                                                                     ))}
                                                                 </div>
                                                             </div>
                                                         )}
                                                     </div>
                                                 ))"""

# Replace the lines from index 1397 to 1612 inclusive.
# content_lines is a list of lines. 1398 is index 1397.
# We need to replace items from 1397 to 1612.
content_lines[1397:1613] = [new_block]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(content_lines))

print("SUCCESS: Index.tsx fixed.")
