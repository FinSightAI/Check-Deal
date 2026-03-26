'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { YearlyCashFlow, ReturnMetrics } from '@/lib/types/deal';
import { formatCurrency } from '@/lib/utils/formatters';

interface Props {
  cashFlows: YearlyCashFlow[];
  projections: ReturnMetrics['projections'];
  currency: 'BRL';
}

export function ProjectionChart({ cashFlows, projections, currency }: Props) {
  const data = cashFlows.map((cf) => ({
    year: `Y${cf.year}`,
    'Property Value': Math.round(cf.propertyValue),
    'Equity': Math.round(cf.equity),
    'Loan Balance': Math.round(cf.loanBalance),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-sm">
        <p className="font-semibold text-slate-700 mb-2">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.stroke || p.fill }} />
              <span className="text-slate-600">{p.dataKey}</span>
            </div>
            <span className="font-medium text-slate-800">
              {formatCurrency(p.value, currency, true)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">Value & Equity Growth (20 Years)</h3>
        <div className="flex gap-4 text-xs text-slate-500">
          {projections.map((p) => (
            <span key={p.years}>
              {p.years}Y: <span className="font-semibold text-blue-600">{formatCurrency(p.projectedValue, currency, true)}</span>
            </span>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `R$${(v / 1000000).toFixed(1)}M`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#64748b' }} />
          <Area
            type="monotone"
            dataKey="Property Value"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#valueGradient)"
          />
          <Area
            type="monotone"
            dataKey="Equity"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#equityGradient)"
          />
          <Area
            type="monotone"
            dataKey="Loan Balance"
            stroke="#f43f5e"
            strokeWidth={2}
            fill="none"
            strokeDasharray="5 5"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
