"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Check, Users, Scissors,
  User, Calendar, Clock, Tag, MessageCircle, AlertCircle,
  Loader2, X, CalendarX, CheckCircle2,
} from "lucide-react";
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameDay,
  isSameMonth, isBefore, startOfDay, addDays, isAfter,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { publicApi } from "@/lib/api";
import { formatCurrency, formatDuration, cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface Establishment { id: string; name: string; address?: string; timeZoneId?: string; }
interface Service { id: string; name: string; category?: string; durationMinutes: number; price: number; }
interface Professional { id: string; name: string; photoUrl?: string; specialty?: string; serviceIds: string[]; }
interface SlotProfessional { id: string; name: string; photoUrl?: string; }
interface AggregatedSlot { time: string; availableProfessionals: SlotProfessional[]; }
interface ProfessionalSlot { professionalId: string; professionalName: string; slots: string[]; }

interface ExistingBooking {
  id: string;
  serviceId: string;
  serviceName: string;
  professionalId: string;
  professionalName: string;
  scheduledAt: string;
  status: number;
  cancelToken: string;
}

interface Props {
  slug: string;
  establishment: Establishment;
  services: Service[];
  professionals: Professional[];
  initialServiceId?: string;
  initialProfessionalId?: string;
}

// Step order: 0=WhatsApp 1=Serviço 2=Profissional 3=Data/hora 4=Confirmação
const STEPS = ["Identificação", "Serviço", "Profissional", "Data e hora", "Confirmação"];

const STATUS_LABEL: Record<number, string> = {
  1: "Pendente", 2: "Confirmado", 3: "Concluído", 4: "Cancelado", 5: "Não compareceu",
};
const STATUS_COLOR: Record<number, string> = {
  1: "text-amber-600 bg-amber-50 border-amber-200",
  2: "text-blue-600 bg-blue-50 border-blue-200",
  3: "text-green-600 bg-green-50 border-green-200",
  4: "text-red-500 bg-red-50 border-red-200",
  5: "text-gray-500 bg-gray-50 border-gray-200",
};

// ── Calendar ──────────────────────────────────────────────────────────────────

function MonthCalendar({
  selected, onSelect, minDate, availableDays, loadingDays, onMonthChange,
}: {
  selected: Date | null;
  onSelect: (d: Date) => void;
  minDate: Date;
  /** Conjunto de números de dias disponíveis no mês atual. Dias ausentes ficam desabilitados. */
  availableDays?: Set<number>;
  /** Quando true exibe spinner e mantém os dias habilitados (carregando). */
  loadingDays?: boolean;
  onMonthChange?: (year: number, month: number) => void;
}) {
  const [view, setView] = useState(startOfMonth(minDate));

  const changeView = (newView: Date) => {
    setView(newView);
    onMonthChange?.(newView.getFullYear(), newView.getMonth() + 1);
  };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(view), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(view), { weekStartsOn: 1 }),
  });
  const canGoBack = !isSameMonth(view, startOfMonth(minDate));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => changeView(subMonths(view, 1))}
          disabled={!canGoBack}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#F5F5F5] disabled:opacity-30 transition-colors"
        >
          <ChevronLeft size={22} />
        </button>
        <span className="font-semibold text-[#1B1B1B] capitalize flex items-center gap-2">
          {format(view, "MMMM yyyy", { locale: ptBR })}
          {loadingDays && <Loader2 size={13} className="text-[#EF9F27] animate-spin" />}
        </span>
        <button
          onClick={() => changeView(addMonths(view, 1))}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#F5F5F5] transition-colors"
        >
          <ChevronRight size={22} />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map(d => (
          <div key={d} className="text-center text-xs font-medium text-[#9B9B9B] py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {days.map(day => {
          const inMonth = isSameMonth(day, view);
          const isPast = isBefore(day, startOfDay(minDate));
          const dayNum = day.getDate();
          // Desabilita se availableDays definido, não estamos carregando, e o dia não está na lista
          const isUnavailable = !loadingDays
            && availableDays !== undefined
            && inMonth
            && !availableDays.has(dayNum);
          const isSel = selected ? isSameDay(day, selected) : false;
          const disabled = !inMonth || isPast || isUnavailable;
          return (
            <button
              key={day.toISOString()}
              onClick={() => !disabled && onSelect(day)}
              disabled={disabled}
              className={cn(
                "mx-auto w-9 h-9 flex items-center justify-center rounded-full text-sm transition-colors",
                !inMonth && "invisible",
                (isPast || isUnavailable) && "opacity-30 cursor-not-allowed",
                isSel && "bg-[#1B1B1B] text-white font-bold",
                !isSel && !disabled && "hover:bg-[#FAEEDA]",
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Phone mask ────────────────────────────────────────────────────────────────

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

// ── Wizard ────────────────────────────────────────────────────────────────────

export function BookingWizard({
  slug, establishment, services, professionals,
  initialServiceId, initialProfessionalId,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 0 – WhatsApp / identificação
  const [phone, setPhone] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);
  const [clientFound, setClientFound] = useState(false);
  const [name, setName] = useState("");
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set());
  // Reagendamento inline
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<AggregatedSlot[] | ProfessionalSlot[]>([]);
  const [reschedulingDate, setReschedulingDate] = useState<Date | null>(null);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [reschedulingBooking, setReschedulingBooking] = useState(false);
  const [rescheduledIds, setRescheduledIds] = useState<Record<string, string>>({}); // id → novo scheduledAt
  // Disponibilidade de dias no mês (calendário principal + reagendamento inline)
  const [availableDays, setAvailableDays] = useState<Set<number> | undefined>(undefined);
  const [loadingDays, setLoadingDays] = useState(false);
  const [reschedAvailableDays, setReschedAvailableDays] = useState<Set<number> | undefined>(undefined);
  const [loadingReschedDays, setLoadingReschedDays] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null);

  // Steps 1-4
  const [selectedService, setSelectedService] = useState<Service | null>(
    initialServiceId ? (services.find(s => s.id === initialServiceId) ?? null) : null
  );
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | "any" | null>(
    initialProfessionalId ? (professionals.find(p => p.id === initialProfessionalId) ?? null) : null
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; professionalId?: string; professionalName?: string } | null>(null);
  const [slots, setSlots] = useState<AggregatedSlot[] | ProfessionalSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Pula passo de serviço se já veio pré-selecionado (mantendo step 0 = WhatsApp)
  useEffect(() => {
    if (initialServiceId && selectedService) setStep(2); // pula serviço → profissional
    if (initialServiceId && initialProfessionalId && selectedService) setStep(3); // pula para data
  }, []); // eslint-disable-line

  // Busca disponibilidade de dias ao entrar no step 3
  useEffect(() => {
    if (step !== 3 || !selectedService) return;
    const profId = typeof selectedProfessional === "object" && selectedProfessional !== null
      ? selectedProfessional.id : null;
    const now = new Date();
    setAvailableDays(undefined);
    setLoadingDays(true);
    publicApi.getAvailableDays(slug, now.getFullYear(), now.getMonth() + 1, selectedService.id, profId)
      .then(res => setAvailableDays(new Set(res.data)))
      .catch(() => setAvailableDays(undefined))
      .finally(() => setLoadingDays(false));
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const availableProfessionals = selectedService
    ? professionals.filter(p => p.serviceIds.includes(selectedService.id))
    : professionals;

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const back = () => { setStep(s => Math.max(s - 1, 0)); setError(""); };

  // ── Lookup de cliente por WhatsApp
  const handleLookup = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) return;
    setLookingUp(true);
    try {
      const res = await publicApi.lookupClient(slug, digits);
      const data = res.data;
      setClientFound(data.found);
      if (data.found) {
        setName(data.name);
        setExistingBookings(data.bookings ?? []);
      }
    } catch {
      setClientFound(false);
    } finally {
      setLookingUp(false);
      setLookupDone(true);
    }
  };

  // Lookup automático quando telefone tem 10-11 dígitos
  useEffect(() => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 10) {
      setLookupDone(false);
      setClientFound(false);
      const t = setTimeout(handleLookup, 500);
      return () => clearTimeout(t);
    } else {
      setLookupDone(false);
      setClientFound(false);
      setName("");
      setExistingBookings([]);
    }
  }, [phone]); // eslint-disable-line

  // ── Cancelar agendamento existente
  const handleCancelBooking = async (cancelToken: string, bookingId: string) => {
    setCancellingId(bookingId);
    try {
      await publicApi.cancelBooking(cancelToken);
      setCancelledIds(prev => new Set(prev).add(bookingId));
    } catch {
      /* silent */
    } finally {
      setCancellingId(null);
    }
  };

  // ── Abrir painel de reagendamento
  const openReschedule = async (booking: ExistingBooking) => {
    if (reschedulingId === booking.id) {
      // toggle: fecha se já estiver aberto
      setReschedulingId(null);
      setRescheduleSlots([]);
      setReschedulingDate(null);
      setReschedAvailableDays(undefined);
      return;
    }
    setReschedulingId(booking.id);
    setRescheduleSlots([]);
    setReschedulingDate(null);
    // Busca dias disponíveis para o profissional+serviço do agendamento
    setReschedAvailableDays(undefined);
    setLoadingReschedDays(true);
    const now = new Date();
    publicApi.getAvailableDays(slug, now.getFullYear(), now.getMonth() + 1, booking.serviceId, booking.professionalId || null)
      .then(res => setReschedAvailableDays(new Set(res.data)))
      .catch(() => setReschedAvailableDays(undefined))
      .finally(() => setLoadingReschedDays(false));
  };

  // ── Escolhe data no painel de reagendamento e busca slots
  const handleRescheduleDateSelect = async (date: Date, booking: ExistingBooking) => {
    setReschedulingDate(date);
    setRescheduleSlots([]);
    setLoadingRescheduleSlots(true);
    try {
      const res = await publicApi.getSlots(
        slug,
        booking.serviceId,
        format(date, "yyyy-MM-dd"),
        booking.professionalId || null,
      );
      setRescheduleSlots(res.data);
    } catch {
      setRescheduleSlots([]);
    } finally {
      setLoadingRescheduleSlots(false);
    }
  };

  // ── Confirma o reagendamento
  const handleConfirmReschedule = async (booking: ExistingBooking, timeStr: string) => {
    setReschedulingBooking(true);
    try {
      const [h, m] = timeStr.split(":").map(Number);
      const d = new Date(reschedulingDate!);
      d.setHours(h, m, 0, 0);
      await publicApi.rescheduleBooking(booking.cancelToken, d.toISOString());
      setRescheduledIds(prev => ({ ...prev, [booking.id]: d.toISOString() }));
      setReschedulingId(null);
      setRescheduleSlots([]);
      setReschedulingDate(null);
    } catch {
      /* silent — o erro de conflito será visível no slot já não aparecer */
    } finally {
      setReschedulingBooking(false);
    }
  };

  // ── Carregar slots
  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setSlots([]);
    setLoadingSlots(true);
    const dateStr = format(date, "yyyy-MM-dd");
    const profId = typeof selectedProfessional === "object" && selectedProfessional !== null
      ? selectedProfessional.id : null;
    try {
      const res = await publicApi.getSlots(slug, selectedService!.id, dateStr, profId);
      setSlots(res.data);
    } finally {
      setLoadingSlots(false);
    }
  };

  // ── Confirmar agendamento
  const handleSubmit = async () => {
    if (!selectedService || !selectedSlot || !name || !phone) return;
    setSubmitting(true);
    setError("");
    try {
      const profId = selectedSlot.professionalId
        ?? (typeof selectedProfessional === "object" && selectedProfessional !== null
          ? selectedProfessional.id : null);

      const result = await publicApi.createBooking(slug, {
        serviceId: selectedService.id,
        professionalId: profId ?? null,
        scheduledAt: buildScheduledAt(selectedDate!, selectedSlot.time),
        client: { name, phone: phone.replace(/\D/g, ""), email: email || undefined },
      });

      const p = new URLSearchParams({
        service: selectedService.name,
        duration: selectedService.durationMinutes.toString(),
        price: selectedService.price.toString(),
        professional: result.data.professional.name,
        scheduledAt: result.data.scheduledAt,
        cancelToken: result.data.cancelToken,
        confirmationCode: result.data.confirmationCode,
        address: establishment.address ?? "",
      });
      router.push(`/${slug}/book/success?${p.toString()}`);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg === "Horário não disponível. Escolha outro."
        ? "Este horário acabou de ser ocupado. Escolha outro."
        : "Erro ao confirmar agendamento. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const buildScheduledAt = (date: Date, timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  const isAggregated = (s: AggregatedSlot[] | ProfessionalSlot[]): s is AggregatedSlot[] =>
    s.length > 0 && "time" in s[0];

  const resolvedProfName = selectedSlot?.professionalName
    ?? (typeof selectedProfessional === "object" && selectedProfessional !== null
      ? selectedProfessional.name : "A confirmar");

  const visibleBookings = existingBookings.filter(b => !cancelledIds.has(b.id));
  const upcomingBookings = visibleBookings.filter(b => isAfter(new Date(b.scheduledAt), new Date()));

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-black/8">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-2">
          {step > 0 && (
            <button onClick={back} className="p-2 -ml-2 rounded-lg hover:bg-[#F5F5F5] transition-colors">
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#1B1B1B] text-sm truncate">{establishment.name}</p>
            <p className="text-xs text-[#9B9B9B]">Passo {step + 1} de {STEPS.length} · {STEPS[step]}</p>
          </div>
        </div>
        <div className="flex gap-1 px-4 pb-3">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i <= step ? "bg-[#EF9F27]" : "border border-dashed border-[#D4D4D4] bg-transparent"
              )}
            />
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">

        {/* ── Step 0: WhatsApp ── */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-[#1B1B1B]">Olá! 👋</h2>
              <p className="text-sm text-[#6B6B6B] mt-1">
                Para agendar, informe seu WhatsApp. Se você já é cliente, já recuperamos seus dados!
              </p>
            </div>

            {/* Input WhatsApp */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[#6B6B6B] pointer-events-none">
                <MessageCircle size={18} className="text-[#EF9F27]" />
              </div>
              <input
                ref={phoneRef}
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={e => setPhone(maskPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="w-full h-14 pl-11 pr-12 text-lg rounded-2xl border-2 border-black/10 focus:border-[#EF9F27] focus:outline-none transition-colors font-medium tracking-wide"
              />
              {lookingUp && (
                <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#EF9F27] animate-spin" />
              )}
              {lookupDone && !lookingUp && (
                <div className={cn("absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center",
                  clientFound ? "bg-green-100" : "bg-[#F5F5F5]")}>
                  {clientFound
                    ? <Check size={14} className="text-green-600" strokeWidth={3} />
                    : <User size={14} className="text-[#9B9B9B]" />}
                </div>
              )}
            </div>

            {/* Estado: cliente encontrado */}
            {lookupDone && clientFound && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <span className="text-base font-bold text-green-700">
                      {name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-[#1B1B1B]">{name}</p>
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      Cliente cadastrado
                    </p>
                  </div>
                </div>

                {/* Agendamentos futuros */}
                {upcomingBookings.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">
                      Seus agendamentos
                    </p>
                    {upcomingBookings.map(b => {
                      const isRescheduling = reschedulingId === b.id;
                      const rescheduledAt = rescheduledIds[b.id];
                      const displayedAt = rescheduledAt ?? b.scheduledAt;
                      return (
                        <div key={b.id} className="bg-white rounded-xl border border-black/8 overflow-hidden">
                          {/* Linha principal */}
                          <div className="p-3 flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-[#1B1B1B] truncate">{b.serviceName}</p>
                              <p className="text-xs text-[#6B6B6B]">
                                {b.professionalName} · {format(new Date(displayedAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                                  STATUS_COLOR[b.status])}>
                                  {rescheduledAt ? "Reagendado ✓" : (STATUS_LABEL[b.status] ?? "")}
                                </span>
                              </div>
                            </div>
                            {/* Botões */}
                            {b.status !== 3 && (
                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                <button
                                  onClick={() => openReschedule(b)}
                                  className={cn(
                                    "flex items-center gap-1 text-[11px] font-medium transition-colors",
                                    isRescheduling ? "text-[#EF9F27]" : "text-[#6B6B6B] hover:text-[#EF9F27]"
                                  )}
                                >
                                  <Calendar size={11} />
                                  {isRescheduling ? "Fechar" : "Reagendar"}
                                </button>
                                {!cancelledIds.has(b.id) && (
                                  <button
                                    onClick={() => handleCancelBooking(b.cancelToken, b.id)}
                                    disabled={cancellingId === b.id}
                                    className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors"
                                  >
                                    {cancellingId === b.id
                                      ? <Loader2 size={11} className="animate-spin" />
                                      : <X size={11} />}
                                    Cancelar
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Painel de reagendamento inline */}
                          {isRescheduling && (
                            <div className="border-t border-black/8 bg-[#FAFAF8] p-3 space-y-3">
                              <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">
                                Escolha a nova data e horário
                              </p>
                              <MonthCalendar
                                selected={reschedulingDate}
                                onSelect={d => handleRescheduleDateSelect(d, b)}
                                minDate={addDays(new Date(), 0)}
                                availableDays={reschedAvailableDays}
                                loadingDays={loadingReschedDays}
                                onMonthChange={(year, month) => {
                                  setReschedAvailableDays(undefined);
                                  setLoadingReschedDays(true);
                                  publicApi.getAvailableDays(slug, year, month, b.serviceId, b.professionalId || null)
                                    .then(res => setReschedAvailableDays(new Set(res.data)))
                                    .catch(() => setReschedAvailableDays(undefined))
                                    .finally(() => setLoadingReschedDays(false));
                                }}
                              />

                              {reschedulingDate && (
                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-[#1B1B1B] capitalize">
                                    {format(reschedulingDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                                  </p>
                                  {loadingRescheduleSlots ? (
                                    <div className="grid grid-cols-4 gap-2">
                                      {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="h-10 rounded-xl bg-[#F0F0F0] animate-pulse" />
                                      ))}
                                    </div>
                                  ) : rescheduleSlots.length === 0 ? (
                                    <p className="text-xs text-center text-[#9B9B9B] py-3">
                                      Nenhum horário disponível nesta data
                                    </p>
                                  ) : isAggregated(rescheduleSlots) ? (
                                    <div className="grid grid-cols-4 gap-2">
                                      {(rescheduleSlots as AggregatedSlot[]).map(slot => (
                                        <button
                                          key={slot.time}
                                          onClick={() => handleConfirmReschedule(b, slot.time)}
                                          disabled={reschedulingBooking}
                                          className="h-10 rounded-xl border border-black/10 bg-white text-xs font-semibold hover:border-[#EF9F27] hover:bg-[#FAEEDA] transition-all disabled:opacity-50"
                                        >
                                          {reschedulingBooking ? <Loader2 size={12} className="animate-spin mx-auto" /> : slot.time}
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-4 gap-2">
                                      {(rescheduleSlots as ProfessionalSlot[]).flatMap(ps =>
                                        ps.slots.map(time => (
                                          <button
                                            key={`${ps.professionalId}-${time}`}
                                            onClick={() => handleConfirmReschedule(b, time)}
                                            disabled={reschedulingBooking}
                                            className="h-10 rounded-xl border border-black/10 bg-white text-xs font-semibold hover:border-[#EF9F27] hover:bg-[#FAEEDA] transition-all disabled:opacity-50"
                                          >
                                            {reschedulingBooking ? <Loader2 size={12} className="animate-spin mx-auto" /> : time}
                                          </button>
                                        ))
                                      )}
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

                {upcomingBookings.length === 0 && (
                  <p className="text-xs text-[#9B9B9B] flex items-center gap-1.5">
                    <CalendarX size={13} />
                    Nenhum agendamento futuro
                  </p>
                )}
              </div>
            )}

            {/* Estado: cliente novo */}
            {lookupDone && !clientFound && (
              <div className="space-y-3">
                <div className="bg-[#FAFAF8] border border-dashed border-[#D4D4D4] rounded-2xl p-4">
                  <p className="text-sm text-[#6B6B6B] flex items-center gap-2">
                    <AlertCircle size={15} className="text-[#EF9F27] shrink-0" />
                    Número não encontrado. Seja bem-vindo! Como você se chama?
                  </p>
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full h-12 px-4 rounded-xl border-2 border-black/10 focus:border-[#EF9F27] focus:outline-none transition-colors text-sm"
                  autoFocus
                />
              </div>
            )}

            {/* Botão continuar */}
            {lookupDone && (
              <button
                onClick={next}
                disabled={!name.trim()}
                className="w-full h-14 bg-[#1B1B1B] text-white font-semibold text-base rounded-2xl disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {clientFound ? "Fazer novo agendamento" : "Continuar"}
                <ChevronRight size={18} />
              </button>
            )}

            {/* Estado: aguardando digitar */}
            {!lookupDone && !lookingUp && (
              <p className="text-xs text-center text-[#C4C4C4]">
                Verificando cadastro automaticamente ao digitar
              </p>
            )}
          </div>
        )}

        {/* ── Step 1: Serviço ── */}
        {step === 1 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-[#1B1B1B]">Escolha o serviço</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {services.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedService(s); next(); }}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl border-2 transition-all",
                    selectedService?.id === s.id
                      ? "border-[#EF9F27] bg-[#FAEEDA]"
                      : "border-black/8 bg-white hover:border-[#EF9F27]"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-[#1B1B1B] text-sm leading-tight">{s.name}</p>
                    {selectedService?.id === s.id && (
                      <div className="w-5 h-5 rounded-full bg-[#EF9F27] flex items-center justify-center shrink-0">
                        <Check size={12} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <p className="flex items-center gap-1 text-xs text-[#6B6B6B] mt-1.5">
                    <Clock size={11} /> {formatDuration(s.durationMinutes)}
                  </p>
                  <p className="font-bold text-[#EF9F27] text-sm mt-1">{formatCurrency(s.price)}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Profissional ── */}
        {step === 2 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-[#1B1B1B]">Escolha o profissional</h2>
            <button
              onClick={() => { setSelectedProfessional("any"); next(); }}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                selectedProfessional === "any" ? "border-[#EF9F27] bg-[#FAEEDA]" : "border-black/8 bg-white hover:border-[#EF9F27]"
              )}
            >
              <div className="w-12 h-12 rounded-full bg-[#F5F5F5] flex items-center justify-center shrink-0">
                <Users size={22} className="text-[#6B6B6B]" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-[#1B1B1B] text-sm">Qualquer disponível</p>
                <p className="text-xs text-[#6B6B6B]">Recomendado · disponibilidade maior</p>
              </div>
              {selectedProfessional === "any" && (
                <div className="w-5 h-5 rounded-full bg-[#EF9F27] flex items-center justify-center">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
              )}
            </button>

            {availableProfessionals.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedProfessional(p); next(); }}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                  typeof selectedProfessional === "object" && selectedProfessional?.id === p.id
                    ? "border-[#EF9F27] bg-[#FAEEDA]" : "border-black/8 bg-white hover:border-[#EF9F27]"
                )}
              >
                <div className="w-12 h-12 rounded-full bg-[#FAEEDA] flex items-center justify-center shrink-0 overflow-hidden">
                  {p.photoUrl ? (
                    <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#EF9F27] font-bold text-lg">{p.name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-[#1B1B1B] text-sm">{p.name}</p>
                  {p.specialty && <p className="text-xs text-[#6B6B6B]">{p.specialty}</p>}
                </div>
                {typeof selectedProfessional === "object" && selectedProfessional?.id === p.id && (
                  <div className="w-5 h-5 rounded-full bg-[#EF9F27] flex items-center justify-center">
                    <Check size={12} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Step 3: Data e hora ── */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-[#1B1B1B]">Escolha a data</h2>
            <div className="bg-white rounded-2xl border border-black/8 p-4">
              <MonthCalendar
                selected={selectedDate}
                onSelect={handleDateSelect}
                minDate={addDays(new Date(), 0)}
                availableDays={availableDays}
                loadingDays={loadingDays}
                onMonthChange={(year, month) => {
                  setAvailableDays(undefined);
                  setLoadingDays(true);
                  const profId = typeof selectedProfessional === "object" && selectedProfessional !== null
                    ? selectedProfessional.id : null;
                  publicApi.getAvailableDays(slug, year, month, selectedService?.id ?? null, profId)
                    .then(res => setAvailableDays(new Set(res.data)))
                    .catch(() => setAvailableDays(undefined))
                    .finally(() => setLoadingDays(false));
                }}
              />
            </div>

            {selectedDate && (
              <div>
                <h3 className="text-sm font-semibold text-[#1B1B1B] mb-3 capitalize">
                  {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </h3>
                {loadingSlots ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-12 rounded-xl bg-[#F5F5F5] animate-pulse" />
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <div className="text-center py-8 text-[#9B9B9B] text-sm">
                    Nenhum horário disponível nesta data.
                  </div>
                ) : isAggregated(slots) ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slots.map(slot => (
                      <button
                        key={slot.time}
                        onClick={() => {
                          const prof = slot.availableProfessionals[0];
                          setSelectedSlot({ time: slot.time, professionalId: prof?.id, professionalName: prof?.name });
                          next();
                        }}
                        className={cn(
                          "h-12 rounded-xl border text-sm font-semibold transition-all",
                          selectedSlot?.time === slot.time
                            ? "bg-[#1B1B1B] text-white border-transparent"
                            : "border-black/10 bg-white hover:border-[#EF9F27]"
                        )}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {(slots as ProfessionalSlot[]).flatMap(ps =>
                      ps.slots.map(time => (
                        <button
                          key={`${ps.professionalId}-${time}`}
                          onClick={() => {
                            setSelectedSlot({ time, professionalId: ps.professionalId, professionalName: ps.professionalName });
                            next();
                          }}
                          className={cn(
                            "h-12 rounded-xl border text-sm font-semibold transition-all",
                            selectedSlot?.time === time
                              ? "bg-[#1B1B1B] text-white border-transparent"
                              : "border-black/10 bg-white hover:border-[#EF9F27]"
                          )}
                        >
                          {time}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: Confirmação ── */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-[#1B1B1B]">Confirmar agendamento</h2>

            {/* Dados do cliente — editáveis se necessário */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-1 block">
                  Nome completo *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full h-12 px-4 rounded-xl border border-black/15 text-base text-[#1B1B1B] placeholder:text-[#C4C4C4] focus:outline-none focus:border-[#1B1B1B] transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-1 block">
                  WhatsApp *
                </label>
                <input
                  type="tel"
                  value={phone}
                  readOnly
                  className="w-full h-12 px-4 rounded-xl border border-black/8 bg-[#FAFAF8] text-base text-[#6B6B6B]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-1 block">
                  E-mail (opcional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full h-12 px-4 rounded-xl border border-black/15 text-base text-[#1B1B1B] placeholder:text-[#C4C4C4] focus:outline-none focus:border-[#1B1B1B] transition-colors"
                />
              </div>
            </div>

            {/* Resumo */}
            <div className="bg-white rounded-2xl border border-black/8 p-4 space-y-3">
              <p className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wide">Resumo</p>
              <SummaryRow icon={<Scissors size={15} />} label={selectedService?.name ?? ""} />
              <SummaryRow icon={<User size={15} />} label={resolvedProfName} />
              {selectedDate && (
                <SummaryRow icon={<Calendar size={15} />} label={format(selectedDate, "dd/MM/yyyy", { locale: ptBR })} />
              )}
              {selectedSlot && <SummaryRow icon={<Clock size={15} />} label={selectedSlot.time} />}
              {selectedService && (
                <SummaryRow icon={<Tag size={15} />} label={formatCurrency(selectedService.price)} accent />
              )}
            </div>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={submitting || !name || !phone}
              className="w-full h-14 bg-[#1B1B1B] text-white font-semibold text-base rounded-2xl disabled:opacity-40 active:scale-[0.98] transition-all"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Confirmando...
                </span>
              ) : "Confirmar agendamento"}
            </button>

            <p className="text-center text-xs text-[#9B9B9B]">
              Você receberá uma confirmação no WhatsApp
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ icon, label, accent }: { icon: React.ReactNode; label: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[#9B9B9B]">{icon}</span>
      <span className={cn("text-sm", accent ? "font-bold text-[#EF9F27]" : "text-[#1B1B1B]")}>{label}</span>
    </div>
  );
}
