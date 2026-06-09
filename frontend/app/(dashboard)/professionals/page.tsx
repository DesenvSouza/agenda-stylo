"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Scissors, Power, Trash2, Pencil, ChevronDown, ChevronUp,
  Loader2, Camera, CheckSquare, CalendarClock, KeyRound, ShieldOff, Copy, Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { professionalsApi, servicesApi, establishmentsApi, ProfessionalDto, ActivateAccessResult } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDuration, formatCurrency, cn } from "@/lib/utils";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  category?: string;
  durationMinutes: number;
  price: number;
}

type ActionState = { type: "confirm-delete"; id: string } | null;

// ── Modal de credenciais ──────────────────────────────────────────────────────
function CredentialsModal({
  credentials,
  onClose,
}: {
  credentials: ActivateAccessResult;
  onClose: () => void;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  function copy(text: string, field: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <KeyRound size={20} className="text-green-600" />
          </div>
          <div>
            <h2 className="font-bold text-[#1B1B1B]">Acesso ativado!</h2>
            <p className="text-xs text-[#9B9B9B]">Compartilhe essas credenciais com o profissional</p>
          </div>
        </div>

        <div className="space-y-3 mb-5">
          <div className="rounded-xl border border-black/10 bg-[#FAFAF8] p-3">
            <p className="text-[10px] font-bold text-[#9B9B9B] uppercase tracking-widest mb-1">Login (WhatsApp)</p>
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm font-semibold text-[#1B1B1B] flex-1 break-all">{credentials.login}</p>
              <button
                onClick={() => copy(credentials.login, "login")}
                className="p-1.5 rounded-lg hover:bg-black/5 transition-colors shrink-0"
              >
                {copiedField === "login" ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-[#9B9B9B]" />}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-black/10 bg-[#FAFAF8] p-3">
            <p className="text-[10px] font-bold text-[#9B9B9B] uppercase tracking-widest mb-1">Senha gerada</p>
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm font-semibold text-[#1B1B1B] flex-1 tracking-widest">{credentials.password}</p>
              <button
                onClick={() => copy(credentials.password, "password")}
                className="p-1.5 rounded-lg hover:bg-black/5 transition-colors shrink-0"
              >
                {copiedField === "password" ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-[#9B9B9B]" />}
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs text-[#9B9B9B] mb-4">
          O profissional usará seu número de WhatsApp como login e essa senha gerada para entrar no sistema.
        </p>

        <Button variant="accent" className="w-full" onClick={onClose}>
          Entendido
        </Button>
      </div>
    </div>
  );
}

// ── Componente de Avatar ──────────────────────────────────────────────────────
function ProfAvatar({
  name, photoUrl, size = "md",
}: { name: string; photoUrl?: string; size?: "sm" | "md" | "lg" }) {
  const sz = { sm: "w-9 h-9 text-xs", md: "w-11 h-11 text-sm", lg: "w-20 h-20 text-2xl" }[size];
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={cn("rounded-full object-cover shrink-0", sz)}
      />
    );
  }
  return (
    <div className={cn("rounded-full bg-[#FAEEDA] flex items-center justify-center shrink-0 font-bold text-[#EF9F27]", sz)}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ProfessionalsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [professionals, setProfessionals] = useState<ProfessionalDto[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulário de criação
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", specialty: "", bio: "", cpf: "", whatsApp: "" });
  const [formPhoto, setFormPhoto] = useState<File | null>(null);
  const [formPhotoPreview, setFormPhotoPreview] = useState<string | null>(null);
  const [formServiceIds, setFormServiceIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const formPhotoRef = useRef<HTMLInputElement>(null);

  // Painel expandido por profissional
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Serviços em edição para o profissional expandido
  const [servicesDraft, setServicesDraft] = useState<string[]>([]);
  const [servicesDirty, setServicesDirty] = useState(false);
  const [savingServices, setSavingServices] = useState(false);

  // Upload de foto para profissional existente
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Edição de perfil inline
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editProfileForm, setEditProfileForm] = useState({ name: "", specialty: "", bio: "", cpf: "", whatsApp: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  // Acesso do profissional
  const [accessBusyId, setAccessBusyId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<ActivateAccessResult | null>(null);
  const [allowProfessionalAccess, setAllowProfessionalAccess] = useState(false);

  // ── Carga inicial ────────────────────────────────────────────────────────
  const reload = async () => {
    if (!user) return;
    const [proRes, svcRes] = await Promise.all([
      professionalsApi.list(user.establishmentId),
      servicesApi.list(user.establishmentId),
    ]);
    setProfessionals(proRes.data);
    setAllServices(svcRes.data);
  };

  useEffect(() => {
    if (!user) return;
    Promise.all([
      professionalsApi.list(user.establishmentId),
      servicesApi.list(user.establishmentId),
      establishmentsApi.getProfessionalAccess(),
    ])
      .then(([proRes, svcRes, accessRes]) => {
        setProfessionals(proRes.data);
        setAllServices(svcRes.data);
        setAllowProfessionalAccess(accessRes.data.allowed);
      })
      .finally(() => setLoading(false));
  }, [user]);

  // ── Formulário de criação ────────────────────────────────────────────────
  function handleFormPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormPhoto(file);
    setFormPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const res = await professionalsApi.upsert({
        name: form.name,
        specialty: form.specialty,
        bio: form.bio,
        cpf: form.cpf,
        whatsApp: form.whatsApp,
        establishmentId: user.establishmentId,
      });
      const newId = res.data.id;

      if (formPhoto) {
        try {
          await professionalsApi.uploadPhoto(newId, formPhoto);
        } catch {
          toast.error("Profissional criado, mas falha ao enviar a foto.");
        }
      }

      if (formServiceIds.length > 0) {
        try {
          await professionalsApi.setServices(newId, formServiceIds);
        } catch {
          toast.error("Profissional criado, mas falha ao vincular serviços.");
        }
      }

      await reload();
      setShowForm(false);
      setForm({ name: "", specialty: "", bio: "", cpf: "", whatsApp: "" });
      setFormPhoto(null);
      setFormPhotoPreview(null);
      setFormServiceIds([]);
      toast.success("Profissional cadastrado com sucesso");
    } catch {
      toast.error("Erro ao salvar profissional");
    } finally {
      setSaving(false);
    }
  }

  // ── Edição de perfil ─────────────────────────────────────────────────────
  function startEditProfile(p: ProfessionalDto) {
    setEditProfileForm({
      name: p.name,
      specialty: p.specialty ?? "",
      bio: p.bio ?? "",
      cpf: p.cpf ?? "",
      whatsApp: p.whatsApp ?? "",
    });
    setEditingProfileId(p.id);
    setActionState(null);
  }

  function cancelEditProfile() {
    setEditingProfileId(null);
  }

  async function handleUpdateProfile(id: string) {
    if (!editProfileForm.name.trim()) { toast.error("O nome é obrigatório"); return; }
    const current = professionals.find((p) => p.id === id);
    setSavingProfile(true);
    try {
      await professionalsApi.update(id, { ...editProfileForm, order: current?.order ?? 0 });
      setProfessionals((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                name: editProfileForm.name,
                specialty: editProfileForm.specialty,
                bio: editProfileForm.bio,
                cpf: editProfileForm.cpf,
                whatsApp: editProfileForm.whatsApp,
              }
            : p
        )
      );
      setEditingProfileId(null);
      toast.success("Profissional atualizado");
    } catch {
      toast.error("Erro ao atualizar profissional");
    } finally {
      setSavingProfile(false);
    }
  }

  // ── Expandir painel ──────────────────────────────────────────────────────
  function handleExpand(p: ProfessionalDto) {
    const opening = expandedId !== p.id;
    setExpandedId(opening ? p.id : null);
    setActionState(null);
    setEditingProfileId(null);
    if (opening) {
      setServicesDraft(p.serviceIds ?? []);
      setServicesDirty(false);
    }
  }

  // ── Serviços ─────────────────────────────────────────────────────────────
  function toggleService(serviceId: string) {
    setServicesDraft((prev) => {
      const next = prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId];
      setServicesDirty(true);
      return next;
    });
  }

  async function saveServices(professionalId: string) {
    setSavingServices(true);
    try {
      await professionalsApi.setServices(professionalId, servicesDraft);
      setProfessionals((prev) =>
        prev.map((p) =>
          p.id === professionalId ? { ...p, serviceIds: [...servicesDraft] } : p
        )
      );
      setServicesDirty(false);
      toast.success("Serviços vinculados atualizados");
    } catch {
      toast.error("Erro ao salvar serviços");
    } finally {
      setSavingServices(false);
    }
  }

  // ── Foto de profissional existente ───────────────────────────────────────
  async function handlePhotoChange(
    e: React.ChangeEvent<HTMLInputElement>,
    professionalId: string
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const res = await professionalsApi.uploadPhoto(professionalId, file);
      setProfessionals((prev) =>
        prev.map((p) =>
          p.id === professionalId ? { ...p, photoUrl: res.data.photoUrl } : p
        )
      );
      toast.success("Foto atualizada");
    } catch {
      toast.error("Erro ao enviar foto");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  // ── Toggle ativo / inativo ───────────────────────────────────────────────
  async function handleToggleActive(id: string, currentActive: boolean) {
    setBusyId(id);
    try {
      await professionalsApi.toggleActive(id);
      setProfessionals((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p))
      );
      toast.success(currentActive ? "Profissional desativado" : "Profissional ativado");
    } catch {
      toast.error("Erro ao alterar status");
    } finally {
      setBusyId(null);
    }
  }

  // ── Exclusão ─────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    setBusyId(id);
    setActionState(null);
    try {
      await professionalsApi.delete(id);
      setProfessionals((prev) => prev.filter((p) => p.id !== id));
      if (expandedId === id) setExpandedId(null);
      toast.success("Profissional excluído");
    } catch {
      toast.error("Erro ao excluir profissional");
    } finally {
      setBusyId(null);
    }
  }

  // ── Acesso do profissional ───────────────────────────────────────────────
  async function handleActivateAccess(p: ProfessionalDto) {
    if (!p.whatsApp) {
      toast.error("Cadastre o WhatsApp do profissional antes de ativar o acesso.");
      return;
    }
    setAccessBusyId(p.id);
    try {
      const res = await professionalsApi.activateAccess(p.id);
      setProfessionals((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, hasUserAccount: true } : x))
      );
      setCredentials(res.data);
      toast.success("Acesso ativado com sucesso!");
    } catch {
      toast.error("Erro ao ativar acesso");
    } finally {
      setAccessBusyId(null);
    }
  }

  async function handleRevokeAccess(id: string) {
    setAccessBusyId(id);
    try {
      await professionalsApi.revokeAccess(id);
      setProfessionals((prev) =>
        prev.map((x) => (x.id === id ? { ...x, hasUserAccount: false } : x))
      );
      toast.success("Acesso revogado");
    } catch {
      toast.error("Erro ao revogar acesso");
    } finally {
      setAccessBusyId(null);
    }
  }

  // ── Seção de serviços (render helper) ────────────────────────────────────
  function ServicesSection(professionalId: string) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-[#9B9B9B] uppercase tracking-widest">
            Serviços vinculados
          </p>
          {servicesDirty && (
            <button
              onClick={() => saveServices(professionalId)}
              disabled={savingServices}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B1B1B] text-white text-xs font-semibold rounded-lg hover:bg-[#2d2d2d] disabled:opacity-40 transition-colors"
            >
              {savingServices
                ? <Loader2 size={12} className="animate-spin" />
                : <CheckSquare size={12} />}
              Salvar serviços
            </button>
          )}
        </div>

        {allServices.length === 0 ? (
          <p className="text-sm text-[#9B9B9B]">Nenhum serviço cadastrado ainda.</p>
        ) : (
          <div className="space-y-2">
            {allServices.map((svc) => {
              const checked = servicesDraft.includes(svc.id);
              return (
                <label
                  key={svc.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors select-none",
                    checked
                      ? "border-[#EF9F27] bg-[#FAEEDA]/40"
                      : "border-black/10 bg-white hover:border-black/20"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleService(svc.id)}
                    className="w-4 h-4 accent-[#EF9F27] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1B1B1B] truncate">{svc.name}</p>
                    <p className="text-xs text-[#9B9B9B]">
                      {formatDuration(svc.durationMinutes)}
                      {svc.category ? ` · ${svc.category}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[#EF9F27] shrink-0">
                    {formatCurrency(svc.price)}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Modal de credenciais */}
      {credentials && (
        <CredentialsModal
          credentials={credentials}
          onClose={() => setCredentials(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B1B1B]">Profissionais</h1>
          <p className="text-sm text-[#9B9B9B] mt-0.5">
            {professionals.length} cadastrado{professionals.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          variant="accent"
          onClick={() => { setShowForm((v) => !v); }}
          className="gap-2"
        >
          <Plus size={18} />
          Adicionar
        </Button>
      </div>

      {/* ── Formulário de criação ── */}
      {showForm && (
        <Card className="mb-6 border-[#EF9F27]">
          <CardHeader>
            <CardTitle className="text-base">Novo profissional</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-5">
              {/* Foto + campos principais */}
              <div className="flex gap-5 items-start">
                {/* Avatar clicável para upload */}
                <div className="shrink-0 flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => formPhotoRef.current?.click()}
                    className="relative w-20 h-20 rounded-full bg-[#FAEEDA] flex items-center justify-center overflow-hidden border-2 border-dashed border-[#EF9F27]/40 hover:border-[#EF9F27] transition-colors group"
                  >
                    {formPhotoPreview ? (
                      <img src={formPhotoPreview} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera size={24} className="text-[#EF9F27]/60 group-hover:text-[#EF9F27] transition-colors" />
                    )}
                    {formPhotoPreview && (
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera size={18} className="text-white" />
                      </div>
                    )}
                  </button>
                  <span className="text-[10px] text-[#9B9B9B]">Foto (opcional)</span>
                  <input
                    ref={formPhotoRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFormPhotoChange}
                  />
                </div>

                {/* Campos de texto */}
                <div className="flex-1 space-y-3">
                  <div className="space-y-1.5">
                    <Label>Nome *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      required
                      placeholder="Nome completo"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Especialidade</Label>
                    <Input
                      value={form.specialty}
                      onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))}
                      placeholder="Ex: Corte masculino, coloração..."
                    />
                  </div>
                </div>
              </div>

              {/* CPF e WhatsApp */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>CPF</Label>
                  <Input
                    value={form.cpf}
                    onChange={(e) => setForm((p) => ({ ...p, cpf: e.target.value }))}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>WhatsApp *</Label>
                  <Input
                    value={form.whatsApp}
                    onChange={(e) => setForm((p) => ({ ...p, whatsApp: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <Label>Bio</Label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="Descreva a experiência, diferenciais e estilo do profissional..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-black/15 text-sm text-[#1B1B1B] placeholder:text-[#C4C4C4] resize-none focus:outline-none focus:border-[#1B1B1B] transition-colors"
                />
              </div>

              {/* Serviços vinculados */}
              {allServices.length > 0 && (
                <div className="space-y-2">
                  <Label>Serviços vinculados</Label>
                  <div className="space-y-2">
                    {allServices.map((svc) => {
                      const checked = formServiceIds.includes(svc.id);
                      return (
                        <label
                          key={svc.id}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors select-none",
                            checked
                              ? "border-[#EF9F27] bg-[#FAEEDA]/40"
                              : "border-black/10 bg-[#FAFAF8] hover:border-black/20"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setFormServiceIds((prev) =>
                                prev.includes(svc.id)
                                  ? prev.filter((id) => id !== svc.id)
                                  : [...prev, svc.id]
                              )
                            }
                            className="w-4 h-4 accent-[#EF9F27] shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1B1B1B] truncate">{svc.name}</p>
                            <p className="text-xs text-[#9B9B9B]">
                              {formatDuration(svc.durationMinutes)}
                              {svc.category ? ` · ${svc.category}` : ""}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-[#EF9F27] shrink-0">
                            {formatCurrency(svc.price)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button type="submit" variant="accent" disabled={saving}>
                  {saving && <Loader2 size={14} className="animate-spin mr-1" />}
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowForm(false);
                    setFormPhoto(null);
                    setFormPhotoPreview(null);
                    setForm({ name: "", specialty: "", bio: "", cpf: "", whatsApp: "" });
                    setFormServiceIds([]);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Lista de profissionais ── */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#EF9F27] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : professionals.length === 0 ? (
            <div className="text-center py-12 text-[#6B6B6B]">
              <Scissors size={40} className="mx-auto mb-3 opacity-30" />
              <p>Nenhum profissional cadastrado</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {professionals.map((p) => {
                const isExpanded = expandedId === p.id;
                const isConfirmingDelete =
                  actionState?.type === "confirm-delete" && actionState.id === p.id;
                const isBusy = busyId === p.id;
                const isAccessBusy = accessBusyId === p.id;

                return (
                  <div
                    key={p.id}
                    className={cn("transition-colors", !p.isActive && "opacity-60")}
                  >
                    {/* ── Linha principal ── */}
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <ProfAvatar name={p.name} photoUrl={p.photoUrl} size="md" />

                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-semibold text-[#1B1B1B] leading-tight",
                          !p.isActive && "line-through text-[#9B9B9B]"
                        )}>
                          {p.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {p.specialty && (
                            <span className="text-xs text-[#6B6B6B] truncate">{p.specialty}</span>
                          )}
                          {p.serviceIds.length > 0 && (
                            <span className="text-[10px] bg-[#FAEEDA] text-[#EF9F27] font-semibold px-1.5 py-0.5 rounded-full shrink-0">
                              {p.serviceIds.length} serviço{p.serviceIds.length !== 1 ? "s" : ""}
                            </span>
                          )}
                          {p.hasUserAccount && (
                            <span className="text-[10px] bg-green-100 text-green-700 font-semibold px-1.5 py-0.5 rounded-full shrink-0">
                              com acesso
                            </span>
                          )}
                        </div>
                      </div>

                      <Badge variant={p.isActive ? "success" : "outline"}>
                        {p.isActive ? "Ativo" : "Inativo"}
                      </Badge>

                      <button
                        onClick={() => handleExpand(p)}
                        className="p-1.5 rounded-lg hover:bg-[#F5F5F5] text-[#6B6B6B] transition-colors shrink-0"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>

                    {/* ── Painel expandido ── */}
                    {isExpanded && (
                      <div className="border-t border-black/5 bg-[#FAFAF8] px-4 py-4 space-y-5">

                        {/* Input de foto (oculto, compartilhado) */}
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => handlePhotoChange(e, p.id)}
                        />

                        {editingProfileId === p.id ? (
                          /* ══════════════ MODO EDIÇÃO ══════════════ */
                          <>
                            {/* Foto + campos de texto */}
                            <div className="flex gap-4 items-start">
                              <div className="shrink-0 flex flex-col items-center gap-1">
                                <div className="relative">
                                  <ProfAvatar
                                    name={editProfileForm.name || p.name}
                                    photoUrl={p.photoUrl}
                                    size="lg"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => photoInputRef.current?.click()}
                                    disabled={uploadingPhoto}
                                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#1B1B1B] text-white rounded-full flex items-center justify-center hover:bg-[#333] disabled:opacity-40 transition-colors shadow"
                                  >
                                    {uploadingPhoto
                                      ? <Loader2 size={11} className="animate-spin" />
                                      : <Camera size={11} />}
                                  </button>
                                </div>
                                <span className="text-[10px] text-[#9B9B9B]">Foto</span>
                              </div>

                              <div className="flex-1 space-y-3">
                                <div className="space-y-1.5">
                                  <Label>Nome *</Label>
                                  <Input
                                    value={editProfileForm.name}
                                    onChange={(e) =>
                                      setEditProfileForm((f) => ({ ...f, name: e.target.value }))
                                    }
                                    placeholder="Nome completo"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label>Especialidade</Label>
                                  <Input
                                    value={editProfileForm.specialty}
                                    onChange={(e) =>
                                      setEditProfileForm((f) => ({ ...f, specialty: e.target.value }))
                                    }
                                    placeholder="Ex: Corte masculino, coloração..."
                                  />
                                </div>
                              </div>
                            </div>

                            {/* CPF e WhatsApp */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label>CPF</Label>
                                <Input
                                  value={editProfileForm.cpf}
                                  onChange={(e) =>
                                    setEditProfileForm((f) => ({ ...f, cpf: e.target.value }))
                                  }
                                  placeholder="000.000.000-00"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label>WhatsApp</Label>
                                <Input
                                  value={editProfileForm.whatsApp}
                                  onChange={(e) =>
                                    setEditProfileForm((f) => ({ ...f, whatsApp: e.target.value }))
                                  }
                                  placeholder="(11) 99999-9999"
                                />
                              </div>
                            </div>

                            {/* Bio */}
                            <div className="space-y-1.5">
                              <Label>Bio</Label>
                              <textarea
                                value={editProfileForm.bio}
                                onChange={(e) =>
                                  setEditProfileForm((f) => ({ ...f, bio: e.target.value }))
                                }
                                placeholder="Descreva a experiência, diferenciais e estilo do profissional..."
                                rows={3}
                                className="w-full px-3 py-2.5 rounded-xl border border-black/15 text-sm text-[#1B1B1B] placeholder:text-[#C4C4C4] resize-none focus:outline-none focus:border-[#1B1B1B] transition-colors"
                              />
                            </div>

                            {/* Serviços (sempre editável) */}
                            {ServicesSection(p.id)}

                            {/* Salvar / Cancelar */}
                            <div className="border-t border-black/5 pt-4 flex gap-3">
                              <Button
                                variant="accent"
                                disabled={savingProfile}
                                onClick={() => handleUpdateProfile(p.id)}
                              >
                                {savingProfile && <Loader2 size={14} className="animate-spin mr-1" />}
                                {savingProfile ? "Salvando..." : "Salvar alterações"}
                              </Button>
                              <Button variant="ghost" onClick={cancelEditProfile}>
                                Cancelar
                              </Button>
                            </div>
                          </>
                        ) : (
                          /* ══════════════ MODO VISUALIZAÇÃO ══════════════ */
                          <>
                            {/* Foto */}
                            <div>
                              <p className="text-[10px] font-bold text-[#9B9B9B] uppercase tracking-widest mb-3">
                                Foto do profissional
                              </p>
                              <div className="flex items-center gap-4">
                                <ProfAvatar name={p.name} photoUrl={p.photoUrl} size="lg" />
                                <div className="space-y-1">
                                  <button
                                    onClick={() => photoInputRef.current?.click()}
                                    disabled={uploadingPhoto}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-black/15 bg-white hover:bg-[#F5F5F5] transition-colors disabled:opacity-40"
                                  >
                                    {uploadingPhoto
                                      ? <Loader2 size={14} className="animate-spin" />
                                      : <Camera size={14} />}
                                    {p.photoUrl ? "Alterar foto" : "Adicionar foto"}
                                  </button>
                                  <p className="text-[11px] text-[#9B9B9B]">
                                    JPG, PNG ou WebP · máx. 2 MB
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Dados do profissional */}
                            {(p.whatsApp || p.cpf || p.bio) && (
                              <div className="space-y-2">
                                {p.bio && (
                                  <div>
                                    <p className="text-[10px] font-bold text-[#9B9B9B] uppercase tracking-widest mb-1.5">
                                      Bio
                                    </p>
                                    <p className="text-sm text-[#6B6B6B] leading-relaxed">{p.bio}</p>
                                  </div>
                                )}
                                <div className="flex gap-4">
                                  {p.whatsApp && (
                                    <div>
                                      <p className="text-[10px] font-bold text-[#9B9B9B] uppercase tracking-widest mb-0.5">WhatsApp</p>
                                      <p className="text-sm text-[#1B1B1B]">{p.whatsApp}</p>
                                    </div>
                                  )}
                                  {p.cpf && (
                                    <div>
                                      <p className="text-[10px] font-bold text-[#9B9B9B] uppercase tracking-widest mb-0.5">CPF</p>
                                      <p className="text-sm text-[#1B1B1B]">{p.cpf}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Serviços */}
                            {ServicesSection(p.id)}

                            {/* Acesso do profissional — só exibe se o estabelecimento habilitou */}
                            {allowProfessionalAccess && <div className="rounded-xl border border-black/8 bg-white p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-[#1B1B1B]">
                                    Acesso ao portal
                                  </p>
                                  <p className="text-xs text-[#9B9B9B] mt-0.5">
                                    {p.hasUserAccount
                                      ? "Profissional pode acessar o app com WhatsApp e senha"
                                      : "Profissional não tem acesso ao sistema ainda"}
                                  </p>
                                </div>
                                {p.hasUserAccount ? (
                                  <button
                                    onClick={() => handleRevokeAccess(p.id)}
                                    disabled={isAccessBusy}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-40 shrink-0"
                                  >
                                    {isAccessBusy ? <Loader2 size={12} className="animate-spin" /> : <ShieldOff size={12} />}
                                    Revogar
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleActivateAccess(p)}
                                    disabled={isAccessBusy}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-40 shrink-0"
                                  >
                                    {isAccessBusy ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />}
                                    Ativar acesso
                                  </button>
                                )}
                              </div>
                            </div>}

                            {/* Ações */}
                            <div className="border-t border-black/5 pt-4 flex flex-wrap gap-2">
                              {/* Configurar agenda */}
                              <button
                                onClick={() => router.push(`/professionals/${p.id}/schedule`)}
                                disabled={isBusy}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-[#EF9F27]/30 bg-[#FAEEDA]/30 text-[#EF9F27] hover:bg-[#FAEEDA]/60 transition-all disabled:opacity-40"
                              >
                                <CalendarClock size={14} />
                                Agenda
                              </button>

                              {/* Editar perfil */}
                              <button
                                onClick={() => startEditProfile(p)}
                                disabled={isBusy}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-black/10 bg-white text-[#1B1B1B] hover:bg-[#F5F5F5] transition-all disabled:opacity-40"
                              >
                                <Pencil size={14} />
                                Editar perfil
                              </button>

                              {/* Ativar / Desativar */}
                              <button
                                onClick={() => handleToggleActive(p.id, p.isActive)}
                                disabled={isBusy}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all disabled:opacity-40",
                                  p.isActive
                                    ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                    : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                                )}
                              >
                                {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                                {p.isActive ? "Desativar" : "Ativar"}
                              </button>

                              {/* Excluir */}
                              {!isConfirmingDelete ? (
                                <button
                                  onClick={() => setActionState({ type: "confirm-delete", id: p.id })}
                                  disabled={isBusy}
                                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all disabled:opacity-40"
                                >
                                  <Trash2 size={14} />
                                  Excluir
                                </button>
                              ) : (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-red-300 bg-red-50">
                                  <span className="text-sm text-red-700 font-medium">Confirmar exclusão?</span>
                                  <button
                                    onClick={() => handleDelete(p.id)}
                                    disabled={isBusy}
                                    className="px-2 py-0.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 disabled:opacity-40"
                                  >
                                    {isBusy ? <Loader2 size={12} className="animate-spin" /> : "Sim, excluir"}
                                  </button>
                                  <button
                                    onClick={() => setActionState(null)}
                                    className="px-2 py-0.5 text-xs font-medium text-[#6B6B6B] hover:text-[#1B1B1B]"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
