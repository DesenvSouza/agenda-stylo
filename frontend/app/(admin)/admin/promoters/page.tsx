'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, PromoterListDto, InvitePromoterResult } from '@/lib/admin-api';
import {
  UserPlus, Search, CheckCircle2, XCircle, Copy, Eye, EyeOff,
  ArrowUpRight, ToggleLeft, ToggleRight, Percent,
} from 'lucide-react';

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function InviteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (r: InvitePromoterResult) => void }) {
  const [name, setName]             = useState('');
  const [email, setEmail]           = useState('');
  const [commission, setCommission] = useState('20');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await adminApi.invitePromoter({ name, email, commissionPercent: Number(commission) });
      onSuccess(result);
    } catch {
      setError('Erro ao convidar promotor. Verifique se o e-mail já está em uso.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Convidar Promotor</h2>
        {error && <p className="text-sm text-red-600 mb-3 bg-red-50 rounded-lg p-2">{error}</p>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              value={name} onChange={e => setName(e.target.value)} required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Nome completo"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="email@exemplo.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comissão (%)</label>
            <input
              type="number" min="0" max="100" step="0.5"
              value={commission} onChange={e => setCommission(e.target.value)} required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border rounded-lg py-2 text-sm text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Enviando...' : 'Convidar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CredentialsModal({ result, onClose }: { result: InvitePromoterResult; onClose: () => void }) {
  const [showPwd, setShowPwd] = useState(false);
  const copy = (v: string) => navigator.clipboard.writeText(v);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Promotor Convidado!</h2>
        <p className="text-sm text-gray-500 mb-5">Compartilhe as credenciais com o promotor.</p>

        <div className="space-y-3">
          {[
            { label: 'E-mail', value: result.email },
            { label: 'Código de Indicação', value: result.promoterCode },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm font-medium text-gray-900">{value}</p>
              </div>
              <button onClick={() => copy(value)} className="text-gray-400 hover:text-indigo-600">
                <Copy size={16} />
              </button>
            </div>
          ))}

          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
            <div>
              <p className="text-xs text-gray-500">Senha Temporária</p>
              <p className="text-sm font-medium text-gray-900 font-mono">
                {showPwd ? result.tempPassword : '••••••••••••'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowPwd(!showPwd)} className="text-gray-400 hover:text-gray-600">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button onClick={() => copy(result.tempPassword)} className="text-gray-400 hover:text-indigo-600">
                <Copy size={16} />
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 mt-4">
          O promotor deverá trocar a senha no primeiro acesso.
        </p>

        <button onClick={onClose}
          className="mt-4 w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700">
          Fechar
        </button>
      </div>
    </div>
  );
}

export default function PromotersPage() {
  const [promoters, setPromoters] = useState<PromoterListDto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showInvite, setShowInvite]         = useState(false);
  const [inviteResult, setInviteResult]     = useState<InvitePromoterResult | null>(null);
  const [editCommission, setEditCommission] = useState<{ id: string; value: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await adminApi.getPromoters({ search: search || undefined });
      setPromoters(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleStatus(id: string) {
    await adminApi.togglePromoterStatus(id);
    load();
  }

  async function saveCommission(id: string, val: string) {
    const n = parseFloat(val);
    if (isNaN(n) || n < 0 || n > 100) return;
    await adminApi.setCommission(id, n);
    setEditCommission(null);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotores</h1>
          <p className="text-gray-500 text-sm mt-1">{promoters.length} promotores cadastrados</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700"
        >
          <UserPlus size={16} />
          Convidar
        </button>
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar promotor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="py-20 text-center text-gray-400">Carregando...</div>
      ) : promoters.length === 0 ? (
        <div className="py-20 text-center text-gray-400">Nenhum promotor encontrado.</div>
      ) : (
        <div className="space-y-3">
          {promoters.map((p: PromoterListDto) => (
            <div key={p.id} className="bg-white rounded-xl border p-5">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm shrink-0">
                  {p.name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    {p.isActive ? (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={10} /> Ativo
                      </span>
                    ) : (
                      <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <XCircle size={10} /> Inativo
                      </span>
                    )}
                    {p.mustChangePassword && (
                      <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">
                        Troca senha
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{p.email}</p>
                  {p.promoterCode && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Código: <span className="font-mono font-medium text-gray-700">{p.promoterCode}</span>
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-4 sm:gap-6 text-center">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{p.totalConversions}</p>
                    <p className="text-xs text-gray-400">Conversões</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600">{fmt(p.totalCommission)}</p>
                    <p className="text-xs text-gray-400">Comissão total</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-indigo-600">{p.conversionsThisMonth}</p>
                    <p className="text-xs text-gray-400">Esse mês</p>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Editar comissão */}
                  {editCommission?.id === p.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min="0" max="100" step="0.5"
                        value={editCommission.value}
                        onChange={e => setEditCommission({ id: p.id, value: e.target.value })}
                        className="w-16 border rounded px-2 py-1 text-sm"
                      />
                      <span className="text-xs text-gray-400">%</span>
                      <button
                        onClick={() => saveCommission(p.id, editCommission.value)}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditCommission(null)}
                        className="text-xs text-gray-400 hover:underline"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditCommission({ id: p.id, value: String(p.commissionPercent) })}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 border rounded px-2 py-1"
                      title="Editar comissão"
                    >
                      <Percent size={12} />
                      {p.commissionPercent}%
                    </button>
                  )}

                  {/* Toggle status */}
                  <button
                    onClick={() => toggleStatus(p.id)}
                    className={`p-1.5 rounded transition ${p.isActive ? 'text-green-600 hover:text-red-600' : 'text-gray-400 hover:text-green-600'}`}
                    title={p.isActive ? 'Desativar' : 'Ativar'}
                  >
                    {p.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>

                  {/* Ver detalhes */}
                  <Link
                    href={`/admin/promoters/${p.id}`}
                    className="p-1.5 rounded text-gray-400 hover:text-indigo-600 transition"
                    title="Ver detalhes"
                  >
                    <ArrowUpRight size={18} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSuccess={(r) => { setShowInvite(false); setInviteResult(r); load(); }}
        />
      )}

      {inviteResult && (
        <CredentialsModal
          result={inviteResult}
          onClose={() => setInviteResult(null)}
        />
      )}
    </div>
  );
}
