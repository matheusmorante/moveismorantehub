import React, { useState, useEffect } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import { toast } from 'react-toastify';

interface LabelImage {
    id: number;
    name: string;
    image: string;
    category: string;
}

interface LabelImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (image: string) => void;
    currentCategory: string | null;
}

const LabelImageModal: React.FC<LabelImageModalProps> = ({ isOpen, onClose, onSelect, currentCategory }) => {
    const [images, setImages] = useState<LabelImage[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const fetchImages = async () => {
        setLoading(true);
        // Tenta buscar da tabela, se falhar (ex: tabela não existe ainda), limpa a lista
        const { data, error } = await supabase
            .from('label_images')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (data && !error) {
            setImages(data);
        } else if (error) {
            console.error('Erro ao buscar imagens:', error);
            // Se o erro for de tabela inexistente, o usuário receberá o aviso ao tentar salvar pela primeira vez
        }
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen) fetchImages();
    }, [isOpen]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            const name = file.name.split('.')[0].toUpperCase();

            try {
                const { data, error } = await supabase
                    .from('label_images')
                    .insert([{ name, image: base64, category: currentCategory || 'logos' }])
                    .select()
                    .single();

                if (error) {
                    toast.error('Erro ao salvar imagem: ' + error.message);
                } else if (data) {
                    setImages(prev => [data, ...prev]);
                    toast.success('Imagem salva na biblioteca!');
                }
            } catch (err) {
                toast.error('Certifique-se de que a tabela label_images existe no banco.');
            } finally {
                setUploading(false);
            }
        };
        reader.readAsDataURL(file);
        e.target.value = ''; // Reset input
    };

    const handleDelete = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!window.confirm('Excluir esta imagem da biblioteca?')) return;
        
        const { error } = await supabase.from('label_images').delete().eq('id', id);
        if (error) {
            toast.error('Erro ao remover: ' + error.message);
        } else {
            setImages(prev => prev.filter(img => img.id !== id));
            toast.success('Imagem removida.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in slide-in-from-bottom-4 duration-300">
                <header className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Biblioteca de Arte</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gerencie seus Logotipos e Rótulos Customizados</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all flex items-center justify-center"
                    >
                        <i className="bi bi-x-lg text-lg" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {/* Dropzone / Upload Button */}
                        <label className="aspect-square border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10 hover:border-blue-400 transition-all group relative overflow-hidden">
                            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-sm">
                                {uploading ? <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent animate-spin rounded-full" /> : <i className="bi bi-cloud-arrow-up text-2xl" />}
                            </div>
                            <div className="text-center">
                                <span className="block text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-tight">Nova Imagem</span>
                                <span className="block text-[8px] text-slate-400 font-bold uppercase mt-1">Carregar Arquivo</span>
                            </div>
                            <input type="file" hidden accept="image/*" onChange={handleUpload} disabled={uploading} />
                        </label>

                        {loading ? (
                            Array.from({ length: 9 }).map((_, i) => (
                                <div key={i} className="aspect-square bg-slate-50 dark:bg-slate-800 animate-pulse rounded-[2.5rem]" />
                            ))
                        ) : images.length === 0 ? (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300 pointer-events-none">
                                <i className="bi bi-images text-6xl mb-4 opacity-20" />
                                <p className="text-xs font-black uppercase tracking-widest opacity-50">Sua biblioteca está vazia</p>
                            </div>
                        ) : (
                            images.map(img => (
                                <div key={img.id} className="group relative aspect-square bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 transition-all cursor-pointer">
                                    <div className="w-full h-full p-6 flex items-center justify-center relative z-10" onClick={() => onSelect(img.image)}>
                                        <img src={img.image} alt={img.name} className="max-w-full max-h-full object-contain drop-shadow-md" />
                                    </div>
                                    
                                    {/* Overlay Ações - Bottom Style */}
                                    <div className="absolute inset-x-0 bottom-0 p-3 flex gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-20 bg-gradient-to-t from-slate-900/60 to-transparent">
                                        <button 
                                            onClick={() => onSelect(img.image)}
                                            className="flex-1 h-9 bg-blue-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95"
                                        >
                                            Selecionar
                                        </button>
                                        <button 
                                            onClick={(e) => handleDelete(e, img.id)}
                                            className="w-9 h-9 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all flex items-center justify-center"
                                        >
                                            <i className="bi bi-trash3-fill text-xs" />
                                        </button>
                                    </div>

                                    {/* Label flutuante */}
                                    <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-full border border-slate-100 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        <p className="text-[7px] font-black text-slate-800 dark:text-white uppercase truncate max-w-[80px]">{img.name}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <footer className="px-10 py-6 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between shrink-0">
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Tip: Clique em uma imagem para adicionar à sua fila de impressão.</p>
                    <button 
                        onClick={onClose}
                        className="px-6 py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                    >
                        Fechar Biblioteca
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default LabelImageModal;
