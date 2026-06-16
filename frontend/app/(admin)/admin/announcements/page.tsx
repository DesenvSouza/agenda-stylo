'use client';

import { useEffect, useState } from 'react';
import {
  announcementsAdminApi,
  AnnouncementAdminDto,
  UpsertAnnouncementPayload,
} from '@/lib/admin-api';
import {
  Plus, Pencil, Trash2, X, Megaphone,
  Sparkles, Info, AlertTriangle, AlertCircle,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_OPTIONS = ['Novidade', 'Info', 'Aviso', 'Urgente'] as const;
const TARGET_OPTIONS   = ['Todos', 'Basico', 'Profissional'] as const;

const SEVERITY_BADGES: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  Novidade: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: Sparkles },
  Info:     { bg: 'bg-blue-500/10',    text: 'text-blue-400',    icon: Info },
  Aviso:    { bg: 'bg-amber-500/10',   text: 'text-amber-400',   icon: AlertTriangle },
  Urgente:  { bg: 'bg-red-500/10',     text: 'text-red-400',     icon: AlertCircle },
};

const TARGET_LABELS: Record<string, string> = {
  Todos:        'Todos',
  Basico:       'Plano Básico',
  Profissional: 'Plano Profissional',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toInputDate(iso: string) {
  return iso ? iso.slice(0, 16) : '';
}

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

// ── Modal de criação / edição ─────────────────────────────────────────────────

interface ModalProps {
  initial: AnnouncementAdminDto | null;
  onClose: () => void;
  onSaved: (dto: AnnouncementAdminDto) => void;
}

function AnnouncementModal({ initial, onClose, onSaved }: ModalProps) {
  const [title,         setTitle]         = useState(initial?.title         ?? '');
  const [body,          setBody]          = useState(initial?.body          ?? '');
  const [severity,      setSeverity]      = useState(initial?.severity      ?? 'Info');
  const [target,        setTarget]        = useState(initial?.target        ?? 'Todos');
  const [startsAt,      setStartsAt]      = useState(initial ? toInputDate(initial.startsAt) : '');
  const [endsAt,        setEndsAt]        = useState(initial ? toInputDate(initial.endsAt)   : '');
  const [actionLabel,   setActionLabel]   = useState(initial?.actionLabel   ?? '');
  const [actionUrl,     setActionUrl]     = useState(initial?.actionUrl     ?? '');
  const [isDismissible, setIsDismissible] = useState(initial?.isDismissible ?? true);
  const [isActive,      setIsActive]      = useState(initial?.isActive      ?? true);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!title.trim() || !body.trim() || !startsAt || !endsAt) {
      setError('Preencha título, texto, data de início e fim.');
      return;
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      setError('A data de encerramento deve ser posterior à data de início.');
      return;
    }

    const payload: UpsertAnnouncementPayload = {
      title: title.trim(),
      body: body.trim(),
      severity,
      target,
      startsAt: new Date(startsAt).toISOString(),
      endsAt:   new Date(endsAt).toISOString(),
      actionLabel: actionLabel.trim() || null,
      actionUrl:   actionUrl.trim()   || null,
      isDismissible,
      isActive,
    };

    setLoading(true);
    try {
      const saved = initial
        ? await announcementsAdminApi.update(initial.id, payload)
        : await announcementsAdminApi.create(payload);
      onSaved(saved);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string; title?: string } } })
        ?.response?.data?.detail
        ?? (err as { response?: { data?: { title?: string } } })?.response?.data?.title
        ?? 'Erro ao salvar comunicado.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-[#1A1A1A] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <h2 className="text-white font-semibold text-base">
            {initial ? 'Editar comunicado' : 'Novo comunicado'}
          </h2>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={submit} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <Field label="Título *">
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="Ex: Manutenção programada"
            />
          </Field>

          <Field label="Texto *">
            <textarea
              className={`${inputClass} resize-none h-24`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              placeholder="Descreva o comunicado..."
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Severidade">
              <select
                className={inputClass}
                value={severity}
                onChange={(e) => setSeverity(e.target.value as typeof SEVERITY_OPTIONS[number])}
              >
                {SEVERITY_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Público-alvo">
              <select
                className={inputClass}
                value={target}
                onChange={(e) => setTarget(e.target.value as typeof TARGET_OPTIONS[number])}
              >
                {TARGET_OPTIONS.map((t) => (
                  <option key={t} value={t}>{TARGET_LABELS[t]}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Início *">
              <input
                type="datetime-local"
                className={inputClass}
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </Field>
            <Field label="Encerramento *">
              <input
                type="datetime-local"
                className={inputClass}
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Texto do botão (opcional)">
              <input
                className={inputClass}
                value={actionLabel}
                onChange={(e) => setActionLabel(e.target.value)}
                maxLength={80}
                placeholder="Saiba mais"
              />
            </Field>
            <Field label="URL do botão (opcional)">
              <input
                className={inputClass}
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                maxLength={500}
                placeholder="https://..."
              />
            </Field>
          </div>

          <div className="flex gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm text-[#888] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isDismissible}
                onChange={(e) => setIsDismissible(e.target.checked)}
                className="accent-indigo-500 w-4 h-4"
              />
              Permite fechar
            </label>
            <label className="flex items-center gap-2 text-sm text-[#888] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="accent-indigo-500 w-4 h-4"
              />
              Ativo
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-white/[0.06] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-[#888] hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors"
          >
            {loading ? 'Salvando...' : initial ? 'Salvar alterações' : 'Criar comunicado'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirmação de exclusão ───────────────────────────────────────────────────

function DeleteConfirm({ onConfirm, onCancel, loading }: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm bg-[#1A1A1A] border border-white/[0.08] rounded-2xl shadow-2xl p-6">
        <p className="text-white font-semibold mb-2">Excluir comunicado?</p>
        <p className="text-[#888] text-sm mb-5">Esta ação é permanente e não pode ser desfeita.</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-[#888] hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 transition-colors"
          >
            {loading ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function AdminAnnouncementsPage() {
  const [items,       setItems]       = useState<AnnouncementAdminDto[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [editing,     setEditing]     = useState<AnnouncementAdminDto | null>(null);
  const [deleting,    setDeleting]    = useState<AnnouncementAdminDto | null>(null);
  const [delLoading,  setDelLoading]  = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setItems(await announcementsAdminApi.list()); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }

  function handleSaved(dto: AnnouncementAdminDto) {
    setItems((prev) => {
      const exists = prev.find((a) => a.id === dto.id);
      return exists
        ? prev.map((a) => (a.id === dto.id ? dto : a))
        : [dto, ...prev];
    });
    setShowModal(false);
    setEditing(null);
  }

  async function handleDelete() {
    if (!deleting) return;
    setDelLoading(true);
    try {
      await announcementsAdminApi.remove(deleting.id);
      setItems((prev) => prev.filter((a) => a.id !== deleting.id));
      setDeleting(null);
    } catch { /* ignore */ }
    finally { setDelLoading(false); }
  }

  const now = new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Megaphone size={18} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg">Comunicados</h1>
            <p className="text-[#555] text-xs">Avisos exibidos no painel dos estabelecimentos</p>
          </div>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
        >
          <Plus size={15} />
          Novo comunicado
        </button>
      </div>

      {/* Lista */}
      <div className="bg-[#161616] border border-white/[0.06] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[#555] text-sm">Carregando...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Megaphone size={32} className="text-[#333]" />
            <p className="text-[#555] text-sm">Nenhum comunicado criado ainda.</p>
            <button
              onClick={() => { setEditing(null); setShowModal(true); }}
              className="text-indigo-400 text-sm hover:text-indigo-300 transition-colors"
            >
              Criar o primeiro comunicado
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {/* Cabeçalho */}
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 text-[10px] font-semibold tracking-wider text-[#444] uppercase">
              <span>Título</span>
              <span>Severidade</span>
              <span>Público</span>
              <span>Período</span>
              <span>Status</span>
              <span />
            </div>

            {items.map((item) => {
              const badge  = SEVERITY_BADGES[item.severity] ?? SEVERITY_BADGES.Info;
              const SvIcon = badge.icon;
              const isExpired = new Date(item.endsAt) < now;
              const isPending = new Date(item.startsAt) > now;
              const isLive    = !isExpired && !isPending && item.isActive;

              return (
                <div
                  key={item.id}
                  className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-4"
                >
                  {/* Título + body */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.title}</p>
                    <p className="text-xs text-[#666] truncate mt-0.5">{item.body}</p>
                  </div>

                  {/* Severidade */}
                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${badge.bg} ${badge.text}`}>
                      <SvIcon size={11} />
                      {item.severity}
                    </span>
                  </div>

                  {/* Público */}
                  <span className="text-xs text-[#888]">{TARGET_LABELS[item.target] ?? item.target}</span>

                  {/* Período */}
                  <span className="text-xs text-[#666]">
                    {fmtDate(item.startsAt)} → {fmtDate(item.endsAt)}
                  </span>

                  {/* Status */}
                  <div>
                    {!item.isActive ? (
                      <span className="text-xs text-[#555]">Inativo</span>
                    ) : isExpired ? (
                      <span className="text-xs text-[#555]">Expirado</span>
                    ) : isPending ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Agendado
                      </span>
                    ) : isLive ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Ao vivo
                      </span>
                    ) : null}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditing(item); setShowModal(true); }}
                      className="p-2 rounded-lg text-[#555] hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleting(item)}
                      className="p-2 rounded-lg text-[#555] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modais */}
      {showModal && (
        <AnnouncementModal
          initial={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}
      {deleting && (
        <DeleteConfirm
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
          loading={delLoading}
        />
      )}
    </div>
  );
}
