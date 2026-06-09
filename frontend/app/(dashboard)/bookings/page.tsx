"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Filter, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { bookingsApi, professionalsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency, cn } from "@/lib/utils";
import { BookingBottomSheet } from "@/components/dashboard/BookingBottomSheet";

interface Booking {
  id: string; clientName: string; clientPhone: string;
  serviceName: string; servicePrice: number;
  professionalId: string; professionalName: string; professionalPhotoUrl?: string;
  scheduledAt: string; status: number;
}
interface Professional { id: string; name: string; }

const STATUS_OPTS = [
  { value: "", label: "Todos status" },
  { value: "2", label: "Confirmado" },
  { value: "3", label: "Concluído" },
  { value: "1", label: "Pendente" },
  { value: "4", label: "Cancelado" },
  { value: "5", label: "Não compareceu" },
];
const STATUS_BADGE: Record<number, string> = {
  1: "bg-amber-100 text-amber-700", 2: "bg-blue-100 text-blue-700",
  3: "bg-green-100 text-green-700", 4: "bg-red-100 text-red-500",
  5: "bg-gray-100 text-gray-600",
};
const STATUS_LABEL: Record<number, string> = {
  1: "Pendente", 2: "Confirmado", 3: "Concluído", 4: "Cancelado", 5: "Não compareceu",
};
const PAGE_SIZE = 20;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function BookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Padrão: a partir de hoje — facilita encontrar agendamentos futuros
  const [dateFrom, setDateFrom] = useState(todayISO);
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");
  const [profId, setProfId] = useState("");
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (user) professionalsApi.list(user.establishmentId).then(r => setProfessionals(r.data));
  }, [user]);

  const loadBookings = useCallback(async (p: number) => {
    if (!user) return;
    setLoading(true);
    try {
      const params: Record<string, unknown> = { establishmentId: user.establishmentId, page: p, pageSize: PAGE_SIZE };
      if (debouncedSearch) params.search = debouncedSearch;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (status) params.status = Number(status);
      if (profId) params.professionalId = profId;
      const res = await bookingsApi.list(params as Parameters<typeof bookingsApi.list>[0]);
      setBookings(res.data.items);
      setTotal(res.data.totalCount);
    } finally { setLoading(false); }
  }, [user, debouncedSearch, dateFrom, dateTo, status, profId]);

  useEffect(() => { setPage(1); loadBookings(1); }, [debouncedSearch, dateFrom, dateTo, status, profId]); // eslint-disable-line
  useEffect(() => { loadBookings(page); }, [page]); // eslint-disable-line

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1B1B1B]">Agendamentos</h1>
          {dateFrom && !dateTo && (
            <p className="text-xs text-[#9B9B9B]">
              A partir de hoje ·{" "}
              <button
                onClick={() => setDateFrom("")}
                className="underline text-[#EF9F27]"
              >
                ver todos
              </button>
            </p>
          )}
        </div>
        <span className="text-sm text-[#9B9B9B]">{total} total</span>
      </div>

      {/* Busca */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9B9B9B]" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou telefone"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-black/15 text-sm focus:outline-none focus:border-[#1B1B1B]" />
          </div>
          <button onClick={() => setShowFilters(v => !v)}
            className={cn("h-10 px-3 rounded-xl border text-sm font-medium flex items-center gap-1.5",
              showFilters ? "bg-[#1B1B1B] text-white border-[#1B1B1B]" : "border-black/15")}>
            <Filter size={15} /><span className="hidden sm:inline">Filtros</span>
          </button>
        </div>

        {showFilters && (
          <div className="bg-white rounded-2xl border border-black/8 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Data início", type: "date", value: dateFrom, onChange: setDateFrom },
              { label: "Data fim", type: "date", value: dateTo, onChange: setDateTo },
            ].map(f => (
              <div key={f.label}>
                <label className="text-xs text-[#9B9B9B] mb-1 block">{f.label}</label>
                <input type={f.type} value={f.value} onChange={e => f.onChange(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-black/15 text-sm" />
              </div>
            ))}
            <div>
              <label className="text-xs text-[#9B9B9B] mb-1 block">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full h-9 px-2 rounded-lg border border-black/15 text-sm bg-white">
                {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#9B9B9B] mb-1 block">Profissional</label>
              <select value={profId} onChange={e => setProfId(e.target.value)}
                className="w-full h-9 px-2 rounded-lg border border-black/15 text-sm bg-white">
                <option value="">Todos</option>
                {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-2">
        {loading ? Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 bg-[#F5F5F5] rounded-2xl animate-pulse" />
        )) : bookings.length === 0 ? (
          <div className="text-center py-12 text-[#9B9B9B]">
            <Calendar size={40} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum agendamento encontrado</p>
          </div>
        ) : bookings.map(b => (
          <button key={b.id} onClick={() => setSelectedBooking(b)}
            className="w-full bg-white rounded-2xl border border-black/8 px-4 py-3 text-left hover:border-[#EF9F27]/40 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1B1B1B] text-sm truncate">{b.clientName}</p>
                <p className="text-xs text-[#9B9B9B] truncate">{b.serviceName} · {b.professionalName}</p>
                <p className="text-xs font-mono text-[#6B6B6B] mt-0.5">
                  {format(new Date(b.scheduledAt), "dd/MM/yyyy HH:mm")}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", STATUS_BADGE[b.status])}>
                  {STATUS_LABEL[b.status]}
                </span>
                <span className="text-xs font-bold text-[#EF9F27]">{formatCurrency(b.servicePrice)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden md:block bg-white rounded-2xl border border-black/8 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#FAFAF8] border-b border-black/5">
            <tr>
              {["Cliente", "Serviço", "Profissional", "Data/Hora", "Status", "Valor", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#9B9B9B] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {loading ? Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                <td key={j} className="px-4 py-3"><div className="h-4 bg-[#F5F5F5] rounded animate-pulse" /></td>
              ))}</tr>
            )) : bookings.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-[#9B9B9B]">Nenhum agendamento encontrado</td></tr>
            ) : bookings.map(b => (
              <tr key={b.id} className="hover:bg-[#FAFAF8] transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-[#1B1B1B]">{b.clientName}</p>
                  <p className="text-xs text-[#9B9B9B]">{b.clientPhone}</p>
                </td>
                <td className="px-4 py-3 text-[#6B6B6B]">{b.serviceName}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {b.professionalPhotoUrl
                      ? <img src={b.professionalPhotoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                      : <div className="w-6 h-6 rounded-full bg-[#FAEEDA] flex items-center justify-center text-[8px] font-bold text-[#EF9F27]">{b.professionalName.charAt(0)}</div>}
                    <span className="text-[#6B6B6B]">{b.professionalName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-[#6B6B6B] text-xs">
                  {format(new Date(b.scheduledAt), "dd/MM/yyyy HH:mm")}
                </td>
                <td className="px-4 py-3">
                  <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", STATUS_BADGE[b.status])}>
                    {STATUS_LABEL[b.status]}
                  </span>
                </td>
                <td className="px-4 py-3 font-bold text-[#EF9F27]">{formatCurrency(b.servicePrice)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => setSelectedBooking(b)}
                    className="text-xs text-[#6B6B6B] hover:text-[#1B1B1B] font-medium">Ações</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação desktop */}
      {totalPages > 1 && (
        <div className="hidden md:flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-lg border border-black/10 disabled:opacity-30 hover:bg-[#F5F5F5]">
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
            return (
              <button key={p} onClick={() => setPage(p)}
                className={cn("w-9 h-9 rounded-lg text-sm font-medium",
                  page === p ? "bg-[#1B1B1B] text-white" : "hover:bg-[#F5F5F5]")}>
                {p}
              </button>
            );
          })}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-2 rounded-lg border border-black/10 disabled:opacity-30 hover:bg-[#F5F5F5]">
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Carregar mais — mobile */}
      {page < totalPages && (
        <div className="md:hidden">
          <button onClick={() => setPage(p => p + 1)} disabled={loading}
            className="w-full py-3 text-sm font-medium text-[#6B6B6B] border border-black/10 rounded-xl">
            Carregar mais
          </button>
        </div>
      )}

      {selectedBooking && (
        <BookingBottomSheet
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onStatusChange={() => loadBookings(page)}
        />
      )}
    </div>
  );
}
