"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { establishmentsApi, DayHours } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DAY_NAMES = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const DEFAULTS: DayHours[] = [
  { dayOfWeek: 0, isOpen: false, openTime: "08:00", closeTime: "18:00" },
  { dayOfWeek: 1, isOpen: true,  openTime: "08:00", closeTime: "18:00" },
  { dayOfWeek: 2, isOpen: true,  openTime: "08:00", closeTime: "18:00" },
  { dayOfWeek: 3, isOpen: true,  openTime: "08:00", closeTime: "18:00" },
  { dayOfWeek: 4, isOpen: true,  openTime: "08:00", closeTime: "18:00" },
  { dayOfWeek: 5, isOpen: true,  openTime: "08:00", closeTime: "18:00" },
  { dayOfWeek: 6, isOpen: true,  openTime: "08:00", closeTime: "13:00" },
];

export default function HoursPage() {
  const [hours, setHours] = useState<DayHours[]>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    establishmentsApi
      .getHours()
      .then((res) => setHours(res.data.hours))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = (dayOfWeek: number, changes: Partial<DayHours>) =>
    setHours((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...changes } : d))
    );

  const handleSave = async () => {
    setSaving(true);
    try {
      await establishmentsApi.updateHours(hours);
      toast.success("Horários de funcionamento salvos!");
    } catch {
      toast.error("Erro ao salvar horários.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-5">
      {/* Breadcrumb */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-[#9B9B9B] hover:text-[#1B1B1B] mb-5 transition-colors"
      >
        <ChevronLeft size={14} />
        Configurações
      </Link>

      <h1 className="text-xl font-bold text-[#1B1B1B] mb-1">
        Horário de Funcionamento
      </h1>
      <p className="text-sm text-[#6B6B6B] mb-6 leading-relaxed">
        Os agendamentos só serão oferecidos dentro do horário configurado, mesmo
        que o profissional esteja disponível em outros horários.
      </p>

      {/* Lista de dias */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-[60px] rounded-2xl bg-black/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {hours.map((day) => (
            <div
              key={day.dayOfWeek}
              className={cn(
                "bg-white rounded-2xl border border-black/8 px-4 py-3 transition-opacity",
                !day.isOpen && "opacity-60"
              )}
            >
              {/* Linha 1: Nome do dia + toggle */}
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-[#1B1B1B] text-sm leading-tight">
                  {DAY_NAMES[day.dayOfWeek]}
                </p>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className={cn(
                    "text-xs font-medium transition-colors",
                    day.isOpen ? "text-[#EF9F27]" : "text-[#9B9B9B]"
                  )}>
                    {day.isOpen ? "Aberto" : "Fechado"}
                  </span>
                  {/* Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={day.isOpen}
                      onChange={(e) =>
                        update(day.dayOfWeek, { isOpen: e.target.checked })
                      }
                    />
                    <div className="w-11 h-6 bg-black/10 rounded-full peer peer-checked:bg-[#EF9F27] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5 after:shadow-sm" />
                  </label>
                </div>
              </div>

              {/* Linha 2: Seleção de horário (só quando aberto) */}
              {day.isOpen && (
                <div className="flex items-center gap-2 mt-2.5">
                  <input
                    type="time"
                    value={day.openTime}
                    onChange={(e) =>
                      update(day.dayOfWeek, { openTime: e.target.value })
                    }
                    className="flex-1 min-w-0 h-10 px-3 rounded-xl border border-black/10 bg-[#FAFAF8] text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-[#EF9F27]/30 focus:border-[#EF9F27] transition-colors"
                  />
                  <span className="text-xs text-[#9B9B9B] shrink-0 font-medium">às</span>
                  <input
                    type="time"
                    value={day.closeTime}
                    onChange={(e) =>
                      update(day.dayOfWeek, { closeTime: e.target.value })
                    }
                    className="flex-1 min-w-0 h-10 px-3 rounded-xl border border-black/10 bg-[#FAFAF8] text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-[#EF9F27]/30 focus:border-[#EF9F27] transition-colors"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Botão salvar — fixo no bottom em mobile */}
      <div className="mt-6 pb-4">
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="w-full h-12 bg-[#EF9F27] hover:bg-[#d4891f] disabled:opacity-50 text-white font-semibold rounded-2xl active:scale-[0.98] transition-all"
        >
          {saving ? "Salvando..." : "Salvar horários"}
        </button>
      </div>
    </div>
  );
}
