"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Calendar, ChevronRight } from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { bookingsApi, dashboardApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency, cn } from "@/lib/utils";
import { WalkInModal } from "@/components/dashboard/WalkInModal";
import { BookingBottomSheet } from "@/components/dashboard/BookingBottomSheet";
import Link from "next/link";

interface Metrics {
  totalBookings: number; confirmedBookings: number;
  completedBookings: number; cancelledBookings: number;
  expectedRevenue: number; completedRevenue: number;
  byProfessional: { professionalId: string; name: string; photoUrl?: string; bookingsCount: number }[];
}
interface Booking {
  id: string; clientId: string; clientName: string; clientPhone: string;
  serviceName: string; servicePrice: number;
  professionalId: string; professionalName: string; professionalPhotoUrl?: string;
  scheduledAt: string; endsAt: string; status: number; source: number;
}

const STATUS_CONFIG: Record<number, { label: string; dot: string; badge: string }> = {
  1: { label: "Pendente", dot: "bg-amber-400", badge: "bg-amber-100 text-amber-700" },
  2: { label: "Confirmado", dot: "bg-blue-400", badge: "bg-blue-100 text-blue-700" },
  3: { label: "Concluído", dot: "bg-green-400", badge: "bg-green-100 text-green-700" },
  4: { label: "Cancelado", dot: "bg-red-400", badge: "bg-red-100 text-red-500 line-through" },
  5: { label: "Não compareceu", dot: "bg-gray-400", badge: "bg-gray-100 text-gray-500" },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProfId, setFilterProfId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showWalkIn, setShowWalkIn] = useState(false);

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  // "próximos" = amanhã até +7 dias
  const tomorrowStr = format(addDays(today, 1), "yyyy-MM-dd");
  const in7daysStr = format(addDays(today, 7), "yyyy-MM-dd");

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [metricsRes, bookingsRes, upcomingRes] = await Promise.all([
        dashboardApi.today(user.establishmentId),
        bookingsApi.list({ establishmentId: user.establishmentId, date: todayStr, pageSize: 100 }),
        bookingsApi.list({
          establishmentId: user.establishmentId,
          dateFrom: tomorrowStr,
          dateTo: in7daysStr,
          pageSize: 20,
        }),
      ]);
      setMetrics(metricsRes.data);
      // Apenas ativos (Pendente=1 e Confirmado=2) — concluídos/cancelados/não-compareceu não aparecem
      setBookings(bookingsRes.data.items.filter((b: Booking) => b.status === 1 || b.status === 2));
      setUpcoming(upcomingRes.data.items.filter((b: Booking) => b.status !== 4 && b.status !== 5));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user, todayStr, tomorrowStr, in7daysStr]);

  useEffect(() => { loadData(); }, [loadData]);

  const allFiltered = filterProfId
    ? bookings.filter(b => b.professionalId === filterProfId)
    : bookings;
  // Limite de 5 na página inicial; o resto fica acessível em Agendamentos
  const filteredBookings = allFiltered.slice(0, 5);
  const hasMore = allFiltered.length > 5;

  const professionals = metrics?.byProfessional ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1B1B1B]">
            {format(today, "EEEE, d 'de' MMMM", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}
          </h1>
          <p className="text-sm text-[#9B9B9B]">Visão geral do dia</p>
        </div>
        <button
          onClick={() => setShowWalkIn(true)}
          className="h-10 w-10 bg-[#1B1B1B] text-white rounded-xl flex items-center justify-center shadow-sm hover:bg-[#2d2d2d] active:scale-95 transition-all"
          title="Novo atendimento"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Métricas — 2 colunas no mobile, 3 no desktop */}
      {metrics && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          <MetricChip label="Agendamentos" value={metrics.totalBookings.toString()} />
          <MetricChip label="Previsto" value={formatCurrency(metrics.expectedRevenue)} accent />
          <MetricChip label="Concluídos" value={metrics.completedBookings.toString()} />
          <MetricChip label="Cancelados" value={metrics.cancelledBookings.toString()} muted />
          <MetricChip label="Recebido" value={formatCurrency(metrics.completedRevenue)} accent />
        </div>
      )}

      {/* Filtro por profissional */}
      {professionals.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
          <ProfChip
            label="Todos"
            active={filterProfId === null}
            onClick={() => setFilterProfId(null)}
          />
          {professionals.map(p => (
            <ProfChip
              key={p.professionalId}
              label={p.name}
              photoUrl={p.photoUrl}
              count={p.bookingsCount}
              active={filterProfId === p.professionalId}
              onClick={() => setFilterProfId(prev => prev === p.professionalId ? null : p.professionalId)}
            />
          ))}
        </div>
      )}

      {/* Lista de agendamentos ativos de hoje */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[72px] bg-[#F5F5F5] rounded-2xl animate-pulse" />
          ))
        ) : filteredBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#C4C4C4]">
            <Calendar size={48} strokeWidth={1} />
            <p className="mt-3 text-sm">Nenhum agendamento ativo hoje</p>
            <button
              onClick={() => setShowWalkIn(true)}
              className="mt-4 px-4 py-2 bg-[#1B1B1B] text-white text-sm font-medium rounded-xl"
            >
              Adicionar presencial
            </button>
          </div>
        ) : (
          <>
            {filteredBookings.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onClick={() => setSelectedBooking(booking)}
              />
            ))}
            {hasMore && (
              <Link
                href="/bookings"
                className="flex items-center justify-center gap-1 py-2.5 text-sm text-[#EF9F27] font-medium hover:underline"
              >
                Ver todos os agendamentos de hoje <ChevronRight size={15} />
              </Link>
            )}
          </>
        )}
      </div>

      {/* Próximos 7 dias */}
      {!loading && upcoming.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#6B6B6B]">Próximos 7 dias</h2>
            <Link
              href="/bookings"
              className="text-xs text-[#EF9F27] flex items-center gap-0.5 hover:underline"
            >
              Ver todos <ChevronRight size={13} />
            </Link>
          </div>
          {upcoming.map(booking => (
            <UpcomingCard
              key={booking.id}
              booking={booking}
              onClick={() => setSelectedBooking(booking)}
            />
          ))}
        </div>
      )}

      {/* Bottom sheet */}
      {selectedBooking && (
        <BookingBottomSheet
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onStatusChange={loadData}
        />
      )}

      {/* Walk-in modal */}
      {showWalkIn && user && (
        <WalkInModal
          establishmentId={user.establishmentId}
          onClose={() => setShowWalkIn(false)}
          onCreated={loadData}
        />
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function MetricChip({ label, value, accent, muted }: {
  label: string; value: string; accent?: boolean; muted?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-black/8 px-4 py-3">
      <p className="text-xs text-[#9B9B9B] mb-0.5">{label}</p>
      <p className={cn(
        "text-lg font-bold",
        accent ? "text-[#EF9F27]" : muted ? "text-[#9B9B9B]" : "text-[#1B1B1B]",
      )}>{value}</p>
    </div>
  );
}

function ProfChip({ label, photoUrl, count, active, onClick }: {
  label: string; photoUrl?: string; count?: number; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all shrink-0",
        active ? "bg-[#1B1B1B] text-white border-[#1B1B1B]" : "bg-white text-[#1B1B1B] border-black/10 hover:border-[#1B1B1B]",
      )}
    >
      {photoUrl && (
        <img src={photoUrl} alt={label} className="w-5 h-5 rounded-full object-cover" />
      )}
      {label}
      {count !== undefined && (
        <span className={cn("text-xs", active ? "opacity-70" : "text-[#9B9B9B]")}>
          {count}
        </span>
      )}
    </button>
  );
}

function BookingCard({ booking, onClick }: { booking: Booking; onClick: () => void }) {
  const s = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG[1];
  const time = format(new Date(booking.scheduledAt), "HH:mm");

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-white rounded-2xl border border-black/8 px-4 py-3 text-left hover:border-[#EF9F27]/40 transition-colors active:scale-[0.99] min-h-[72px]"
    >
      {/* Hora */}
      <div className="text-center shrink-0 w-12">
        <p className="font-mono font-bold text-[#1B1B1B] text-base leading-none">{time}</p>
      </div>

      <div className={cn("w-px h-10 rounded-full shrink-0", s.dot)} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#1B1B1B] text-sm truncate">{booking.clientName}</p>
        <p className="text-xs text-[#9B9B9B] truncate">{booking.serviceName}</p>
      </div>

      {/* Profissional + status */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", s.badge)}>
          {s.label}
        </span>
        <div className="flex items-center gap-1">
          {booking.professionalPhotoUrl ? (
            <img src={booking.professionalPhotoUrl} alt={booking.professionalName}
              className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-[#FAEEDA] flex items-center justify-center">
              <span className="text-[8px] font-bold text-[#EF9F27]">
                {booking.professionalName.charAt(0)}
              </span>
            </div>
          )}
          <span className="text-[10px] text-[#9B9B9B] max-w-[60px] truncate">
            {booking.professionalName.split(" ")[0]}
          </span>
        </div>
      </div>
    </button>
  );
}

function UpcomingCard({ booking, onClick }: { booking: Booking; onClick: () => void }) {
  const date = new Date(booking.scheduledAt);
  const dayLabel = format(date, "EEE, dd/MM", { locale: ptBR });
  const time = format(date, "HH:mm");
  const s = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG[2];

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-white rounded-2xl border border-black/8 px-4 py-3 text-left hover:border-[#EF9F27]/40 transition-colors active:scale-[0.99]"
    >
      {/* Data + hora */}
      <div className="text-left shrink-0 w-[72px]">
        <p className="text-xs font-semibold text-[#1B1B1B] capitalize">{dayLabel}</p>
        <p className="font-mono text-sm font-bold text-[#EF9F27]">{time}</p>
      </div>

      <div className={cn("w-px h-8 rounded-full shrink-0", s.dot)} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#1B1B1B] text-sm truncate">{booking.clientName}</p>
        <p className="text-xs text-[#9B9B9B] truncate">
          {booking.serviceName} · {booking.professionalName.split(" ")[0]}
        </p>
      </div>

      <ChevronRight size={15} className="text-[#C4C4C4] shrink-0" />
    </button>
  );
}
