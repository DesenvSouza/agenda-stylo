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
  const [stats, setStats]   = useState<PromoterStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getPromoterStats(params.id as string)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="py-20 text-center text-gray-400">Carregando...</div>;
  if (!stats)  return <div className="py-20 text-center text-red-500">Promotor não encontrado.</div>;

  const maxCommission = Math.max(...stats.monthlyStats.map(m => m.commission), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{stats.name}</h1>
            {stats.isActive ? (
              <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 size={10} /> Ativo
              </span>
            ) : (
              <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                <XCircle size={10} /> Inativo
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm">{stats.email}</p>
          {stats.promoterCode && (
            <p className="text-xs text-gray-400 mt-0.5">
              Código: <span className="font-mono font-medium text-indigo-700">{stats.promoterCode}</span>
              {' · '}Comissão: <span className="font-medium">{stats.commissionPercent}%</span>
            </p>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.totalConversions}</p>
          <p className="text-xs text-gray-500 mt-1">Total de Conversões</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-lg font-bold text-green-600">{fmt(stats.totalCommission)}</p>
          <p className="text-xs text-gray-500 mt-1">Comissão Total</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600">
            {stats.monthlyStats.reduce((acc, m) => acc + m.conversions, 0) > 0
              ? stats.monthlyStats.find(m => {
                  const now = new Date();
                  return m.year === now.getFullYear() && m.month === now.getMonth() + 1;
                })?.conversions ?? 0
              : 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">Conversões (Mês)</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-sm font-bold text-orange-600">
            {stats.commissionPercent}%
          </p>
          <p className="text-xs text-gray-500 mt-1">% de Comissão</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico mensal */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-5">
            <TrendingUp size={18} className="text-indigo-500" />
            Histórico Mensal
          </h2>
          <div className="flex items-end gap-1.5 h-32">
            {stats.monthlyStats.map((m: MonthlyPromoterStatsDto) => {
              const h = maxCommission > 0 ? (m.commission / maxCommission) * 100 : 0;
              return (
                <div key={`${m.year}-${m.month}`} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="relative w-full" style={{ height: '100px' }}>
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-indigo-400 rounded-t transition-all"
                      style={{ height: `${h}%` }}
                    />
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
                      {m.conversions} conv. · {fmt(m.commission)}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{m.monthName}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Conversões recentes */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <Award size={18} className="text-orange-500" />
            Conversões Recentes
          </h2>
          {stats.conversions.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma conversão ainda.</p>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {stats.conversions.map((c: PromoterConversionDto) => (
                <div key={c.establishmentId} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 font-bold text-xs shrink-0">
                    {c.establishmentName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.establishmentName}</p>
                    <p className="text-xs text-gray-400">
                      {c.plan} · {new Date(c.convertedAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-green-600 shrink-0">{fmt(c.commissionAmount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
