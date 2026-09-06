import React, { useEffect, useState } from 'react';
import { uploadFile } from '@/pages/utils/storageService';
import { Layer, DynamicTextLayer } from '../../types';
import { ElementModel, loadElementModels, saveElementModel, applyElementModel } from '../../services/elementModels';

interface Props { layers: Layer[]; selected: string | null; opportunityId?: string; opportunityName?: string; onChange: (layer: Layer) => void; onMessage: (message: string) => void }
export function ElementModelsPanel({ layers, selected, opportunityId, opportunityName, onChange, onMessage }: Props) {
  const [models, setModels] = useState<ElementModel[]>([]), [busy, setBusy] = useState(false);
  const layer = layers.find(l => l.id === selected);
  useEffect(() => { loadElementModels().then(setModels).catch(e => onMessage(e.message)); }, []);
  async function save() {
    if (!layer?.role) return;
    const name = window.prompt('Nome do modelo deste elemento:'); if (!name?.trim()) return;
    setBusy(true);
    try { const saved = await saveElementModel(name.trim(), { ...layer, opportunityId: layer.role === 'badge' ? opportunityId : undefined });
      setModels(await loadElementModels()); onMessage(saved.persistedRemotely ? 'Modelo salvo na biblioteca.' : 'Modelo salvo neste navegador. Sincronização indisponível.');
    } catch (e) { onMessage((e as Error).message); } finally { setBusy(false); }
  }
  async function upload(file?: File) {
    if (!file || !layer) return;
    if (!['image/png', 'image/webp', 'image/jpeg'].includes(file.type)) { onMessage('Use PNG, WebP ou JPEG.'); return; }
    setBusy(true);
    try { const url = await uploadFile(file, `marketing/elements/${crypto.randomUUID()}-${file.name}`);
      onChange({ ...layer, type: 'ASSET', assetId: crypto.randomUUID(), assetUrl: url, visible: true,
        opportunityId: layer.role === 'badge' ? opportunityId : undefined } as Layer);
    } catch (e) { onMessage((e as Error).message); } finally { setBusy(false); }
  }
  const input = 'w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs';
  const regions = [
    ['TOP_LEFT', '↖'], ['TOP_CENTER', '↑'], ['TOP_RIGHT', '↗'],
    ['CENTER_LEFT', '←'], ['CENTER', '●'], ['CENTER_RIGHT', '→'],
    ['BOTTOM_LEFT', '↙'], ['BOTTOM_CENTER', '↓'], ['BOTTOM_RIGHT', '↘'],
  ] as const;
  return <section className="p-4 bg-slate-900 rounded-xl space-y-3">
    <h2 className="font-semibold">Propriedades do elemento</h2>
    {!layer && <p className="text-xs text-slate-400">Selecione um elemento no painel de camadas para definir suas regras.</p>}
    {layer && <div className="space-y-2 border-t border-slate-700 pt-3">
      <p className="text-sm">Editar: {layer.name}</p>
      {layer.role === 'main' && <div className="rounded border border-cyan-900/70 bg-cyan-950/20 p-2 text-[11px] text-cyan-100">
        Região: {layer.preferredRegion || 'CENTER'} · Escala resultante: {Math.round(Math.min(100, layer.width / .65 * 100))}% · alvo: 90%<br />
        Ocupação visual: {Math.round(layer.width * (layer.height || .1) * ((layer.subjectBounds?.width || .9) * (layer.subjectBounds?.height || .9)) * 100)}%
      </div>}
      <div><p className="text-xs mb-1">Posição preferida</p><div className="grid grid-cols-3 gap-1">
        {regions.map(([region, icon]) => <button key={region} title={region} onClick={() => onChange({ ...layer, preferredRegion: region })}
          className={layer.preferredRegion === region ? 'bg-indigo-600 rounded p-2' : 'bg-slate-800 hover:bg-slate-700 rounded p-2'}>{icon}</button>)}
      </div></div>
      <div className="grid grid-cols-2 gap-2"><label className="text-xs">Tamanho<select className={input} value={layer.preferredSize || 'medium'} onChange={e => onChange({ ...layer, preferredSize: e.target.value as Layer['preferredSize'] })}>
        <option value="small">Pequeno</option><option value="medium">Médio</option><option value="large">Grande</option></select></label>
        <label className="text-xs">Prioridade<select className={input} value={layer.priority || 'MEDIUM'} onChange={e => onChange({ ...layer, priority: e.target.value as Layer['priority'] })}>
          <option value="VERY_HIGH">Muito alta</option><option value="HIGH">Alta</option><option value="MEDIUM">Média</option><option value="LOW">Baixa</option></select></label></div>
      <label className="block text-xs">Flexibilidade<select className={input} value={layer.positionTolerance || 'automatic'} onChange={e => onChange({ ...layer, positionTolerance: e.target.value as Layer['positionTolerance'] })}>
        <option value="automatic">Automática dentro da região</option><option value="strict">Manter estritamente na região</option></select></label>
      <label className="block text-xs">Comportamento para IA<textarea className={input} value={layer.aiInstructions || ''} placeholder="Ex.: reduzir fonte antes de reduzir o preço" onChange={e => onChange({ ...layer, aiInstructions: e.target.value })} /></label>
      <div><p className="text-xs mb-1">Estilos disponíveis</p><div className="grid grid-cols-2 gap-2">{models.filter(model => model.role === layer.role && (!model.opportunityId || model.opportunityId === opportunityId) &&
        (model.id !== 'default-badge' || /queima|salvados/i.test(opportunityName || ''))).map(model => <button key={model.id} onClick={() => onChange({ ...applyElementModel(layer, model), ...(layer.role === 'badge' ? { visible: !!opportunityId, opportunityId } : {}) })}
          className={layer.modelId === model.id ? 'border-2 border-indigo-400 rounded p-2 text-left bg-indigo-950/30' : 'border border-slate-700 rounded p-2 text-left hover:border-slate-500'}><span className="block h-6 rounded bg-slate-800 mb-1" /><span className="text-xs">{model.name}</span></button>)}</div></div>
      {'fontFamily' in layer && <>
        <label className="block text-xs">Fonte<select className={input} value={layer.fontFamily} onChange={e => onChange({ ...layer, fontFamily: e.target.value })}>
          {Array.from(new Set([layer.fontFamily, 'Arial, sans-serif', 'Georgia, serif', 'Impact, sans-serif', 'cursive'])).map(font => <option key={font}>{font}</option>)}
        </select></label>
        <label className="block text-xs">Tamanho da fonte<input className={input} type="range" min="1.4" max="9" step="0.1"
          value={layer.fontSizeRelative * 100} onChange={e => onChange({ ...layer, fontSizeRelative: Number(e.target.value) / 100 })} /></label>
        <label className="text-xs">Cor <input type="color" value={layer.color} onChange={e => onChange({ ...layer, color: e.target.value })} /></label>
        <label className="text-xs ml-3">Fundo <input type="color" value={layer.backgroundColor || '#24170e'} onChange={e => onChange({ ...layer, backgroundColor: e.target.value })} /></label>
      </>}
      {layer.type === 'VARIATION_GALLERY' && <label className="block text-xs">Distribuição<select className={input} value={(layer as any).direction}
        onChange={e => onChange({ ...layer, direction: e.target.value } as Layer)}>
        <option value="horizontal">Linha</option><option value="vertical">Coluna</option><option value="grid">Grid</option>
      </select></label>}
      {['badge', 'brand', 'installment', 'storeSlogan'].includes(layer.role || '') && <label className="block text-xs">Usar imagem deste elemento
        <input disabled={busy} type="file" accept="image/png,image/webp,image/jpeg" onChange={e => { upload(e.target.files?.[0]); e.target.value = ''; }} className="block w-full mt-1" />
      </label>}
      <button disabled={busy || !layer.role} onClick={save} className="w-full bg-indigo-600 rounded p-2 text-xs">Salvar como novo modelo</button>
    </div>}
    <p className="text-xs text-slate-400">O template guarda a região e as regras. O estilo visual escolhido pela campanha será aplicado no fluxo de geração.</p>
  </section>;
}
