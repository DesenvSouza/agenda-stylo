'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi, EstablishmentAdminDto, PagedEstablishments } from '@/lib/admin-api';
import { Search, Building2, ChevronLeft, ChevronRight } from 'lucide-react';

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

export default function EstablishmentsAdminPage() {
  const [data, setData]       = useState<PagedEstablishments | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage]       = useState(1);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.getEstablishments({ search: search || undefined, category: category || undefined, page, pageSize });
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [search, category, page]);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  useEffect(() => { setPage(1); }, [search, category]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Estabelecimentos</h1>
        <p className="text-gray-500 text-sm mt-1">
          {data ? `${data.total} estabelecimentos cadastrados` : ''}
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400">Carregando...</div>
        ) : !data || data.items.length === 0 ? (
          <div className="py-20 text-center text-gray-400">Nenhum estabelecimento encontrado.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Estabelecimento</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Categoria</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Indicação</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Receita</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Agendamentos</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Cadastro</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.items.map((est: EstablishmentAdminDto) => (
                    <tr key={est.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                            {est.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{est.name}</p>
                            <p className="text-xs text-gray-400">{est.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{est.category}</td>
                      <td className="px-4 py-3">
                        {est.referralCode ? (
                          <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                            {est.referralCode}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(est.totalRevenue)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{est.totalBookings.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3 text-right text-gray-400 text-xs">
                        {new Date(est.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {data.totalPages > 1 && (
              <div className="px-4 py-3 border-t flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Página {data.page} de {data.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded border disabled:opacity-40 hover:bg-gray-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                    disabled={page === data.totalPages}
                    className="p-1.5 rounded border disabled:opacity-40 hover:bg-gray-50"
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
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{data.total}</p>
            <p className="text-xs text-gray-500 mt-1">Total</p>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {data.items.filter(e => e.isActive).length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Nesta página (ativos)</p>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">
              {data.items.filter(e => e.referralCode).length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Com código de indicação</p>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-sm font-bold text-gray-900 flex items-center justify-center gap-1">
              <Building2 size={16} />
              {pageSize}
            </p>
            <p className="text-xs text-gray-500 mt-1">Por página</p>
          </div>
        </div>
      )}
    </div>
  );
}
