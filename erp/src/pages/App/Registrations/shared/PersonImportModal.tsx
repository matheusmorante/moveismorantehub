import React, { useState, useRef } from 'react';
import Person from '../../../types/person.type';
import { savePeopleBatch, mapAddress } from '@/pages/utils/personService';
import { toast } from 'react-toastify';
import { supabase } from '@/pages/utils/supabaseConfig';

interface PersonImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    collectionName: string;
    title: string;
}

interface ImportRow {
    status: 'pending' | 'processing' | 'success' | 'error';
    error?: string;
    warning?: string;
    data: Partial<Person>;
    csvRow: any[];
}

const PersonImportModal: React.FC<PersonImportModalProps> = ({ isOpen, onClose, onSuccess, collectionName, title }) => {
    const [file, setFile] = useState<File | null>(null);
    const [importData, setImportData] = useState<ImportRow[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [encoding, setEncoding] = useState<'UTF-8' | 'ISO-8859-1'>('UTF-8');
    const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
    
    // Mapping States
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvRows, setCsvRows] = useState<string[][]>([]);
    const [mapping, setMapping] = useState<Record<string, number | null>>({
        id: null,
        fullName: null,
        nickname: null,
        personType: null,
        cpfCnpj: null,
        rgIe: null,
        email: null,
        phone: null,
        zipCode: null,
        street: null,
        number: null,
        complement: null,
        neighborhood: null,
        city: null,
        state: null,
        observation: null
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef(false);

    React.useEffect(() => {
        if (isOpen) {
            setStep('upload');
            setFile(null);
            setImportData([]);
            setProgress(0);
            setIsCompleted(false);
            setSelectedIndexes(new Set());
            setMapping({
                id: null,
                fullName: null,
                nickname: null,
                personType: null,
                cpfCnpj: null,
                rgIe: null,
                email: null,
                phone: null,
                zipCode: null,
                street: null,
                number: null,
                complement: null,
                neighborhood: null,
                city: null,
                state: null,
                observation: null
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const parseCSV = (text: string) => {
        const rows: string[][] = [];
        let currentRow: string[] = [];
        let currentField = '';
        let inQuotes = false;
        
        const firstLine = text.split('\n')[0];
        const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (inQuotes) {
                if (char === '"' && nextChar === '"') {
                    currentField += '"';
                    i++;
                } else if (char === '"') inQuotes = false;
                else currentField += char;
            } else {
                if (char === '"') inQuotes = true;
                else if (char === delimiter) {
                    currentRow.push(currentField.trim());
                    currentField = '';
                } else if (char === '\n' || char === '\r') {
                    if (char === '\r' && nextChar === '\n') i++;
                    currentRow.push(currentField.trim());
                    if (currentRow.some(f => f !== '')) rows.push(currentRow);
                    currentRow = [];
                    currentField = '';
                } else currentField += char;
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
            
            const headers = rows[0].map(h => h.toUpperCase());
            const newMapping = { ...mapping };
            
            const fieldKeywords: Record<string, string[]> = {
                id: ['ID', 'UUID', 'PK'],
                fullName: ['NOME', 'RAZÃO', 'FULL NAME', 'CLIENTE', 'FORNECEDOR'],
                nickname: ['FANTASIA', 'NICKNAME', 'APELIDO'],
                cpfCnpj: ['CPF', 'CNPJ', 'DOCUMENTO'],
                rgIe: ['RG', 'IE', 'INSCRIÇÃO'],
                email: ['EMAIL', 'E-MAIL'],
                phone: ['FONE', 'TELEFONE', 'CELULAR', 'WHATSAPP'],
                zipCode: ['CEP', 'ZIP'],
                street: ['RUA', 'ENDEREÇO', 'LOGRADOURO'],
                number: ['NÚMERO', 'NUMERO'],
                complement: ['COMPLEMENTO'],
                neighborhood: ['BAIRRO'],
                city: ['CIDADE', 'MUNICIPIO'],
                state: ['UF', 'ESTADO'],
                observation: ['OBS', 'OBSERVAÇÃO']
            };

            Object.keys(fieldKeywords).forEach(field => {
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
        setMapping(prev => ({ ...prev, [fieldId]: numValue }));
    };

    const processMappingToPreview = () => {
        const mapped: ImportRow[] = csvRows.map((row): ImportRow => {
            const getVal = (field: string) => mapping[field] !== null ? row[mapping[field]!] : undefined;

            const addrData = {
                zipCode: getVal('zipCode'),
                street: getVal('street'),
                number: getVal('number'),
                complement: getVal('complement'),
                neighborhood: getVal('neighborhood'),
                city: getVal('city'),
                state: getVal('state')
            };

            return {
                status: 'pending',
                csvRow: row,
                data: {
                    id: getVal('id'),
                    fullName: getVal('fullName') || '',
                    nickname: getVal('nickname'),
                    personType: (getVal('cpfCnpj')?.length || 0) > 14 ? 'PJ' : 'PF',
                    cpfCnpj: getVal('cpfCnpj'),
                    rgIe: getVal('rgIe'),
                    email: getVal('email'),
                    phone: getVal('phone'),
                    fullAddress: mapAddress(addrData),
                    observation: getVal('observation'),
                    active: true,
                    type: collectionName as any
                }
            };
        }).filter(r => r.data.fullName && r.data.fullName.trim() !== '');

        setImportData(mapped);
        setSelectedIndexes(new Set(mapped.map((_, i) => i)));
        setStep('preview');
    };

    const runImport = async () => {
        setIsImporting(true);
        setProgress(0);
        abortRef.current = false;
        
        const toProcess = importData.filter((_, i) => selectedIndexes.has(i));
        const total = toProcess.length;
        
        if (total === 0) {
            toast.warn("Selecione registros para importar.");
            setIsImporting(false);
            return;
        }

        try {
            // Processing in chunks of 50 to give feedback and handle large datasets
            const CHUNK_SIZE = 50;
            for (let i = 0; i < total; i += CHUNK_SIZE) {
                if (abortRef.current) break;
                
                const chunk = toProcess.slice(i, i + CHUNK_SIZE).map(r => r.data);
                await savePeopleBatch(collectionName, chunk);
                
                const done = Math.min(i + CHUNK_SIZE, total);
                setProgress(Math.round((done / total) * 100));
            }

            if (!abortRef.current) {
                setIsCompleted(true);
                toast.success(`${total} registros importados com sucesso! ✨`);
                onSuccess();
                setTimeout(onClose, 1500);
            }
        } catch (err: any) {
            toast.error("Erro na importação em lote: " + err.message);
        } finally {
            setIsImporting(false);
        }
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

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={!isImporting ? onClose : undefined} />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800">
                
                {/* Header */}
                <div className="px-10 py-6 border-b border-slate-50 dark:border-slate-800/50 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Importação de {title}</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Carregue sua planilha CSV para processamento em lote</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {step === 'upload' && (
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-100 dark:border-slate-700">
                                <span className="text-[9px] font-black uppercase text-slate-400 px-2">Encoding:</span>
                                <button onClick={() => setEncoding('UTF-8')} className={`px-3 py-1 rounded-lg text-[10px] font-bold ${encoding === 'UTF-8' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>UTF-8</button>
                                <button onClick={() => setEncoding('ISO-8859-1')} className={`px-3 py-1 rounded-lg text-[10px] font-bold ${encoding === 'ISO-8859-1' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>ANSI</button>
                            </div>
                        )}
                        <button onClick={onClose} disabled={isImporting} className="p-2 text-slate-400 hover:text-red-500"><i className="bi bi-x-lg text-xl"></i></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                    {step === 'upload' && (
                        <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] p-32 flex flex-col items-center justify-center gap-6 hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer group">
                            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-[2rem] flex items-center justify-center group-hover:scale-110 transition-transform"><i className="bi bi-file-earmark-arrow-up text-4xl text-blue-600"></i></div>
                            <div className="text-center">
                                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">Arraste seu arquivo CSV</h3>
                                <p className="text-slate-400 font-medium max-w-sm">Dica: Utilize cabeçalhos claros como Nome, CPF/CNPJ, Email, Telefone, CEP, Cidade.</p>
                            </div>
                            <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleFileLoad(e.target.files[0])} accept=".csv" className="hidden" />
                        </div>
                    )}

                    {step === 'mapping' && (
                        <div className="flex flex-col gap-8 max-w-4xl mx-auto">
                            <div className="grid grid-cols-2 gap-x-12 gap-y-6 bg-slate-50 dark:bg-slate-800/30 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                                {[
                                    { id: 'fullName', label: 'Nome Completo / Razão Social', required: true },
                                    { id: 'nickname', label: 'Nome Fantasia / Apelido' },
                                    { id: 'cpfCnpj', label: 'CPF / CNPJ' },
                                    { id: 'email', label: 'E-mail' },
                                    { id: 'phone', label: 'Telefone' },
                                    { id: 'zipCode', label: 'CEP' },
                                    { id: 'street', label: 'Logradouro / Rua' },
                                    { id: 'number', label: 'Número' },
                                    { id: 'complement', label: 'Complemento' },
                                    { id: 'neighborhood', label: 'Bairro' },
                                    { id: 'city', label: 'Cidade' },
                                    { id: 'state', label: 'UF / Estado' },
                                    { id: 'observation', label: 'Observações' }
                                ].map((field) => (
                                    <div key={field.id} className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{field.label} {field.required && '*'}</label>
                                        <select 
                                            value={mapping[field.id] ?? ''} 
                                            onChange={(e) => handleMappingChange(field.id, e.target.value)}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold"
                                        >
                                            <option value="">-- Ignorar --</option>
                                            {csvHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                            <button 
                                onClick={processMappingToPreview} 
                                className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-200"
                            >
                                Avançar para Visualização
                            </button>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Registros encontrados ({importData.length})</h3>
                                <button onClick={toggleAll} className="text-[10px] font-black text-blue-600 uppercase tracking-widest underline underline-offset-4">
                                    {selectedIndexes.size === importData.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                </button>
                            </div>
                            <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-[2rem]">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                                        <tr>
                                            <th className="px-6 py-4 w-10"></th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Nome</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">CPF/CNPJ</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Contato</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Localidade</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {importData.map((row, i) => (
                                            <tr key={i} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${!selectedIndexes.has(i) ? 'opacity-40' : ''}`}>
                                                <td className="px-6 py-4">
                                                    <input type="checkbox" checked={selectedIndexes.has(i)} onChange={() => toggleSelection(i)} className="w-4 h-4 rounded border-slate-300" />
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200">{row.data.fullName}</td>
                                                <td className="px-6 py-4 text-xs font-medium text-slate-400">{row.data.cpfCnpj || '-'}</td>
                                                <td className="px-6 py-4">
                                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{row.data.email}</p>
                                                    <p className="text-[10px] text-slate-400">{row.data.phone}</p>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-medium text-slate-400">
                                                    {row.data.fullAddress?.city} - {row.data.fullAddress?.state}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {isImporting && (
                    <div className="px-10 py-4 bg-slate-900 border-t border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Processando Importação...</span>
                            <span className="text-[10px] font-black text-blue-400">{progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                )}

                {step === 'preview' && !isImporting && (
                    <div className="p-8 border-t border-slate-50 dark:border-slate-800 flex gap-4 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                        <button onClick={() => setStep('mapping')} className="flex-1 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 rounded-2xl font-black uppercase text-[10px] tracking-widest">Voltar</button>
                        <button onClick={runImport} className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-200/50 flex items-center justify-center gap-3">
                            <i className="bi bi-cloud-arrow-up-fill text-lg" />
                            Finalizar Importação ({selectedIndexes.size} Registros)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PersonImportModal;
