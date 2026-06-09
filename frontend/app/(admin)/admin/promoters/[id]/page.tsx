'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi, PromoterStats, PromoterConversionDto, MonthlyPromoterStatsDto } from '@/lib/admin-api';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PromoterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [stats, setStats]     = useState<PromoterStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getPromoterStats(params.id as string)
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return (
    <div className="space-y-6">
      <div className="h-16 rounded-2xl bg-[#1A1A1A] animate-pulse" />
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl bg-[#1A1A1A] animate-pulse" />)}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1,2].map(i => <div key={i} className="h-48 rounded-2xl bg-[#1A1A1A] animate-pulse" />)}
      </div>
    </div>
  );

  if (!stats) return (
    <div className="py-20 text-center">
      <p className="text-[#555] text-sm">Promotor não encontrado.</p>
      <button onClick={() => router.back()} className="mt-3 text-xs text-indigo-400 hover:underline">
        Voltar
      </button>
    </div>
  );

  const maxCommission = Math.max(...stats.monthlyStats.map(m => m.commission), 1);
  const now = new Date();
  const thisMonthConversions = stats.monthlyStats.find(
    m => m.year === now.getFullYear() && m.month === now.getMonth() + 1
  )?.conversions ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-[#666] hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{stats.name}</h1>
            {stats.isActive ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-emerald-500/20 text-emerald-300 flex items-center gap-1">
                <CheckCircle2 size={10} /> Ativo
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-white/[0.06] text-[#666] flex items-center gap-1">
                <XCircle size={10} /> Inativo
              </span>
            )}
          </div>
          <p className="text-[#666] text-sm">{stats.email}</p>
          {stats.promoterCode && (
            <p className="text-[#555] text-xs mt-0.5 font-mono">
              Código: <span className="text-indigo-400">{stats.promoterCode}</span>
              {' · '}Comissão: <span className="text-[#888]">{stats.commissionPercent}%</span>
            </p>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { value: String(stats.totalConversions), label: 'Total de Conversões', color: 'text-white' },
          { value: BRL(stats.totalCommission),     label: 'Comissão Total',      color: 'text-emerald-400' },
          { value: String(thisMonthConversions),   label: 'Conversões (Mês)',    color: 'text-indigo-400' },
          { value: `${stats.commissionPercent}%`,  label: '% de Comissão',      color: 'text-amber-400' },
        ].map(({ value, label, color }) => (
          <div key={label} className="bg-[#1A1A1A] border border-white/[0.06] rounded-2xl p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-[11px] text-[#555] mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico mensal */}
        <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-5">Histórico Mensal</h2>
          <div className="flex items-end gap-1 h-28">
            {stats.monthlyStats.map((m: MonthlyPromoterStatsDto) => {
              const h = maxCommission > 0 ? (m.commission / maxCommission) * 100 : 0;
              return (
                <div key={`${m.year}-${m.month}`} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="relative w-full" style={{ height: '90px' }}>
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-indigo-500 rounded-t transition-all"
                      style={{ height: `${h}%` }}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-[#0F0F0F] border border-white/[0.1] text-white text-[10px] rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10 shadow-xl">
                      {m.conversions} conv.
                      <br />
                      <span className="text-emerald-400">{BRL(m.commission)}</span>
                    </div>
                  </div>
                  <span className="text-[9px] text-[#444]">{m.monthName}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Conversões recentes */}
        <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white">Conversões</h2>
          </div>
          {stats.conversions.length === 0 ? (
            <p className="text-xs text-[#555] text-center py-10">Nenhuma conversão ainda.</p>
          ) : (
            <div className="divide-y divide-white/[0.04] max-h-64 overflow-y-auto">
              {stats.conversions.map((c: PromoterConversionDto) => (
                <div key={c.establishmentId} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-[#888]">
                      {c.establishmentName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{c.establishmentName}</p>
                    <p className="text-[11px] text-[#555]">
                      {c.plan} · {new Date(c.convertedAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-400 shrink-0">{BRL(c.commissionAmount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
