import React, { useState, useRef } from 'react';
import Product, { Variation } from '../../../types/product.type';
import { saveProduct } from '@/pages/utils/productService';
import { subscribeToPeople } from '@/pages/utils/personService';
import { toast } from 'react-toastify';
import Person from '../../../types/person.type';
import { supabase } from '@/pages/utils/supabaseConfig';

interface ProductImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface ImportRow {
    status: 'pending' | 'processing' | 'success' | 'error';
    error?: string;
    warning?: string;
    data: Partial<Product>;
    csvRow: any[];
}

const ProductImportModal: React.FC<ProductImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [importData, setImportData] = useState<ImportRow[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [suppliers, setSuppliers] = useState<Person[]>([]);
    const [encoding, setEncoding] = useState<'UTF-8' | 'ISO-8859-1'>('UTF-8');
    const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
    const [nextSkuSequence, setNextSkuSequence] = useState<number>(1000001);
    const [importMode, setImportMode] = useState<'full' | 'update_by_id' | 'stock_by_code'>('full'); // Modo de importação
    const [existingIds, setExistingIds] = useState<Set<string>>(new Set()); // IDs encontrados no banco
    
    // Mapping States
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvRows, setCsvRows] = useState<string[][]>([]);
    const [mapping, setMapping] = useState<Record<string, number | null>>({
        code: null,
        description: null,
        unit: null,
        unitPrice: null,
        costPrice: null,
        stock: null,
        minStock: null,
        brand: null,
        parentId: null,
        width: null,
        height: null,
        depth: null,
        ncm: null,
        id: null
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef(false);

    React.useEffect(() => {
        if (isOpen) {
            // Reset everything
            setStep('upload');
            setFile(null);
            setImportData([]);
            setProgress(0);
            setIsCompleted(false);
            setSelectedIndexes(new Set());
            setMapping({
                code: null,
                description: null,
                unit: null,
                unitPrice: null,
                costPrice: null,
                stock: null,
                minStock: null,
                brand: null,
                parentId: null,
                width: null,
                height: null,
                depth: null,
                ncm: null
            });

            const unsubscribe = subscribeToPeople('suppliers', (people: Person[]) => {
                setSuppliers(people.filter((p: Person) => p.type === 'suppliers'));
            });

            const fetchLastSku = async () => {
                const { data } = await supabase.from('products').select('code').order('code', { ascending: false }).limit(500);
                if (data) {
                    const numericSkus = data
                        .map((p: any) => parseInt(p.code))
                        .filter((n: number) => !isNaN(n) && n < 9999999);
                    if (numericSkus.length > 0) {
                        setNextSkuSequence(Math.max(...numericSkus) + 1);
                    }
                }
            };
            fetchLastSku();

            return unsubscribe;
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const parseCSV = (text: string) => {
        const rows: string[][] = [];
        let currentRow: string[] = [];
        let currentField = '';
        let inQuotes = false;
        
        // Detect delimiter
        const firstLine = text.split('\n')[0];
        const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (inQuotes) {
                if (char === '"' && nextChar === '"') {
                    currentField += '"';
                    i++; // Skip next quote
                } else if (char === '"') {
                    inQuotes = false;
                } else {
                    currentField += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === delimiter) {
                    currentRow.push(currentField.trim());
                    currentField = '';
                } else if (char === '\n' || char === '\r') {
                    if (char === '\r' && nextChar === '\n') i++;
                    currentRow.push(currentField.trim());
                    if (currentRow.some(f => f !== '')) rows.push(currentRow);
                    currentRow = [];
                    currentField = '';
                } else {
                    currentField += char;
                }
            }
        }
        
        if (currentRow.length > 0 || currentField !== '') {
            currentRow.push(currentField.trim());
            if (currentRow.some(f => f !== '')) rows.push(currentRow);
        }
        
        return rows;
    };

    const handleFileLoad = (selectedFile: File) => {
        setFile(selectedFile);
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const rows = parseCSV(text);
            if (rows.length < 2) {
                toast.error("CSV vazio ou inválido.");
                return;
            }

            setCsvHeaders(rows[0]);
            setCsvRows(rows.slice(1));
            
            // Try auto-mapping
            const headers = rows[0].map(h => h.toUpperCase());
            const newMapping = { ...mapping };
            
            let savedMap: Record<string, string> = {};
            try { 
                const ls = localStorage.getItem('blingImportMapping');
                if (ls) savedMap = JSON.parse(ls); 
            } catch (e) {}
            
            const fieldKeywords: Record<string, string[]> = {
                id: ['ID', 'UUID', 'PK'],
                code: ['CÓDIGO', 'SKU', 'REFERÊNCIA', 'REF'],
                description: ['DESCRIÇÃO', 'NOME', 'PRODUTO', 'TÍTULO'],
                unit: ['UNIDADE', 'UN', 'MEDIDA'],
                unitPrice: ['PREÇO', 'VENDA', 'VALOR', 'PRECO'],
                costPrice: ['CUSTO', 'COMPRA'],
                stock: ['ESTOQUE', 'SALDO', 'QTD', 'QUANTIDADE'],
                minStock: ['MÍNIMO', 'MINIMO'],
                brand: ['MARCA', 'FABRICANTE'],
                parentId: ['PAI', 'PARENT', 'CÓDIGO PAI'],
                width: ['LARGURA'],
                height: ['ALTURA'],
                depth: ['PROFUNDIDADE', 'COMPRIMENTO'],
                ncm: ['NCM']
            };

            Object.keys(fieldKeywords).forEach(field => {
                if (savedMap[field]) {
                    const idx = rows[0].findIndex(h => h === savedMap[field]);
                    if (idx !== -1) {
                        (newMapping as any)[field] = idx;
                        return;
                    }
                }
                const index = headers.findIndex(h => fieldKeywords[field].some(k => h.includes(k)));
                if (index !== -1) (newMapping as any)[field] = index;
            });

            setMapping(newMapping);
            setStep('mapping');
        };
        reader.readAsText(selectedFile, encoding);
    };

    const handleMappingChange = (fieldId: string, value: string) => {
        const numValue = value === '' ? null : Number(value);
        const updatedMapping = { ...mapping, [fieldId]: numValue };
        setMapping(updatedMapping);
        
        const savedMap: Record<string, string> = {};
        Object.keys(updatedMapping).forEach(key => {
            const idx = updatedMapping[key];
            if (idx !== null && csvHeaders[idx]) {
                savedMap[key] = csvHeaders[idx];
            }
        });
        localStorage.setItem('blingImportMapping', JSON.stringify(savedMap));
    };

    const processMappingToPreview = async () => {
        const mapped: ImportRow[] = csvRows.map((row): ImportRow => {
            const getVal = (field: string) => mapping[field] !== null ? row[mapping[field]!] : undefined;

            const unitPriceVal = getVal('unitPrice');
            const costPriceVal = getVal('costPrice');
            const unitPrice = parseFloat(unitPriceVal?.replace('.', '').replace(',', '.') || '0');
            const costPrice = parseFloat(costPriceVal?.replace('.', '').replace(',', '.') || '0');
            
            const code = getVal('code');
            let description = getVal('description') || '';
            
            // Clean up description if it's just HTML or empty tags
            const cleanDesc = description.replace(/<[^>]*>/g, '').trim();
            if (cleanDesc === '' && description.includes('<')) description = 'Sem descrição';
            else description = cleanDesc || description;

            return {
                status: 'pending',
                csvRow: row,
                data: {
                    code,
                    description,
                    unit: getVal('unit') || 'UN',
                    unitPrice,
                    costPrice,
                    stock: parseFloat(getVal('stock') || '0'),
                    minStock: parseFloat(getVal('minStock') || '0'),
                    active: true,
                    brand: getVal('brand'),
                    itemType: 'product',
                    width: parseFloat(getVal('width') || '0'),
                    height: parseFloat(getVal('height') || '0'),
                    depth: parseFloat(getVal('depth') || '0'),
                    fiscal: { ncm: getVal('ncm') },
                    parentId: (getVal('parentId')?.trim() || undefined),
                    sku: code,
                    id: getVal('id')
                }
            };
        }).filter(r => {
            // Filter out obviously garbage rows (empty description and no price/code)
            const d = r.data.description?.trim();
            if ((!d || d === 'Sem descrição') && !r.data.code && r.data.unitPrice === 0) return false;
            // Also filter rows that are just separator lines
            if (d?.match(/^[_ \-*/=+]{3,}$/)) return false; 
            return true;
        });

        // Validation
        const skusInFile = new Set<string>();
        mapped.forEach(r => {
            // Title check removed as requested
        });

        const finalData = mapped.map((row, idx): ImportRow => {
            let code = row.data.code;

            if (!code) return { ...row, status: 'error', error: 'SKU Faltando' };
            if (skusInFile.has(code)) {
                row.warning = "SKU duplicado no arquivo (o último será usado)";
            }
            skusInFile.add(code);

            return row;
        });

        setImportData(finalData);

        // [updateOnly compat] Ao ativar modo 'update_by_id', pré-selecionar apenas itens com ID mapeado
        if (importMode === 'update_by_id' && mapping.id !== null) {
            const idsInFile = new Set(finalData.map(r => r.data.id).filter(Boolean) as string[]);
            // Consultar banco para verificar quais IDs existem
            if (idsInFile.size > 0) {
                const idArr = Array.from(idsInFile);
                const { data: found } = await supabase.from('products').select('id').in('id', idArr);
                const foundSet = new Set<string>((found || []).map((p: any) => String(p.id)));
                setExistingIds(foundSet);
                // Selecionar apenas os que existem
                const validIndexes = new Set(
                    finalData.map((r, i) => (r.data.id && foundSet.has(String(r.data.id))) ? i : -1).filter(i => i !== -1)
                );
                setSelectedIndexes(validIndexes);
            } else {
                setSelectedIndexes(new Set());
                setExistingIds(new Set());
            }
        } else {
            setExistingIds(new Set());
            setSelectedIndexes(new Set(finalData.map((_, i) => i)));
        }

        setStep('preview');
    };

    const generateSkusForMissing = () => {
        let currentSeq = nextSkuSequence;
        const skusInFile = new Set(importData.map(r => r.data.code).filter(c => !!c));
        
        const updated = importData.map(row => {
            if (!row.data.code) {
                // Find next available sequence not in current file
                while (skusInFile.has(String(currentSeq).padStart(7, '0'))) {
                    currentSeq++;
                }
                const newCode = String(currentSeq++).padStart(7, '0');
                skusInFile.add(newCode);
                
                return {
                    ...row,
                    status: 'pending',
                    error: undefined,
                    data: { ...row.data, code: newCode, sku: newCode }
                } as ImportRow;
            }
            return row;
        });
        
        setImportData(updated);
        setNextSkuSequence(currentSeq);
        toast.success("SKUs gerados para itens faltantes!");
    };

    const handleEncodingChange = (enc: 'UTF-8' | 'ISO-8859-1') => {
        setEncoding(enc);
        if (file) handleFileLoad(file);
    };

    const toggleSelection = (idx: number) => {
        setSelectedIndexes(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedIndexes.size === importData.length) setSelectedIndexes(new Set());
        else setSelectedIndexes(new Set(importData.map((_, i) => i)));
    };

    // ======== runImport stock_by_code mode ========
    const runStockByCode = async () => {
        setIsImporting(true);
        setProgress(0);
        abortRef.current = false;

        // Build code → new stock map from preview data
        const toProcess = importData
            .map((r, i) => ({ r, i }))
            .filter(x => selectedIndexes.has(x.i) && x.r.status !== 'success');

        if (toProcess.length === 0) {
            toast.warn('Selecione itens para atualizar.');
            setIsImporting(false);
            return;
        }

        const updated = [...importData];
        let done = 0;

        for (const { r, i } of toProcess) {
            if (abortRef.current) break;
            const code = r.data.code;
            const newStock = r.data.stock;
            if (!code) { updated[i].status = 'error'; updated[i].error = 'SKU vazio'; done++; continue; }

            updated[i].status = 'processing';
            setImportData([...updated]);

            try {
                // Find product by code
                const { data: found } = await supabase
                    .from('products')
                    .select('id')
                    .eq('code', code)
                    .eq('deleted', false)
                    .maybeSingle();

                if (!found) {
                    updated[i].status = 'error';
                    updated[i].error = 'Código não encontrado';
                } else {
                    const { error } = await supabase
                        .from('products')
                        .update({ stock: newStock ?? 0, updated_at: new Date().toISOString() })
                        .eq('id', found.id);
                    updated[i].status = error ? 'error' : 'success';
                    if (error) updated[i].error = error.message;
                }
            } catch (err: any) {
                updated[i].status = 'error';
                updated[i].error = err.message;
            }

            done++;
            if (!abortRef.current) {
                setProgress(Math.round((done / toProcess.length) * 100));
                setImportData([...updated]);
            }
        }

        setIsImporting(false);
        if (abortRef.current) {
            toast.info('Atualização cancelada.');
            setProgress(0);
        } else {
            setIsCompleted(true);
            const successCount = updated.filter(r => r.status === 'success').length;
            toast.success(`${successCount} estoque(s) atualizado(s) com sucesso!`);
            onSuccess();
        }
    };
    // ==========================================

    const runImport = async () => {
        setIsImporting(true);
        setProgress(0);
        abortRef.current = false;
        const updated = [...importData];
        const toProcess = updated.map((r, i) => ({ r, i })).filter(x => selectedIndexes.has(x.i) && x.r.status !== 'success');

        if (toProcess.length === 0) {
            toast.warn("Selecione itens para importar.");
            setIsImporting(false);
            return;
        }

        const parents = toProcess.filter(x => !x.r.data.parentId);
        const variations = toProcess.filter(x => x.r.data.parentId);
        const parentMap = new Map<string, ImportRow[]>();
        variations.forEach(x => {
            const pid = x.r.data.parentId!;
            if (!parentMap.has(pid)) parentMap.set(pid, []);
            parentMap.get(pid)!.push(x.r);
        });

        let done = 0;
        const totalUnits = parents.length || 1;
        
        // 1. Pre-fetch existing products by SKU or ID to handle updates (Chunked to avoided large URLs)
        const allSkus = parents.map(p => p.r.data.code!).filter(c => !!c);
        const allIdsFromCsv = parents.map(p => p.r.data.id!).filter(id => !!id);
        
        let existingByCode: Record<string, string> = {};
        let existingById: Record<string, string> = {};
        
        async function prefetch(skus: string[], ids: string[]) {
            if (skus.length === 0 && ids.length === 0) return;
            const orFilters: string[] = [];
            if (skus.length > 0) orFilters.push(`code.in.(${skus.map(s => `"${s}"`).join(',')})`);
            if (ids.length > 0) orFilters.push(`id.in.(${ids.join(',')})`);
            
            if (orFilters.length > 0) {
                const { data: existing } = await supabase.from('products').select('id, code').eq('deleted', false).or(orFilters.join(','));
                existing?.forEach((p: any) => { 
                    if (p.code) existingByCode[p.code] = p.id;
                    existingById[String(p.id)] = p.id;
                });
            }
        }

        const CHUNK_SIZE = 100;
        for (let i = 0; i < Math.max(allSkus.length, allIdsFromCsv.length); i += CHUNK_SIZE) {
            if (abortRef.current) break;
            const skuChunk = allSkus.slice(i, i + CHUNK_SIZE);
            const idChunk = allIdsFromCsv.slice(i, i + CHUNK_SIZE);
            await prefetch(skuChunk, idChunk);
            
            if (abortRef.current) break;
            // Optional: Give feedback during pre-fetch
            const prefDone = Math.min(5, Math.round((i / Math.max(allSkus.length, allIdsFromCsv.length)) * 5));
            setProgress(prefDone);
        }

        if (!abortRef.current) {
            // Give a small progress boost after pre-fetch
            setProgress(Math.max(5, Math.round(100 / (totalUnits || 1))));
        }

        for (const p of parents) {
            if (abortRef.current) break;
            
            // Update progress at start of item to show we are working on it
            const currentProgress = Math.round((done / totalUnits) * 100);
            setProgress(Math.max(currentProgress, 5));

            updated[p.i].status = 'processing';
            setImportData([...updated]);

            try {
                const children = parentMap.get(p.r.data.code!) || [];
                
                // Determine the correct ID to use (Update if exists, Insert if not)
                let targetId = p.r.data.id ? existingById[String(p.r.data.id)] : undefined;
                if (!targetId && p.r.data.code) {
                    targetId = existingByCode[p.r.data.code];
                }

                const product: Product = {
                    ...p.r.data,
                    id: targetId || p.r.data.id, // Use existing found ID or the new manual ID from CSV
                    hasVariations: children.length > 0,
                    variations: children.map(c => ({
                        id: Math.random().toString(36).substr(2, 9),
                        sku: c.data.code || '',
                        name: c.data.description || '',
                        unitPrice: c.data.unitPrice || 0,
                        costPrice: c.data.costPrice || 0,
                        stock: c.data.stock || 0,
                        active: c.data.active ?? true,
                        attributes: [{ name: 'Variação', value: c.data.description || 'Padrão' }],
                        syncUnitPrice: true, syncCostPrice: true, syncDescription: true
                    } as Variation))
                } as Product;

                const isNew = !targetId;
                await saveProduct(product, isNew);
                
                updated[p.i].status = 'success';
                children.forEach(c => {
                    const idx = updated.indexOf(c);
                    if (idx !== -1) updated[idx].status = 'success';
                });
            } catch (err: any) {
                updated[p.i].status = 'error';
                updated[p.i].error = err.message;
            }
            done++;
            
            if (!abortRef.current) {
                setProgress(Math.round((done / totalUnits) * 100));
                setImportData([...updated]);
            }
        }

        setIsImporting(false);
        if (abortRef.current) {
            toast.info("Importação cancelada.");
            setProgress(0);
        } else {
            setIsCompleted(true);
            toast.success("Importação concluída!");
            onSuccess();
        }
    };

    const handleStartImport = () => {
        if (importMode === 'stock_by_code') runStockByCode();
        else runImport();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={!isImporting ? onClose : undefined} />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800">
                
                {/* Header */}
                <div className="px-10 py-6 border-b border-slate-50 dark:border-slate-800/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-8">
                        <div>
                            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Importação de Produtos - Bling</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Importação exclusiva de planilhas do Bling ERP</p>
                        </div>
                        
                        {/* Steps Indicator */}
                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-800">
                            {[
                                { id: 'upload', label: 'Upload' },
                                { id: 'mapping', label: 'Mapeamento' },
                                { id: 'preview', label: 'Visualização' }
                            ].map((s, i) => (
                                <React.Fragment key={s.id}>
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${step === s.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${step === s.id ? 'bg-white text-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                            {i + 1}
                                        </span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">{s.label}</span>
                                    </div>
                                    {i < 2 && <i className="bi bi-chevron-right text-slate-300 dark:text-slate-700"></i>}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {step === 'preview' && file && importData.some(r => !r.data.code) && (
                            <button onClick={generateSkusForMissing} className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-6 py-2.5 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm shadow-amber-200/50">
                                <i className="bi bi-magic"></i> Gerar SKUs p/ faltantes
                            </button>
                        )}
                        {step === 'upload' && (
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-100 dark:border-slate-700">
                                <span className="text-[9px] font-black uppercase text-slate-400 px-2 tracking-widest">Encoding:</span>
                                <button onClick={() => handleEncodingChange('UTF-8')} className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${encoding === 'UTF-8' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>UTF-8</button>
                                <button onClick={() => handleEncodingChange('ISO-8859-1')} className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${encoding === 'ISO-8859-1' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>ANSI</button>
                            </div>
                        )}
                        <button onClick={onClose} disabled={isImporting} className="p-2 text-slate-400 hover:text-red-500 ml-4"><i className="bi bi-x-lg text-xl"></i></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                    {step === 'upload' && (
                        <div className="flex flex-col gap-8">
                            {/* Mode selector */}
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    {
                                        id: 'full' as const,
                                        icon: 'bi-cloud-arrow-up-fill',
                                        color: 'blue',
                                        title: 'Importação Completa',
                                        desc: 'Cria novos produtos e atualiza os existentes pelo SKU ou ID'
                                    },
                                    {
                                        id: 'update_by_id' as const,
                                        icon: 'bi-pencil-square',
                                        color: 'amber',
                                        title: 'Atualizar por ID',
                                        desc: 'Atualiza todos os dados apenas de produtos já cadastrados (pelo ID do Bling)'
                                    },
                                    {
                                        id: 'stock_by_code' as const,
                                        icon: 'bi-boxes',
                                        color: 'emerald',
                                        title: 'Atualizar Estoque',
                                        desc: 'Atualiza somente o estoque de produtos que tiverem o mesmo código (SKU)'
                                    }
                                ].map(mode => (
                                    <button
                                        key={mode.id}
                                        onClick={() => setImportMode(mode.id)}
                                        className={`flex flex-col gap-3 p-6 rounded-[2rem] border-2 text-left transition-all ${
                                            importMode === mode.id
                                                ? `border-${mode.color}-400 bg-${mode.color}-50 dark:bg-${mode.color}-900/10 shadow-lg shadow-${mode.color}-100/50`
                                                : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                                        }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                            importMode === mode.id
                                                ? `bg-${mode.color}-100 dark:bg-${mode.color}-900/30 text-${mode.color}-600`
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                        }`}>
                                            <i className={`bi ${mode.icon} text-lg`} />
                                        </div>
                                        <div>
                                            <p className={`text-xs font-black uppercase tracking-widest ${importMode === mode.id ? `text-${mode.color}-700 dark:text-${mode.color}-300` : 'text-slate-700 dark:text-slate-200'}`}>
                                                {mode.title}
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed font-medium">{mode.desc}</p>
                                        </div>
                                        {importMode === mode.id && (
                                            <div className={`self-start text-[9px] font-black uppercase tracking-widest text-${mode.color}-600 bg-${mode.color}-100 dark:bg-${mode.color}-900/30 px-2 py-1 rounded-lg`}>
                                                ✓ Selecionado
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Upload zone */}
                            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] p-24 flex flex-col items-center justify-center gap-6 hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all cursor-pointer group">
                                <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-[2rem] flex items-center justify-center group-hover:scale-110 transition-transform"><i className="bi bi-file-earmark-arrow-up text-4xl text-blue-600"></i></div>
                                <div className="text-center">
                                    <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">Arraste seu CSV</h3>
                                    <p className="text-slate-400 font-medium max-w-sm">
                                        {importMode === 'stock_by_code' ? 'CSV com colunas de Código (SKU) e Estoque' : 'Dica: Se nomes como SOFÁ ficarem estranhos, mude o Encoding para ANSI acima.'}
                                    </p>
                                </div>
                                <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleFileLoad(e.target.files[0])} accept=".csv" className="hidden" />
                            </div>
                        </div>
                    )}

                    {step === 'mapping' && (
                        <div className="flex flex-col gap-8 max-w-4xl mx-auto">
                            <div className="bg-blue-50 dark:bg-blue-950/30 p-8 rounded-[2.5rem] border border-blue-100 dark:border-blue-900/50">
                                <h3 className="text-lg font-black text-blue-800 dark:text-blue-200 uppercase tracking-tight mb-2">Mapear Colunas</h3>
                                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium italic">Relacione os campos do seu sistema com as colunas do arquivo CSV selecionado.</p>
                                {importMode === 'stock_by_code' && (
                                    <div className="mt-3 flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-black uppercase tracking-widest">
                                        <i className="bi bi-boxes" /> Modo Atualizar Estoque — mapeie apenas SKU e Estoque
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-x-12 gap-y-6 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                                {(importMode === 'stock_by_code'
                                    ? [
                                        { id: 'code', label: 'SKU / Código Comercial', required: true },
                                        { id: 'stock', label: 'Estoque Atual', required: true },
                                    ]
                                    : [
                                        { id: 'id', label: 'ID do Produto' },
                                        { id: 'code', label: 'SKU / Código Comercial' },
                                        { id: 'description', label: 'Descrição / Nome', required: true },
                                        { id: 'unitPrice', label: 'Preço de Venda', required: true },
                                        { id: 'costPrice', label: 'Preço de Custo' },
                                        { id: 'stock', label: 'Estoque Atual' },
                                        { id: 'minStock', label: 'Estoque Mínimo' },
                                        { id: 'unit', label: 'Unidade (UN, KG, etc)' },
                                        { id: 'brand', label: 'Marca' },
                                        { id: 'parentId', label: 'Código do Pai (Variações)' },
                                        { id: 'ncm', label: 'NCM' },
                                        { id: 'width', label: 'Largura' },
                                        { id: 'height', label: 'Altura' },
                                        { id: 'depth', label: 'Profundidade' },
                                    ]
                                ).map((field) => (
                                    <div key={field.id} className="flex flex-col gap-2 group transition-all">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                        </label>
                                        <select 
                                            value={mapping[field.id] ?? ''} 
                                            onChange={(e) => handleMappingChange(field.id, e.target.value)}
                                            className="bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 transition-all outline-none appearance-none w-full"
                                        >
                                            <option value="">-- Ignorar Campo --</option>
                                            {csvHeaders.map((header, idx) => (
                                                <option key={idx} value={idx}>{header}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                <button onClick={() => setStep('upload')} className="text-slate-400 hover:text-slate-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                                    <i className="bi bi-arrow-left"></i> Voltar para Upload
                                </button>
                                <button 
                                    onClick={() => {
                                        if (importMode === 'stock_by_code') {
                                            if (mapping.code === null || mapping.stock === null) {
                                                toast.warn('Para atualizar estoque, mapeie os campos SKU e Estoque.');
                                                return;
                                            }
                                        } else if (mapping.description === null || mapping.unitPrice === null) {
                                            toast.warn('Os campos Descrição e Preço de Venda são obrigatórios.');
                                            return;
                                        }
                                        processMappingToPreview();
                                    }} 
                                    className="px-12 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20"
                                >
                                    Continuar para Visualização
                                </button>
                            </div>

                            {/* Modo toggle info */}
                            {importMode === 'update_by_id' && (
                                <div className="flex items-center justify-between p-6 bg-amber-50 dark:bg-amber-900/10 rounded-[2rem] border border-amber-200 dark:border-amber-800/30">
                                    <div>
                                        <h4 className="text-sm font-black text-amber-800 dark:text-amber-200 uppercase tracking-tight">Modo Atualização por ID</h4>
                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Somente produtos já cadastrados com o mesmo ID serão atualizados. Novos registros serão ignorados.</p>
                                    </div>
                                    <i className="bi bi-shield-lock-fill text-amber-500 text-2xl ml-6 shrink-0" />
                                </div>
                            )}
                            {importMode === 'stock_by_code' && (
                                <div className="flex items-center justify-between p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-[2rem] border border-emerald-200 dark:border-emerald-800/30">
                                    <div>
                                        <h4 className="text-sm font-black text-emerald-800 dark:text-emerald-200 uppercase tracking-tight">Modo Atualizar Estoque por SKU</h4>
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Somente o campo de estoque será atualizado nos produtos encontrados pelo código (SKU). Nenhum outro dado será alterado.</p>
                                    </div>
                                    <i className="bi bi-boxes text-emerald-500 text-2xl ml-6 shrink-0" />
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="flex flex-col gap-8">
                            {/* Back Button for Preview */}
                            <div className="flex justify-start">
                                <button onClick={() => setStep('mapping')} className="text-slate-400 hover:text-slate-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                                    <i className="bi bi-arrow-left"></i> Voltar p/ Mapeamento
                                </button>
                            </div>
                            {/* Stats */}
                            <div className="grid grid-cols-4 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Selecionados</p>
                                    <p className="text-2xl font-black text-slate-800 dark:text-white">{selectedIndexes.size} / {importData.length}</p>
                                </div>
                                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100/50 dark:border-emerald-800/30">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Prontos</p>
                                    <p className="text-2xl font-black text-emerald-600">{importData.filter((r, i) => selectedIndexes.has(i) && r.status !== 'error').length}</p>
                                </div>
                                <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-3xl border border-amber-100/50 dark:border-amber-800/30">
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Com Alertas</p>
                                    <p className="text-2xl font-black text-amber-600">{importData.filter(r => r.warning).length}</p>
                                </div>
                                {importMode !== 'full' ? (
                                    <div className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Novos (ignorados)</p>
                                        <p className="text-2xl font-black text-slate-400">{importData.length - selectedIndexes.size}</p>
                                    </div>
                                ) : (
                                    <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-3xl border border-red-100/50 dark:border-red-800/30">
                                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Críticos</p>
                                        <p className="text-2xl font-black text-red-600">{importData.filter(r => r.status === 'error').length}</p>
                                    </div>
                                )}
                            </div>
                            {importMode !== 'full' && (
                                <div className="flex items-center gap-3 px-6 py-3 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-800/30 text-amber-700 dark:text-amber-400 text-xs font-black uppercase tracking-widest">
                                    <i className="bi bi-shield-lock-fill" />
                                    {importMode === 'update_by_id' ? 'Modo Atualização por ID — apenas produtos já cadastrados' : 'Modo Atualizar Estoque — apenas o campo estoque será atualizado'}
                                </div>
                            )}

                            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                                                <th className="px-6 py-4 w-12 text-center">
                                                    <input type="checkbox" checked={selectedIndexes.size === importData.length && importData.length > 0} onChange={toggleAll} className="w-4 h-4 rounded-md border-slate-300 text-blue-600" />
                                                </th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">SKU</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto / Alertas</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{importMode === 'stock_by_code' ? 'Novo Estoque' : 'Venda'}</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                            {importData.map((row, idx) => (
                                                <tr key={idx} className={`group transition-colors ${selectedIndexes.has(idx) ? 'bg-white' : 'bg-slate-50/50 dark:bg-slate-800/20 opacity-60'}`}>
                                                    <td className="px-6 py-4 text-center">
                                                        <input type="checkbox" checked={selectedIndexes.has(idx)} onChange={() => toggleSelection(idx)} className="w-4 h-4 rounded-md border-slate-300 text-blue-600" />
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="font-mono text-[11px] text-slate-400">
                                                            {row.data.id || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`font-mono text-[11px] font-black px-2 py-1 rounded-lg ${!row.data.code ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                            {row.data.code || 'GERAR AO CLICAR'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-1">{row.data.description}</span>
                                                            <div className="flex gap-2 mt-1">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase">{row.data.parentId ? 'Variação' : 'Principal'}</span>
                                                                {row.warning && <span className="text-[9px] font-black text-amber-500 uppercase flex items-center gap-1"><i className="bi bi-exclamation-triangle-fill"></i> {row.warning}</span>}
                                                                {row.status === 'error' && <span className="text-[9px] font-black text-red-500 uppercase flex items-center gap-1"><i className="bi bi-x-circle-fill"></i> {row.error}</span>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-black text-slate-600 dark:text-slate-400">
                                                        {importMode === 'stock_by_code'
                                                            ? <span className="text-emerald-600 font-black">{row.data.stock ?? '—'} un</span>
                                                            : `R$ ${row.data.unitPrice?.toFixed(2)}`
                                                        }
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {row.status === 'pending' && <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aguardando</span>}
                                                        {row.status === 'processing' && <div className="flex items-center gap-2 text-blue-600"><div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div><span className="text-[9px] font-black uppercase">Importando</span></div>}
                                                        {row.status === 'success' && <div className="flex items-center gap-2 text-emerald-600"><i className="bi bi-check-circle-fill"></i><span className="text-[9px] font-black uppercase">Pronto</span></div>}
                                                        {row.status === 'error' && <div className="flex items-center gap-2 text-red-600"><i className="bi bi-x-circle-fill"></i><span className="text-[9px] font-black uppercase">Falhou</span></div>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-10 py-8 border-t border-slate-50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
                    <div className="flex-1 max-w-sm">
                        {isImporting && (
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400"><span>Progresso</span><span>{progress}%</span></div>
                                <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} /></div>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-4">
                        <button onClick={isImporting ? () => { abortRef.current = true; setProgress(0); } : () => { setFile(null); setImportData([]); setProgress(0); setIsCompleted(false); }} className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isImporting ? 'text-red-500 border-red-100 hover:bg-red-50' : 'text-slate-400 hover:text-slate-600'}`}>
                            {isImporting ? 'Cancelar Importação' : 'Limpar Arquivo'}
                        </button>
                        <button onClick={handleStartImport} disabled={!file || isImporting || selectedIndexes.size === 0 || isCompleted} className={`px-12 py-3 ${isCompleted ? 'bg-emerald-600 hover:bg-emerald-700' : importMode === 'stock_by_code' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700'} text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-xl flex items-center gap-2`}>
                            {isCompleted ? <><i className="bi bi-check-all text-lg"></i> CONCLUÍDO</> : isImporting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> PROCESSANDO...</> : importMode === 'stock_by_code' ? <><i className="bi bi-boxes text-lg"></i> ATUALIZAR ESTOQUES</> : <><i className="bi bi-cloud-arrow-up-fill text-lg"></i> IMPORTAR SELECIONADOS</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductImportModal;
