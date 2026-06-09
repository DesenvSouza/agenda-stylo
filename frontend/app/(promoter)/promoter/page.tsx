'use client';

import { useEffect, useState } from 'react';
import { promoterApi, PromoterStats, PromoterConversionDto, MonthlyPromoterStatsDto } from '@/lib/admin-api';
import { ADMIN_STORAGE, AdminUser } from '@/lib/admin-api';
import { Award, TrendingUp, Copy, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

export default function PromoterDashboardPage() {
  const router = useRouter();
  const [stats, setStats]     = useState<PromoterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(false);
  const [user, setUser]       = useState<AdminUser | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(ADMIN_STORAGE.USER);
    if (raw) setUser(JSON.parse(raw));

    const mustChange = localStorage.getItem(ADMIN_STORAGE.MUST_CHANGE_PWD) === 'true';
    if (mustChange) { router.replace('/promoter/change-password'); return; }

    promoterApi.getStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, [router]);

  function copyLink() {
    if (!stats?.promoterCode) return;
    const origin = window.location.origin.replace(/\/+$/, '');
    navigator.clipboard.writeText(`${origin}/cadastro?ref=${stats.promoterCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div className="py-20 text-center text-gray-400">Carregando...</div>;
  if (!stats)  return <div className="py-20 text-center text-red-500">Erro ao carregar dados.</div>;

  const now         = new Date();
  const currentMonth = stats.monthlyStats.find(m => m.year === now.getFullYear() && m.month === now.getMonth() + 1);
  const maxCommission = Math.max(...stats.monthlyStats.map(m => m.commission), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Olá, {user?.name ?? stats.name}!</h1>
        <p className="text-gray-500 text-sm mt-1">Acompanhe suas indicações e comissões</p>
      </div>

      {/* Link de indicação */}
      {stats.promoterCode && (
        <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl p-5 text-white">
          <p className="text-sm font-medium opacity-90 mb-1">Seu link de indicação</p>
          <div className="flex items-center gap-3">
            <p className="text-sm font-mono bg-white/20 rounded-lg px-3 py-1.5 flex-1 truncate">
              {typeof window !== 'undefined'
                ? `${window.location.origin}/cadastro?ref=${stats.promoterCode}`
                : `/cadastro?ref=${stats.promoterCode}`}
            </p>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 bg-white text-orange-600 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-orange-50 transition shrink-0"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <p className="text-xs mt-2 opacity-75">Comissão: {stats.commissionPercent}% por estabelecimento convertido</p>
        </div>
      )}

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
          <p className="text-2xl font-bold text-indigo-600">{currentMonth?.conversions ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Conversões (Mês)</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-lg font-bold text-orange-600">{fmt(currentMonth?.commission ?? 0)}</p>
          <p className="text-xs text-gray-500 mt-1">Comissão (Mês)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico mensal */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-5">
            <TrendingUp size={18} className="text-orange-500" />
            Histórico de Comissões
          </h2>
          <div className="flex items-end gap-1.5 h-32">
            {stats.monthlyStats.map((m: MonthlyPromoterStatsDto) => {
              const h = maxCommission > 0 ? (m.commission / maxCommission) * 100 : 0;
              return (
                <div key={`${m.year}-${m.month}`} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="relative w-full" style={{ height: '100px' }}>
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-orange-400 rounded-t transition-all"
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

        {/* Conversões */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <Award size={18} className="text-orange-500" />
            Estabelecimentos Indicados
          </h2>
          {stats.conversions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">Nenhuma indicação convertida ainda.</p>
              <p className="text-xs text-gray-400 mt-1">Compartilhe seu link e comece a ganhar!</p>
            </div>
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
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-green-600">{fmt(c.commissionAmount)}</p>
                    <p className="text-xs text-gray-400">{fmt(c.planAmount)} plano</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
