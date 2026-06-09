'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, AdminSummary, TopPromoterDto, RecentEstablishmentDto } from '@/lib/admin-api';
import {
  Building2,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  Award,
  ArrowUpRight,
  Clock,
} from 'lucide-react';

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function StatCard({
  label, value, sub, icon: Icon, iconClass,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconClass: string;
}) {
  return (
    <div className="bg-[#1a1d28] rounded-xl border border-white/6 p-5 flex gap-4 items-start">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
        <Icon size={19} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getSummary()
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!summary) return <div className="text-center py-20 text-red-400">Erro ao carregar dados.</div>;

  const categoryEntries = Object.entries(summary.establishmentsByCategory).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral do sistema</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Estabelecimentos"
          value={summary.totalEstablishments}
          sub={`+${summary.newThisMonth} este mês`}
          icon={Building2}
          iconClass="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          label="MRR Estimado"
          value={fmt(summary.mrrEstimate)}
          sub={`Receita total: ${fmt(summary.totalRevenue)}`}
          icon={DollarSign}
          iconClass="bg-emerald-500/10 text-emerald-400"
        />
        <StatCard
          label="Agendamentos"
          value={summary.totalBookings.toLocaleString('pt-BR')}
          sub={`${summary.totalBookingsThisMonth} este mês`}
          icon={Calendar}
          iconClass="bg-purple-500/10 text-purple-400"
        />
        <StatCard
          label="Promotores"
          value={summary.totalPromoters}
          sub={`${summary.activePromoters} ativos · ${fmt(summary.totalCommissionsOwed)} em comissões`}
          icon={Users}
          iconClass="bg-orange-500/10 text-orange-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top promotores do mês */}
        <div className="bg-[#1a1d28] rounded-xl border border-white/6 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-200 flex items-center gap-2 text-sm">
              <Award size={16} className="text-orange-400" />
              Top Promotores (Mês)
            </h2>
            <Link href="/admin/promoters" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
              Ver todos <ArrowUpRight size={12} />
            </Link>
          </div>
          {summary.topPromotersThisMonth.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhuma conversão este mês.</p>
          ) : (
            <div className="space-y-3">
              {summary.topPromotersThisMonth.map((p: TopPromoterDto, i: number) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    i === 0 ? 'bg-yellow-500/15 text-yellow-400' :
                    i === 1 ? 'bg-gray-500/15 text-gray-400' :
                    'bg-amber-500/15 text-amber-400'
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.conversions} conversões</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-400 shrink-0">{fmt(p.commission)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Estabelecimentos recentes */}
        <div className="bg-[#1a1d28] rounded-xl border border-white/6 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-200 flex items-center gap-2 text-sm">
              <Clock size={16} className="text-blue-400" />
              Últimos Estabelecimentos
            </h2>
            <Link href="/admin/establishments" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
              Ver todos <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="space-y-1">
            {summary.recentEstablishments.map((est: RecentEstablishmentDto) => (
              <div key={est.id} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
                  {est.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{est.name}</p>
                  <p className="text-xs text-gray-500">{est.category} · {est.slug}</p>
                </div>
                <div className="text-right shrink-0">
                  {est.referralCode && (
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                      {est.referralCode}
                    </span>
                  )}
                  <p className="text-xs text-gray-600 mt-0.5">
                    {new Date(est.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Por categoria */}
      {categoryEntries.length > 0 && (
        <div className="bg-[#1a1d28] rounded-xl border border-white/6 p-6">
          <h2 className="font-semibold text-gray-200 flex items-center gap-2 text-sm mb-5">
            <TrendingUp size={16} className="text-purple-400" />
            Estabelecimentos por Categoria
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {categoryEntries.map(([cat, count]) => (
              <div key={cat} className="bg-white/4 rounded-xl p-4 text-center border border-white/5 hover:bg-white/6 transition-colors">
                <p className="text-2xl font-bold text-white">{count}</p>
                <p className="text-xs text-gray-500 mt-1">{cat}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
