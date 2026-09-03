import React, { useState } from 'react';
import Order from '../../../types/order.type';
import ProfitHeatMap from './ProfitHeatMap';

interface GeoMapPanelProps {
    orders: Order[];
}

const GeoMapPanel: React.FC<GeoMapPanelProps> = ({ orders }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                        <i className="bi bi-geo-alt-fill text-blue-600 text-sm" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Radar Geográfico</h3>
                        <p className="text-[10px] text-slate-400 font-semibold">Concentração de vendas por região</p>
                    </div>
                </div>
                <button
                    id="geo-map-expand"
                    onClick={() => setExpanded(e => !e)}
                    className="text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-wider flex items-center gap-1 transition-colors"
                >
                    <i className={`bi ${expanded ? 'bi-arrows-angle-contract' : 'bi-arrows-angle-expand'} text-xs`} />
                    {expanded ? 'Compactar' : 'Expandir'}
                </button>
            </div>
            <div className={`transition-all duration-500 ${expanded ? 'h-[600px]' : 'h-[320px]'}`}>
                <ProfitHeatMap orders={orders} />
            </div>
        </div>
    );
};

export default GeoMapPanel;
