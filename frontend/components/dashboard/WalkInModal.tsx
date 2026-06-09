"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { bookingsApi, professionalsApi, servicesApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Service { id: string; name: string; durationMinutes: number; price: number; isActive: boolean; }
interface Professional { id: string; name: string; photoUrl?: string; serviceIds: string[]; isActive: boolean; }
interface Slot { start: string; end: string; }

interface Props {
  establishmentId: string;
  onClose: () => void;
  onCreated: () => void;
}

export function WalkInModal({ establishmentId, onClose, onCreated }: Props) {
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [source, setSource] = useState<"Presencial" | "Manual">("Presencial");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Slots
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null); // ISO start string

  // Carrega serviços e profissionais
  useEffect(() => {
    servicesApi.list(establishmentId).then(r =>
      setServices((r.data as Service[]).filter(s => s.isActive))
    );
    professionalsApi.list(establishmentId).then(r =>
      setProfessionals((r.data as Professional[]).filter(p => p.isActive))
    );
  }, [establishmentId]);

  // Bloqueia scroll do body
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Profissionais filtrados pelo serviço selecionado
  const filteredProfessionals = serviceId
    ? professionals.filter(p => p.serviceIds.includes(serviceId))
    : professionals;

  // Quando o serviço muda e o profissional atual não atende esse serviço, reseta
  useEffect(() => {
    if (professionalId && serviceId) {
      const prof = professionals.find(p => p.id === professionalId);
      if (prof && !prof.serviceIds.includes(serviceId)) {
        setProfessionalId("");
      }
    }
    setSelectedSlot(null);
    setSlots([]);
  }, [serviceId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSelectedSlot(null);
    setSlots([]);
  }, [professionalId, date]);

  // Busca slots disponíveis quando serviço + profissional + data estiverem selecionados
  useEffect(() => {
    if (!serviceId || !professionalId || !date) return;

    setLoadingSlots(true);
    setSelectedSlot(null);
    bookingsApi
      .getDashboardSlots(professionalId, serviceId, date)
      .then(r => setSlots(r.data as Slot[]))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [serviceId, professionalId, date]);

  const handleSubmit = async () => {
    if (!serviceId || !professionalId || !clientName) {
      setError("Preencha serviço, profissional e nome do cliente.");
      return;
    }
    if (!selectedSlot) {
      setError("Selecione um horário disponível.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await bookingsApi.createManual({
        establishmentId,
        professionalId,
        serviceId,
        scheduledAt: selectedSlot,
        clientName,
        clientPhone: clientPhone || undefined,
        source: source === "Presencial" ? 2 : 3,
      });
      onCreated();
      onClose();
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(
        detail === "Horário não disponível. Escolha outro."
          ? "Horário já ocupado para este profissional."
          : "Erro ao criar agendamento."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const slotsReady = !!serviceId && !!professionalId && !!date;

  return createPortal(
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />

      {/* Modal */}
      <div className={cn(
        "fixed z-[70] bg-white shadow-2xl",
        "bottom-0 left-0 right-0 rounded-t-2xl",
        "md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
        "md:w-[480px] md:rounded-2xl",
      )}>
        <div className="flex items-center justify-between p-4 border-b border-black/8">
          <h2 className="font-bold text-[#1B1B1B]">Novo atendimento</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F5F5F5]">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Tipo */}
          <div className="flex gap-2">
            {(["Presencial", "Manual"] as const).map(s => (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={cn(
                  "flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-colors",
                  source === s ? "border-[#1B1B1B] bg-[#1B1B1B] text-white" : "border-black/10",
                )}
              >
                {s === "Presencial" ? "Presencial" : "Agendamento manual"}
              </button>
            ))}
          </div>

          {/* Serviço */}
          <div>
            <label className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-1 block">Serviço *</label>
            <select
              value={serviceId}
              onChange={e => setServiceId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-black/15 text-sm bg-white"
            >
              <option value="">Selecione o serviço</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name} — {s.durationMinutes}min</option>
              ))}
            </select>
          </div>

          {/* Profissional */}
          <div>
            <label className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-1 block">Profissional *</label>
            <select
              value={professionalId}
              onChange={e => setProfessionalId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-black/15 text-sm bg-white"
              disabled={!serviceId}
            >
              <option value="">
                {!serviceId ? "Selecione o serviço primeiro" : "Selecione o profissional"}
              </option>
              {filteredProfessionals.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Data */}
          <div>
            <label className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-1 block">Data *</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-black/15 text-sm"
            />
          </div>

          {/* Seletor de horários */}
          <div>
            <label className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-2 flex items-center gap-1.5 block">
              <Clock size={12} />
              Horário *
            </label>

            {!slotsReady ? (
              <div className="rounded-xl border border-dashed border-black/15 py-5 text-center text-xs text-[#9B9B9B]">
                Selecione o serviço, profissional e data para ver os horários disponíveis
              </div>
            ) : loadingSlots ? (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-xl bg-[#F5F5F5] animate-pulse" />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 py-5 text-center flex flex-col items-center gap-1.5">
                <AlertCircle size={16} className="text-amber-400" />
                <p className="text-xs text-amber-600 font-medium">Nenhum horário disponível nesta data</p>
                <p className="text-[11px] text-amber-500">Verifique a agenda do profissional ou escolha outra data</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map(slot => {
                  const label = format(new Date(slot.start), "HH:mm");
                  const isSelected = selectedSlot === slot.start;
                  return (
                    <button
                      key={slot.start}
                      type="button"
                      onClick={() => setSelectedSlot(isSelected ? null : slot.start)}
                      className={cn(
                        "h-10 rounded-xl border text-sm font-semibold transition-all",
                        isSelected
                          ? "bg-[#1B1B1B] text-white border-transparent"
                          : "border-black/10 bg-white hover:border-[#EF9F27] text-[#1B1B1B]"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cliente */}
          <div>
            <label className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-1 block">Nome do cliente *</label>
            <input
              type="text"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="Nome completo"
              className="w-full h-11 px-3 rounded-xl border border-black/15 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-1 block">
              Telefone {source === "Presencial" ? "(opcional)" : ""}
            </label>
            <input
              type="tel"
              value={clientPhone}
              onChange={e => setClientPhone(e.target.value)}
              placeholder="(31) 99999-9999"
              className="w-full h-11 px-3 rounded-xl border border-black/15 text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="p-4 border-t border-black/8">
          <button
            onClick={handleSubmit}
            disabled={submitting || !selectedSlot}
            className="w-full h-12 bg-[#1B1B1B] text-white font-semibold rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {selectedSlot
              ? `Confirmar — ${format(new Date(selectedSlot), "HH:mm")}`
              : "Confirmar agendamento"}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
