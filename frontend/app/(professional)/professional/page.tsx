"use client";

import { useEffect, useState } from "react";
import { Calendar, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { professionalPortalApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<number, string> = {
  1: "Pendente",
  2: "Confirmado",
  3: "Concluído",
  4: "Cancelado",
};

const STATUS_CLASS: Record<number, string> = {
  1: "bg-amber-50 text-amber-700 border-amber-200",
  2: "bg-blue-50 text-blue-700 border-blue-200",
  3: "bg-green-50 text-green-700 border-green-200",
  4: "bg-red-50 text-red-600 border-red-200",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

interface Booking {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  scheduledAt: string;
  endsAt: string;
  status: number;
}

export default function ProfessionalHome() {
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    professionalPortalApi.getBookings({ dateFrom: today, dateTo: today })
      .then((res) => {
        const items: Booking[] = res.data.items ?? [];
        setTodayBookings(items.sort((a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        ));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [today]);

  const confirmed = todayBookings.filter((b) => b.status === 2).length;
  const concluded = todayBookings.filter((b) => b.status === 3).length;
  const pending = todayBookings.filter((b) => b.status === 1).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1B1B1B] mb-1">Bom dia! 👋</h1>
      <p className="text-sm text-[#9B9B9B] mb-6 capitalize">
        {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-black/8 p-4 text-center">
          <p className="text-2xl font-bold text-[#1B1B1B]">{todayBookings.length}</p>
          <p className="text-xs text-[#9B9B9B] mt-0.5">Total hoje</p>
        </div>
        <div className="bg-white rounded-2xl border border-black/8 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{confirmed}</p>
          <p className="text-xs text-[#9B9B9B] mt-0.5">Confirmados</p>
        </div>
        <div className="bg-white rounded-2xl border border-black/8 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{concluded}</p>
          <p className="text-xs text-[#9B9B9B] mt-0.5">Concluídos</p>
        </div>
      </div>

      {/* Lista de agendamentos de hoje */}
      <div className="bg-white rounded-2xl border border-black/8 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3.5 border-b border-black/5">
          <Calendar size={16} className="text-[#EF9F27]" />
          <p className="font-semibold text-[#1B1B1B] text-sm">Agendamentos de hoje</p>
          {pending > 0 && (
            <span className="ml-auto text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              {pending} pendente{pending !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={22} className="animate-spin text-[#EF9F27]" />
          </div>
        ) : todayBookings.length === 0 ? (
          <div className="text-center py-10 text-[#9B9B9B]">
            <CheckCircle2 size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum agendamento hoje</p>
          </div>
        ) : (
          <div className="divide-y divide-black/5">
            {todayBookings.map((b) => (
              <div key={b.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-1 self-stretch rounded-full bg-[#EF9F27]/30 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1B1B1B] text-sm truncate">{b.clientName}</p>
                  <p className="text-xs text-[#9B9B9B] mt-0.5 truncate">{b.serviceName}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-[#1B1B1B] flex items-center gap-1 justify-end">
                    <Clock size={12} className="text-[#9B9B9B]" />
                    {formatTime(b.scheduledAt)}
                  </p>
                  <span className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                    STATUS_CLASS[b.status] ?? "bg-gray-50 text-gray-500 border-gray-200"
                  )}>
                    {STATUS_LABEL[b.status] ?? "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
