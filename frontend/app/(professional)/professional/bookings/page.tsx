"use client";

import { useEffect, useState, useCallback } from "react";
import { Calendar, Clock, Loader2, RefreshCw } from "lucide-react";
import { professionalPortalApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: 0, label: "Todos" },
  { value: 1, label: "Pendente" },
  { value: 2, label: "Confirmado" },
  { value: 3, label: "Concluído" },
  { value: 4, label: "Cancelado" },
];

const STATUS_CLASS: Record<number, string> = {
  1: "bg-amber-50 text-amber-700 border-amber-200",
  2: "bg-blue-50 text-blue-700 border-blue-200",
  3: "bg-green-50 text-green-700 border-green-200",
  4: "bg-red-50 text-red-600 border-red-200",
};

interface Booking {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  scheduledAt: string;
  endsAt: string;
  status: number;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }),
    time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function ProfessionalBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(0);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await professionalPortalApi.getBookings({
        status: status > 0 ? status : undefined,
        page,
      });
      setBookings(res.data.items ?? []);
      setTotal(res.data.total ?? 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { load(); }, [load]);

  function handleStatusChange(s: number) {
    setStatus(s);
    setPage(1);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#1B1B1B]">Meus Agendamentos</h1>
          <p className="text-sm text-[#9B9B9B] mt-0.5">{total} no total</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-xl border border-black/10 bg-white text-[#6B6B6B] hover:bg-[#F5F5F5] transition-colors disabled:opacity-40"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Filtros de status */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleStatusChange(opt.value)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-colors",
              status === opt.value
                ? "bg-[#1B1B1B] text-white border-[#1B1B1B]"
                : "bg-white text-[#6B6B6B] border-black/10 hover:border-black/20"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-black/8 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={22} className="animate-spin text-[#EF9F27]" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12 text-[#9B9B9B]">
            <Calendar size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum agendamento encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-black/5">
            {bookings.map((b) => {
              const { date, time } = formatDateTime(b.scheduledAt);
              return (
                <div key={b.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="shrink-0 text-center w-12">
                    <p className="text-xs font-semibold text-[#EF9F27]">{date}</p>
                    <p className="text-sm font-bold text-[#1B1B1B] flex items-center gap-0.5 justify-center">
                      <Clock size={11} className="text-[#9B9B9B]" />
                      {time}
                    </p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1B1B1B] text-sm truncate">{b.clientName}</p>
                    <p className="text-xs text-[#9B9B9B] truncate">{b.serviceName}</p>
                    {b.clientPhone && (
                      <p className="text-[11px] text-[#9B9B9B]">{b.clientPhone}</p>
                    )}
                  </div>

                  <span className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
                    STATUS_CLASS[b.status] ?? "bg-gray-50 text-gray-500 border-gray-200"
                  )}>
                    {STATUS_OPTIONS.find(s => s.value === b.status)?.label ?? "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Paginação */}
      {total > pageSize && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="px-4 py-2 rounded-xl border border-black/10 bg-white text-sm font-medium text-[#1B1B1B] disabled:opacity-40 hover:bg-[#F5F5F5] transition-colors"
          >
            Anterior
          </button>
          <span className="text-sm text-[#9B9B9B]">
            Página {page} de {Math.ceil(total / pageSize)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / pageSize) || loading}
            className="px-4 py-2 rounded-xl border border-black/10 bg-white text-sm font-medium text-[#1B1B1B] disabled:opacity-40 hover:bg-[#F5F5F5] transition-colors"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
