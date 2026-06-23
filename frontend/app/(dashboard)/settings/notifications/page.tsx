"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, ChevronLeft, Check, Send, Loader2,
  Mail, UserRound, Clock, CalendarCheck, X,
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface NotificationSettings {
  remindersEnabled24h: boolean;
  remindersEnabled1h: boolean;
  notifyClientCancellation: boolean;
  notifyProfessionalNewBooking: boolean;
  notifyProfessionalCancellation: boolean;
}

const DEFAULT: NotificationSettings = {
  remindersEnabled24h: true,
  remindersEnabled1h: true,
  notifyClientCancellation: true,
  notifyProfessionalNewBooking: true,
  notifyProfessionalCancellation: false,
};

function Toggle({
  checked, onChange, disabled = false,
}: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0",
        checked ? "bg-[#EF9F27]" : "bg-[#D4D4D4]",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span className={cn(
        "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
        checked ? "translate-x-6" : "translate-x-1",
      )} />
    </button>
  );
}

function SettingRow({
  label, description, checked, onChange, disabled,
}: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-black/5 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1B1B1B]">{label}</p>
        {description && <p className="text-xs text-[#9B9B9B] mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT);
  const [contactEmail, setContactEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    api.get("/api/settings/notifications")
      .then(r => {
        setSettings(r.data.settings ?? DEFAULT);
        setContactEmail(r.data.contactEmail ?? "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof NotificationSettings) => (value: boolean) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.put("/api/settings/notifications", { settings, contactEmail });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert("Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    const to = testEmail.trim();
    if (!to) return;
    setTesting(true);
    setTestResult(null);
    try {
      const r = await api.post("/api/settings/notifications/test", { email: to });
      setTestResult({ ok: true, msg: r.data.message });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Falha ao enviar e-mail de teste.";
      setTestResult({ ok: false, msg });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={24} className="animate-spin text-[#EF9F27]" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/settings")}
          className="p-2 rounded-lg hover:bg-[#F5F5F5] transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#1B1B1B] flex items-center gap-2">
            <Bell size={20} className="text-[#EF9F27]" />
            Notificações
          </h1>
          <p className="text-sm text-[#9B9B9B]">Configurações de e-mail para clientes e profissionais</p>
        </div>
      </div>

      {/* Bandeira informativa */}
      <div className="flex items-start gap-3 bg-[#FAEEDA] rounded-2xl px-4 py-3.5 mb-4">
        <Mail size={18} className="text-[#EF9F27] mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-[#1B1B1B]">Notificações via e-mail</p>
          <p className="text-xs text-[#6B6B6B] mt-0.5 leading-relaxed">
            Todos os avisos são enviados por e-mail. Para lembretes ao cliente, o e-mail deve ser informado no momento do agendamento.
          </p>
        </div>
      </div>

      {/* Lembretes para clientes */}
      <div className="bg-white rounded-2xl border border-black/8 mb-4 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-black/5">
          <div className="w-8 h-8 rounded-xl bg-[#FAEEDA] flex items-center justify-center">
            <Clock size={16} className="text-[#EF9F27]" />
          </div>
          <div>
            <h2 className="font-semibold text-[#1B1B1B] text-sm">Lembretes para clientes</h2>
            <p className="text-xs text-[#9B9B9B]">Enviados automaticamente para o e-mail do cliente</p>
          </div>
        </div>
        <div className="px-5">
          <SettingRow
            label="Confirmação ao agendar"
            description="Enviada imediatamente após o cliente confirmar o agendamento"
            checked={true}
            onChange={() => {}}
            disabled
          />
          <SettingRow
            label="Lembrete 24h antes"
            description="Lembrete automático no dia anterior ao agendamento"
            checked={settings.remindersEnabled24h}
            onChange={set("remindersEnabled24h")}
          />
          <SettingRow
            label="Lembrete 1h antes"
            description="Lembrete automático 1 hora antes do horário"
            checked={settings.remindersEnabled1h}
            onChange={set("remindersEnabled1h")}
          />
          <SettingRow
            label="Notificação de cancelamento"
            description="Avisa o cliente por e-mail quando um agendamento é cancelado"
            checked={settings.notifyClientCancellation}
            onChange={set("notifyClientCancellation")}
          />
        </div>
      </div>

      {/* Notificações para profissionais */}
      <div className="bg-white rounded-2xl border border-black/8 mb-4 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-black/5">
          <div className="w-8 h-8 rounded-xl bg-[#F0F0FF] flex items-center justify-center">
            <UserRound size={16} className="text-indigo-500" />
          </div>
          <div>
            <h2 className="font-semibold text-[#1B1B1B] text-sm">Notificações para profissionais</h2>
            <p className="text-xs text-[#9B9B9B]">Enviados para o e-mail cadastrado de cada profissional</p>
          </div>
        </div>
        <div className="px-5">
          <SettingRow
            label="Novo agendamento"
            description="Notifica o profissional a cada novo agendamento recebido"
            checked={settings.notifyProfessionalNewBooking}
            onChange={set("notifyProfessionalNewBooking")}
          />
          <SettingRow
            label="Cancelamento de agendamento"
            description="Notifica o profissional quando um cliente cancela"
            checked={settings.notifyProfessionalCancellation}
            onChange={set("notifyProfessionalCancellation")}
          />
        </div>
      </div>

      {/* E-mail de contato */}
      <div className="bg-white rounded-2xl border border-black/8 mb-4 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-black/5">
          <div className="w-8 h-8 rounded-xl bg-[#F0FAF4] flex items-center justify-center">
            <CalendarCheck size={16} className="text-emerald-500" />
          </div>
          <div>
            <h2 className="font-semibold text-[#1B1B1B] text-sm">E-mail do estabelecimento</h2>
            <p className="text-xs text-[#9B9B9B]">Usado no cabeçalho dos e-mails enviados</p>
          </div>
        </div>
        <div className="px-5 py-4">
          <label className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wide mb-1.5 block">
            E-mail de contato
          </label>
          <input
            type="email"
            value={contactEmail}
            onChange={e => setContactEmail(e.target.value)}
            placeholder="contato@seuestablecimento.com.br"
            className="w-full h-11 px-4 rounded-xl border border-black/15 text-sm focus:outline-none focus:border-[#EF9F27] transition-colors"
          />
        </div>
      </div>

      {/* Enviar e-mail de teste */}
      <div className="bg-white rounded-2xl border border-black/8 mb-6 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-black/5">
          <div className="w-8 h-8 rounded-xl bg-[#FAFAF8] flex items-center justify-center">
            <Send size={15} className="text-[#6B6B6B]" />
          </div>
          <div>
            <h2 className="font-semibold text-[#1B1B1B] text-sm">Testar notificação</h2>
            <p className="text-xs text-[#9B9B9B]">Envie um e-mail de teste para verificar a configuração</p>
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="flex gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="seu@email.com"
              className="flex-1 h-10 px-3.5 rounded-xl border border-black/15 text-sm focus:outline-none focus:border-[#EF9F27] transition-colors"
            />
            <button
              onClick={handleTest}
              disabled={testing || !testEmail.trim()}
              className="h-10 px-4 bg-[#1B1B1B] text-white text-sm font-semibold rounded-xl disabled:opacity-40 flex items-center gap-1.5 transition-opacity"
            >
              {testing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Enviar
            </button>
          </div>
          {testResult && (
            <div className={cn(
              "flex items-start gap-2 mt-3 px-3.5 py-2.5 rounded-xl text-xs font-medium",
              testResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
            )}>
              {testResult.ok
                ? <Check size={13} className="mt-0.5 shrink-0" />
                : <X size={13} className="mt-0.5 shrink-0" />}
              {testResult.msg}
            </div>
          )}
        </div>
      </div>

      {/* Salvar */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-12 bg-[#1B1B1B] text-white font-semibold rounded-2xl disabled:opacity-40 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
      >
        {saving ? (
          <><Loader2 size={16} className="animate-spin" /> Salvando...</>
        ) : saved ? (
          <><Check size={16} /> Salvo!</>
        ) : "Salvar configurações"}
      </button>
    </div>
  );
}
