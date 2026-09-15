import React from 'react';
import { AppSettings } from '@/pages/utils/settingsService';

interface ValidationConfigSectionProps {
    settings: AppSettings;
    onChange: (path: string, value: any) => void;
}

const ValidationConfigSection = ({ settings, onChange }: ValidationConfigSectionProps) => {
    const handleToggle = (form: keyof AppSettings['requiredFields'], field: string, value: boolean) => {
        onChange(`requiredFields.${String(form)}.${field}`, value);
    };

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                {/* CLientes & Fornecedores */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50 dark:border-slate-800/50">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500">
                            <i className="bi bi-people-fill text-lg"></i>
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Clientes e Fornecedores</h3>
                    </div>

                    <div className="flex flex-col gap-4">
                        <ToggleRow 
                            label="Telefone / WhatsApp" 
                            checked={settings.requiredFields?.customer?.phone ?? true} 
                            onChange={(checked) => handleToggle('customer', 'phone', checked)} 
                        />
                        <ToggleRow 
                            label="CPF / CNPJ" 
                            checked={settings.requiredFields?.customer?.cpfCnpj ?? false} 
                            onChange={(checked) => handleToggle('customer', 'cpfCnpj', checked)} 
                        />
                        <ToggleRow 
                            label="RG / Inscrição Estadual" 
                            checked={settings.requiredFields?.customer?.rgIe ?? false} 
                            onChange={(checked) => handleToggle('customer', 'rgIe', checked)} 
                        />
                        <ToggleRow 
                            label="E-mail" 
                            checked={settings.requiredFields?.customer?.email ?? false} 
                            onChange={(checked) => handleToggle('customer', 'email', checked)} 
                        />
                        <ToggleRow 
                            label="Endereço Completo" 
                            checked={settings.requiredFields?.customer?.address ?? false} 
                            onChange={(checked) => handleToggle('customer', 'address', checked)} 
                        />
                    </div>
                </div>

                {/* Produtos */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50 dark:border-slate-800/50">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-500">
                            <i className="bi bi-box-seam-fill text-lg"></i>
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Cadastro de Produtos</h3>
                    </div>

                    <div className="flex flex-col gap-4">
                        <ToggleRow 
                            label="Código Genérico (SKU Pai)" 
                            checked={settings.requiredFields?.product?.code ?? false} 
                            onChange={(checked) => handleToggle('product', 'code', checked)} 
                        />
                        <ToggleRow 
                            label="Marca do Produto" 
                            checked={settings.requiredFields?.product?.brand ?? false} 
                            onChange={(checked) => handleToggle('product', 'brand', checked)} 
                        />
                        <ToggleRow 
                            label="Preço de Custo" 
                            checked={settings.requiredFields?.product?.costPrice ?? false} 
                            onChange={(checked) => handleToggle('product', 'costPrice', checked)} 
                        />
                        <ToggleRow 
                            label="Estoque Mínimo" 
                            checked={settings.requiredFields?.product?.minStock ?? false} 
                            onChange={(checked) => handleToggle('product', 'minStock', checked)} 
                        />
                    </div>
                </div>

                {/* Pedidos de Venda */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50 dark:border-slate-800/50">
                        <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500">
                            <i className="bi bi-cart-check-fill text-lg"></i>
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Pedidos de Venda</h3>
                    </div>

                    <div className="flex flex-col gap-4">
                        <ToggleRow 
                            label="Vendedor Responsável" 
                            checked={settings.requiredFields?.salesOrder?.seller ?? true} 
                            onChange={(checked) => handleToggle('salesOrder', 'seller', checked)} 
                        />
                        <div className="mt-2 text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl">
                            Nota: Campos de cliente, produtos e pagamentos em pedidos de venda seguem lógicas vitais do sistema e não podem ser totalmente desativados.
                        </div>
                    </div>
                </div>

                {/* Pedidos de Assistência */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50 dark:border-slate-800/50">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500">
                            <i className="bi bi-tools text-lg"></i>
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Ordens de Assistência</h3>
                    </div>

                    <div className="flex flex-col gap-4">
                        <ToggleRow 
                            label="Cliente / Solicitante" 
                            checked={settings.requiredFields?.assistanceOrder?.customer ?? false} 
                            onChange={(checked) => handleToggle('assistanceOrder', 'customer', checked)} 
                        />
                        <ToggleRow 
                            label="Vendedor Vinculado" 
                            checked={settings.requiredFields?.assistanceOrder?.seller ?? true} 
                            onChange={(checked) => handleToggle('assistanceOrder', 'seller', checked)} 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ValidationConfigSection;

// Small reusable component for the toggles
function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) {
    return (
        <div className="flex items-center justify-between group">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                {label}
            </span>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 ease-in-out ${checked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
            >
                <span className="sr-only">Ativar {label}</span>
                <span aria-hidden="true" className={`pointer-events-none absolute left-0 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
        </div>
    );
}
