'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi, EstablishmentAdminDto, PagedEstablishments } from '@/lib/admin-api';
import { Search, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function EstablishmentsAdminPage() {
  const [data, setData]         = useState<PagedEstablishments | null>(null);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage]         = useState(1);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.getEstablishments({
        search: search || undefined,
        category: category || undefined,
        page,
        pageSize,
      });
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [search, category, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, category]);

  return (
    <div className="space-y-5">
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
            className="appearance-none bg-[#1A1A1A] border border-white/[0.08] text-[category ? 'white' : '#555'] rounded-xl px-4 py-2.5 pr-8 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer text-white"
          >
            <option value="">Todas as categorias</option>
            <option value="Salao">Salão</option>
            <option value="Barbearia">Barbearia</option>
            <option value="Estetica">Estética</option>
            <option value="Spa">Spa</option>
            <option value="Outros">Outros</option>
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
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-white/[0.06]">
              {['Estabelecimento', 'Categoria', 'Indicação', 'Receita', 'Agendamentos', 'Cadastro'].map(h => (
                <span key={h} className="text-xs font-medium text-[#555]">{h}</span>
              ))}
            </div>

            <div className="divide-y divide-white/[0.04]">
              {data.items.map((est: EstablishmentAdminDto) => (
                <div key={est.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3.5 items-center hover:bg-white/[0.02] transition-colors">
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

                  <span>
                    {est.referralCode ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-300">
                        {est.referralCode}
                      </span>
                    ) : (
                      <span className="text-[#444] text-xs">—</span>
                    )}
                  </span>

                  <span className="text-sm text-emerald-400 font-medium">{BRL(est.totalRevenue)}</span>
                  <span className="text-sm text-[#888]">{est.totalBookings.toLocaleString('pt-BR')}</span>
                  <span className="text-[11px] text-[#444]">
                    {new Date(est.createdAt).toLocaleDateString('pt-BR')}
                  </span>
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
            { value: data.items.filter(e => e.referralCode).length, label: 'Com indicação', color: 'text-indigo-400' },
            { value: pageSize, label: 'Por página', color: 'text-[#666]' },
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
