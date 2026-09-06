import { useEffect, useRef, useState } from 'react';
import { fetchProductsPage, getFullProduct } from '@/pages/utils/productService';
import { Product } from '@/pages/types/product.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { Layer, MarketingTemplate, MarketingCampaign, MarketingAsset } from '../../types';
import { compositionTemplate } from '../../services/compositionDefaults';
import { composeWithAi } from '../../services/compositionAi';
import { templateService } from '../../services/templateService';
import { postProduct } from '../../services/postProduct';
import { detectImageSubjectBounds } from '../../services/imageSubjectBounds';

const defaultPreviewProductKey = 'morante_post_creator_default_preview_product_id';

export function usePostEditor() {
  const [products, setProducts] = useState<Product[]>([]), [product, setProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState(''), [page, setPage] = useState(1), [total, setTotal] = useState(0);
  const [campaign, setCampaign] = useState<MarketingCampaign | null>(null);
  const [template, setTemplate] = useState(compositionTemplate), [layers, setLayers] = useState<Layer[]>(compositionTemplate.layers);
  const [selected, setSelected] = useState<string | null>(null), [overrides, setOverrides] = useState<Record<string, string>>({});
  const [slogan, setSlogan] = useState(''), [busy, setBusy] = useState(''), [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [opportunities, setOpportunities] = useState<Array<{ id: string; name: string; slug?: string; image_url?: string }>>([]);
  const revision = useRef(0);
  useEffect(() => { let alive = true;
    const timer = setTimeout(() => { fetchProductsPage(page, 30, { activeOnly: true, isDraft: false, search })
      .then(result => { if (alive) { setProducts(current => page === 1 ? result.data : [...current, ...result.data.filter(item => !current.some(existing => existing.id === item.id))]); setTotal(result.total); } }).catch(e => alive && setMessage(e.message)); }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [page, search]);
  useEffect(() => { supabase.from('opportunities').select('*').eq('active', true).then(({ data }) => setOpportunities(data || [])); }, []);
  useEffect(() => () => { revision.current++; }, []);
  useEffect(() => { const savedProductId = localStorage.getItem(defaultPreviewProductKey); if (savedProductId) void selectProduct(savedProductId); }, []);
  const opportunity = opportunities.find(o => o.id === product?.opportunityId);
  const data = product ? postProduct(product, overrides) : null;
  useEffect(() => {
    if (!opportunity) return;
    const queima = /queima|salvados/i.test(opportunity.name || opportunity.slug || '');
    setLayers(current => current.map(l => l.role === 'badge' && !l.opportunityId ? { ...l,
      opportunityId: opportunity.id, assetId: opportunity.id, visible: !!opportunity.image_url || queima,
      assetUrl: queima ? '/assets/queima-salvados-original.png' : opportunity.image_url } : l));
  }, [opportunity?.id]);
  function resetContent() { revision.current++; setSlogan(''); setMessage(''); }
  async function selectProduct(id: string) {
    resetContent(); setProduct(null); setOverrides({});
    if (!id) { localStorage.removeItem(defaultPreviewProductKey); return; }
    setLoading(true); const version = revision.current;
    let full: Product | null = null;
    try { full = await getFullProduct(id); } catch (error) { if (revision.current === version) setMessage((error as Error).message || 'Não foi possível carregar o produto.'); }
    if (revision.current !== version) return;
    if (!full) { setMessage('Não foi possível carregar o produto.'); setLoading(false); return; }
    setProduct(full); localStorage.setItem(defaultPreviewProductKey, full.id || id);
    const subjectBounds = await detectImageSubjectBounds(postProduct(full).mainImageUrl);
    if (revision.current !== version) return;
    if (subjectBounds) setLayers(current => current.map(layer => layer.role === 'main' ? { ...layer, subjectBounds } : layer));
    const opp = opportunities.find(o => o.id === full.opportunityId);
    const queima = /queima|salvados/i.test(opp?.name || opp?.slug || '');
    setLayers(current => current.map(l => l.role === 'badge' && !(l.opportunityId && l.opportunityId === full.opportunityId) ? { ...l, visible: !!opp && (!!opp.image_url || queima),
      opportunityId: opp?.id, assetUrl: queima ? '/assets/queima-salvados-original.png' : opp?.image_url,
      assetId: opp?.id || '', modelId: undefined } : l));
    if (campaign) {
      const saved = (await templateService.getAll()).filter(t => t.campaignId === campaign.id && !t.name.startsWith('@element/') &&
        t.layers.some(l => l.role === 'badge' && l.opportunityId === full.opportunityId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      if (saved && revision.current === version) { setTemplate(saved); setLayers(saved.layers); }
    }
    setLoading(false);
  }
  function selectTemplate(next: MarketingTemplate) { resetContent(); setTemplate(next); setLayers(next.layers); }
  async function selectCampaign(next: MarketingCampaign) {
    resetContent(); setCampaign(next); const version = revision.current;
    const saved = (await templateService.getAll()).filter(t => t.campaignId === next.id && !t.name.startsWith('@element/'));
    if (version !== revision.current) return;
    const latest = saved.sort((a, b) => Number(b.layers.some(l => l.role === 'badge' && l.opportunityId === product?.opportunityId)) -
      Number(a.layers.some(l => l.role === 'badge' && l.opportunityId === product?.opportunityId)) || b.updatedAt.localeCompare(a.updatedAt))[0];
    if (latest) { setTemplate(latest); setLayers(latest.layers); }
  }
  async function run(kind: 'layout') {
    if (!data || busy) return null;
    const version = revision.current; setBusy(kind); setMessage('');
    try {
      if (kind === 'layout') {
        const applicableLayers = layers.map(l => l.role === 'badge' && (!opportunity || (l.opportunityId && l.opportunityId !== opportunity.id))
          ? { ...l, visible: false } : l);
        const result = await composeWithAi(data, applicableLayers, template.aspectRatio);
        if (revision.current === version) { setLayers(result.layers); setSlogan(result.slogan); setMessage(`Layout válido ✓ Score: ${result.validation.score}/100${result.repaired ? ' (reparado automaticamente)' : ''}`); return result; }
      }
    } catch (e) { if (version === revision.current) setMessage((e as Error).message); }
    finally { setBusy(''); }
    return null;
  }
  async function save() {
    const name = window.prompt('Nome deste template de campanha:', campaign?.name || 'Meu template'); if (!name?.trim()) return;
    try { const saved = await templateService.save({ ...template, id: undefined, name: name.trim(), campaignId: campaign?.id, layers, isDefault: false });
      setTemplate(saved); setMessage(saved.persistedRemotely ? 'Template salvo.' : 'Template salvo neste navegador. Sincronização com o servidor indisponível.');
    } catch (e) { setMessage((e as Error).message); }
  }
  function addAsset(asset: MarketingAsset) {
    const role = asset.category === 'CAMPAIGN_BADGE' ? 'badge' : asset.category === 'PAYMENT' ? 'installment' : asset.category === 'BRAND' ? 'brand' : undefined;
    const target = layers.find(l => l.role === role && role);
    const layer: Layer = { ...(target || { x: .6, y: .05, width: .35, height: .25, rotation: 0, zIndex: 6, locked: false, opacity: 1 }),
      id: target?.id || crypto.randomUUID(), type: 'ASSET', role, name: asset.name, visible: true, assetId: asset.id, assetUrl: asset.fileUrl,
      opportunityId: role === 'badge' ? opportunity?.id : undefined };
    setLayers(current => target ? current.map(l => l.id === target.id ? layer : l) : [...current, layer]); setSelected(layer.id);
  }
  return { products, product, selectProduct, search, setSearch: (value: string) => { setSearch(value); setPage(1); }, page, setPage, total,
    campaign, selectCampaign, template, selectTemplate, layers,
    setLayers: (value: React.SetStateAction<Layer[]>) => { revision.current++; setLayers(value); }, selected, setSelected, slogan, loading,
    setSlogan: (value: string) => { revision.current++; setSlogan(value); }, busy, message, setMessage,
    data, opportunity, run, save, addAsset, setPhoto: (id: string, url: string) => { resetContent(); setOverrides(v => ({ ...v, [id]: url })); } };
}
