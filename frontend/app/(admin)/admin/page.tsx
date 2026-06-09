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
  label, value, sub, icon: Icon, color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border p-5 flex gap-4 items-start">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
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

  if (loading) return <div className="text-center py-20 text-gray-400">Carregando...</div>;
  if (!summary) return <div className="text-center py-20 text-red-500">Erro ao carregar dados.</div>;

  const categoryEntries = Object.entries(summary.establishmentsByCategory).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral do sistema</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Estabelecimentos"
          value={summary.totalEstablishments}
          sub={`+${summary.newThisMonth} este mês`}
          icon={Building2}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="MRR Estimado"
          value={fmt(summary.mrrEstimate)}
          sub={`Receita total: ${fmt(summary.totalRevenue)}`}
          icon={DollarSign}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          label="Agendamentos"
          value={summary.totalBookings.toLocaleString('pt-BR')}
          sub={`${summary.totalBookingsThisMonth} este mês`}
          icon={Calendar}
          color="bg-purple-50 text-purple-600"
        />
        <StatCard
          label="Promotores"
          value={summary.totalPromoters}
          sub={`${summary.activePromoters} ativos · ${fmt(summary.totalCommissionsOwed)} em comissões`}
          icon={Users}
          color="bg-orange-50 text-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top promotores do mês */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Award size={18} className="text-orange-500" />
              Top Promotores (Mês)
            </h2>
            <Link href="/admin/promoters" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              Ver todos <ArrowUpRight size={12} />
            </Link>
          </div>
          {summary.topPromotersThisMonth.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma conversão este mês.</p>
          ) : (
            <div className="space-y-3">
              {summary.topPromotersThisMonth.map((p: TopPromoterDto, i: number) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700' :
                    i === 1 ? 'bg-gray-100 text-gray-600' :
                    'bg-amber-100 text-amber-700'
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.conversions} conversões</p>
                  </div>
                  <span className="text-sm font-semibold text-green-600">{fmt(p.commission)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Estabelecimentos recentes */}
        <div className="bg-white rounded-xl border p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Clock size={18} className="text-blue-500" />
              Últimos Estabelecimentos
            </h2>
            <Link href="/admin/establishments" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              Ver todos <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {summary.recentEstablishments.map((est: RecentEstablishmentDto) => (
              <div key={est.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                  {est.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{est.name}</p>
                  <p className="text-xs text-gray-400">{est.category} · {est.slug}</p>
                </div>
                <div className="text-right shrink-0">
                  {est.referralCode && (
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      {est.referralCode}
                    </span>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
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
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-purple-500" />
            Estabelecimentos por Categoria
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {categoryEntries.map(([cat, count]) => (
              <div key={cat} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500 mt-1">{cat}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
