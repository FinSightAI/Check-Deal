'use client';

import { Deal, DealAnalysis } from '@/lib/types/deal';
import { formatCurrency, formatPercent } from '@/lib/utils/formatters';
import { RentalMarketInsight } from './RentalMarketInsight';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface Props {
  deal: Deal;
  analysis: DealAnalysis;
}

export function RentalComparison({ deal, analysis }: Props) {
  const { rentalAnalysis } = analysis;
  const { ltr, str } = rentalAnalysis;
  const showSTR = deal.rentalAssumptions.strategy !== 'long-term' && deal.rentalAssumptions.strategy !== 'none';

  // Airbnb monthly data
  const monthlyData = str.monthlyBreakdown.map((m) => ({
    month: m.month,
    income: Math.round(m.income),
    occupancy: m.occupancy,
  }));

  return (
    <div className="space-y-6">
      {/* AI Market Insight */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-xl p-4">
        <RentalMarketInsight
          city={deal.property.city}
          neighborhood={deal.property.neighborhood || ''}
          state={deal.property.state}
          sizeSqm={deal.property.sizeSqm}
          rooms={deal.property.rooms}
          propertyType={deal.property.propertyType}
          userLtrRent={deal.rentalAssumptions.ltr.monthlyRent || undefined}
          userNightlyRate={deal.rentalAssumptions.str.avgNightlyRate || undefined}
        />
      </div>

      {/* Strategy recommendation */}
      {rentalAnalysis.strPremiumPercent !== 0 && showSTR && (
        <div className={`rounded-xl p-4 border ${rentalAnalysis.strPremiumPercent > 15 ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className={`font-semibold ${rentalAnalysis.strPremiumPercent > 15 ? 'text-emerald-800' : 'text-blue-800'}`}>
            {rentalAnalysis.recommendedStrategy === 'short-term'
              ? `🏆 Short-term (Airbnb) earns ${rentalAnalysis.strPremiumPercent.toFixed(0)}% more than long-term`
              : rentalAnalysis.recommendedStrategy === 'hybrid'
              ? `🔄 Hybrid strategy recommended — ${rentalAnalysis.strPremiumPercent.toFixed(0)}% STR premium`
              : '🏠 Long-term rental is recommended for this property'}
          </div>
          {str.breakEvenOccupancy > 0 && (
            <p className="text-sm mt-1 text-slate-600">
              Airbnb break-even occupancy: {str.breakEvenOccupancy.toFixed(0)}% · You projected: {deal.rentalAssumptions.str.occupancyRatePercent}%
            </p>
          )}
        </div>
      )}

      {/* Comparison table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Metric</th>
              <th className="text-right px-5 py-3 font-semibold text-blue-700">Long-Term Rental</th>
              {showSTR && (
                <th className="text-right px-5 py-3 font-semibold text-emerald-700">Airbnb (STR)</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[
              {
                label: 'Gross Annual Income',
                ltr: formatCurrency(ltr.grossAnnualIncome, 'BRL'),
                str: formatCurrency(str.grossAnnualRevenue, 'BRL'),
              },
              {
                label: 'Net Annual Income',
                ltr: formatCurrency(ltr.netAnnualIncome, 'BRL'),
                str: formatCurrency(str.netAnnualIncome, 'BRL'),
                highlight: true,
              },
              {
                label: 'Monthly Net (avg)',
                ltr: formatCurrency(ltr.monthlyNetIncome, 'BRL'),
                str: formatCurrency(str.monthlyAvgIncome, 'BRL'),
              },
              {
                label: 'Gross Yield',
                ltr: formatPercent(ltr.grossYield),
                str: formatPercent(str.grossYield),
              },
              {
                label: 'Net Yield',
                ltr: formatPercent(ltr.netYield),
                str: formatPercent(str.netYield),
                highlight: true,
              },
              {
                label: 'Vacancy Loss',
                ltr: formatCurrency(ltr.vacancyLoss, 'BRL'),
                str: `${(100 - str.occupancyRate).toFixed(0)}% unoccupied`,
              },
              {
                label: 'Income Tax',
                ltr: formatCurrency(ltr.taxOnRent, 'BRL'),
                str: formatCurrency(str.taxOnIncome, 'BRL'),
              },
            ].map((row) => (
              <tr key={row.label} className={row.highlight ? 'bg-blue-50/50' : ''}>
                <td className="px-5 py-3 text-slate-600">{row.label}</td>
                <td className="px-5 py-3 text-right font-medium text-slate-800">{row.ltr}</td>
                {showSTR && (
                  <td className="px-5 py-3 text-right font-medium text-slate-800">{row.str}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* LTR details */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-700 mb-3">Long-Term Rental Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-slate-500">Monthly Rent</div>
            <div className="font-semibold text-slate-800">
              {formatCurrency(deal.rentalAssumptions.ltr.monthlyRent, 'BRL')}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Vacancy Rate</div>
            <div className="font-semibold text-slate-800">{deal.rentalAssumptions.ltr.vacancyRatePercent}%</div>
          </div>
          <div>
            <div className="text-slate-500">Mgmt Fee</div>
            <div className="font-semibold text-slate-800">{deal.rentalAssumptions.ltr.managementFeePercent}%</div>
          </div>
          <div>
            <div className="text-slate-500">Rent Growth</div>
            <div className="font-semibold text-slate-800">{deal.rentalAssumptions.ltr.annualRentGrowthPercent}%/yr</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500">
          Brazil context: Rent is typically adjusted annually by IGPM or IPCA index. Average LTR yields in {deal.property.city}: 4-7%.
        </div>
      </div>

      {/* Airbnb seasonality chart */}
      {showSTR && str.monthlyBreakdown.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Airbnb Monthly Income Projection</h3>
            <div className="text-sm text-slate-500">
              Peak: {formatCurrency(str.peakMonthRevenue, 'BRL')} ·
              Low: {formatCurrency(str.lowMonthRevenue, 'BRL')}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
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
              <Tooltip
                formatter={(v: number) => [formatCurrency(v, 'BRL'), 'Gross Revenue']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Bar dataKey="income" radius={[4, 4, 0, 0]}>
                {monthlyData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.income === Math.max(...monthlyData.map((m) => m.income))
                      ? '#10b981'
                      : entry.income === Math.min(...monthlyData.map((m) => m.income))
                      ? '#f59e0b'
                      : '#3b82f6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 text-xs text-slate-500">
            {deal.property.state === 'RJ' && 'Rio de Janeiro: High demand during Carnaval (Feb) and NYE (Dec). Strong tourism market.'}
            {deal.property.state === 'SC' && 'Santa Catarina: Strong summer season (Dec-Mar) near beach destinations. Lower off-season.'}
            {deal.property.state === 'SP' && 'São Paulo: Business travel drives steady year-round demand. Less seasonal than coastal cities.'}
            {deal.property.state === 'BA' && 'Bahia: Carnaval (Feb) is peak season. Salvador and coastal areas see strong summer demand.'}
            {!['RJ', 'SC', 'SP', 'BA'].includes(deal.property.state) &&
              'Seasonality estimate based on regional tourism patterns. Adjust monthly multipliers in rental settings.'}
          </div>
        </div>
      )}

      {/* STR additional metrics */}
      {showSTR && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Avg Nightly Rate', value: `R$${deal.rentalAssumptions.str.avgNightlyRate}` },
            { label: 'Target Occupancy', value: `${deal.rentalAssumptions.str.occupancyRatePercent}%` },
            { label: 'Platform Fee', value: `${deal.rentalAssumptions.str.platformCommissionPercent}%` },
            { label: 'Break-even Occupancy', value: `${str.breakEvenOccupancy.toFixed(0)}%` },
          ].map((item) => (
            <div key={item.label} className="bg-white border border-slate-200 rounded-xl p-4 text-sm">
              <div className="text-slate-500">{item.label}</div>
              <div className="font-semibold text-slate-800 text-lg mt-0.5">{item.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
