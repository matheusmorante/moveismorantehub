import React from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { deriveReportAbcChartData } from './reportChartData';

type ReportAbcChartData = ReturnType<typeof deriveReportAbcChartData>;

interface ReportAbcChartProps {
  chartData: ReportAbcChartData;
  analyzedItemCount: number;
}

export const ReportAbcChart: React.FC<ReportAbcChartProps> = ({
  chartData,
  analyzedItemCount,
}) => (
<div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-premium border border-slate-100 dark:border-slate-800">
  <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-10 flex items-center justify-between">
    Análise de Pareto Completa
    <div className="flex items-center gap-6">
      {analyzedItemCount} Itens Analisados
      <div className="flex gap-4 border-l border-slate-100 dark:border-slate-800 pl-6">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>
          <span className="text-[8px] font-black text-slate-400 uppercase">
            Classe A
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></div>
          <span className="text-[8px] font-black text-slate-400 uppercase">
            Classe B
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-slate-400 rounded-full"></div>
          <span className="text-[8px] font-black text-slate-400 uppercase">
            Classe C
          </span>
        </div>
      </div>
    </div>
  </h3>
  <div className="h-[450px] overflow-hidden">
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ bottom: 20 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f1f5f9"
          />
          <XAxis
            dataKey="percItens"
            fontSize={9}
            fontWeight="900"
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${Number(val).toFixed(0)}%`}
          />

          <YAxis
            yAxisId="left"
            fontSize={9}
            fontWeight="900"
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => {
              if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`;
              if (val >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`;
              return `R$ ${val}`;
            }}
            domain={[0, 'dataMax']}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            fontSize={9}
            fontWeight="900"
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${Number(val).toFixed(0)}%`}
            domain={[0, 100]}
          />
          <Tooltip
            formatter={(value, name) => {
              if (name === 'percItens')
                return [`${Number(value).toFixed(1)}%`, 'da Quantidade de Itens'];
              if (name === 'perc')
                return [`${Number(value).toFixed(1)}%`, '% do Lucro Total'];
              if (name === 'lucroAcumulado')
                return [
                  Number(value).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }),
                  'Lucro Mensal Acumulado',
                ];
              return [value, name];
            }}
            labelFormatter={(label, payload) => {
              if (payload && payload.length > 0) {
                const p = payload[0].payload;
                return `${p.percItens.toFixed(1)}% dos itens (${p.numeroItens} produtos até ${p.name})`;
              }
              return `${Number(label).toFixed(1)}% dos Itens`;
            }}
            contentStyle={{
              borderRadius: '20px',
              border: 'none',
              boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.1)',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
            }}
          />

          <Area
            yAxisId="right"
            type="monotone"
            dataKey="perc"
            stroke="transparent"
            fill="url(#colorPerc)"
            strokeWidth={0}
            dot={false}
            fillOpacity={0.1}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="lucroAcumulado"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={false}
          />
          <defs>
            <linearGradient id="colorPerc" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  </div>
</div>
);
