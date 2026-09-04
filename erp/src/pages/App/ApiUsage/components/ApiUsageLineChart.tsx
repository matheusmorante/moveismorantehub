import React, { useState } from 'react';

interface DayData {
    day: number;
    date: string;
    calls: number;
    isProjected?: boolean;
}

interface ApiUsageLineChartProps {
    daysData: DayData[];
    monthlyLimit: number;
    apiName: string;
}

export default function ApiUsageLineChart({ daysData, monthlyLimit, apiName }: ApiUsageLineChartProps) {
    const [hoveredPoint, setHoveredPoint] = useState<DayData | null>(null);

    if (!daysData || daysData.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-xs font-bold text-slate-400">
                Nenhum dado de chamadas registrado no período selecionado.
            </div>
        );
    }

    const maxCalls = Math.max(...daysData.map(d => d.calls), 10);
    const height = 220;
    const width = 700;
    const padding = { top: 20, right: 30, bottom: 30, left: 45 };

    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Gerar pontos (x, y)
    const points = daysData.map((d, index) => {
        const x = padding.left + (index / Math.max(daysData.length - 1, 1)) * graphWidth;
        const y = padding.top + graphHeight - (d.calls / maxCalls) * graphHeight;
        return { ...d, x, y };
    });

    const realPoints = points.filter(p => !p.isProjected);
    const projectedPoints = points.filter((p, i) => p.isProjected || i === realPoints.length - 1);

    const realPathD = realPoints.reduce((acc, curr, index) => {
        return index === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, '');

    const projectedPathD = projectedPoints.reduce((acc, curr, index) => {
        return index === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, '');

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                        Evolução Diária de Requisições — {apiName}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                        Linha contínua: chamadas reais · Linha pontilhada: projeção até o fim do mês
                    </p>
                </div>

                {hoveredPoint && (
                    <div className="text-right">
                        <span className="text-[11px] font-black text-blue-600 dark:text-blue-400">
                            {hoveredPoint.date}: <strong>{hoveredPoint.calls.toLocaleString()} chamadas</strong>
                            {hoveredPoint.isProjected ? ' (Projeção)' : ''}
                        </span>
                    </div>
                )}
            </div>

            <div className="relative w-full overflow-x-auto">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]">
                    {/* Linhas de Grade Horizontais */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                        const y = padding.top + graphHeight * (1 - ratio);
                        const value = Math.round(maxCalls * ratio);
                        return (
                            <g key={i}>
                                <line
                                    x1={padding.left}
                                    y1={y}
                                    x2={width - padding.right}
                                    y2={y}
                                    stroke="currentColor"
                                    className="text-slate-100 dark:text-slate-800/80"
                                    strokeDasharray={ratio > 0 && ratio < 1 ? "4 4" : undefined}
                                />
                                <text
                                    x={padding.left - 8}
                                    y={y + 4}
                                    textAnchor="end"
                                    className="text-[9px] fill-slate-400 font-bold"
                                >
                                    {value}
                                </text>
                            </g>
                        );
                    })}

                    {/* Traçado Real (Azul Sólido) */}
                    {realPathD && (
                        <path
                            d={realPathD}
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}

                    {/* Traçado Projetado (Pontilhado Âmbar) */}
                    {projectedPoints.length > 1 && projectedPathD && (
                        <path
                            d={projectedPathD}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="2"
                            strokeDasharray="4 4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}

                    {/* Pontos Interativos */}
                    {points.map((p, i) => (
                        <circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r={hoveredPoint?.date === p.date ? 5 : 3}
                            className={`cursor-pointer transition-all ${
                                p.isProjected 
                                    ? 'fill-amber-400 stroke-white dark:stroke-slate-900' 
                                    : 'fill-blue-600 stroke-white dark:stroke-slate-900'
                            }`}
                            strokeWidth="2"
                            onMouseEnter={() => setHoveredPoint(p)}
                            onMouseLeave={() => setHoveredPoint(null)}
                        />
                    ))}

                    {/* Eixo X - Dias */}
                    {points.filter((_, i) => i % Math.ceil(points.length / 10) === 0 || i === points.length - 1).map((p, i) => (
                        <text
                            key={i}
                            x={p.x}
                            y={height - 10}
                            textAnchor="middle"
                            className="text-[9px] fill-slate-400 font-bold"
                        >
                            Dia {p.day}
                        </text>
                    ))}
                </svg>
            </div>
        </div>
    );
}
