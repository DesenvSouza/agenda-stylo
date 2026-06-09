"use client";

import { useEffect, useState } from "react";
import { Plus, Scissors, Power, Trash2, Pencil, ChevronDown, ChevronUp, Loader2, Percent, DollarSign, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { servicesApi, billingApi, PlanStatusDto } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency, formatDuration, cn } from "@/lib/utils";
import { toast } from "sonner";

const UNLIMITED = 2147483647;

// CommissionType enum (espelha o backend: 0=None, 1=Percentage, 2=Fixed)
type CommissionType = 0 | 1 | 2;

interface Service {
  id: string;
  name: string;
  category?: string;
  durationMinutes: number;
  price: number;
  description?: string;
  isActive: boolean;
  commissionType: CommissionType;
  commissionValue: number;
}

type ActionState = { type: "confirm-delete"; id: string } | null;

// ── Hook de máscara monetária ─────────────────────────────────────────────────
function useMoneymask(initial = 0) {
  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [str, setStr] = useState(fmt(initial));
  const [val, setVal] = useState(initial);

  function onInput(raw: string) {
    const digits = raw.replace(/\D/g, "");
    const cents = digits ? parseInt(digits, 10) : 0;
    const v = cents / 100;
    setStr(fmt(v));
    setVal(v);
  }
  function reset(v = 0) { setStr(fmt(v)); setVal(v); }

  return { str, val, onInput, reset };
}

// ── Painel de comissão (reutilizável para criação e edição) ───────────────────
function CommissionPanel({
  commType, commValue, commValueStr,
  servicePrice,
  onTypeChange, onValueInput,
}: {
  commType: CommissionType;
  commValue: number;
  commValueStr: string;
  servicePrice: number;
  onTypeChange: (t: CommissionType) => void;
  onValueInput: (raw: string) => void;
}) {
  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Cálculo em tempo real com o preço atual do serviço
  const commissionAmount =
    commType === 1 ? servicePrice * commValue / 100
    : commType === 2 ? Math.min(commValue, servicePrice)
    : 0;
  const netAmount = servicePrice - commissionAmount;
  const hasPreview = commType !== 0 && (commValue > 0) && servicePrice > 0;

  return (
    <div className="col-span-1 sm:col-span-2 space-y-3 p-3 rounded-xl bg-[#FAFAF8] border border-black/8">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold text-[#6B6B6B]">Comissão do estabelecimento</p>
        <span className="text-[10px] text-[#9B9B9B]">(opcional)</span>
      </div>

      {/* Tipo */}
      <div className="flex gap-1.5">
        {([
          { value: 0, label: "Sem comissão" },
          { value: 1, label: "Percentual (%)" },
          { value: 2, label: "Valor fixo (R$)" },
        ] as { value: CommissionType; label: string }[]).map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onTypeChange(opt.value)}
            className={cn(
              "flex-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              commType === opt.value
                ? "border-[#1B1B1B] bg-[#1B1B1B] text-white"
                : "border-black/10 text-[#6B6B6B] hover:border-[#1B1B1B]"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Input do valor */}
      {commType !== 0 && (
        <div className="space-y-1">
          <Label className="text-xs">
            {commType === 1 ? "Taxa (%)" : "Valor fixo (R$)"}
          </Label>
          {commType === 1 ? (
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={commValue === 0 ? "" : commValue}
                onChange={e => {
                  const v = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                  onValueInput(String(Math.round(v * 100)));
                }}
                placeholder="0"
                className="pr-8"
              />
              <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B9B9B]" />
            </div>
          ) : (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#9B9B9B] pointer-events-none select-none">R$</span>
              <Input
                type="text"
                inputMode="numeric"
                className="pl-9"
                value={commValueStr}
                onChange={e => onValueInput(e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      {/* Preview em tempo real */}
      {hasPreview && (
        <div className="grid grid-cols-3 gap-2 pt-0.5">
          <div className="bg-white rounded-xl p-3 text-center border border-black/8">
            <p className="text-[10px] text-[#9B9B9B] mb-1 leading-tight">Preço do serviço</p>
            <p className="text-sm font-bold text-[#1B1B1B]">R$ {fmt(servicePrice)}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
            <p className="text-[10px] text-blue-500 mb-1 leading-tight">
              Comissão{commType === 1 ? ` (${commValue}%)` : ""}
            </p>
            <p className="text-sm font-bold text-blue-600">R$ {fmt(commissionAmount)}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
            <p className="text-[10px] text-green-600 mb-1 leading-tight">Profissional recebe</p>
            <p className="text-sm font-bold text-green-700">R$ {fmt(netAmount)}</p>
          </div>
        </div>
      )}

      {/* Aviso se preço ainda não foi preenchido */}
      {commType !== 0 && commValue > 0 && servicePrice === 0 && (
        <p className="text-[11px] text-amber-500">
          Preencha o preço do serviço para ver o cálculo em tempo real
        </p>
      )}
    </div>
  );
}

// ── Rótulo de comissão (exibição resumida na lista) ───────────────────────────
function CommissionBadge({ type, value }: { type: CommissionType; value: number }) {
  if (type === 0 || value === 0) return null;
  const label = type === 1 ? `${value}% comissão` : `R$ ${value.toFixed(2).replace(".", ",")} comissão`;
  return (
    <span className="text-[10px] bg-blue-50 text-blue-600 font-semibold px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-0.5">
      {type === 1 ? <Percent size={9} /> : <DollarSign size={9} />}
      {label}
    </span>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", category: "", durationMinutes: 30, price: 0, description: "",
    commissionType: 0 as CommissionType, commissionValue: 0,
  });
  const [saving, setSaving] = useState(false);
  const price = useMoneymask(0);
  const commFixed = useMoneymask(0);   // máscara para valor fixo de comissão (criação)

  const [actionState, setActionState] = useState<ActionState>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Edição inline ─────────────────────────────────────────────────────────
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "", category: "", durationMinutes: 30, price: 0, description: "",
    commissionType: 0 as CommissionType, commissionValue: 0,
  });
  const editPrice = useMoneymask(0);
  const editCommFixed = useMoneymask(0);  // máscara valor fixo de comissão (edição)

  function startEdit(s: Service) {
    setEditId(s.id);
    setEditForm({
      name: s.name, category: s.category ?? "",
      durationMinutes: s.durationMinutes, price: s.price,
      description: s.description ?? "",
      commissionType: s.commissionType, commissionValue: s.commissionValue,
    });
    editPrice.reset(s.price);
    editCommFixed.reset(s.commissionType === 2 ? s.commissionValue : 0);
    setActionState(null);
  }

  function cancelEdit() { setEditId(null); }

  const [planStatus, setPlanStatus] = useState<PlanStatusDto | null>(null);

  const reload = async () => {
    if (!user) return;
    const res = await servicesApi.list(user.establishmentId);
    setServices(res.data);
  };

  useEffect(() => {
    if (!user) return;
    Promise.all([
      servicesApi.list(user.establishmentId),
      billingApi.getStatus().catch(() => null),
    ])
      .then(([svcRes, planRes]) => {
        setServices(svcRes.data);
        if (planRes) setPlanStatus(planRes.data);
      })
      .finally(() => setLoading(false));
  }, [user]);

  // Se o preço mudar e a comissão fixa for maior que o novo preço, recalcula
  useEffect(() => {
    if (form.commissionType === 2 && price.val > 0 && form.commissionValue > price.val) {
      const clamped = price.val;
      commFixed.reset(clamped);
      setForm(p => ({ ...p, commissionValue: clamped }));
    }
  }, [price.val]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (editForm.commissionType === 2 && editPrice.val > 0 && editForm.commissionValue > editPrice.val) {
      const clamped = editPrice.val;
      editCommFixed.reset(clamped);
      setEditForm(p => ({ ...p, commissionValue: clamped }));
    }
  }, [editPrice.val]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await servicesApi.upsert({
        ...form,
        establishmentId: user.establishmentId,
        durationMinutes: Number(form.durationMinutes),
        price: price.val,
        commissionValue: form.commissionType === 0 ? 0
          : form.commissionType === 2 ? commFixed.val
          : form.commissionValue,
      });
      await reload();
      setShowForm(false);
      setForm({ name: "", category: "", durationMinutes: 30, price: 0, description: "", commissionType: 0, commissionValue: 0 });
      price.reset(0);
      commFixed.reset(0);
      toast.success("Serviço cadastrado com sucesso");
    } catch {
      toast.error("Erro ao salvar serviço");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    setBusyId(id);
    try {
      await servicesApi.update(id, {
        ...editForm,
        durationMinutes: Number(editForm.durationMinutes),
        price: editPrice.val,
        commissionValue: editForm.commissionType === 0 ? 0
          : editForm.commissionType === 2 ? editCommFixed.val
          : editForm.commissionValue,
      });
      await reload();
      setEditId(null);
      toast.success("Serviço atualizado");
    } catch {
      toast.error("Erro ao atualizar serviço");
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    setBusyId(id);
    try {
      await servicesApi.toggleActive(id);
      setServices((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
      );
      toast.success(currentActive ? "Serviço desativado" : "Serviço ativado");
    } catch {
      toast.error("Erro ao alterar status");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    setActionState(null);
    try {
      await servicesApi.delete(id);
      setServices((prev) => prev.filter((s) => s.id !== id));
      toast.success("Serviço excluído");
    } catch {
      toast.error("Erro ao excluir serviço");
    } finally {
      setBusyId(null);
    }
  }

  const svcLimit = planStatus?.servicesLimit ?? UNLIMITED;
  const svcUsed  = planStatus?.servicesUsed ?? services.length;
  const atSvcLimit   = svcLimit < UNLIMITED && svcUsed >= svcLimit;
  const nearSvcLimit = svcLimit < UNLIMITED && !atSvcLimit && svcUsed >= svcLimit - 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#1B1B1B]">Serviços</h1>
        <Button
          variant="accent"
          onClick={() => { if (!atSvcLimit) setShowForm((v) => !v); }}
          disabled={atSvcLimit}
          className="gap-2"
        >
          <Plus size={18} /> Adicionar
        </Button>
      </div>

      {/* Banner limite atingido */}
      {atSvcLimit && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-800 mb-5">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-500" />
          <div>
            <p className="font-semibold">Limite de serviços atingido</p>
            <p className="text-rose-700 mt-0.5 text-xs">
              Seu plano <strong>{planStatus?.currentPlanLabel}</strong> permite até {svcLimit} serviço{svcLimit !== 1 ? "s" : ""}.
              {" "}<a href="/dashboard/settings/plans" className="underline hover:text-rose-900">Faça upgrade</a> para adicionar mais.
            </p>
          </div>
        </div>
      )}

      {/* Banner próximo do limite */}
      {nearSvcLimit && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800 mb-5">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="font-semibold">Próximo do limite</p>
            <p className="text-amber-700 mt-0.5 text-xs">
              Você tem {svcUsed} de {svcLimit} serviços no plano <strong>{planStatus?.currentPlanLabel}</strong>.
              {" "}<a href="/dashboard/settings/plans" className="underline hover:text-amber-900">Ver planos</a>.
            </p>
          </div>
        </div>
      )}


      {/* ── Formulário de cadastro ── */}
      {showForm && (
        <Card className="mb-6 border-[#EF9F27]">
          <CardHeader>
            <CardTitle className="text-base">Novo serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nome *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    required
                    placeholder="Ex: Corte masculino"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Input
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    placeholder="Ex: Corte, Coloração..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Duração (min) *</Label>
                  <Input
                    type="number"
                    min={5}
                    value={form.durationMinutes}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, durationMinutes: Number(e.target.value) }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Preço (R$) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#9B9B9B] pointer-events-none select-none">R$</span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      className="pl-9"
                      value={price.str}
                      onChange={(e) => price.onInput(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Painel de comissão */}
                <CommissionPanel
                  commType={form.commissionType}
                  commValue={form.commissionValue}
                  commValueStr={commFixed.str}
                  servicePrice={price.val}
                  onTypeChange={(t) => {
                    setForm(p => ({ ...p, commissionType: t, commissionValue: 0 }));
                    commFixed.reset(0);
                  }}
                  onValueInput={(raw) => {
                    const digits = raw.replace(/\D/g, "");
                    if (form.commissionType === 1) {
                      // percentual: clampado entre 0 e 100
                      const v = digits ? Math.min(100, Math.max(0, parseInt(digits, 10) / 100)) : 0;
                      setForm(p => ({ ...p, commissionValue: v }));
                    } else {
                      // valor fixo: não pode ser negativo nem maior que o preço
                      const v = digits ? parseInt(digits, 10) / 100 : 0;
                      const clamped = price.val > 0 ? Math.min(v, price.val) : v;
                      if (clamped !== v) {
                        commFixed.reset(clamped);
                      } else {
                        commFixed.onInput(raw);
                      }
                      setForm(p => ({ ...p, commissionValue: clamped }));
                    }
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Descrição do serviço..."
                />
              </div>
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
                    setForm({ name: "", category: "", durationMinutes: 30, price: 0, description: "", commissionType: 0, commissionValue: 0 });
                    price.reset(0);
                    commFixed.reset(0);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Lista ── */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#EF9F27] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12 text-[#6B6B6B]">
              <Scissors size={40} className="mx-auto mb-3 opacity-30" />
              <p>Nenhum serviço cadastrado</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {services.map((s) => {
                const isExpanded = expandedId === s.id;
                const isConfirmingDelete =
                  actionState?.type === "confirm-delete" && actionState.id === s.id;
                const isBusy = busyId === s.id;

                return (
                  <div
                    key={s.id}
                    className={cn("transition-colors", !s.isActive && "bg-[#FAFAF8] opacity-70")}
                  >
                    {/* Linha principal */}
                    <div className="flex items-center gap-3 px-4 py-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={cn(
                            "font-medium text-[#1B1B1B]",
                            !s.isActive && "line-through text-[#9B9B9B]"
                          )}>
                            {s.name}
                          </p>
                          {!s.isActive && <Badge variant="outline">Inativo</Badge>}
                          <CommissionBadge type={s.commissionType} value={s.commissionValue} />
                        </div>
                        <p className="text-sm text-[#6B6B6B]">
                          {formatDuration(s.durationMinutes)}
                          {s.category ? ` · ${s.category}` : ""}
                        </p>
                      </div>

                      <span className={cn(
                        "font-bold shrink-0",
                        s.isActive ? "text-[#EF9F27]" : "text-[#9B9B9B]"
                      )}>
                        {formatCurrency(s.price)}
                      </span>

                      <button
                        onClick={() => {
                          setExpandedId((prev) => (prev === s.id ? null : s.id));
                          setActionState(null);
                          setEditId(null);
                        }}
                        className="p-1.5 rounded-lg hover:bg-[#F5F5F5] text-[#6B6B6B] transition-colors shrink-0"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>

                    {/* Painel expandido */}
                    {isExpanded && (
                      <div className="border-t border-black/5">
                        {editId === s.id ? (
                          /* ── Edição ── */
                          <div className="px-4 py-4 space-y-4">
                            <p className="text-sm font-semibold text-[#1B1B1B]">Editar serviço</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label>Nome *</Label>
                                <Input
                                  value={editForm.name}
                                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                                  required
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label>Categoria</Label>
                                <Input
                                  value={editForm.category}
                                  onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                                  placeholder="Ex: Corte, Coloração..."
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label>Duração (min) *</Label>
                                <Input
                                  type="number"
                                  min={5}
                                  value={editForm.durationMinutes}
                                  onChange={(e) =>
                                    setEditForm((p) => ({ ...p, durationMinutes: Number(e.target.value) }))
                                  }
                                  required
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label>Preço (R$) *</Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#9B9B9B] pointer-events-none select-none">R$</span>
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    className="pl-9"
                                    value={editPrice.str}
                                    onChange={(e) => editPrice.onInput(e.target.value)}
                                    required
                                  />
                                </div>
                              </div>

                              {/* Painel de comissão (edição) */}
                              <CommissionPanel
                                commType={editForm.commissionType}
                                commValue={editForm.commissionValue}
                                commValueStr={editCommFixed.str}
                                servicePrice={editPrice.val}
                                onTypeChange={(t) => {
                                  setEditForm(p => ({ ...p, commissionType: t, commissionValue: 0 }));
                                  editCommFixed.reset(0);
                                }}
                                onValueInput={(raw) => {
                                  const digits = raw.replace(/\D/g, "");
                                  if (editForm.commissionType === 1) {
                                    // percentual: clampado entre 0 e 100
                                    const v = digits ? Math.min(100, Math.max(0, parseInt(digits, 10) / 100)) : 0;
                                    setEditForm(p => ({ ...p, commissionValue: v }));
                                  } else {
                                    // valor fixo: não pode ser negativo nem maior que o preço
                                    const v = digits ? parseInt(digits, 10) / 100 : 0;
                                    const clamped = editPrice.val > 0 ? Math.min(v, editPrice.val) : v;
                                    if (clamped !== v) {
                                      editCommFixed.reset(clamped);
                                    } else {
                                      editCommFixed.onInput(raw);
                                    }
                                    setEditForm(p => ({ ...p, commissionValue: clamped }));
                                  }
                                }}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>Descrição</Label>
                              <Input
                                value={editForm.description}
                                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                                placeholder="Descrição do serviço..."
                              />
                            </div>
                            <div className="flex gap-3">
                              <Button
                                variant="accent"
                                disabled={isBusy}
                                onClick={() => handleUpdate(s.id)}
                              >
                                {isBusy && <Loader2 size={14} className="animate-spin mr-1" />}
                                {isBusy ? "Salvando..." : "Salvar"}
                              </Button>
                              <Button variant="ghost" onClick={cancelEdit}>
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          /* ── Botões de ação ── */
                          <div className="px-4 pb-4 flex flex-wrap gap-2 pt-3">
                            <button
                              onClick={() => startEdit(s)}
                              disabled={isBusy}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-black/10 bg-white text-[#1B1B1B] hover:bg-[#F5F5F5] transition-all disabled:opacity-40"
                            >
                              <Pencil size={14} />
                              Editar
                            </button>

                            <button
                              onClick={() => handleToggleActive(s.id, s.isActive)}
                              disabled={isBusy}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all disabled:opacity-40",
                                s.isActive
                                  ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                  : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                              )}
                            >
                              {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                              {s.isActive ? "Desativar" : "Ativar"}
                            </button>

                            {!isConfirmingDelete ? (
                              <button
                                onClick={() => setActionState({ type: "confirm-delete", id: s.id })}
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
                                  onClick={() => handleDelete(s.id)}
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
