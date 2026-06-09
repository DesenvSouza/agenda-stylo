'use client';

import { useEffect, useState } from 'react';
import { adminApi, FinancialReport, MonthlyRevenueDto } from '@/lib/admin-api';
import { ChevronDown } from 'lucide-react';

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function SummaryCard({
  label, value, sub, color,
}: {
  label: string; value: string; sub?: string;
  color: 'emerald' | 'red' | 'amber' | 'blue';
}) {
  const text = {
    emerald: 'text-emerald-400',
    red:     'text-red-400',
    amber:   'text-amber-400',
    blue:    'text-blue-400',
  }[color];

  return (
    <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-2xl p-5">
      <p className="text-xs text-[#666]">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${text}`}>{value}</p>
      {sub && <p className="text-[11px] text-[#555] mt-0.5">{sub}</p>}
    </div>
  );
}

function ProfitBar({ revenue, commissions }: { revenue: number; commissions: number }) {
  if (revenue === 0) return <div className="h-1.5 rounded-full bg-white/[0.06]" />;
  const commPct   = Math.min(100, Math.round((commissions / revenue) * 100));
  const profitPct = 100 - commPct;
  return (
    <div className="h-1.5 rounded-full overflow-hidden bg-white/[0.06] flex">
      <div className="h-full bg-indigo-500 transition-all" style={{ width: `${profitPct}%` }} />
      <div className="h-full bg-orange-500 transition-all" style={{ width: `${commPct}%` }} />
    </div>
  );
}

const YEAR_OPTIONS = (() => {
  const y = new Date().getFullYear();
  return [y, y - 1, y - 2];
})();

export default function FinancialPage() {
  const [year, setYear]       = useState(YEAR_OPTIONS[0]);
  const [report, setReport]   = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi.getFinancialReport(year)
      .then(setReport)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [year]);

  const r = report;
  const totalNet = r ? r.totalRevenue - r.totalCommissions : 0;
  const margin   = r && r.totalRevenue > 0
    ? Math.round(((r.totalRevenue - r.totalCommissions) / r.totalRevenue) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Relatório Financeiro</h1>
          <p className="text-[#666] text-sm mt-1">Receita, comissões e lucro líquido por mês</p>
        </div>
        <div className="relative">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="appearance-none bg-[#1A1A1A] border border-white/[0.08] rounded-xl px-4 py-2.5 pr-9 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
          >
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" />
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Receita total" color="emerald"
          value={loading ? '—' : BRL(r?.totalRevenue ?? 0)}
        />
        <SummaryCard
          label="Comissões pagas" color="red"
          value={loading ? '—' : BRL(r?.totalCommissions ?? 0)}
        />
        <SummaryCard
          label="Receita líquida" color="amber"
          value={loading ? '—' : BRL(totalNet)}
          sub={loading ? undefined : `Margem: ${margin}%`}
        />
        <SummaryCard
          label="Meses com receita" color="blue"
          value={loading ? '—' : String(r?.monthlyRevenue.filter(m => m.revenue > 0).length ?? 0)}
        />
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-5 text-[11px] text-[#555]">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" />
          Receita líquida
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" />
          Comissões
        </span>
      </div>

      {/* Tabela mensal */}
      <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-2xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_2fr] gap-4 px-5 py-3 border-b border-white/[0.06]">
          {['Mês', 'Receita', 'Comissões', 'Líquido', 'Composição'].map(h => (
            <span key={h} className="text-xs font-medium text-[#555]">{h}</span>
          ))}
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded-xl bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : !r || r.monthlyRevenue.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-[#555] text-sm">Nenhum dado para o período selecionado.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-white/[0.04]">
              {r.monthlyRevenue.map((m: MonthlyRevenueDto) => {
                const net    = m.revenue - m.commissions;
                const marg   = m.revenue > 0
                  ? Math.round(((m.revenue - m.commissions) / m.revenue) * 100)
                  : 0;
                return (
                  <div key={m.month} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_2fr] gap-4 px-5 py-3.5 items-center hover:bg-white/[0.02] transition-colors">
                    <span className="text-sm font-semibold text-white">{m.monthName}</span>
                    <span className="text-sm text-emerald-400 font-medium">{BRL(m.revenue)}</span>
                    <span className="text-sm text-orange-400">{BRL(m.commissions)}</span>
                    <span className={`text-sm font-bold ${net < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                      {BRL(net)}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <ProfitBar revenue={m.revenue} commissions={m.commissions} />
                      </div>
                      <span className="text-[10px] text-[#555] w-8 text-right shrink-0">
                        {marg}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rodapé totalizador */}
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_2fr] gap-4 px-5 py-3.5 border-t border-white/[0.06] bg-white/[0.02]">
              <span className="text-xs font-semibold text-[#666]">Total {year}</span>
              <span className="text-sm font-bold text-emerald-400">{BRL(r.totalRevenue)}</span>
              <span className="text-sm font-bold text-orange-400">{BRL(r.totalCommissions)}</span>
              <span className="text-sm font-bold text-amber-400">{BRL(totalNet)}</span>
              <span className="text-xs text-[#555]">Margem média: {margin}%</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
