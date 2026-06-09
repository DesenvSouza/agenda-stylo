"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, ChevronLeft, Check, Send, Loader2,
  Wifi, WifiOff, MessageSquare, Mail, UserRound,
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface NotificationSettings {
  remindersEnabled24h: boolean;
  remindersEnabled1h: boolean;
  notifyClientCancellation: boolean;
  notifyProfessionalNewBooking: boolean;
  notifyProfessionalCancellation: boolean;
  emailFallbackEnabled: boolean;
}

const DEFAULT: NotificationSettings = {
  remindersEnabled24h: true,
  remindersEnabled1h: true,
  notifyClientCancellation: true,
  notifyProfessionalNewBooking: true,
  notifyProfessionalCancellation: false,
  emailFallbackEnabled: false,
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
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
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
      <div className="flex-1">
        <p className="text-sm font-medium text-[#1B1B1B]">{label}</p>
        {description && <p className="text-xs text-[#9B9B9B] mt-0.5">{description}</p>}
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
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [waStatus] = useState<"unknown" | "connected" | "disconnected">("unknown");

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
    if (!testPhone.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const r = await api.post("/api/settings/notifications/test", { phone: testPhone });
      setTestResult({ ok: true, msg: r.data.message });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Falha ao enviar mensagem.";
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
          <p className="text-sm text-[#9B9B9B]">WhatsApp e e-mail para clientes e profissionais</p>
        </div>
      </div>

      {/* WhatsApp */}
      <div className="bg-white rounded-2xl border border-black/8 mb-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-[#25D366]" />
            <h2 className="font-semibold text-[#1B1B1B]">WhatsApp</h2>
          </div>
          <div className={cn(
            "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
            waStatus === "connected"
              ? "bg-green-50 text-green-700"
              : waStatus === "disconnected"
              ? "bg-amber-50 text-amber-700"
              : "bg-[#F5F5F5] text-[#9B9B9B]",
          )}>
            {waStatus === "connected" ? <Wifi size={12} /> : <WifiOff size={12} />}
            {waStatus === "connected" ? "Conectado" : waStatus === "disconnected" ? "Desconectado" : "Verificar"}
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
            description="Avisa o cliente quando um agendamento é cancelado"
            checked={settings.notifyClientCancellation}
            onChange={set("notifyClientCancellation")}
          />
        </div>

        {/* Teste */}
        <div className="px-5 pb-5 pt-3 border-t border-black/5 mt-1">
          <p className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wide mb-2">
            Enviar mensagem de teste
          </p>
          <div className="flex gap-2">
            <input
              type="tel"
              value={testPhone}
              onChange={e => setTestPhone(e.target.value)}
              placeholder="(31) 99963-0255"
              className="flex-1 h-10 px-3 rounded-xl border border-black/15 text-sm focus:outline-none focus:border-[#EF9F27]"
            />
            <button
              onClick={handleTest}
              disabled={testing || !testPhone.trim()}
              className="h-10 px-4 bg-[#1B1B1B] text-white text-sm font-semibold rounded-xl disabled:opacity-40 flex items-center gap-1.5"
            >
              {testing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Enviar
            </button>
          </div>
          {testResult && (
            <p className={cn("text-xs mt-2", testResult.ok ? "text-green-600" : "text-red-500")}>
              {testResult.msg}
            </p>
          )}
        </div>
      </div>

      {/* Profissionais */}
      <div className="bg-white rounded-2xl border border-black/8 mb-4 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-black/5">
          <UserRound size={18} className="text-[#EF9F27]" />
          <h2 className="font-semibold text-[#1B1B1B]">Notificações para profissionais</h2>
        </div>
        <div className="px-5">
          <SettingRow
            label="Novo agendamento"
            description="Notifica o profissional por e-mail a cada novo agendamento"
            checked={settings.notifyProfessionalNewBooking}
            onChange={set("notifyProfessionalNewBooking")}
          />
          <SettingRow
            label="Cancelamento"
            description="Notifica o profissional quando um agendamento é cancelado"
            checked={settings.notifyProfessionalCancellation}
            onChange={set("notifyProfessionalCancellation")}
          />
        </div>
      </div>

      {/* Fallback e-mail */}
      <div className="bg-white rounded-2xl border border-black/8 mb-6 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-black/5">
          <Mail size={18} className="text-[#6B6B6B]" />
          <h2 className="font-semibold text-[#1B1B1B]">Fallback por e-mail</h2>
        </div>
        <div className="px-5">
          <SettingRow
            label="Enviar e-mail se WhatsApp falhar"
            description="Usa o e-mail de contato como fallback quando a mensagem WhatsApp não é entregue"
            checked={settings.emailFallbackEnabled}
            onChange={set("emailFallbackEnabled")}
          />
        </div>
        <div className="px-5 pb-5 pt-2">
          <label className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wide mb-1.5 block">
            E-mail de contato do estabelecimento
          </label>
          <input
            type="email"
            value={contactEmail}
            onChange={e => setContactEmail(e.target.value)}
            placeholder="contato@seuestablecimento.com.br"
            disabled={!settings.emailFallbackEnabled}
            className="w-full h-11 px-4 rounded-xl border border-black/15 text-sm focus:outline-none focus:border-[#EF9F27] disabled:opacity-40 disabled:cursor-not-allowed"
          />
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
