import React, { useState } from 'react';
import { formatCurrency } from '@/pages/utils/formatters';

interface DataPoint {
    name: string;
    valor: number;
    lucro: number;
    orders: number;
}

type ChartMetric = 'valor' | 'lucro' | 'orders';

interface SalesChartProps {
    data: DataPoint[];
}

const METRICS: { key: ChartMetric; label: string; color: string; colorFill: string }[] = [
    { key: 'valor', label: 'Faturamento', color: '#3b82f6', colorFill: 'rgba(59,130,246,0.15)' },
    { key: 'lucro', label: 'Lucro', color: '#10b981', colorFill: 'rgba(16,185,129,0.15)' },
    { key: 'orders', label: 'Pedidos', color: '#8b5cf6', colorFill: 'rgba(139,92,246,0.15)' },
];

const SalesChart: React.FC<SalesChartProps> = ({ data }) => {
    const [metric, setMetric] = useState<ChartMetric>('valor');
    const [hovered, setHovered] = useState<number | null>(null);

    const metricCfg = METRICS.find(m => m.key === metric)!;

    if (data.length === 0) return (
        <div className="flex flex-col items-center justify-center h-52 text-slate-300 dark:text-slate-600 gap-2">
            <i className="bi bi-bar-chart-line text-4xl" />
            <p className="text-xs font-black uppercase tracking-widest">Sem dados no período</p>
        </div>
    );

    const values = data.map(d => d[metric] as number);
    const maxVal = Math.max(...values, 1);
    const width = 1000;
    const height = 220;
    const pad = 20;

    const points = data.map((d, i) => ({
        x: pad + (i / Math.max(data.length - 1, 1)) * (width - pad * 2),
        y: height - ((d[metric] as number) / maxVal) * (height * 0.85) - 10,
        d,
        i,
    }));

    const pathArea = `M ${points[0].x},${height} ${points.map(p => `L ${p.x},${p.y}`).join(' ')} L ${points[points.length - 1].x},${height} Z`;
    const pathLine = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');

    const hovP = hovered !== null ? points[hovered] : null;
    const formatVal = (v: number) => metric === 'orders' ? String(v) : formatCurrency(v);

    const labelSkip = Math.max(Math.floor(data.length / 10), 1);

    return (
        <div className="space-y-4">
            {/* Metric toggle */}
            <div className="flex gap-2 flex-wrap">
                {METRICS.map(m => (
                    <button
                        key={m.key}
                        id={`chart-metric-${m.key}`}
                        onClick={() => setMetric(m.key)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                            metric === m.key
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        {m.label}
                    </button>
                ))}
            </div>

            {/* Chart SVG */}
            <div className="relative">
                <svg
                    viewBox={`0 0 ${width} ${height + 40}`}
                    className="w-full overflow-visible"
                    onMouseLeave={() => setHovered(null)}
                >
                    <defs>
                        <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={metricCfg.color} stopOpacity="0.25" />
                            <stop offset="100%" stopColor={metricCfg.color} stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    {[0.25, 0.5, 0.75, 1].map(v => (
                        <line key={v} x1={pad} y1={height - v * (height * 0.85) - 10} x2={width - pad}
                            y2={height - v * (height * 0.85) - 10}
                            stroke="currentColor" className="text-slate-100 dark:text-slate-800"
                            strokeDasharray="4 4" strokeWidth="1" />
                    ))}

                    <path d={pathArea} fill={`url(#grad-${metric})`} />
                    <path d={pathLine} fill="none" stroke={metricCfg.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Hover areas */}
                    {points.map((p, i) => (
                        <rect
                            key={i}
                            x={i === 0 ? 0 : (points[i - 1].x + p.x) / 2}
                            y={0}
                            width={i === 0
                                ? (points.length > 1 ? (p.x + points[1].x) / 2 : width)
                                : i === points.length - 1
                                    ? width - (points[i - 1].x + p.x) / 2
                                    : (p.x - points[i - 1].x)}
                            height={height}
                            fill="transparent"
                            onMouseEnter={() => setHovered(i)}
                        />
                    ))}

                    {/* Dots */}
                    {points.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r={hovered === i ? 7 : 4}
                            fill={metricCfg.color} stroke="#fff" strokeWidth={hovered === i ? 3 : 2}
                            className="transition-all duration-100" />
                    ))}

                    {/* X labels */}
                    {points.map((p, i) => {
                        const show = i % labelSkip === 0 || i === data.length - 1;
                        if (!show) return null;
                        return (
                            <text key={i} x={p.x} y={height + 28} textAnchor="middle"
                                className="fill-slate-400 dark:fill-slate-500 text-[11px] font-bold">
                                {data[i].name}
                            </text>
                        );
                    })}

                    {/* Tooltip */}
                    {hovP && (() => {
                        const tx = hovP.x > width * 0.75 ? hovP.x - 180 : hovP.x + 12;
                        const ty = Math.max(10, hovP.y - 20);
                        return (
                            <g>
                                <line x1={hovP.x} y1={10} x2={hovP.x} y2={height}
                                    stroke={metricCfg.color} strokeWidth="1" strokeDasharray="4 3" opacity={0.4} />
                                <rect x={tx} y={ty} width={170} height={70} rx="10"
                                    fill="white" className="dark:fill-slate-800" filter="drop-shadow(0 2px 8px rgba(0,0,0,0.12))" />
                                <text x={tx + 12} y={ty + 20} className="fill-slate-500 dark:fill-slate-400 font-bold" fontSize="10">
                                    {hovP.d.name}
                                </text>
                                <text x={tx + 12} y={ty + 38} className="fill-slate-900 dark:fill-slate-100 font-black" fontSize="13">
                                    {formatVal(hovP.d[metric] as number)}
                                </text>
                                <text x={tx + 12} y={ty + 55} className="fill-slate-400 dark:fill-slate-500 font-medium" fontSize="10">
                                    {hovP.d.orders} venda{hovP.d.orders !== 1 ? 's' : ''}
                                </text>
                            </g>
                        );
                    })()}
                </svg>
            </div>
        </div>
    );
};

export default SalesChart;
