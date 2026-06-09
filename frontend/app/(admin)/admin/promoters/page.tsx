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

  const inputClass = 'w-full bg-[#0d0f14] border border-white/10 text-gray-200 placeholder-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1a1d28] border border-white/8 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Convidar Promotor</h2>
        {error && <p className="text-sm text-red-400 mb-3 bg-red-500/10 border border-red-500/20 rounded-lg p-2">{error}</p>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Nome</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              className={inputClass} placeholder="Nome completo" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className={inputClass} placeholder="email@exemplo.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Comissão (%)</label>
            <input type="number" min="0" max="100" step="0.5"
              value={commission} onChange={e => setCommission(e.target.value)} required
              className={inputClass} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-white/10 rounded-lg py-2 text-sm text-gray-400 hover:bg-white/5 transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1a1d28] border border-white/8 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Promotor Convidado!</h2>
        <p className="text-sm text-gray-500 mb-5">Compartilhe as credenciais com o promotor.</p>

        <div className="space-y-3">
          {[
            { label: 'E-mail', value: result.email },
            { label: 'Código de Indicação', value: result.promoterCode },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between bg-white/4 border border-white/6 rounded-lg px-3 py-2.5">
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm font-medium text-gray-200">{value}</p>
              </div>
              <button onClick={() => copy(value)} className="text-gray-500 hover:text-indigo-400 transition">
                <Copy size={15} />
              </button>
            </div>
          ))}

          <div className="flex items-center justify-between bg-white/4 border border-white/6 rounded-lg px-3 py-2.5">
            <div>
              <p className="text-xs text-gray-500">Senha Temporária</p>
              <p className="text-sm font-medium text-gray-200 font-mono">
                {showPwd ? result.tempPassword : '••••••••••••'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowPwd(!showPwd)} className="text-gray-500 hover:text-gray-300 transition">
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button onClick={() => copy(result.tempPassword)} className="text-gray-500 hover:text-indigo-400 transition">
                <Copy size={15} />
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 mt-4">
          O promotor deverá trocar a senha no primeiro acesso.
        </p>

        <button onClick={onClose}
          className="mt-4 w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 transition">
          Fechar
        </button>
      </div>
    </div>
  );
}

export default function PromotersPage() {
  const [promoters, setPromoters]           = useState<PromoterListDto[]>([]);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState('');
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
          <h1 className="text-2xl font-bold text-white">Promotores</h1>
          <p className="text-gray-500 text-sm mt-1">{promoters.length} promotores cadastrados</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition"
        >
          <UserPlus size={15} />
          Convidar
        </button>
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Buscar promotor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-[#1a1d28] border border-white/8 text-gray-200 placeholder-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : promoters.length === 0 ? (
        <div className="py-20 text-center text-gray-600">Nenhum promotor encontrado.</div>
      ) : (
        <div className="space-y-3">
          {promoters.map((p: PromoterListDto) => (
            <div key={p.id} className="bg-[#1a1d28] rounded-xl border border-white/6 p-5 hover:border-white/10 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold text-sm shrink-0">
                  {p.name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-200">{p.name}</h3>
                    {p.isActive ? (
                      <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={10} /> Ativo
                      </span>
                    ) : (
                      <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <XCircle size={10} /> Inativo
                      </span>
                    )}
                    {p.mustChangePassword && (
                      <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                        Troca senha
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{p.email}</p>
                  {p.promoterCode && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      Código: <span className="font-mono font-medium text-indigo-400">{p.promoterCode}</span>
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-5 sm:gap-6 text-center">
                  <div>
                    <p className="text-lg font-bold text-white">{p.totalConversions}</p>
                    <p className="text-xs text-gray-600">Conversões</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-emerald-400">{fmt(p.totalCommission)}</p>
                    <p className="text-xs text-gray-600">Comissão total</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-indigo-400">{p.conversionsThisMonth}</p>
                    <p className="text-xs text-gray-600">Esse mês</p>
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
                        className="w-16 bg-[#0d0f14] border border-white/10 text-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                      <span className="text-xs text-gray-500">%</span>
                      <button
                        onClick={() => saveCommission(p.id, editCommission.value)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditCommission(null)}
                        className="text-xs text-gray-600 hover:text-gray-400 transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditCommission({ id: p.id, value: String(p.commissionPercent) })}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-400 border border-white/8 rounded-lg px-2 py-1 transition"
                      title="Editar comissão"
                    >
                      <Percent size={12} />
                      {p.commissionPercent}%
                    </button>
                  )}

                  {/* Toggle status */}
                  <button
                    onClick={() => toggleStatus(p.id)}
                    className={`p-1.5 rounded-lg transition ${
                      p.isActive
                        ? 'text-emerald-400 hover:text-red-400 hover:bg-red-500/10'
                        : 'text-gray-600 hover:text-emerald-400 hover:bg-emerald-500/10'
                    }`}
                    title={p.isActive ? 'Desativar' : 'Ativar'}
                  >
                    {p.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>

                  {/* Ver detalhes */}
                  <Link
                    href={`/admin/promoters/${p.id}`}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition"
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
