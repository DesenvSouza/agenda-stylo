'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi, EstablishmentAdminDto, PagedEstablishments } from '@/lib/admin-api';
import { Search, ChevronLeft, ChevronRight, ChevronDown, Zap, Crown, Check, X, Loader2 } from 'lucide-react';

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ── Modal de Ativar Plano ─────────────────────────────────────────────────────
function ActivatePlanModal({
  establishment,
  onClose,
  onSuccess,
}: {
  establishment: EstablishmentAdminDto;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [plan, setPlan]       = useState<'Basico' | 'Profissional'>(
    (establishment.currentPlan as 'Basico' | 'Profissional') ?? 'Basico'
  );
  const [extId, setExtId]     = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  async function handleActivate() {
    setSaving(true);
    setError('');
    try {
      await adminApi.activatePlan(establishment.id, plan, extId || undefined);
      onSuccess();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? 'Erro ao ativar plano';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-[#1A1A1A] border border-white/[0.1] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-white text-base">Ativar plano</h2>
            <p className="text-xs text-[#666] mt-0.5 truncate max-w-[200px]">{establishment.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#555] hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Escolha de plano */}
        <div className="space-y-2.5 mb-4">
          {(['Basico', 'Profissional'] as const).map((p) => {
            const isBasico = p === 'Basico';
            const label    = isBasico ? 'Básico' : 'Profissional';
            const price    = isBasico ? 'R$29,90/mês' : 'R$49,90/mês';
            const desc     = isBasico
              ? 'Até 2 profissionais e 5 serviços'
              : 'Profissionais e serviços ilimitados';

            return (
              <button
                key={p}
                onClick={() => setPlan(p)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                  plan === p
                    ? isBasico
                      ? 'border-amber-500/50 bg-amber-500/[0.07]'
                      : 'border-indigo-500/50 bg-indigo-500/[0.07]'
                    : 'border-white/[0.07] hover:border-white/[0.14]'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isBasico ? 'bg-amber-500/15' : 'bg-indigo-500/15'
                }`}>
                  {isBasico
                    ? <Zap size={15} className="text-amber-400" />
                    : <Crown size={15} className="text-indigo-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-[11px] text-[#555]">{desc}</p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-xs font-bold text-[#888]">{price}</span>
                  {plan === p && (
                    <Check size={13} className={isBasico ? 'text-amber-400' : 'text-indigo-400'} />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* ID externo (opcional) */}
        <div className="mb-5">
          <label className="text-xs font-medium text-[#666] block mb-1.5">
            ID do pagamento externo (opcional)
          </label>
          <input
            type="text"
            value={extId}
            onChange={(e) => setExtId(e.target.value)}
            placeholder="Ex: pay_xxxxx"
            className="w-full px-3.5 py-2.5 bg-[#111] border border-white/[0.08] text-white placeholder:text-[#333] rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>

        {error && (
          <p className="text-xs text-rose-400 mb-4">{error}</p>
        )}

        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-white/[0.08] text-[#888] text-sm font-medium hover:border-white/[0.15] hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleActivate}
            disabled={saving}
            className="flex-1 h-10 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            Ativar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Badge de plano ────────────────────────────────────────────────────────────
function PlanBadge({ plan }: { plan: string | null }) {
  if (!plan) return <span className="text-[#444] text-xs">—</span>;
  if (plan === 'Profissional')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300">
        <Crown size={9} /> Profissional
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300">
      <Zap size={9} /> Básico
    </span>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function EstablishmentsAdminPage() {
  const [data, setData]         = useState<PagedEstablishments | null>(null);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage]         = useState(1);
  const pageSize = 20;

  // Modal ativar plano
  const [activating, setActivating] = useState<EstablishmentAdminDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.getEstablishments({
        search: search || undefined,
        category: category || undefined,
        plan: planFilter || undefined,
        page,
        pageSize,
      });
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [search, category, planFilter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, category, planFilter]);

  return (
    <div className="space-y-5">
      {/* Modal */}
      {activating && (
        <ActivatePlanModal
          establishment={activating}
          onClose={() => setActivating(null)}
          onSuccess={() => { setActivating(null); load(); }}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Estabelecimentos</h1>
        <p className="text-[#666] text-sm mt-1">
          {data ? `${data.total} estabelecimentos cadastrados` : 'Carregando...'}
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#555]" />
          <input
            type="text"
            placeholder="Buscar por nome ou slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-[#1A1A1A] border border-white/[0.08] text-white placeholder:text-[#444] rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>
        <div className="relative">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="appearance-none bg-[#1A1A1A] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 pr-8 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
          >
            <option value="">Todas categorias</option>
            <option value="Salao">Salão</option>
            <option value="Barbearia">Barbearia</option>
            <option value="Estetica">Estética</option>
            <option value="Spa">Spa</option>
            <option value="Outros">Outros</option>
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="appearance-none bg-[#1A1A1A] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 pr-8 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
          >
            <option value="">Todos os planos</option>
            <option value="Basico">Básico</option>
            <option value="Profissional">Profissional</option>
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" />
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[#555] text-sm">Nenhum estabelecimento encontrado.</p>
          </div>
        ) : (
          <>
            {/* Cabeçalho */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-white/[0.06]">
              {['Estabelecimento', 'Categoria', 'Plano', 'Receita', 'Agendamentos', 'Cadastro', ''].map(h => (
                <span key={h} className="text-xs font-medium text-[#555]">{h}</span>
              ))}
            </div>

            <div className="divide-y divide-white/[0.04]">
              {data.items.map((est: EstablishmentAdminDto) => (
                <div
                  key={est.id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3.5 items-center hover:bg-white/[0.02] transition-colors"
                >
                  {/* Estabelecimento */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-[#888]">
                        {est.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{est.name}</p>
                      <p className="text-[11px] text-[#555] truncate">{est.slug}</p>
                    </div>
                  </div>

                  <span className="text-sm text-[#888]">{est.category}</span>

                  {/* Plano */}
                  <PlanBadge plan={est.currentPlan} />

                  <span className="text-sm text-emerald-400 font-medium">{BRL(est.totalRevenue)}</span>
                  <span className="text-sm text-[#888]">{est.totalBookings.toLocaleString('pt-BR')}</span>
                  <span className="text-[11px] text-[#444]">
                    {new Date(est.createdAt).toLocaleDateString('pt-BR')}
                  </span>

                  {/* Ação */}
                  <button
                    onClick={() => setActivating(est)}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 text-[11px] font-semibold hover:bg-indigo-500/20 transition-colors whitespace-nowrap flex items-center gap-1"
                  >
                    <Zap size={11} />
                    {est.currentPlan ? 'Alterar' : 'Ativar'}
                  </button>
                </div>
              ))}
            </div>

            {/* Paginação */}
            {data.totalPages > 1 && (
              <div className="px-5 py-3.5 border-t border-white/[0.06] flex items-center justify-between">
                <p className="text-xs text-[#555]">
                  Página {data.page} de {data.totalPages} · {data.total} resultados
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-white/[0.08] text-[#666] disabled:opacity-30 hover:border-white/[0.15] hover:text-white transition-colors"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                    disabled={page === data.totalPages}
                    className="p-1.5 rounded-lg border border-white/[0.08] text-[#666] disabled:opacity-30 hover:border-white/[0.15] hover:text-white transition-colors"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Rodapé stats */}
      {!loading && data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value: data.total, label: 'Total cadastrados', color: 'text-white' },
            { value: data.items.filter(e => e.isActive).length, label: 'Ativos (página)', color: 'text-emerald-400' },
            { value: data.items.filter(e => e.currentPlan === 'Profissional').length, label: 'Plano Profissional', color: 'text-indigo-400' },
            { value: data.items.filter(e => e.currentPlan === 'Basico').length, label: 'Plano Básico', color: 'text-amber-400' },
          ].map(({ value, label, color }) => (
            <div key={label} className="bg-[#1A1A1A] border border-white/[0.06] rounded-2xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-[11px] text-[#555] mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
