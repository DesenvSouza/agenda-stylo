'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, PromoterListDto, InvitePromoterResult } from '@/lib/admin-api';
import {
  Plus, Search, ChevronRight, Check, X, Copy,
  Eye, EyeOff, ToggleLeft, ToggleRight, Percent,
} from 'lucide-react';

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const inputClass =
  'w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-indigo-500/50 transition-colors';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#AAA] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function InfoBox({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-[#111] rounded-xl px-3 py-2.5 border border-white/[0.08]">
      <p className="text-[10px] text-[#555] mb-1">{label}</p>
      <p className={`text-sm text-white ${mono ? 'font-mono' : 'font-medium'}`}>{value}</p>
    </div>
  );
}

function InviteModal({ onClose, onSuccess }: {
  onClose: () => void;
  onSuccess: (r: InvitePromoterResult) => void;
}) {
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
      setError('Erro ao convidar. Verifique se o e-mail já está em uso.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#1A1A1A] border border-white/[0.1] rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="font-semibold text-white">Convidar Promotor</h2>
          <button onClick={onClose} className="text-[#666] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="p-5 space-y-4">
            <Field label="Nome">
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                required placeholder="Nome completo" className={inputClass} />
            </Field>
            <Field label="E-mail">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="promotor@email.com" className={inputClass} />
            </Field>
            <Field label="Comissão (%)">
              <input type="number" min="0" max="100" step="0.5"
                value={commission} onChange={e => setCommission(e.target.value)}
                required className={inputClass} />
            </Field>
            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">{error}</p>
            )}
          </div>
          <div className="flex gap-3 px-5 pb-5">
            <button type="button" onClick={onClose}
              className="flex-1 border border-white/10 rounded-xl py-2.5 text-sm text-[#888] hover:text-white transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
              {loading ? 'Convidando...' : 'Convidar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CredentialsModal({ result, onClose }: { result: InvitePromoterResult; onClose: () => void }) {
  const [showPwd, setShowPwd]   = useState(false);
  const [copied, setCopied]     = useState(false);

  function copy(v: string) {
    navigator.clipboard.writeText(v);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-[#1A1A1A] border border-white/[0.1] rounded-2xl shadow-2xl">
        <div className="p-5 border-b border-white/[0.06] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Check size={16} className="text-emerald-400" />
          </div>
          <h2 className="font-semibold text-white">Promotor convidado!</h2>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-[#888]">
            Compartilhe as credenciais com <span className="text-white">{result.email}</span>.
          </p>
          <InfoBox label="E-mail" value={result.email} />
          <InfoBox label="Código de indicação" value={result.promoterCode} mono />

          {/* Senha com toggle */}
          <div className="bg-[#111] rounded-xl px-3 py-2.5 border border-white/[0.08] flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-[#555] mb-1">Senha temporária</p>
              <p className="text-sm text-white font-mono">
                {showPwd ? result.tempPassword : '••••••••••••'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setShowPwd(!showPwd)} className="text-[#555] hover:text-white transition-colors">
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button onClick={() => copy(result.tempPassword)} className="text-[#555] hover:text-white transition-colors">
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <p className="text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2 border border-amber-500/20">
            O promotor deverá trocar a senha no primeiro acesso.
          </p>
        </div>
        <div className="px-5 pb-5">
          <button onClick={onClose}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
            Fechar
          </button>
        </div>
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
      setPromoters(await adminApi.getPromoters({ search: search || undefined }));
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Promotores</h1>
          <p className="text-[#666] text-sm mt-1">
            {promoters.length} promotor{promoters.length !== 1 ? 'es' : ''} cadastrado{promoters.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus size={15} />
          Convidar
        </button>
      </div>

      {/* Busca */}
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#555]" />
        <input
          type="text"
          placeholder="Buscar promotor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 bg-[#1A1A1A] border border-white/[0.08] text-white placeholder:text-[#444] rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-[#1A1A1A] animate-pulse" />
          ))}
        </div>
      ) : promoters.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-2xl p-10 text-center">
          <p className="text-[#555] text-sm">Nenhum promotor encontrado.</p>
          <button onClick={() => setShowInvite(true)} className="mt-3 text-xs text-indigo-400 hover:underline">
            Convidar o primeiro promotor
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {promoters.map((p: PromoterListDto) => (
            <div key={p.id} className="bg-[#1A1A1A] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-5 transition-colors">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-[#888] font-bold text-sm shrink-0">
                  {p.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-white">{p.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      p.isActive
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-white/[0.06] text-[#666]'
                    }`}>
                      {p.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                    {p.mustChangePassword && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-500/15 text-amber-400">
                        Troca senha
                      </span>
                    )}
                  </div>
                  <p className="text-[#888] text-xs">{p.email}</p>
                  {p.promoterCode && (
                    <p className="text-[#555] text-xs mt-1 font-mono">
                      Código: <span className="text-indigo-400">{p.promoterCode}</span>
                      {' · '}Comissão: {p.commissionPercent}%
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="hidden sm:flex gap-6 text-center shrink-0">
                  <div>
                    <p className="text-lg font-bold text-white">{p.totalConversions}</p>
                    <p className="text-[10px] text-[#555]">conversões</p>
                  </div>
                  <div>
                    <p className="text-base font-bold text-emerald-400">{BRL(p.totalCommission)}</p>
                    <p className="text-[10px] text-[#555]">comissão</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-indigo-400">{p.conversionsThisMonth}</p>
                    <p className="text-[10px] text-[#555]">este mês</p>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Comissão inline */}
                  {editCommission?.id === p.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min="0" max="100" step="0.5"
                        value={editCommission.value}
                        onChange={e => setEditCommission({ id: p.id, value: e.target.value })}
                        className="w-14 bg-[#111] border border-white/10 text-white rounded-lg px-2 py-1 text-xs focus:outline-none"
                      />
                      <span className="text-[10px] text-[#555]">%</span>
                      <button onClick={() => saveCommission(p.id, editCommission.value)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Salvar</button>
                      <button onClick={() => setEditCommission(null)}
                        className="text-xs text-[#555] hover:text-[#888] transition-colors">×</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditCommission({ id: p.id, value: String(p.commissionPercent) })}
                      className="flex items-center gap-1 text-xs text-[#666] hover:text-indigo-400 border border-white/[0.08] rounded-lg px-2 py-1 transition-colors"
                      title="Editar comissão"
                    >
                      <Percent size={11} />
                      {p.commissionPercent}%
                    </button>
                  )}

                  <button
                    onClick={() => toggleStatus(p.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      p.isActive
                        ? 'text-emerald-400 hover:text-red-400 hover:bg-red-500/[0.08]'
                        : 'text-[#555] hover:text-emerald-400 hover:bg-emerald-500/[0.08]'
                    }`}
                    title={p.isActive ? 'Desativar' : 'Ativar'}
                  >
                    {p.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>

                  <Link
                    href={`/admin/promoters/${p.id}`}
                    className="p-1.5 rounded-lg text-[#555] hover:text-indigo-400 transition-colors"
                    title="Ver detalhes"
                  >
                    <ChevronRight size={18} />
                  </Link>
                </div>
              </div>

              {/* Stats mobile + bottom row */}
              <div className="flex gap-4 mt-3 pt-3 border-t border-white/[0.05] text-xs text-[#555]">
                <span className="sm:hidden">
                  <span className="text-white font-medium">{p.totalConversions}</span> conv. ·{' '}
                  <span className="text-emerald-400">{BRL(p.totalCommission)}</span>
                </span>
                <span>Este mês: <span className="text-[#888]">{p.conversionsThisMonth}</span></span>
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
        <CredentialsModal result={inviteResult} onClose={() => setInviteResult(null)} />
      )}
    </div>
  );
}
