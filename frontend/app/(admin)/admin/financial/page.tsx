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
          <h1 className="text-2xl font-bold text-gray-900">Relatório Financeiro</h1>
          <p className="text-gray-500 text-sm mt-1">Receita mensal e comissões</p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {[currentYear, currentYear - 1, currentYear - 2].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400">Carregando...</div>
      ) : report ? (
        <>
          {/* Totais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border p-5 flex gap-4 items-start">
              <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                <DollarSign size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Receita Total</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(report.totalRevenue)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border p-5 flex gap-4 items-start">
              <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Comissões Pagas</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(report.totalCommissions)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border p-5 flex gap-4 items-start">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Minus size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Receita Líquida</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(report.netRevenue)}</p>
              </div>
            </div>
          </div>

          {/* Gráfico de barras */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-gray-800 mb-6">Receita Mensal</h2>
            <div className="flex items-end gap-2 h-48">
              {report.monthlyRevenue.map((m: MonthlyRevenueDto) => {
                const height = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full relative group" style={{ height: '160px' }}>
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                        {fmt(m.revenue)}
                        {m.commissions > 0 && <><br />Comissões: {fmt(m.commissions)}</>}
                        {m.newEstablishments > 0 && <><br />+{m.newEstablishments} estab.</>}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0">
                        {/* barra de comissão (empilhada) */}
                        {m.commissions > 0 && (
                          <div
                            className="w-full bg-orange-300 rounded-t"
                            style={{ height: `${(m.commissions / maxRevenue) * 160}px` }}
                          />
                        )}
                        {/* barra de receita */}
                        <div
                          className="w-full bg-indigo-500 rounded-t"
                          style={{ height: `${height * 1.6}px`, marginTop: m.commissions > 0 ? `${(m.commissions / maxRevenue) * 160}px` : 0 }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{m.monthName}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-indigo-500 inline-block" />
                Receita
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-orange-300 inline-block" />
                Comissões
              </span>
            </div>
          </div>

          {/* Tabela mensal */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Mês</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-medium">Receita</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-medium">Comissões</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-medium">Líquido</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-medium">Novos Est.</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {report.monthlyRevenue.map((m: MonthlyRevenueDto) => (
                  <tr key={m.month} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{m.monthName}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{fmt(m.revenue)}</td>
                    <td className="px-4 py-3 text-right text-orange-600">{fmt(m.commissions)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(m.revenue - m.commissions)}</td>
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
