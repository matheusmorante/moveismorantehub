import React, { useState } from 'react';
import { ApiConfiguration } from '@/services/apiMonitoring/apiMonitoringTypes';
import { ApiConfigService } from '@/services/apiMonitoring/apiConfigService';
import { ApiUsageGuard } from '@/services/apiMonitoring/apiUsageGuard';
import { toast } from 'react-toastify';

interface ApiConfigEditModalProps {
    config: ApiConfiguration;
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}

export default function ApiConfigEditModal({ config, isOpen, onClose, onSaved }: ApiConfigEditModalProps) {
    const [formData, setFormData] = useState<ApiConfiguration>({ ...config });
    const [saving, setSaving] = useState(false);

    if (!isOpen) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const success = await ApiConfigService.saveConfiguration(formData);
            if (success) {
                ApiUsageGuard.clearCache(formData.service_id);
                toast.success(`Configurações de ${formData.service_name} salvas com sucesso!`);
                onSaved();
                onClose();
            } else {
                toast.error("Erro ao salvar configuração.");
            }
        } catch (err: any) {
            toast.error(err.message || "Erro ao salvar.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-reveal">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <i className="bi bi-sliders2 text-lg" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                                {formData.service_name}
                            </h3>
                            <p className="text-xs font-bold text-slate-400">
                                Configurações de Limites e Custos
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <i className="bi bi-x-lg text-sm" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="space-y-4 pt-4">
                    {/* Status Ativo / Inativo */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                        <div>
                            <div className="text-xs font-black text-slate-800 dark:text-slate-200">Integração Ativa</div>
                            <div className="text-[11px] text-slate-400">Habilita ou suspende as chamadas externas deste serviço</div>
                        </div>
                        <input
                            type="checkbox"
                            checked={formData.enabled}
                            onChange={e => setFormData({ ...formData, enabled: e.target.checked })}
                            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                    </div>

                    {/* Limite Mensal e Franquia */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                                Limite Mensal ({formData.billing_unit})
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={formData.monthly_limit}
                                onChange={e => setFormData({ ...formData, monthly_limit: Number(e.target.value) })}
                                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                                Franquia Gratuita
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={formData.free_allowance}
                                onChange={e => setFormData({ ...formData, free_allowance: Number(e.target.value) })}
                                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100"
                            />
                        </div>
                    </div>

                    {/* Thresholds: Aviso, Crítico, Hard Limit */}
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-amber-600 mb-1">
                                Aviso (%)
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={100}
                                value={formData.warning_threshold}
                                onChange={e => setFormData({ ...formData, warning_threshold: Number(e.target.value) })}
                                className="w-full px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 text-center"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-rose-500 mb-1">
                                Crítico (%)
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={100}
                                value={formData.critical_threshold}
                                onChange={e => setFormData({ ...formData, critical_threshold: Number(e.target.value) })}
                                className="w-full px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 text-center"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-rose-700 dark:text-rose-400 mb-1">
                                Hard Limit (%)
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={100}
                                value={formData.hard_limit}
                                onChange={e => setFormData({ ...formData, hard_limit: Number(e.target.value) })}
                                className="w-full px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 text-center"
                                required
                            />
                        </div>
                    </div>

                    {/* Bloqueio no Hard Limit */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40">
                        <div>
                            <div className="text-xs font-black text-rose-800 dark:text-rose-300">
                                Bloqueio Preventivo (Hard Limit)
                            </div>
                            <div className="text-[11px] text-rose-600/80 dark:text-rose-400">
                                Suspende novas chamadas não críticas antes de gerar cobrança comercial
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={formData.block_on_hard_limit}
                            disabled={formData.criticality === 'CRITICAL'}
                            onChange={e => setFormData({ ...formData, block_on_hard_limit: e.target.checked })}
                            className="w-5 h-5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                        />
                    </div>

                    {/* Preço por Unidade e Moeda */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                                Preço por Unidade
                            </label>
                            <input
                                type="number"
                                step="0.0001"
                                min={0}
                                value={formData.price_per_unit}
                                onChange={e => setFormData({ ...formData, price_per_unit: Number(e.target.value) })}
                                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                                Moeda
                            </label>
                            <select
                                value={formData.currency}
                                onChange={e => setFormData({ ...formData, currency: e.target.value as 'BRL' | 'USD' })}
                                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100"
                            >
                                <option value="BRL">Real (BRL - R$)</option>
                                <option value="USD">Dólar (USD - $)</option>
                            </select>
                        </div>
                    </div>

                    {/* Circuit Breaker (Teto por Minuto) */}
                    <div>
                        <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                            Circuit Breaker (Máx. chamadas/minuto)
                        </label>
                        <input
                            type="number"
                            min={10}
                            value={formData.circuit_breaker_max_per_minute}
                            onChange={e => setFormData({ ...formData, circuit_breaker_max_per_minute: Number(e.target.value) })}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100"
                            required
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                            Proteção automática contra loops acidentais ou bugs no frontend/mobile.
                        </p>
                    </div>

                    {/* Botões */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Salvando...</span>
                                </>
                            ) : (
                                <span>Salvar Configuração</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
