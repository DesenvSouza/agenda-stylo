"use client";

import { useEffect, useState, useCallback } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp, Calendar,
  BarChart2, Users, ArrowUpDown, Scissors, UserCheck,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { reportsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency, cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";

// ── Types ────────────────────────────────────────────────────────────────────

type ReportTab    = "revenue" | "clients" | "professionals" | "commissions";
type Period       = "day" | "week" | "month";
type AllPeriod    = Period | "all";
type SortBy       = "visits" | "spent";
type ProfSortBy   = "services" | "revenue";

interface RevenueReport {
  totalRevenue: number; totalBookings: number;
  completedBookings: number; noShows: number; cancellations: number;
  byDay: { date: string; revenue: number; bookings: number }[];
  byService: { serviceId: string; name: string; revenue: number; count: number }[];
  byProfessional: { professionalId: string; name: string; photoUrl?: string; revenue: number; count: number }[];
}
interface BookingsReport {
  totalBookings: number; completionRate: number;
  noShowRate: number; cancellationRate: number;
  byHour: { hour: number; count: number }[];
  byDayOfWeek: { day: number; dayName: string; count: number }[];
  bySource: { online: number; presencial: number; manual: number };
}
interface TopClient {
  clientId: string; name: string; phone: string;
  visitCount: number; totalSpent: number; lastVisitAt: string | null;
}
interface TopProfessional {
  professionalId: string;
  name: string;
  photoUrl?: string;
  specialty?: string;
  servicesCount: number;
  totalRevenue: number;
  lastServiceAt: string | null;
}
interface CommissionServiceLine {
  serviceName: string;
  count: number;
  unitPrice: number;
  revenue: number;
  commissionType: number;   // 0=None,1=Percentage,2=Fixed
  commissionValue: number;
  commissionAmount: number;
  netAmount: number;
}
interface ProfessionalCommission {
  professionalId: string;
  name: string;
  photoUrl?: string;
  servicesCount: number;
  totalRevenue: number;
  totalCommission: number;
  netEarnings: number;
  serviceLines: CommissionServiceLine[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<Period, string> = {
  day: "Hoje", week: "Esta semana", month: "Este mês",
};
const ALL_PERIOD_LABELS: Record<AllPeriod, string> = {
  day: "Hoje", week: "Esta semana", month: "Este mês", all: "Todos os tempos",
};

function todayStr() { return format(new Date(), "yyyy-MM-dd"); }

// ── Revenue tooltip ──────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RevenueTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl border border-black/10 shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-[#EF9F27]">{formatCurrency(payload[0]?.value ?? 0)}</p>
      <p className="text-xs text-[#9B9B9B]">{payload[1]?.value ?? 0} agendamentos</p>
    </div>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<ReportTab>("revenue");

  // ── Revenue tab state ────────────────────────────────────────────────────
  const [period, setPeriod] = useState<Period>("week");
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [bookings, setBookings] = useState<BookingsReport | null>(null);
  const [loadingRevenue, setLoadingRevenue] = useState(true);

  // ── Clients tab state ────────────────────────────────────────────────────
  const [clientPeriod, setClientPeriod] = useState<AllPeriod>("all");
  const [sortBy, setSortBy] = useState<SortBy>("visits");
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // ── Professionals tab state ──────────────────────────────────────────────
  const [profPeriod, setProfPeriod] = useState<AllPeriod>("all");
  const [profSortBy, setProfSortBy] = useState<ProfSortBy>("services");
  const [topProfessionals, setTopProfessionals] = useState<TopProfessional[]>([]);
  const [loadingProfs, setLoadingProfs] = useState(false);

  // ── Commissions tab state ────────────────────────────────────────────────
  const today = new Date();
  const [commDateFrom, setCommDateFrom] = useState<string>(
    format(startOfMonth(today), "yyyy-MM-dd")
  );
  const [commDateTo, setCommDateTo] = useState<string>(
    format(endOfMonth(today), "yyyy-MM-dd")
  );
  const [commissions, setCommissions] = useState<ProfessionalCommission[]>([]);
  const [loadingCommissions, setLoadingCommissions] = useState(false);

  // ── Load revenue ─────────────────────────────────────────────────────────
  const loadRevenue = useCallback(async () => {
    if (!user) return;
    setLoadingRevenue(true);
    try {
      const [r, b] = await Promise.all([
        reportsApi.revenue({ establishmentId: user.establishmentId, period, date: todayStr() }),
        reportsApi.bookings({ establishmentId: user.establishmentId, period, date: todayStr() }),
      ]);
      setRevenue(r.data);
      setBookings(b.data);
    } catch { /* silent */ }
    finally { setLoadingRevenue(false); }
  }, [user, period]);

  // ── Load clients ─────────────────────────────────────────────────────────
  const loadClients = useCallback(async () => {
    if (!user) return;
    setLoadingClients(true);
    try {
      const params: Parameters<typeof reportsApi.clients>[0] = {
        establishmentId: user.establishmentId,
        period: clientPeriod,
        sortBy,
        top: 20,
      };
      if (clientPeriod !== "all") params.date = todayStr();
      const res = await reportsApi.clients(params);
      setTopClients(res.data);
    } catch { /* silent */ }
    finally { setLoadingClients(false); }
  }, [user, clientPeriod, sortBy]);

  // ── Load top professionals ────────────────────────────────────────────────
  const loadProfessionals = useCallback(async () => {
    if (!user) return;
    setLoadingProfs(true);
    try {
      const params: Parameters<typeof reportsApi.topProfessionals>[0] = {
        establishmentId: user.establishmentId,
        period: profPeriod,
        sortBy: profSortBy,
        top: 20,
      };
      if (profPeriod !== "all") params.date = todayStr();
      const res = await reportsApi.topProfessionals(params);
      setTopProfessionals(res.data);
    } catch { /* silent */ }
    finally { setLoadingProfs(false); }
  }, [user, profPeriod, profSortBy]);

  // ── Load commissions ─────────────────────────────────────────────────────
  const loadCommissions = useCallback(async () => {
    if (!user || !commDateFrom || !commDateTo) return;
    setLoadingCommissions(true);
    try {
      const res = await reportsApi.professionals({
        establishmentId: user.establishmentId,
        dateFrom: commDateFrom,
        dateTo: commDateTo,
      });
      setCommissions(res.data);
    } catch { /* silent */ }
    finally { setLoadingCommissions(false); }
  }, [user, commDateFrom, commDateTo]);

  useEffect(() => { if (tab === "revenue") loadRevenue(); }, [loadRevenue, tab]);
  useEffect(() => { if (tab === "clients") loadClients(); }, [loadClients, tab]);
  useEffect(() => { if (tab === "professionals") loadProfessionals(); }, [loadProfessionals, tab]);
  useEffect(() => { if (tab === "commissions") loadCommissions(); }, [loadCommissions, tab]);

  const maxServiceRevenue = revenue?.byService[0]?.revenue ?? 1;

  // ── Totais do relatório de comissões ─────────────────────────────────────
  const commTotalRevenue    = commissions.reduce((s, p) => s + p.totalRevenue, 0);
  const commTotalCommission = commissions.reduce((s, p) => s + p.totalCommission, 0);
  const commTotalNet        = commissions.reduce((s, p) => s + p.netEarnings, 0);
  const commTotalServices   = commissions.reduce((s, p) => s + p.servicesCount, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#1B1B1B]">Relatórios</h1>
        <p className="text-sm text-[#9B9B9B]">Análise de desempenho do estabelecimento</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-[#F5F5F5] p-1 rounded-xl w-fit overflow-x-auto">
        {(["revenue", "clients", "professionals", "commissions"] as ReportTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all shrink-0",
              tab === t
                ? "bg-white text-[#1B1B1B] shadow-sm"
                : "text-[#9B9B9B] hover:text-[#6B6B6B]"
            )}
          >
            {t === "revenue"
              ? <><TrendingUp size={14} /> Receita</>
              : t === "clients"
              ? <><Users size={14} /> Clientes</>
              : t === "professionals"
              ? <><UserCheck size={14} /> Profissionais</>
              : <><Scissors size={14} /> Comissões</>}
          </button>
        ))}
      </div>

      {/* ── Revenue tab ─────────────────────────────────────────────────── */}
      {tab === "revenue" && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium border-2 transition-colors shrink-0",
                  period === p
                    ? "border-[#1B1B1B] bg-[#1B1B1B] text-white"
                    : "border-black/10 text-[#6B6B6B] hover:border-[#1B1B1B]"
                )}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {loadingRevenue ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 bg-[#F5F5F5] rounded-2xl animate-pulse" />
                ))}
              </div>
              <div className="h-64 bg-[#F5F5F5] rounded-2xl animate-pulse" />
            </div>
          ) : !revenue || revenue.totalBookings === 0 ? (
            <EmptyState
              icon={BarChart2}
              title="Sem dados para o período"
              description="Realize agendamentos para ver as métricas aqui"
            />
          ) : (
            <>
              {/* KPIs principais */}
              <div className="grid grid-cols-2 gap-3">
                <KPICard icon={<TrendingUp size={18} className="text-[#EF9F27]" />}
                  label="Receita total" value={formatCurrency(revenue.totalRevenue)} accent />
                <KPICard icon={<Calendar size={18} className="text-blue-500" />}
                  label="Total de agendamentos" value={revenue.totalBookings.toString()} />
              </div>

              {/* Breakdown por status */}
              {(() => {
                const confirmed = revenue.totalBookings
                  - revenue.completedBookings - revenue.noShows - revenue.cancellations;
                const pct = (n: number) =>
                  revenue.totalBookings > 0
                    ? `${Math.round((n / revenue.totalBookings) * 100)}%`
                    : "0%";
                const statuses = [
                  { label: "Concluídos",      count: revenue.completedBookings, dot: "bg-green-400",  badge: "bg-green-100 text-green-700" },
                  { label: "Confirmados",      count: confirmed,                 dot: "bg-blue-400",   badge: "bg-blue-100 text-blue-700" },
                  { label: "Não compareceu",   count: revenue.noShows,           dot: "bg-gray-400",   badge: "bg-gray-100 text-gray-600" },
                  { label: "Cancelados",       count: revenue.cancellations,     dot: "bg-red-400",    badge: "bg-red-100 text-red-500" },
                ];
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {statuses.map(s => (
                      <div key={s.label} className="bg-white rounded-2xl border border-black/8 p-4">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                          <p className="text-xs text-[#9B9B9B] font-medium truncate">{s.label}</p>
                        </div>
                        <p className="text-xl font-bold text-[#1B1B1B] leading-tight">{s.count}</p>
                        <p className="text-xs text-[#9B9B9B] mt-0.5">{pct(s.count)} do total</p>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {revenue.byDay.length > 0 && (
                <div className="bg-white rounded-2xl border border-black/8 p-4">
                  <p className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wide mb-4">
                    Receita por dia
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={revenue.byDay} barSize={24}>
                      <CartesianGrid vertical={false} stroke="#F5F5F5" />
                      <XAxis dataKey="date"
                        tickFormatter={d => format(new Date(d + "T12:00:00"), "dd/MM")}
                        tick={{ fontSize: 11, fill: "#9B9B9B" }}
                        axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v => `R$${v}`}
                        tick={{ fontSize: 11, fill: "#9B9B9B" }}
                        axisLine={false} tickLine={false} width={48} />
                      <Tooltip content={<RevenueTooltip />} cursor={{ fill: "#FAEEDA", radius: 4 }} />
                      <Bar dataKey="revenue" fill="#EF9F27" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="bookings" fill="#1B1B1B" radius={[6, 6, 0, 0]} opacity={0.15} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                {revenue.byService.length > 0 && (
                  <div className="bg-white rounded-2xl border border-black/8 p-4">
                    <p className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wide mb-4">
                      Por serviço
                    </p>
                    <div className="space-y-3">
                      {revenue.byService.map(s => (
                        <div key={s.serviceId}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-[#1B1B1B] truncate pr-2">{s.name}</span>
                            <span className="text-sm font-bold text-[#EF9F27] shrink-0">
                              {formatCurrency(s.revenue)}
                            </span>
                          </div>
                          <div className="h-1.5 bg-[#F5F5F5] rounded-full overflow-hidden">
                            <div className="h-full bg-[#EF9F27] rounded-full transition-all duration-500"
                              style={{ width: `${(s.revenue / maxServiceRevenue) * 100}%` }} />
                          </div>
                          <p className="text-xs text-[#9B9B9B] mt-0.5">{s.count} atendimentos</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {revenue.byProfessional.length > 0 && (
                  <div className="bg-white rounded-2xl border border-black/8 p-4">
                    <p className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wide mb-4">
                      Por profissional
                    </p>
                    <div className="space-y-3">
                      {revenue.byProfessional.map(p => (
                        <div key={p.professionalId} className="flex items-center gap-3">
                          {p.photoUrl ? (
                            <img src={p.photoUrl} alt={p.name}
                              className="w-9 h-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#FAEEDA] flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-[#EF9F27]">{p.name.charAt(0)}</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1B1B1B] truncate">{p.name}</p>
                            <p className="text-xs text-[#9B9B9B]">{p.count} atendimentos</p>
                          </div>
                          <span className="text-sm font-bold text-[#EF9F27] shrink-0">
                            {formatCurrency(p.revenue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {bookings && (bookings.bySource.online + bookings.bySource.presencial + bookings.bySource.manual > 0) && (
                <div className="bg-white rounded-2xl border border-black/8 p-4">
                  <p className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wide mb-4">
                    Origem dos agendamentos
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Online", count: bookings.bySource.online, color: "bg-blue-100 text-blue-700" },
                      { label: "Presencial", count: bookings.bySource.presencial, color: "bg-amber-100 text-amber-700" },
                      { label: "Manual", count: bookings.bySource.manual, color: "bg-gray-100 text-gray-600" },
                    ].map(src => (
                      <div key={src.label} className="text-center">
                        <div className={cn("text-2xl font-bold rounded-xl py-3", src.color)}>
                          {src.count}
                        </div>
                        <p className="text-xs text-[#9B9B9B] mt-1">{src.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Clients tab ──────────────────────────────────────────────────── */}
      {tab === "clients" && (
        <>
          {/* Controles */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Período */}
            <div className="flex gap-1 bg-[#F5F5F5] p-1 rounded-xl overflow-x-auto">
              {(Object.keys(ALL_PERIOD_LABELS) as AllPeriod[]).map(p => (
                <button
                  key={p}
                  onClick={() => setClientPeriod(p)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0",
                    clientPeriod === p
                      ? "bg-white text-[#1B1B1B] shadow-sm"
                      : "text-[#9B9B9B] hover:text-[#6B6B6B]"
                  )}
                >
                  {ALL_PERIOD_LABELS[p]}
                </button>
              ))}
            </div>

            {/* Ordenação */}
            <button
              onClick={() => setSortBy(s => s === "visits" ? "spent" : "visits")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all shrink-0",
                "border-black/10 bg-white hover:border-[#1B1B1B]"
              )}
            >
              <ArrowUpDown size={14} className="text-[#EF9F27]" />
              {sortBy === "visits" ? "Por comparecimentos" : "Por valor gasto"}
            </button>
          </div>

          {/* Lista */}
          {loadingClients ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-16 bg-[#F5F5F5] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : topClients.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Sem clientes para o período"
              description="Os clientes aparecerão aqui conforme os atendimentos forem concluídos"
            />
          ) : (
            <div className="space-y-2">
              {topClients.map((client, idx) => (
                <ClientRankCard
                  key={client.clientId}
                  rank={idx + 1}
                  client={client}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Professionals tab ────────────────────────────────────────────── */}
      {tab === "professionals" && (
        <>
          {/* Controles */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Período */}
            <div className="flex gap-1 bg-[#F5F5F5] p-1 rounded-xl overflow-x-auto">
              {(Object.keys(ALL_PERIOD_LABELS) as AllPeriod[]).map(p => (
                <button
                  key={p}
                  onClick={() => setProfPeriod(p)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0",
                    profPeriod === p
                      ? "bg-white text-[#1B1B1B] shadow-sm"
                      : "text-[#9B9B9B] hover:text-[#6B6B6B]"
                  )}
                >
                  {ALL_PERIOD_LABELS[p]}
                </button>
              ))}
            </div>

            {/* Ordenação */}
            <button
              onClick={() => setProfSortBy(s => s === "services" ? "revenue" : "services")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all shrink-0",
                "border-black/10 bg-white hover:border-[#1B1B1B]"
              )}
            >
              <ArrowUpDown size={14} className="text-[#EF9F27]" />
              {profSortBy === "services" ? "Por atendimentos" : "Por receita"}
            </button>
          </div>

          {/* Lista */}
          {loadingProfs ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 bg-[#F5F5F5] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : topProfessionals.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="Sem atendimentos para o período"
              description="Os profissionais aparecerão aqui conforme os atendimentos forem concluídos"
            />
          ) : (
            <div className="space-y-2">
              {topProfessionals.map((prof, idx) => (
                <ProfessionalRankCard
                  key={prof.professionalId}
                  rank={idx + 1}
                  prof={prof}
                  sortBy={profSortBy}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Commissions tab ──────────────────────────────────────────────── */}
      {tab === "commissions" && (
        <>
          {/* Seletor de período personalizado */}
          <div className="bg-white rounded-2xl border border-black/8 p-4 space-y-3">
            <p className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wide">
              Período do relatório
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-xs text-[#6B6B6B] font-medium">De</label>
                <input
                  type="date"
                  value={commDateFrom}
                  max={commDateTo}
                  onChange={e => setCommDateFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-black/15 text-sm text-[#1B1B1B] focus:outline-none focus:border-[#1B1B1B] transition-colors"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs text-[#6B6B6B] font-medium">Até</label>
                <input
                  type="date"
                  value={commDateTo}
                  min={commDateFrom}
                  onChange={e => setCommDateTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-black/15 text-sm text-[#1B1B1B] focus:outline-none focus:border-[#1B1B1B] transition-colors"
                />
              </div>
            </div>

            {/* Atalhos de período */}
            <div className="flex gap-2 flex-wrap">
              {[
                { label: "Este mês", from: format(startOfMonth(today), "yyyy-MM-dd"), to: format(endOfMonth(today), "yyyy-MM-dd") },
                { label: "Semana atual",
                  from: format(new Date(today.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1))), "yyyy-MM-dd"),
                  to: format(new Date(new Date().setDate(new Date().getDate() + (7 - new Date().getDay()) % 7 || 7)), "yyyy-MM-dd") },
                { label: "Quinzena 1–15",
                  from: format(startOfMonth(new Date()), "yyyy-MM-dd"),
                  to: format(new Date(new Date().getFullYear(), new Date().getMonth(), 15), "yyyy-MM-dd") },
                { label: "Quinzena 16–fim",
                  from: format(new Date(new Date().getFullYear(), new Date().getMonth(), 16), "yyyy-MM-dd"),
                  to: format(endOfMonth(new Date()), "yyyy-MM-dd") },
              ].map(preset => (
                <button
                  key={preset.label}
                  onClick={() => { setCommDateFrom(preset.from); setCommDateTo(preset.to); }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                    commDateFrom === preset.from && commDateTo === preset.to
                      ? "border-[#1B1B1B] bg-[#1B1B1B] text-white"
                      : "border-black/10 text-[#6B6B6B] hover:border-[#1B1B1B]"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards de totais */}
          {!loadingCommissions && commissions.some(p => p.servicesCount > 0) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl border border-black/8 p-4">
                <p className="text-xs text-[#9B9B9B] mb-1">Serviços concluídos</p>
                <p className="text-xl font-bold text-[#1B1B1B]">{commTotalServices}</p>
              </div>
              <div className="bg-white rounded-2xl border border-black/8 p-4">
                <p className="text-xs text-[#9B9B9B] mb-1">Receita bruta</p>
                <p className="text-xl font-bold text-[#EF9F27]">{formatCurrency(commTotalRevenue)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-black/8 p-4">
                <p className="text-xs text-[#9B9B9B] mb-1">Total comissões</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(commTotalCommission)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-black/8 p-4">
                <p className="text-xs text-[#9B9B9B] mb-1">A pagar profissionais</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(commTotalNet)}</p>
              </div>
            </div>
          )}

          {/* Lista de profissionais */}
          {loadingCommissions ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 bg-[#F5F5F5] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : commissions.length === 0 || !commissions.some(p => p.servicesCount > 0) ? (
            <EmptyState
              icon={Scissors}
              title="Sem atendimentos no período"
              description="Os dados aparecerão aqui conforme os atendimentos forem concluídos"
            />
          ) : (
            <div className="space-y-3">
              {commissions
                .filter(p => p.servicesCount > 0)
                .sort((a, b) => b.totalRevenue - a.totalRevenue)
                .map(prof => (
                  <CommissionCard key={prof.professionalId} prof={prof} />
                ))}
              {/* Profissionais sem atendimento no período */}
              {commissions.some(p => p.servicesCount === 0) && (
                <details className="group">
                  <summary className="cursor-pointer text-xs text-[#9B9B9B] hover:text-[#6B6B6B] py-1 list-none flex items-center gap-1">
                    <span className="group-open:hidden">▶</span>
                    <span className="hidden group-open:inline">▼</span>
                    {commissions.filter(p => p.servicesCount === 0).length} profissional(is) sem atendimentos no período
                  </summary>
                  <div className="mt-2 space-y-2">
                    {commissions
                      .filter(p => p.servicesCount === 0)
                      .map(prof => (
                        <div key={prof.professionalId}
                          className="bg-white rounded-2xl border border-black/8 px-4 py-3 flex items-center gap-3 opacity-50">
                          <ProfAvatar name={prof.name} photoUrl={prof.photoUrl} />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[#1B1B1B]">{prof.name}</p>
                            <p className="text-xs text-[#9B9B9B]">Nenhum atendimento concluído neste período</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KPICard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; accent?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-black/8 p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-xs text-[#9B9B9B] font-medium">{label}</p>
      </div>
      <p className={cn("text-xl font-bold leading-tight", accent ? "text-[#EF9F27]" : "text-[#1B1B1B]")}>
        {value}
      </p>
      {sub && <p className="text-xs text-[#9B9B9B] mt-0.5">{sub}</p>}
    </div>
  );
}

const MEDAL: Record<number, { bg: string; text: string; icon: string }> = {
  1: { bg: "bg-amber-100",  text: "text-amber-600",  icon: "🥇" },
  2: { bg: "bg-gray-100",   text: "text-gray-600",   icon: "🥈" },
  3: { bg: "bg-orange-100", text: "text-orange-600", icon: "🥉" },
};

function ClientRankCard({
  rank, client,
}: {
  rank: number;
  client: TopClient;
}) {
  const medal = MEDAL[rank];
  const initials = client.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="bg-white rounded-2xl border border-black/8 px-4 py-3 flex items-center gap-3">
      {/* Rank badge */}
      {medal ? (
        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-lg", medal.bg)}>
          {medal.icon}
        </div>
      ) : (
        <div className="w-9 h-9 rounded-full bg-[#F5F5F5] flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-[#9B9B9B]">{rank}</span>
        </div>
      )}

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-[#FAEEDA] flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-[#EF9F27]">{initials}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#1B1B1B] text-sm truncate">{client.name}</p>
        <p className="text-xs text-[#9B9B9B]">{client.phone}</p>
      </div>

      {/* Métricas */}
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span className="text-sm font-bold text-[#EF9F27]">
          {formatCurrency(client.totalSpent)}
        </span>
        <span className="text-xs text-[#9B9B9B]">
          {client.visitCount} {client.visitCount === 1 ? "visita" : "visitas"}
        </span>
      </div>
    </div>
  );
}

// ── Professional rank card ────────────────────────────────────────────────────

function ProfessionalRankCard({
  rank, prof, sortBy,
}: {
  rank: number;
  prof: TopProfessional;
  sortBy: ProfSortBy;
}) {
  const medal = MEDAL[rank];
  const initials = prof.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
  const lastDate = prof.lastServiceAt
    ? format(new Date(prof.lastServiceAt), "dd/MM/yyyy", { locale: ptBR })
    : null;

  return (
    <div className="bg-white rounded-2xl border border-black/8 px-4 py-3 flex items-center gap-3">
      {/* Rank badge */}
      {medal ? (
        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-lg", medal.bg)}>
          {medal.icon}
        </div>
      ) : (
        <div className="w-9 h-9 rounded-full bg-[#F5F5F5] flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-[#9B9B9B]">{rank}</span>
        </div>
      )}

      {/* Avatar */}
      {prof.photoUrl ? (
        <img src={prof.photoUrl} alt={prof.name}
          className="w-9 h-9 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-[#FAEEDA] flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-[#EF9F27]">{initials}</span>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#1B1B1B] text-sm truncate">{prof.name}</p>
        <p className="text-xs text-[#9B9B9B] truncate">
          {prof.specialty ?? "Profissional"}
          {lastDate ? ` · último em ${lastDate}` : ""}
        </p>
      </div>

      {/* Métricas */}
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span className="text-sm font-bold text-[#EF9F27]">
          {sortBy === "revenue"
            ? formatCurrency(prof.totalRevenue)
            : `${prof.servicesCount} ${prof.servicesCount === 1 ? "atend." : "atend."}`}
        </span>
        <span className="text-xs text-[#9B9B9B]">
          {sortBy === "revenue"
            ? `${prof.servicesCount} atendimento${prof.servicesCount !== 1 ? "s" : ""}`
            : formatCurrency(prof.totalRevenue)}
        </span>
      </div>
    </div>
  );
}

// ── Commission card ───────────────────────────────────────────────────────────

function ProfAvatar({ name, photoUrl }: { name: string; photoUrl?: string }) {
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className="w-10 h-10 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="w-10 h-10 rounded-full bg-[#FAEEDA] flex items-center justify-center shrink-0">
      <span className="text-sm font-bold text-[#EF9F27]">{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

function commissionLabel(type: number, value: number): string {
  if (type === 1) return `${value}%`;
  if (type === 2) return formatCurrency(value);
  return "—";
}

function CommissionCard({ prof }: { prof: ProfessionalCommission }) {
  const hasAnyCommission = prof.serviceLines.some(l => l.commissionType !== 0 && l.commissionAmount > 0);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-black/8 p-4 space-y-3">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <ProfAvatar name={prof.name} photoUrl={prof.photoUrl} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#1B1B1B]">{prof.name}</p>
          <p className="text-xs text-[#9B9B9B]">
            {prof.servicesCount} atendimento{prof.servicesCount !== 1 ? "s" : ""} concluído{prof.servicesCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-bold text-[#EF9F27]">{formatCurrency(prof.totalRevenue)}</p>
          <p className="text-[11px] text-[#9B9B9B]">receita bruta</p>
        </div>
      </div>

      {/* Totais do profissional */}
      <div className="bg-[#F9F9F9] rounded-xl p-3 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs text-[#9B9B9B] mb-0.5">Receita bruta</p>
          <p className="text-sm font-bold text-[#1B1B1B]">{formatCurrency(prof.totalRevenue)}</p>
        </div>
        <div>
          <p className="text-xs text-[#9B9B9B] mb-0.5">Comissões</p>
          <p className="text-sm font-bold text-blue-600">
            {hasAnyCommission ? `− ${formatCurrency(prof.totalCommission)}` : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#9B9B9B] mb-0.5">A receber</p>
          <p className="text-sm font-bold text-green-600">{formatCurrency(prof.netEarnings)}</p>
        </div>
      </div>

      {/* Detalhamento por serviço */}
      {prof.serviceLines.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full text-left text-xs text-[#9B9B9B] hover:text-[#6B6B6B] flex items-center gap-1 py-0.5"
          >
            <span>{expanded ? "▼" : "▶"}</span>
            {expanded ? "Ocultar" : "Ver"} detalhes por serviço
          </button>

          {expanded && (
            <div className="mt-2 rounded-xl border border-black/8 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-[#F5F5F5]">
                  <tr>
                    <th className="text-left px-3 py-2 text-[#6B6B6B] font-semibold">Serviço</th>
                    <th className="text-center px-2 py-2 text-[#6B6B6B] font-semibold">Qtd</th>
                    <th className="text-right px-2 py-2 text-[#6B6B6B] font-semibold">Receita</th>
                    <th className="text-right px-2 py-2 text-[#6B6B6B] font-semibold">Comissão</th>
                    <th className="text-right px-3 py-2 text-[#6B6B6B] font-semibold">Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F5F5]">
                  {prof.serviceLines.map((line, i) => (
                    <tr key={i} className="bg-white">
                      <td className="px-3 py-2 text-[#1B1B1B] font-medium">
                        {line.serviceName}
                        {line.commissionType !== 0 && (
                          <span className="ml-1 text-blue-500">({commissionLabel(line.commissionType, line.commissionValue)})</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center text-[#6B6B6B]">{line.count}×</td>
                      <td className="px-2 py-2 text-right text-[#EF9F27] font-semibold">{formatCurrency(line.revenue)}</td>
                      <td className="px-2 py-2 text-right text-blue-600">
                        {line.commissionAmount > 0 ? `− ${formatCurrency(line.commissionAmount)}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-green-600 font-semibold">{formatCurrency(line.netAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!hasAnyCommission && (
        <p className="text-xs text-[#C4C4C4] text-center">
          Nenhum serviço com comissão configurada · configure em Serviços
        </p>
      )}
    </div>
  );
}
