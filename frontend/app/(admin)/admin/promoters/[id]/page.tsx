'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi, PromoterStats, PromoterConversionDto, MonthlyPromoterStatsDto } from '@/lib/admin-api';
import { ArrowLeft, Award, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

export default function PromoterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [stats, setStats]     = useState<PromoterStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getPromoterStats(params.id as string)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!stats) return <div className="py-20 text-center text-red-400">Promotor não encontrado.</div>;

  const maxCommission = Math.max(...stats.monthlyStats.map(m => m.commission), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{stats.name}</h1>
            {stats.isActive ? (
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 size={10} /> Ativo
              </span>
            ) : (
              <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <XCircle size={10} /> Inativo
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm">{stats.email}</p>
          {stats.promoterCode && (
            <p className="text-xs text-gray-600 mt-0.5">
              Código: <span className="font-mono font-medium text-indigo-400">{stats.promoterCode}</span>
              {' · '}Comissão: <span className="font-medium text-gray-400">{stats.commissionPercent}%</span>
            </p>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            value: stats.totalConversions,
            label: 'Total de Conversões',
            color: 'text-white',
          },
          {
            value: fmt(stats.totalCommission),
            label: 'Comissão Total',
            color: 'text-emerald-400',
          },
          {
            value: (() => {
              const now = new Date();
              return stats.monthlyStats.find(
                m => m.year === now.getFullYear() && m.month === now.getMonth() + 1
              )?.conversions ?? 0;
            })(),
            label: 'Conversões (Mês)',
            color: 'text-indigo-400',
          },
          {
            value: `${stats.commissionPercent}%`,
            label: '% de Comissão',
            color: 'text-orange-400',
          },
        ].map(({ value, label, color }) => (
          <div key={label} className="bg-[#1a1d28] rounded-xl border border-white/6 p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico mensal */}
        <div className="bg-[#1a1d28] rounded-xl border border-white/6 p-6">
          <h2 className="font-semibold text-gray-200 text-sm flex items-center gap-2 mb-5">
            <TrendingUp size={16} className="text-indigo-400" />
            Histórico Mensal
          </h2>
          <div className="flex items-end gap-1.5 h-32">
            {stats.monthlyStats.map((m: MonthlyPromoterStatsDto) => {
              const h = maxCommission > 0 ? (m.commission / maxCommission) * 100 : 0;
              return (
                <div key={`${m.year}-${m.month}`} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="relative w-full" style={{ height: '100px' }}>
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-indigo-500 rounded-t transition-all"
                      style={{ height: `${h}%` }}
                    />
                    <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-gray-900 border border-white/10 text-gray-200 text-xs rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10 shadow-xl">
                      {m.conversions} conv. · {fmt(m.commission)}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-600">{m.monthName}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Conversões recentes */}
        <div className="bg-[#1a1d28] rounded-xl border border-white/6 p-6">
          <h2 className="font-semibold text-gray-200 text-sm flex items-center gap-2 mb-4">
            <Award size={16} className="text-orange-400" />
            Conversões Recentes
          </h2>
          {stats.conversions.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhuma conversão ainda.</p>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {stats.conversions.map((c: PromoterConversionDto) => (
                <div key={c.establishmentId} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold text-xs shrink-0">
                    {c.establishmentName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{c.establishmentName}</p>
                    <p className="text-xs text-gray-600">
                      {c.plan} · {new Date(c.convertedAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-400 shrink-0">{fmt(c.commissionAmount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
