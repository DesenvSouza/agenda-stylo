'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, AdminSummary, TopPromoterDto, RecentEstablishmentDto } from '@/lib/admin-api';
import {
  Building2, TrendingUp, Users, Calendar,
  DollarSign, ChevronRight,
} from 'lucide-react';

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function MetricCard({
  icon: Icon, label, value, sub, accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent: 'indigo' | 'emerald' | 'blue' | 'amber';
}) {
  const colors = {
    indigo:  { icon: 'text-indigo-400',  bg: 'bg-indigo-500/10'  },
    emerald: { icon: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    blue:    { icon: 'text-blue-400',    bg: 'bg-blue-500/10'    },
    amber:   { icon: 'text-amber-400',   bg: 'bg-amber-500/10'   },
  }[accent];

  return (
    <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-2xl p-5 flex items-start gap-4">
      <div className={`${colors.bg} p-2.5 rounded-xl shrink-0`}>
        <Icon size={18} className={colors.icon} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[#666]">{label}</p>
        <p className="text-xl font-bold text-white mt-0.5 truncate">{value}</p>
        {sub && <p className="text-[11px] text-[#555] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getSummary()
      .then(setSummary)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const s = summary;
  const categoryEntries = s
    ? Object.entries(s.establishmentsByCategory).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-[#666] text-sm mt-1">Visão geral da plataforma</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Building2} label="Estabelecimentos" accent="indigo"
          value={loading ? '—' : String(s?.totalEstablishments ?? 0)}
          sub={loading ? undefined : `+${s?.newThisMonth ?? 0} este mês`}
        />
        <MetricCard
          icon={DollarSign} label="MRR estimado" accent="emerald"
          value={loading ? '—' : BRL(s?.mrrEstimate ?? 0)}
          sub={loading ? undefined : `Total: ${BRL(s?.totalRevenue ?? 0)}`}
        />
        <MetricCard
          icon={Calendar} label="Agendamentos" accent="blue"
          value={loading ? '—' : (s?.totalBookings ?? 0).toLocaleString('pt-BR')}
          sub={loading ? undefined : `${s?.totalBookingsThisMonth ?? 0} este mês`}
        />
        <MetricCard
          icon={Users} label="Promotores" accent="amber"
          value={loading ? '—' : String(s?.totalPromoters ?? 0)}
          sub={loading ? undefined : `${s?.activePromoters ?? 0} ativos`}
        />
      </div>

      {/* Comissões + categorias */}
      {!loading && s && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Comissões */}
          <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-2xl p-5 flex items-center gap-4">
            <div className="bg-amber-500/10 p-2.5 rounded-xl shrink-0">
              <Users size={18} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#666]">Comissões a pagar</p>
              <p className="text-xl font-bold text-white mt-0.5">{BRL(s.totalCommissionsOwed)}</p>
              <p className="text-[11px] text-[#555]">
                {s.totalPromoters} promotores ({s.activePromoters} ativos)
              </p>
            </div>
            <Link href="/admin/promoters" className="text-indigo-400 hover:opacity-70 transition-opacity shrink-0">
              <ChevronRight size={18} />
            </Link>
          </div>

          {/* Por categoria */}
          {categoryEntries.length > 0 && (
            <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-2xl p-5">
              <h2 className="text-xs font-semibold text-[#666] mb-3 uppercase tracking-wide">Por categoria</h2>
              <div className="space-y-2.5">
                {categoryEntries.slice(0, 4).map(([cat, count]) => {
                  const pct = s.totalEstablishments > 0
                    ? Math.round((count / s.totalEstablishments) * 100)
                    : 0;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[#888]">{cat}</span>
                        <span className="text-xs text-[#555]">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top promotores do mês */}
      {!loading && s && s.topPromotersThisMonth.length > 0 && (
        <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white">Top promotores — este mês</h2>
            <Link href="/admin/promoters" className="text-xs text-indigo-400 hover:underline font-medium flex items-center gap-1">
              Ver todos <ChevronRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {s.topPromotersThisMonth.map((p: TopPromoterDto, i: number) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                <span className="text-base w-6 shrink-0">{MEDALS[i] ?? `${i + 1}.`}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{p.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-indigo-400">{p.conversions} conv.</p>
                  <p className="text-[11px] text-emerald-400">{BRL(p.commission)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estabelecimentos recentes */}
      <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">Estabelecimentos recentes</h2>
          <Link href="/admin/establishments" className="text-xs text-indigo-400 hover:underline font-medium flex items-center gap-1">
            Ver todos <ChevronRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 rounded-xl bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : !s || s.recentEstablishments.length === 0 ? (
          <p className="text-xs text-[#555] text-center py-8">Nenhum estabelecimento cadastrado.</p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {s.recentEstablishments.map((est: RecentEstablishmentDto) => (
              <div key={est.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-[#888]">
                    {est.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{est.name}</p>
                  <p className="text-[11px] text-[#555] truncate">{est.category} · {est.slug}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {est.referralCode && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-300">
                      {est.referralCode}
                    </span>
                  )}
                  <span className="text-[11px] text-[#444] whitespace-nowrap">
                    {new Date(est.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Skeleton de loading para seções abaixo */}
      {loading && (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-32 rounded-2xl bg-[#1A1A1A] animate-pulse" />
          ))}
        </div>
      )}
    </div>
  );
}
