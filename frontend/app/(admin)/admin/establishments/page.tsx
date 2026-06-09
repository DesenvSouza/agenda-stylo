'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi, EstablishmentAdminDto, PagedEstablishments } from '@/lib/admin-api';
import { Search, Building2, ChevronLeft, ChevronRight } from 'lucide-react';

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Estabelecimentos</h1>
        <p className="text-gray-500 text-sm mt-1">
          {data ? `${data.total} estabelecimentos cadastrados` : ''}
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nome ou slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#1a1d28] border border-white/8 text-gray-200 placeholder-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-[#1a1d28] border border-white/8 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
        >
          <option value="">Todas as categorias</option>
          <option value="Salao">Salão</option>
          <option value="Barbearia">Barbearia</option>
          <option value="Estetica">Estética</option>
          <option value="Spa">Spa</option>
          <option value="Outros">Outros</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-[#1a1d28] rounded-xl border border-white/6 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="py-20 text-center text-gray-600">Nenhum estabelecimento encontrado.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/3 border-b border-white/6">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Estabelecimento</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Categoria</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Indicação</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Receita</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Agendamentos</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Cadastro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/4">
                  {data.items.map((est: EstablishmentAdminDto) => (
                    <tr key={est.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
                            {est.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-200">{est.name}</p>
                            <p className="text-xs text-gray-600">{est.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{est.category}</td>
                      <td className="px-4 py-3">
                        {est.referralCode ? (
                          <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full text-xs font-medium">
                            {est.referralCode}
                          </span>
                        ) : (
                          <span className="text-gray-700 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-200">{fmt(est.totalRevenue)}</td>
                      <td className="px-4 py-3 text-right text-gray-400">{est.totalBookings.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3 text-right text-gray-600 text-xs">
                        {new Date(est.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {data.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-white/6 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Página {data.page} de {data.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-white/8 text-gray-400 disabled:opacity-30 hover:bg-white/5 transition"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                    disabled={page === data.totalPages}
                    className="p-1.5 rounded-lg border border-white/8 text-gray-400 disabled:opacity-30 hover:bg-white/5 transition"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {!loading && data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value: data.total, label: 'Total', color: 'text-white' },
            { value: data.items.filter(e => e.isActive).length, label: 'Ativos (pág.)', color: 'text-emerald-400' },
            { value: data.items.filter(e => e.referralCode).length, label: 'Com indicação', color: 'text-indigo-400' },
            { value: pageSize, label: 'Por página', color: 'text-gray-400', icon: Building2 },
          ].map(({ value, label, color }) => (
            <div key={label} className="bg-[#1a1d28] rounded-xl border border-white/6 p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-600 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
