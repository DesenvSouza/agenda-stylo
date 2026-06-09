"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Trash2, Loader2, Clock, CalendarOff,
  Save, Coffee, UtensilsCrossed, Palmtree, CalendarX,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  professionalsApi, type ScheduleDay,
  type ProfessionalBlock, type CreateBlockInput,
} from "@/lib/api";
import { toast } from "sonner";

// ── Constantes ────────────────────────────────────────────────────────────────
const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const BLOCK_TYPES = [
  { value: "timeoff",  label: "Folga",   icon: CalendarOff },
  { value: "vacation", label: "Férias",  icon: Palmtree    },
  { value: "other",    label: "Outro",   icon: CalendarX   },
];

const BREAK_PRESETS = [
  { label: "Almoço",   start: "12:00", end: "13:00", icon: UtensilsCrossed },
  { label: "Lanche",   start: "15:30", end: "16:00", icon: Coffee           },
];

// ── Utilidades ────────────────────────────────────────────────────────────────
function formatDate(str: string) {
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
}

function blockTypeLabel(type: string) {
  return BLOCK_TYPES.find((t) => t.value === type)?.label ?? type;
}

function blockTypeIcon(type: string) {
  const T = BLOCK_TYPES.find((t) => t.value === type);
  return T ? T.icon : CalendarOff;
}

function newBreakId() {
  return Math.random().toString(36).slice(2, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ProfessionalSchedulePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // --- Agenda semanal ---
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Pausa em edição inline por dia
  const [addingBreak, setAddingBreak] = useState<number | null>(null);
  const [breakForm, setBreakForm] = useState({ label: "", startTime: "", endTime: "" });

  // --- Bloqueios ---
  const [blocks, setBlocks] = useState<ProfessionalBlock[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(true);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockForm, setBlockForm] = useState<{
    blockType: string;
    dateStart: string;
    dateEnd: string;
    isFullDay: boolean;
    startTime: string;
    endTime: string;
    reason: string;
  }>({
    blockType: "timeoff",
    dateStart: todayStr(),
    dateEnd: todayStr(),
    isFullDay: true,
    startTime: "12:00",
    endTime: "13:00",
    reason: "",
  });
  const [savingBlock, setSavingBlock] = useState(false);
  const [deletingBlockId, setDeletingBlockId] = useState<string | null>(null);

  // ── Carga ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    professionalsApi.getSchedule(id)
      .then((r) => setSchedule(r.data.schedule))
      .catch(() => toast.error("Erro ao carregar agenda"))
      .finally(() => setLoadingSchedule(false));

    professionalsApi.getBlocks(id)
      .then((r) => setBlocks(r.data.blocks))
      .catch(() => toast.error("Erro ao carregar ausências"))
      .finally(() => setLoadingBlocks(false));
  }, [id]);

  // ── Mutações de agenda semanal ─────────────────────────────────────────────
  function toggleDay(dow: number) {
    setSchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dow) return d;
        // Não renderizamos o toggle para dias fechados, então aqui chegamos
        // apenas para dias em que o estabelecimento está aberto.
        const nowWorking = !d.isWorking;
        return {
          ...d,
          isWorking: nowWorking,
          startTime: nowWorking ? (d.startTime ?? d.estStart ?? "09:00") : d.startTime,
          endTime:   nowWorking ? (d.endTime   ?? d.estEnd   ?? "18:00") : d.endTime,
        };
      })
    );
  }

  function updateDayTime(dow: number, field: "startTime" | "endTime", value: string) {
    setSchedule((prev) =>
      prev.map((d) => d.dayOfWeek === dow ? { ...d, [field]: value } : d)
    );
  }

  function addBreakPreset(dow: number, preset: typeof BREAK_PRESETS[0]) {
    setSchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dow) return d;
        const exists = d.breaks.some(
          (b) => b.startTime === preset.start && b.endTime === preset.end
        );
        if (exists) return d;
        return {
          ...d,
          breaks: [...d.breaks, { id: newBreakId(), label: preset.label,
            startTime: preset.start, endTime: preset.end }],
        };
      })
    );
  }

  function addCustomBreak(dow: number) {
    if (!breakForm.startTime || !breakForm.endTime) {
      toast.error("Informe o horário da pausa"); return;
    }
    setSchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dow) return d;
        return {
          ...d,
          breaks: [...d.breaks, {
            id: newBreakId(),
            label: breakForm.label || "Pausa",
            startTime: breakForm.startTime,
            endTime: breakForm.endTime,
          }],
        };
      })
    );
    setAddingBreak(null);
    setBreakForm({ label: "", startTime: "", endTime: "" });
  }

  function removeBreak(dow: number, breakId: string) {
    setSchedule((prev) =>
      prev.map((d) =>
        d.dayOfWeek === dow
          ? { ...d, breaks: d.breaks.filter((b) => b.id !== breakId) }
          : d
      )
    );
  }

  async function handleSaveSchedule() {
    // Validação client-side
    for (const day of schedule) {
      if (!day.isWorking) continue;
      if (!day.startTime || !day.endTime) {
        toast.error(`Defina o horário para ${DAY_NAMES[day.dayOfWeek]}`); return;
      }
      if (day.startTime >= day.endTime) {
        toast.error(`${DAY_NAMES[day.dayOfWeek]}: horário de início deve ser antes do término`); return;
      }
      if (day.estStart && day.startTime < day.estStart) {
        toast.error(`${DAY_NAMES[day.dayOfWeek]}: início antes da abertura do estabelecimento (${day.estStart})`); return;
      }
      if (day.estEnd && day.endTime > day.estEnd) {
        toast.error(`${DAY_NAMES[day.dayOfWeek]}: término após fechamento do estabelecimento (${day.estEnd})`); return;
      }
    }

    setSavingSchedule(true);
    try {
      await professionalsApi.updateSchedule(id, schedule.map((d) => ({
        dayOfWeek: d.dayOfWeek,
        isWorking: d.isWorking,
        startTime: d.isWorking ? d.startTime : null,
        endTime:   d.isWorking ? d.endTime   : null,
        breaks:    d.isWorking ? d.breaks    : [],
      })));
      toast.success("Agenda salva com sucesso");
    } catch (err) {
      toast.error((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Erro ao salvar agenda");
    } finally {
      setSavingSchedule(false);
    }
  }

  // ── Mutações de bloqueios ──────────────────────────────────────────────────
  async function handleCreateBlock() {
    setSavingBlock(true);
    try {
      const payload: CreateBlockInput = {
        dateStart: blockForm.dateStart,
        dateEnd:   blockForm.dateEnd !== blockForm.dateStart ? blockForm.dateEnd : undefined,
        isFullDay: blockForm.isFullDay,
        startTime: blockForm.isFullDay ? undefined : blockForm.startTime,
        endTime:   blockForm.isFullDay ? undefined : blockForm.endTime,
        reason:    blockForm.reason || undefined,
        blockType: blockForm.blockType,
      };

      const res = await professionalsApi.createBlock(id, payload);
      const newBlock: ProfessionalBlock = {
        id: res.data.id,
        dateStart: blockForm.dateStart,
        dateEnd:   blockForm.dateEnd !== blockForm.dateStart ? blockForm.dateEnd : null,
        isFullDay: blockForm.isFullDay,
        startTime: blockForm.isFullDay ? null : blockForm.startTime,
        endTime:   blockForm.isFullDay ? null : blockForm.endTime,
        reason:    blockForm.reason || null,
        blockType: blockForm.blockType,
      };
      setBlocks((prev) => [...prev, newBlock].sort((a, b) => a.dateStart.localeCompare(b.dateStart)));
      setShowBlockForm(false);
      setBlockForm({
        blockType: "timeoff", dateStart: todayStr(), dateEnd: todayStr(),
        isFullDay: true, startTime: "12:00", endTime: "13:00", reason: "",
      });
      toast.success("Ausência registrada");
    } catch (err) {
      toast.error((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Erro ao registrar ausência");
    } finally {
      setSavingBlock(false);
    }
  }

  async function handleDeleteBlock(blockId: string) {
    setDeletingBlockId(blockId);
    try {
      await professionalsApi.deleteBlock(id, blockId);
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      toast.success("Ausência removida");
    } catch {
      toast.error("Erro ao remover ausência");
    } finally {
      setDeletingBlockId(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto space-y-6 pb-10">

      {/* Header */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-[#F5F5F5] text-[#6B6B6B] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#1B1B1B]">Agenda do profissional</h1>
          <p className="text-xs text-[#9B9B9B]">Horários de trabalho e ausências</p>
        </div>
      </div>

      {/* ── Seção: Horários de trabalho ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock size={16} className="text-[#EF9F27]" />
            Horários de trabalho
          </CardTitle>
          <p className="text-xs text-[#9B9B9B]">
            Defina quais dias e horários o profissional atende. Os dias em que o estabelecimento
            está fechado não podem ser ativados.
          </p>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {loadingSchedule ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-[#9B9B9B]" />
            </div>
          ) : (
            <>
              {schedule.map((day) => (
                <DayCard
                  key={day.dayOfWeek}
                  day={day}
                  addingBreak={addingBreak}
                  breakForm={breakForm}
                  onToggle={() => toggleDay(day.dayOfWeek)}
                  onTimeChange={(f, v) => updateDayTime(day.dayOfWeek, f, v)}
                  onAddPreset={(p) => addBreakPreset(day.dayOfWeek, p)}
                  onStartAddBreak={() => {
                    setAddingBreak(day.dayOfWeek);
                    setBreakForm({ label: "", startTime: "", endTime: "" });
                  }}
                  onBreakFormChange={(f, v) =>
                    setBreakForm((prev) => ({ ...prev, [f]: v }))
                  }
                  onConfirmBreak={() => addCustomBreak(day.dayOfWeek)}
                  onCancelBreak={() => setAddingBreak(null)}
                  onRemoveBreak={(bid) => removeBreak(day.dayOfWeek, bid)}
                />
              ))}

              <div className="pt-2">
                <Button
                  variant="accent"
                  className="w-full"
                  disabled={savingSchedule}
                  onClick={handleSaveSchedule}
                >
                  {savingSchedule
                    ? <><Loader2 size={14} className="animate-spin mr-2" />Salvando...</>
                    : <><Save size={14} className="mr-2" />Salvar horários</>}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Seção: Ausências ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarOff size={16} className="text-[#EF9F27]" />
              Ausências e bloqueios
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 h-8 text-xs"
              onClick={() => setShowBlockForm((v) => !v)}
            >
              <Plus size={13} />
              Nova
            </Button>
          </div>
          <p className="text-xs text-[#9B9B9B]">
            Folgas, férias e períodos em que o profissional não atende. Dias com agendamentos
            não podem ser bloqueados.
          </p>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">

          {/* Formulário de novo bloqueio */}
          {showBlockForm && (
            <div className="border border-[#EF9F27]/40 rounded-2xl bg-[#FAFAF8] p-4 space-y-4">

              {/* Tipo */}
              <div>
                <p className="text-[10px] font-bold text-[#9B9B9B] uppercase tracking-widest mb-2">
                  Tipo
                </p>
                <div className="flex gap-2">
                  {BLOCK_TYPES.map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.value}
                        onClick={() => setBlockForm((f) => ({ ...f, blockType: t.value }))}
                        className={cn(
                          "flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all",
                          blockForm.blockType === t.value
                            ? "border-[#EF9F27] bg-[#FAEEDA]/50 text-[#EF9F27]"
                            : "border-black/10 bg-white text-[#6B6B6B] hover:border-black/20"
                        )}
                      >
                        <Icon size={15} />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#9B9B9B] uppercase tracking-widest mb-1">
                    Data início
                  </label>
                  <input
                    type="date"
                    value={blockForm.dateStart}
                    min={todayStr()}
                    onChange={(e) => {
                      const v = e.target.value;
                      setBlockForm((f) => ({
                        ...f, dateStart: v,
                        dateEnd: f.dateEnd < v ? v : f.dateEnd,
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-black/15 text-sm focus:outline-none focus:border-[#1B1B1B] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#9B9B9B] uppercase tracking-widest mb-1">
                    Data fim
                  </label>
                  <input
                    type="date"
                    value={blockForm.dateEnd}
                    min={blockForm.dateStart}
                    onChange={(e) => setBlockForm((f) => ({ ...f, dateEnd: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-black/15 text-sm focus:outline-none focus:border-[#1B1B1B] transition-colors"
                  />
                </div>
              </div>

              {/* Dia inteiro / horário específico */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setBlockForm((f) => ({ ...f, isFullDay: true }))}
                  className={cn(
                    "flex-1 py-2 rounded-xl border text-sm font-medium transition-all",
                    blockForm.isFullDay
                      ? "border-[#EF9F27] bg-[#FAEEDA]/50 text-[#EF9F27]"
                      : "border-black/10 bg-white text-[#6B6B6B] hover:border-black/20"
                  )}
                >
                  Dia inteiro
                </button>
                <button
                  onClick={() => setBlockForm((f) => ({ ...f, isFullDay: false }))}
                  className={cn(
                    "flex-1 py-2 rounded-xl border text-sm font-medium transition-all",
                    !blockForm.isFullDay
                      ? "border-[#EF9F27] bg-[#FAEEDA]/50 text-[#EF9F27]"
                      : "border-black/10 bg-white text-[#6B6B6B] hover:border-black/20"
                  )}
                >
                  Horário parcial
                </button>
              </div>

              {/* Horário (se parcial) */}
              {!blockForm.isFullDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#9B9B9B] uppercase tracking-widest mb-1">
                      Início
                    </label>
                    <input
                      type="time"
                      value={blockForm.startTime}
                      onChange={(e) => setBlockForm((f) => ({ ...f, startTime: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-black/15 text-sm focus:outline-none focus:border-[#1B1B1B] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#9B9B9B] uppercase tracking-widest mb-1">
                      Fim
                    </label>
                    <input
                      type="time"
                      value={blockForm.endTime}
                      onChange={(e) => setBlockForm((f) => ({ ...f, endTime: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-black/15 text-sm focus:outline-none focus:border-[#1B1B1B] transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Observação */}
              <div>
                <label className="block text-[10px] font-bold text-[#9B9B9B] uppercase tracking-widest mb-1">
                  Observação (opcional)
                </label>
                <input
                  type="text"
                  value={blockForm.reason}
                  onChange={(e) => setBlockForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Ex: Consulta médica, treinamento..."
                  className="w-full px-3 py-2 rounded-xl border border-black/15 text-sm placeholder:text-[#C4C4C4] focus:outline-none focus:border-[#1B1B1B] transition-colors"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="accent"
                  className="flex-1"
                  disabled={savingBlock}
                  onClick={handleCreateBlock}
                >
                  {savingBlock
                    ? <Loader2 size={14} className="animate-spin mr-1" />
                    : null}
                  Confirmar
                </Button>
                <Button variant="ghost" onClick={() => setShowBlockForm(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Lista de bloqueios */}
          {loadingBlocks ? (
            <div className="flex justify-center py-6">
              <Loader2 size={22} className="animate-spin text-[#9B9B9B]" />
            </div>
          ) : blocks.length === 0 ? (
            <p className="text-sm text-[#9B9B9B] text-center py-6">
              Nenhuma ausência cadastrada
            </p>
          ) : (
            <div className="space-y-2">
              {blocks.map((block) => {
                const Icon = blockTypeIcon(block.blockType);
                const isDeleting = deletingBlockId === block.id;
                return (
                  <div
                    key={block.id}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl border border-black/8 bg-white"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#FAEEDA] flex items-center justify-center shrink-0">
                      <Icon size={15} className="text-[#EF9F27]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1B1B1B]">
                        {blockTypeLabel(block.blockType)}
                        {block.reason ? ` · ${block.reason}` : ""}
                      </p>
                      <p className="text-xs text-[#9B9B9B]">
                        {formatDate(block.dateStart)}
                        {block.dateEnd ? ` → ${formatDate(block.dateEnd)}` : ""}
                        {!block.isFullDay && block.startTime
                          ? ` · ${block.startTime}–${block.endTime}`
                          : block.isFullDay ? " · dia inteiro" : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteBlock(block.id)}
                      disabled={isDeleting}
                      className="p-1.5 rounded-lg text-[#9B9B9B] hover:text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors shrink-0"
                    >
                      {isDeleting
                        ? <Loader2 size={15} className="animate-spin" />
                        : <Trash2 size={15} />}
                    </button>
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

// ── Sub-componente: card de um dia da semana ──────────────────────────────────
function DayCard({
  day,
  addingBreak,
  breakForm,
  onToggle,
  onTimeChange,
  onAddPreset,
  onStartAddBreak,
  onBreakFormChange,
  onConfirmBreak,
  onCancelBreak,
  onRemoveBreak,
}: {
  day: ScheduleDay;
  addingBreak: number | null;
  breakForm: { label: string; startTime: string; endTime: string };
  onToggle: () => void;
  onTimeChange: (field: "startTime" | "endTime", value: string) => void;
  onAddPreset: (preset: typeof BREAK_PRESETS[0]) => void;
  onStartAddBreak: () => void;
  onBreakFormChange: (field: string, value: string) => void;
  onConfirmBreak: () => void;
  onCancelBreak: () => void;
  onRemoveBreak: (id: string) => void;
}) {
  const closed = !day.estIsOpen;
  const isExpanded = day.isWorking && !closed;
  const isAddingBreakHere = addingBreak === day.dayOfWeek;

  return (
    <div className={cn(
      "rounded-2xl border transition-all overflow-hidden",
      closed ? "border-black/5 bg-[#F9F9F9] opacity-60"
        : day.isWorking ? "border-[#EF9F27]/30 bg-white"
        : "border-black/8 bg-white"
    )}>
      {/* Linha do cabeçalho do dia */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-[#6B6B6B]">{DAY_SHORT[day.dayOfWeek]}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1B1B1B]">{DAY_NAMES[day.dayOfWeek]}</p>
          {closed ? (
            <p className="text-xs text-[#9B9B9B]">Estabelecimento fechado</p>
          ) : day.isWorking ? (
            <p className="text-xs text-[#6B6B6B]">
              {day.startTime} – {day.endTime}
              {day.breaks.length > 0 ? ` · ${day.breaks.length} pausa${day.breaks.length > 1 ? "s" : ""}` : ""}
            </p>
          ) : (
            <p className="text-xs text-[#9B9B9B]">Não trabalha</p>
          )}
        </div>

        {/* Toggle on/off */}
        {!closed && (
          <label className="relative inline-flex items-center shrink-0 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={day.isWorking}
              onChange={() => onToggle()}
              className="sr-only peer"
            />
            {/* fundo do toggle */}
            <div className="w-11 h-6 rounded-full bg-[#D8D8D8] peer-checked:bg-[#EF9F27] transition-colors duration-200" />
            {/* bolinha deslizante */}
            <span className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 peer-checked:translate-x-5" />
          </label>
        )}
      </div>

      {/* Detalhes expandidos (só quando ativo) */}
      {isExpanded && (
        <div className="border-t border-black/5 px-4 pb-4 pt-3 space-y-3">

          {/* Horários */}
          <div className="flex gap-3 items-center">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-[#9B9B9B] uppercase tracking-widest mb-1">
                Início
              </label>
              <input
                type="time"
                value={day.startTime ?? ""}
                min={day.estStart ?? undefined}
                max={day.endTime   ?? undefined}
                onChange={(e) => onTimeChange("startTime", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-black/15 text-sm focus:outline-none focus:border-[#EF9F27] transition-colors"
              />
              {day.estStart && (
                <p className="text-[10px] text-[#9B9B9B] mt-0.5">Estab. abre {day.estStart}</p>
              )}
            </div>
            <span className="text-[#9B9B9B] shrink-0 mt-3">→</span>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-[#9B9B9B] uppercase tracking-widest mb-1">
                Término
              </label>
              <input
                type="time"
                value={day.endTime ?? ""}
                min={day.startTime ?? undefined}
                max={day.estEnd    ?? undefined}
                onChange={(e) => onTimeChange("endTime", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-black/15 text-sm focus:outline-none focus:border-[#EF9F27] transition-colors"
              />
              {day.estEnd && (
                <p className="text-[10px] text-[#9B9B9B] mt-0.5">Estab. fecha {day.estEnd}</p>
              )}
            </div>
          </div>

          {/* Pausas */}
          <div>
            <p className="text-[10px] font-bold text-[#9B9B9B] uppercase tracking-widest mb-2">
              Pausas
            </p>

            {/* Presets rápidos */}
            <div className="flex gap-2 mb-2">
              {BREAK_PRESETS.map((p) => {
                const Icon = p.icon;
                const already = day.breaks.some(
                  (b) => b.startTime === p.start && b.endTime === p.end
                );
                return (
                  <button
                    key={p.label}
                    onClick={() => onAddPreset(p)}
                    disabled={already}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all",
                      already
                        ? "border-[#EF9F27]/30 bg-[#FAEEDA]/30 text-[#EF9F27] opacity-50 cursor-not-allowed"
                        : "border-black/10 bg-white text-[#6B6B6B] hover:border-[#EF9F27]/50 hover:text-[#EF9F27]"
                    )}
                  >
                    <Icon size={12} />
                    {p.label}
                    <span className="text-[10px] opacity-70">{p.start}</span>
                  </button>
                );
              })}
            </div>

            {/* Lista de pausas adicionadas */}
            {day.breaks.length > 0 && (
              <div className="space-y-1 mb-2">
                {day.breaks.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FAEEDA]/20 border border-[#EF9F27]/20"
                  >
                    <Coffee size={12} className="text-[#EF9F27] shrink-0" />
                    <span className="text-xs font-medium text-[#1B1B1B] flex-1">{b.label}</span>
                    <span className="text-xs text-[#9B9B9B]">{b.startTime}–{b.endTime}</span>
                    <button
                      onClick={() => onRemoveBreak(b.id)}
                      className="text-[#9B9B9B] hover:text-red-500 transition-colors p-0.5"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Formulário de pausa personalizada */}
            {isAddingBreakHere ? (
              <div className="rounded-xl border border-black/10 bg-white p-3 space-y-2">
                <input
                  type="text"
                  placeholder="Nome da pausa (ex: Lanche)"
                  value={breakForm.label}
                  onChange={(e) => onBreakFormChange("label", e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-black/10 text-xs focus:outline-none focus:border-[#1B1B1B] transition-colors"
                />
                <div className="flex gap-2 items-center">
                  <input
                    type="time"
                    value={breakForm.startTime}
                    onChange={(e) => onBreakFormChange("startTime", e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-black/10 text-xs focus:outline-none focus:border-[#1B1B1B] transition-colors"
                  />
                  <span className="text-xs text-[#9B9B9B]">→</span>
                  <input
                    type="time"
                    value={breakForm.endTime}
                    onChange={(e) => onBreakFormChange("endTime", e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-black/10 text-xs focus:outline-none focus:border-[#1B1B1B] transition-colors"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={onConfirmBreak}
                    className="flex-1 py-1.5 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#333] transition-colors"
                  >
                    Adicionar
                  </button>
                  <button
                    onClick={onCancelBreak}
                    className="px-3 py-1.5 text-xs text-[#6B6B6B] hover:text-[#1B1B1B] transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={onStartAddBreak}
                className="flex items-center gap-1.5 text-xs text-[#9B9B9B] hover:text-[#EF9F27] transition-colors py-1"
              >
                <Plus size={12} />
                Pausa personalizada
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
