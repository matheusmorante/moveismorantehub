import React from 'react';
import { toast } from 'react-toastify';
import Product from '../../../types/product.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { ensureAttributeValue } from '@/pages/utils/variationService';
import { moveVariationToFamily } from '@/pages/utils/productService';

type Family = { id: string; name?: string; description?: string; code?: string };
type Attribute = { name: string; value: string; showName?: boolean };

const normalize = (value: unknown) => String(value || '').trim().toLocaleLowerCase('pt-BR');

const toAttributes = (value: unknown): Attribute[] => {
    if (Array.isArray(value)) return value.filter(Boolean).map((attribute: any) => ({ name: String(attribute.name || ''), value: String(attribute.value || ''), showName: attribute.showName }));
    if (value && typeof value === 'object') return Object.entries(value as Record<string, unknown>).map(([name, attributeValue]) => ({ name, value: String(attributeValue || '') }));
    return [];
};

const hasSameAttributes = (first: Attribute[], second: Attribute[]) => {
    if (first.length !== second.length) return false;
    const secondMap = new Map(second.map(attribute => [normalize(attribute.name), normalize(attribute.value)]));
    return first.every(attribute => secondMap.get(normalize(attribute.name)) === normalize(attribute.value));
};

const familyName = (family?: Family | null) => family?.name || family?.description || 'Família selecionada';

interface MoveVariationFamilyModalProps {
    variation: (Product & { variationId?: string }) | null;
    onClose: () => void;
    onMoved: () => void;
}

export const MoveVariationFamilyModal: React.FC<MoveVariationFamilyModalProps> = ({ variation, onClose, onMoved }) => {
    const [families, setFamilies] = React.useState<Family[]>([]);
    const [targetFamilyId, setTargetFamilyId] = React.useState('');
    const [attributes, setAttributes] = React.useState<Attribute[]>([]);
    const [targetImages, setTargetImages] = React.useState<string[]>([]);
    const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
    const [photosLoaded, setPhotosLoaded] = React.useState(false);
    const [hasConflict, setHasConflict] = React.useState(false);
    const [countdown, setCountdown] = React.useState(5);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        if (!variation) return;
        setTargetFamilyId('');
        setAttributes(toAttributes((variation as any).attributes));
        setTargetImages([]);
        setSelectedImages([]);
        setPhotosLoaded(false);
        setHasConflict(false);
        setCountdown(5);

        let query = supabase
            .from('products')
            .select('id, name, description, code')
            .eq('deleted', false)
            .order('name', { ascending: true });
        if (variation.parentId) query = query.neq('id', variation.parentId);
        query.then(({ data, error }) => {
                if (error) {
                    toast.error('Não foi possível carregar as famílias.');
                    return;
                }
                setFamilies((data || []) as Family[]);
            });
    }, [variation]);

    React.useEffect(() => {
        if (!targetFamilyId) {
            setTargetImages([]);
            setSelectedImages([]);
            setPhotosLoaded(false);
            return;
        }
        let active = true;
        supabase
            .from('products')
            .select('images, product_images(image_url)')
            .eq('id', targetFamilyId)
            .single()
            .then(({ data, error }) => {
                if (!active) return;
                if (error) {
                    toast.error('Não foi possível carregar as fotos da nova família.');
                    return;
                }
                const imageColumn = Array.isArray(data?.images) ? data.images : [];
                const imageRelations = (data?.product_images || []).map((image: any) => image.image_url);
                setTargetImages(Array.from(new Set([...imageRelations, ...imageColumn].filter(Boolean))));
                setSelectedImages([]);
                setPhotosLoaded(true);
            });
        return () => { active = false; };
    }, [targetFamilyId]);

    React.useEffect(() => {
        if (!variation || !targetFamilyId) {
            setHasConflict(false);
            return;
        }
        let active = true;
        supabase
            .from('product_variations')
            .select('id, attributes')
            .eq('product_id', targetFamilyId)
            .then(({ data, error }) => {
                if (!active) return;
                if (error) {
                    toast.error('Não foi possível validar as variações da família.');
                    setHasConflict(true);
                    return;
                }
                setHasConflict((data || []).some(candidate => hasSameAttributes(attributes, toAttributes(candidate.attributes))));
            });
        return () => { active = false; };
    }, [variation, targetFamilyId, attributes]);

    React.useEffect(() => {
        if (!variation || !targetFamilyId || hasConflict || saving) {
            setCountdown(5);
            return;
        }
        if (countdown <= 0) return;
        const timer = window.setTimeout(() => setCountdown(value => value - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [variation, targetFamilyId, hasConflict, saving, countdown]);

    if (!variation) return null;

    const selectedFamily = families.find(family => family.id === targetFamilyId);
    const needsPhotoChoice = Boolean(targetFamilyId);
    const canConfirm = Boolean(targetFamilyId) && photosLoaded && !hasConflict && selectedImages.length > 0 && countdown === 0 && !saving;

    const updateAttribute = (index: number, field: 'name' | 'value', value: string) => {
        setAttributes(current => current.map((attribute, attributeIndex) => attributeIndex === index ? { ...attribute, [field]: value } : attribute));
    };

    const toggleImage = (url: string) => {
        setSelectedImages(current => current.includes(url) ? current.filter(image => image !== url) : [...current, url]);
    };

    const handleConfirm = async () => {
        if (!selectedFamily || !variation.variationId || !canConfirm) return;
        const validAttributes = attributes.filter(attribute => attribute.name.trim() && attribute.value.trim());
        try {
            setSaving(true);
            const canonicalAttributes = await Promise.all(validAttributes.map(async attribute => {
                const stored = await ensureAttributeValue(attribute.name, attribute.value);
                return { ...attribute, ...stored };
            }));
            const newName = [familyName(selectedFamily), ...canonicalAttributes.map(attribute => attribute.value)].filter(Boolean).join(' ');
            await moveVariationToFamily(variation.variationId, selectedFamily.id, canonicalAttributes, newName, selectedImages);
            toast.success('Produto movido para a nova família. O ID da variação foi preservado.');
            onMoved();
            onClose();
        } catch (error: any) {
            toast.error(error?.message || 'Não foi possível mover o produto.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-slate-950/55" role="dialog" aria-modal="true" aria-label="Mover produto para outra família">
            <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
                <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">Mover para outra família</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">O produto permanece com o mesmo ID; somente o vínculo com a família será alterado.</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label="Fechar"><i className="bi bi-x-lg" /></button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                        <i className="bi bi-info-circle-fill mr-2" />
                        O nome deste produto pode mudar: ele será formado pelo nome da nova família mais os valores dos atributos do produto.
                    </div>

                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                        Nova família
                        <select value={targetFamilyId} onChange={event => setTargetFamilyId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                            <option value="">Selecione a família</option>
                            {families.map(family => <option key={family.id} value={family.id}>{familyName(family)}{family.code ? ` (${family.code})` : ''}</option>)}
                        </select>
                    </label>

                    {targetFamilyId && (
                        <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Fotos do produto na nova família</h3>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">As fotos anteriores pertenciam à família antiga. Escolha quais fotos da nova família devem ficar vinculadas a este produto.</p>
                            {targetImages.length > 0 ? (
                                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                                    {targetImages.map(url => {
                                        const checked = selectedImages.includes(url);
                                        return (
                                            <button type="button" key={url} onClick={() => toggleImage(url)} className={`relative aspect-square overflow-hidden rounded-lg border-2 ${checked ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-transparent opacity-70 hover:opacity-100'}`} aria-pressed={checked}>
                                                <img src={url} alt="Foto disponível na nova família" className="h-full w-full object-cover" />
                                                {checked && <span className="absolute inset-0 flex items-center justify-center bg-indigo-600/35 text-xl text-white"><i className="bi bi-check-circle-fill" /></span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">Esta família ainda não possui fotos. Cadastre uma foto nela antes de mover este produto.</p>
                            )}
                        </section>
                    )}

                    {hasConflict && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
                            <p className="text-sm font-bold text-red-800 dark:text-red-200">Já existe um produto nesta família com esta mesma combinação de atributos.</p>
                            <p className="mt-1 text-xs text-red-700 dark:text-red-300">Escolha um novo atributo ou valor antes de continuar. O valor informado será reaproveitado ou criado na lista de atributos.</p>
                            <div className="mt-3 space-y-2">
                                {attributes.map((attribute, index) => (
                                    <div className="grid grid-cols-2 gap-2" key={`${attribute.name}-${index}`}>
                                        <input value={attribute.name} onChange={event => updateAttribute(index, 'name', event.target.value)} placeholder="Atributo" className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm dark:border-red-900 dark:bg-slate-900" />
                                        <input value={attribute.value} onChange={event => updateAttribute(index, 'value', event.target.value)} placeholder="Valor" className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm dark:border-red-900 dark:bg-slate-900" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 p-5 border-t border-slate-100 dark:border-slate-800">
                    <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
                    <button type="button" disabled={!canConfirm} onClick={handleConfirm} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45">
                        {saving ? 'Movendo…' : hasConflict ? 'Resolva o conflito' : !photosLoaded && targetFamilyId ? 'Carregando fotos…' : needsPhotoChoice && selectedImages.length === 0 ? 'Selecione as fotos' : countdown > 0 && targetFamilyId ? `Confirmar em ${countdown}s` : 'Confirmar mudança'}
                    </button>
                </div>
            </div>
        </div>
    );
};
