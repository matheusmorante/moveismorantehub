import React, { useState } from 'react';
import { toast } from 'react-toastify';

export default function MetaCatalog() {
    const csvUrl = 'https://moveismorante.com.br/api/facebook-catalog.csv';
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(csvUrl);
        setCopied(true);
        toast.success("Link público do Feed Meta CSV copiado com sucesso! 📋");
        setTimeout(() => setCopied(false), 3000);
    };

    const handleDownload = () => {
        window.open(csvUrl, '_blank');
        toast.info("Download do Feed Meta CSV iniciado! ⬇️");
    };

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto p-4 md:p-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
                        <i className="bi bi-meta text-2xl" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                                Catálogo Meta
                            </h1>
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                                Facebook & Instagram
                            </span>
                        </div>
                        <p className="text-slate-400 dark:text-slate-500 text-xs font-medium mt-1">
                            Feed de dados CSV em tempo real para sincronização automática com Meta Commerce Manager
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/20"
                    >
                        <i className="bi bi-download text-sm" />
                        <span>Baixar CSV</span>
                    </button>
                </div>
            </div>

            {/* Main Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left 2 Cols: Public Link Box & Controls */}
                <div className="md:col-span-2 flex flex-col gap-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
                                <i className="bi bi-link-45deg text-blue-500 text-lg" />
                                <span>Link Público do Feed CSV</span>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                Sincronização Dinâmica
                            </span>
                        </div>

                        <p className="text-slate-400 dark:text-slate-500 text-xs leading-relaxed">
                            Cole este link no <b>Meta Commerce Manager</b> em <i>Catálogos &gt; Fontes de Dados &gt; Feed de Dados Programado</i> para atualização automática diária/horária dos produtos.
                        </p>

                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                            <input
                                type="text"
                                readOnly
                                value={csvUrl}
                                className="bg-transparent px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-300 outline-none flex-1 truncate"
                            />
                            <button
                                onClick={handleCopy}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shrink-0 ${copied ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700'}`}
                            >
                                <i className={`bi ${copied ? 'bi-check-lg' : 'bi-copy'}`} />
                                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Operational Rules */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-4">
                        <h3 className="font-black text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2">
                            <i className="bi bi-shield-check text-indigo-500" />
                            Regras de Inclusão no Catálogo Meta
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
                                <i className="bi bi-check-circle-fill text-emerald-500 text-base shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold text-slate-700 dark:text-slate-200 block mb-0.5">Produtos Publicados</span>
                                    <span className="text-slate-400 dark:text-slate-500 text-[11px]">Apenas itens com status "Publicado" e ativos aparecem no CSV.</span>
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
                                <i className="bi bi-eye-slash-fill text-amber-500 text-base shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold text-slate-700 dark:text-slate-200 block mb-0.5">Remoção Automática</span>
                                    <span className="text-slate-400 dark:text-slate-500 text-[11px]">Produtos ocultados ou inativados no ERP são excluídos do CSV no ato.</span>
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
                                <i className="bi bi-tags-fill text-blue-500 text-base shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold text-slate-700 dark:text-slate-200 block mb-0.5">Variações & Atributos</span>
                                    <span className="text-slate-400 dark:text-slate-500 text-[11px]">Cada variação (cor/tamanho) vira um item individual no feed.</span>
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
                                <i className="bi bi-images text-purple-500 text-base shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold text-slate-700 dark:text-slate-200 block mb-0.5">Fotos & Preços</span>
                                    <span className="text-slate-400 dark:text-slate-500 text-[11px]">Imagens principais e promocionais são enviadas formatadas.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right 1 Col: Quick Step-by-Step */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 rounded-3xl border border-slate-800 shadow-lg flex flex-col justify-between gap-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                            <i className="bi bi-sliders text-blue-400 text-xl" />
                            <h3 className="font-black text-sm uppercase tracking-wider text-slate-100">
                                Como Configurar no Meta
                            </h3>
                        </div>

                        <ol className="flex flex-col gap-4 text-xs font-medium text-slate-300">
                            <li className="flex gap-3">
                                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                                <span>Acesse o <b>Meta Commerce Manager</b> e escolha seu catálogo.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                                <span>Navegue até <b>Fontes de Dados &gt; Adicionar Produtos</b>.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                                <span>Selecione <b>Usar um Feed de Dados (Data Feed)</b>.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                                <span>Cole a URL do Feed CSV copiada ao lado.</span>
                            </li>
                        </ol>
                    </div>

                    <button
                        onClick={handleDownload}
                        className="w-full py-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all border border-white/10 flex items-center justify-center gap-2"
                    >
                        <i className="bi bi-file-earmark-arrow-down" />
                        <span>Baixar Arquivo CSV</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
