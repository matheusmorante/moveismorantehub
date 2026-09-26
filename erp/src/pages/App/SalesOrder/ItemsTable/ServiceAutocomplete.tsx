import React, { useState, useEffect, useRef } from 'react';
import Service from '../../../types/service.type';
import { subscribeToServices } from '../../../utils/serviceService';

interface ServiceAutocompleteProps {
    value: string;
    onChange: (val: string) => void;
    onSelectService?: (service: Service) => void;
    placeholder?: string;
    className?: string;
}

export const ServiceAutocomplete: React.FC<ServiceAutocompleteProps> = ({
    value,
    onChange,
    onSelectService,
    placeholder = 'Descrição do serviço (ou escolha um cadastrado)...',
    className = ''
}) => {
    const [services, setServices] = useState<Service[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsubscribe = subscribeToServices((data) => {
            setServices(data.filter((s) => s.active && !s.deleted));
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredServices = services.filter((s) =>
        s.description.toLowerCase().includes((value || '').toLowerCase())
    );

    return (
        <div ref={containerRef} className="relative w-full">
            <div className="relative flex items-center">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className={`w-full bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 focus:border-blue-500 px-3 py-2 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal ${className}`}
                />
                {services.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs transition-colors p-1"
                        title="Ver serviços cadastrados"
                    >
                        <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`} />
                    </button>
                )}
            </div>

            {isOpen && filteredServices.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar p-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2.5 py-1">
                        Serviços Cadastrados
                    </div>
                    {filteredServices.map((service) => (
                        <button
                            key={service.id || service.description}
                            type="button"
                            onClick={() => {
                                onChange(service.description);
                                if (onSelectService) {
                                    onSelectService(service);
                                }
                                setIsOpen(false);
                            }}
                            className="w-full text-left px-2.5 py-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl flex items-center justify-between text-xs transition-colors group"
                        >
                            <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                {service.description}
                            </span>
                            {service.unitPrice > 0 && (
                                <span className="font-extrabold text-blue-600 dark:text-blue-400 text-[11px] ml-2 shrink-0">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.unitPrice)}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ServiceAutocomplete;
