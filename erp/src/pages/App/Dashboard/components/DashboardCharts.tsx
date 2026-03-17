import React from 'react';

export interface ChartData {
    name: string;
    valor: number;
}

export interface StatusDistribution {
    name: string;
    value: number;
}

export const ChartContainer = ({ title, subtitle, children }: { title: string, subtitle?: string, children: React.ReactNode }) => (
    <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-premium hover:shadow-premium-lg transition-all duration-500 animate-reveal group">
        <div className="mb-10 flex justify-between items-start">
            <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">{title}</h3>
                {subtitle && <p className="text-slate-400 dark:text-slate-500 text-[11px] font-bold uppercase tracking-wider mt-1">{subtitle}</p>}
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                <i className="bi bi-graph-up text-lg"></i>
            </div>
        </div>
        <div className="h-[250px] w-full relative">
            {children}
        </div>
    </div>
);

export const SimpleAreaChart = ({ data }: { data: ChartData[] }) => {
    if (data.length === 0) return <div className="flex items-center justify-center h-full text-slate-400 font-bold uppercase text-xs tracking-widest">Sem dados no período</div>;
    const maxVal = Math.max(...data.map(d => d.valor), 1);
    const width = 1000;
    const height = 250;
    const points = data.map((d, i) => ({
        x: (i / Math.max(data.length - 1, 1)) * width,
        y: height - (d.valor / maxVal) * (height * 0.9) - 5 // Ocupa 90% da altura em vez de 80%
    }));

    const pathData = `M ${points[0].x},${height} ` + 
        points.map(p => `L ${p.x},${p.y}`).join(' ') + 
        ` L ${points[points.length-1].x},${height} Z`;

    const lineData = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
            </defs>
            {[0, 0.25, 0.5, 0.75, 1].map(v => (
                <line key={v} x1="0" y1={height * v} x2={width} y2={height * v} stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" />
            ))}
            <path d={pathData} fill="url(#areaGradient)" />
            <path d={lineData} fill="none" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((p, i) => {
                // Lógica de densidade aprimorada:
                // Tentamos mostrar entre 10 a 12 labels para preencher melhor o espaço.
                // Para 30 dias, isso dá um label a cada 2 ou 3 dias.
                const labelSkip = Math.max(Math.floor(data.length / 11), 1);
                let showLabel = i % labelSkip === 0;
                
                const isLast = i === data.length - 1;
                if (isLast) {
                    showLabel = true;
                } else if (showLabel && (data.length - 1 - i) < (labelSkip * 0.7)) {
                    // Evita label muito colado no último, mas com margem menor para permitir mais dados
                    showLabel = false;
                }

                return (
                    <g key={i}>
                        <circle cx={p.x} cy={p.y} r="8" fill="#3b82f6" stroke="#fff" strokeWidth="4" />
                        {showLabel && (
                            <text 
                                x={p.x} 
                                y={height + 30}
                                textAnchor="middle" 
                                className="text-[14px] font-black fill-slate-400 dark:fill-slate-500 uppercase tracking-tighter"
                            >
                                {data[i].name}
                            </text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
};

export const SimplePieChart = ({ data }: { data: StatusDistribution[] }) => {
    if (data.length === 0) return <div className="flex items-center justify-center h-full text-slate-400 font-bold uppercase text-xs tracking-widest">Sem dados</div>;
    const total = data.reduce((acc, d) => acc + d.value, 0);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    let currentAngle = 0;

    return (
        <svg viewBox="0 0 100 100" className="w-full h-full max-h-[200px] -rotate-90">
            {data.map((d, i) => {
                const angle = (d.value / total) * 360;
                const r = 40;
                const x1 = 50 + r * Math.cos((currentAngle * Math.PI) / 180);
                const y1 = 50 + r * Math.sin((currentAngle * Math.PI) / 180);
                const x2 = 50 + r * Math.cos(((currentAngle + angle) * Math.PI) / 180);
                const y2 = 50 + r * Math.sin(((currentAngle + angle) * Math.PI) / 180);
                
                const path = `M 50 50 L ${x1} ${y1} A ${r} ${r} 0 ${angle > 180 ? 1 : 0} 1 ${x2} ${y2} Z`;
                currentAngle += angle;
                
                return <path key={i} d={path} fill={colors[i % colors.length]} stroke="#fff" strokeWidth="1" />;
            })}
            <circle cx="50" cy="50" r="30" fill="#fff" className="dark:fill-slate-900" />
        </svg>
    );
};
