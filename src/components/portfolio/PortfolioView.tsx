'use client';

import { Deal } from '@/lib/types/deal';
import { formatCurrency, formatPercent, getRatingColor, getRatingBg } from '@/lib/utils/formatters';
import { ArrowLeft, TrendingUp, Building2, DollarSign, BarChart2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';

interface Props {
  deals: Deal[];
  onBack: () => void;
  onSelectDeal: (deal: Deal) => void;
}

export function PortfolioView({ deals, onBack, onSelectDeal }: Props) {
  const analyzed = deals.filter((d) => d.analysis);

  if (analyzed.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No analyzed deals yet</p>
          <button onClick={onBack} className="mt-3 text-blue-500 hover:underline text-sm">← Back</button>
        </div>
      </div>
    );
  }

  // Portfolio aggregates
  const totalInvested = analyzed.reduce((sum, d) => sum + (d.analysis!.purchaseCosts.totalCashRequired), 0);
  const totalPropertyValue = analyzed.reduce((sum, d) => sum + (d.property.agreedPrice || d.property.askingPrice), 0);
  const avgGrossYield = analyzed.reduce((sum, d) => sum + d.analysis!.returns.grossYield, 0) / analyzed.length;
  const avgNetYield = analyzed.reduce((sum, d) => sum + d.analysis!.returns.netYield, 0) / analyzed.length;
  const avgCapRate = analyzed.reduce((sum, d) => sum + d.analysis!.returns.capRate, 0) / analyzed.length;
  const totalMonthlyRent = analyzed.reduce((sum, d) => sum + d.rentalAssumptions.ltr.monthlyRent, 0);
  const avgScore = analyzed.reduce((sum, d) => sum + d.analysis!.dealScore.total, 0) / analyzed.length;
  const yr10 = analyzed.map((d) => d.analysis!.returns.projections.find((p) => p.years === 10)?.projectedValue ?? 0);
  const total10YValue = yr10.reduce((sum, v) => sum + v, 0);

  // Monthly CF from year 1 cash flows
  const totalMonthlyCF = analyzed.reduce((sum, d) => {
    const cf1 = d.analysis!.cashFlows[0]?.cashFlow ?? 0;
    return sum + cf1 / 12;
  }, 0);

  // By city
  const cityMap: Record<string, { count: number; invested: number; yield: number }> = {};
  analyzed.forEach((d) => {
    const city = d.property.city || 'Unknown';
    if (!cityMap[city]) cityMap[city] = { count: 0, invested: 0, yield: 0 };
    cityMap[city].count++;
    cityMap[city].invested += d.property.agreedPrice || d.property.askingPrice;
    cityMap[city].yield += d.analysis!.returns.grossYield;
  });
  const cityData = Object.entries(cityMap).map(([city, v]) => ({
    city,
    count: v.count,
    invested: v.invested,
    yield: +(v.yield / v.count).toFixed(2),
  }));

  // By strategy
  const strategyMap: Record<string, number> = {};
  analyzed.forEach((d) => {
    const s = d.rentalAssumptions.strategy;
    strategyMap[s] = (strategyMap[s] ?? 0) + 1;
  });
  const strategyData = Object.entries(strategyMap).map(([name, value]) => ({ name, value }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <Building2 className="w-5 h-5 text-blue-500" />
          <span className="font-semibold text-slate-800">Portfolio Overview</span>
          <span className="text-xs text-slate-400">{analyzed.length} analyzed deal{analyzed.length > 1 ? 's' : ''}</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Aggregate stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Invested', value: formatCurrency(totalInvested, 'BRL', true), icon: DollarSign, color: 'text-blue-600' },
            { label: 'Portfolio Value', value: formatCurrency(totalPropertyValue, 'BRL', true), icon: Building2, color: 'text-emerald-600' },
            { label: 'Avg Gross Yield', value: formatPercent(avgGrossYield), icon: TrendingUp, color: avgGrossYield >= 6 ? 'text-emerald-600' : 'text-orange-500' },
            { label: 'Monthly Rent', value: formatCurrency(totalMonthlyRent, 'BRL'), icon: BarChart2, color: 'text-blue-600' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-slate-500">{stat.label}</span>
              </div>
              <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Avg Net Yield', value: formatPercent(avgNetYield) },
            { label: 'Avg Cap Rate', value: formatPercent(avgCapRate) },
            { label: 'Monthly Cash Flow', value: formatCurrency(totalMonthlyCF, 'BRL'), highlight: totalMonthlyCF >= 0 },
            { label: 'Avg Deal Score', value: `${avgScore.toFixed(0)}/100` },
          ].map((m) => (
            <div key={m.label} className="bg-white border border-slate-200 rounded-xl p-4 text-sm">
              <div className="text-slate-500 mb-1">{m.label}</div>
              <div className={`font-semibold text-lg ${m.highlight !== undefined ? (m.highlight ? 'text-emerald-600' : 'text-red-500') : 'text-slate-700'}`}>
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {/* 10-year projection */}
        {total10YValue > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-100 rounded-xl p-5">
            <div className="text-sm text-slate-500 mb-1">Projected total portfolio value in 10 years</div>
            <div className="text-3xl font-bold text-blue-700">{formatCurrency(total10YValue, 'BRL', true)}</div>
            <div className="text-xs text-slate-400 mt-1">Based on individual appreciation assumptions per deal</div>
          </div>
        )}

        {/* Charts row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Yield by city */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-semibold text-slate-700 mb-4 text-sm">Gross Yield by City</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={cityData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="city" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v: number) => [`${v}%`, 'Avg Yield']} />
                <Bar dataKey="yield" radius={[4, 4, 0, 0]}>
                  {cityData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Strategy split */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-semibold text-slate-700 mb-4 text-sm">Rental Strategy Mix</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={strategyData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                  {strategyData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Deal cards */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Individual Deals</h3>
          <div className="space-y-3">
            {analyzed.map((deal) => {
              const price = deal.property.agreedPrice || deal.property.askingPrice;
              const a = deal.analysis!;
              const cf1Monthly = (a.cashFlows[0]?.cashFlow ?? 0) / 12;
              return (
                <div
                  key={deal.id}
                  onClick={() => onSelectDeal(deal)}
                  className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-800">{deal.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getRatingBg(a.dealScore.rating)}`}>
                          <span className={getRatingColor(a.dealScore.rating)}>{a.dealScore.total}/100</span>
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {deal.property.neighborhood ? `${deal.property.neighborhood}, ` : ''}{deal.property.city} · {deal.property.rooms}BR {deal.property.sizeSqm}m²
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-bold text-slate-800">{formatCurrency(price, 'BRL', true)}</div>
                      <div className="text-xs text-slate-400">{formatCurrency(a.returns.pricePerSqm, 'BRL')}/m²</div>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-3 text-xs">
                    <span>Yield: <strong className="text-blue-600">{formatPercent(a.returns.grossYield)}</strong></span>
                    <span>Cap: <strong>{formatPercent(a.returns.capRate)}</strong></span>
                    <span>CF/mo: <strong className={cf1Monthly >= 0 ? 'text-emerald-600' : 'text-red-500'}>{formatCurrency(cf1Monthly, 'BRL')}</strong></span>
                    <span className="ml-auto text-slate-400 capitalize">{deal.rentalAssumptions.strategy}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
