'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { YearlyCashFlow } from '@/lib/types/deal';
import { formatCurrency } from '@/lib/utils/formatters';

interface Props {
  cashFlows: YearlyCashFlow[];
  currency: 'BRL';
}

export function CashFlowChart({ cashFlows, currency }: Props) {
  const data = cashFlows.map((cf) => ({
    year: `Y${cf.year}`,
    'Cash Flow': Math.round(cf.cashFlow),
    'Net After Tax': Math.round(cf.netAfterTax),
    'NOI': Math.round(cf.noi),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-sm">
        <p className="font-semibold text-slate-700 mb-2">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.fill }} />
              <span className="text-slate-600">{p.dataKey}</span>
            </div>
            <span className={`font-medium ${p.value >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(p.value, currency)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="font-semibold text-slate-700 mb-4">Annual Cash Flow (20 Years)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: 10, bottom: 5 }}>
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
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}K`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#64748b' }} />
          <ReferenceLine y={0} stroke="#e2e8f0" strokeWidth={2} />
          <Bar dataKey="NOI" fill="#93c5fd" radius={[2, 2, 0, 0]} />
          <Bar dataKey="Cash Flow" fill="#3b82f6" radius={[2, 2, 0, 0]} />
          <Bar dataKey="Net After Tax" fill="#1d4ed8" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-400 mt-2 text-center">
        NOI = Net Operating Income (before debt service) · Cash Flow = after mortgage payments · Net After Tax = after rental income tax
      </p>
    </div>
  );
}
