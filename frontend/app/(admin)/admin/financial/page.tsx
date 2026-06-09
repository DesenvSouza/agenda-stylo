'use client';

import { useEffect, useState } from 'react';
import { adminApi, FinancialReport, MonthlyRevenueDto } from '@/lib/admin-api';
import { TrendingUp, DollarSign, Minus } from 'lucide-react';

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

export default function FinancialPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear]       = useState(currentYear);
  const [report, setReport]   = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi.getFinancialReport(year)
      .then(setReport)
      .finally(() => setLoading(false));
  }, [year]);

  const maxRevenue = report ? Math.max(...report.monthlyRevenue.map(m => m.revenue), 1) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Relatório Financeiro</h1>
          <p className="text-gray-500 text-sm mt-1">Receita mensal e comissões</p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="bg-[#1a1d28] border border-white/8 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
        >
          {[currentYear, currentYear - 1, currentYear - 2].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : report ? (
        <>
          {/* Totais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#1a1d28] rounded-xl border border-white/6 p-5 flex gap-4 items-start">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <DollarSign size={19} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Receita Total</p>
                <p className="text-2xl font-bold text-white mt-0.5">{fmt(report.totalRevenue)}</p>
              </div>
            </div>
            <div className="bg-[#1a1d28] rounded-xl border border-white/6 p-5 flex gap-4 items-start">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0">
                <TrendingUp size={19} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Comissões Pagas</p>
                <p className="text-2xl font-bold text-white mt-0.5">{fmt(report.totalCommissions)}</p>
              </div>
            </div>
            <div className="bg-[#1a1d28] rounded-xl border border-white/6 p-5 flex gap-4 items-start">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <Minus size={19} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Receita Líquida</p>
                <p className="text-2xl font-bold text-white mt-0.5">{fmt(report.netRevenue)}</p>
              </div>
            </div>
          </div>

          {/* Gráfico de barras */}
          <div className="bg-[#1a1d28] rounded-xl border border-white/6 p-6">
            <h2 className="font-semibold text-gray-200 text-sm mb-6">Receita Mensal</h2>
            <div className="flex items-end gap-2 h-48">
              {report.monthlyRevenue.map((m: MonthlyRevenueDto) => {
                const height = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full relative group" style={{ height: '160px' }}>
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-gray-900 border border-white/10 text-gray-200 text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 shadow-xl">
                        {fmt(m.revenue)}
                        {m.commissions > 0 && <><br /><span className="text-orange-400">Comissões: {fmt(m.commissions)}</span></>}
                        {m.newEstablishments > 0 && <><br /><span className="text-blue-400">+{m.newEstablishments} estab.</span></>}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 rounded-t overflow-hidden">
                        {/* barra de comissão */}
                        {m.commissions > 0 && (
                          <div
                            className="w-full bg-orange-500/60 rounded-t"
                            style={{ height: `${(m.commissions / maxRevenue) * 160}px` }}
                          />
                        )}
                        {/* barra de receita */}
                        <div
                          className="w-full bg-indigo-500 rounded-t"
                          style={{
                            height: `${height * 1.6}px`,
                            marginTop: m.commissions > 0 ? `${(m.commissions / maxRevenue) * 160}px` : 0,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-600">{m.monthName}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-5 mt-5 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" />
                Receita
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-orange-500/60 inline-block" />
                Comissões
              </span>
            </div>
          </div>

          {/* Tabela mensal */}
          <div className="bg-[#1a1d28] rounded-xl border border-white/6 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/3 border-b border-white/6">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Mês</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Receita</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Comissões</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Líquido</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Novos Est.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/4">
                {report.monthlyRevenue.map((m: MonthlyRevenueDto) => (
                  <tr key={m.month} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-200">{m.monthName}</td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-medium">{fmt(m.revenue)}</td>
                    <td className="px-4 py-3 text-right text-orange-400">{fmt(m.commissions)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-white">{fmt(m.revenue - m.commissions)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {m.newEstablishments > 0 ? `+${m.newEstablishments}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
