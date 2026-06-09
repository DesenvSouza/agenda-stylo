"use client";

import { useEffect, useState, useCallback } from "react";
import { BarChart2, DollarSign, Users, TrendingUp, Loader2 } from "lucide-react";
import { professionalPortalApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const PERIODS = [
  { value: "day",   label: "Hoje" },
  { value: "week",  label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "year",  label: "Ano" },
];

interface TopClient {
  clientId: string;
  name: string;
  phone: string;
  visitCount: number;
  totalSpent: number;
  lastVisit: string;
}

interface ReportData {
  period: string;
  revenue: number;
  count: number;
  topClients: TopClient[];
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function ProfessionalReportPage() {
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await professionalPortalApi.getReport(period);
      setData(res.data as ReportData);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <BarChart2 size={22} className="text-[#EF9F27]" />
        <h1 className="text-xl font-bold text-[#1B1B1B]">Meu Relatório</h1>
      </div>

      {/* Seletor de período */}
      <div className="flex gap-2 mb-5">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold border transition-colors",
              period === p.value
                ? "bg-[#1B1B1B] text-white border-[#1B1B1B]"
                : "bg-white text-[#6B6B6B] border-black/10 hover:border-black/20"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-[#EF9F27]" />
        </div>
      ) : !data ? null : (
        <>
          {/* Cards de métricas */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-white rounded-2xl border border-black/8 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center">
                  <DollarSign size={16} className="text-green-600" />
                </div>
                <p className="text-xs text-[#9B9B9B] font-medium">Receita</p>
              </div>
              <p className="text-xl font-bold text-[#1B1B1B]">{formatCurrency(data.revenue)}</p>
            </div>

            <div className="bg-white rounded-2xl border border-black/8 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                  <TrendingUp size={16} className="text-blue-600" />
                </div>
                <p className="text-xs text-[#9B9B9B] font-medium">Atendimentos</p>
              </div>
              <p className="text-xl font-bold text-[#1B1B1B]">{data.count}</p>
            </div>
          </div>

          {/* Ticket médio */}
          {data.count > 0 && (
            <div className="bg-[#FAEEDA]/50 rounded-2xl border border-[#EF9F27]/20 p-4 mb-5">
              <p className="text-xs text-[#9B9B9B] font-medium mb-1">Ticket médio</p>
              <p className="text-2xl font-bold text-[#EF9F27]">
                {formatCurrency(data.revenue / data.count)}
              </p>
            </div>
          )}

          {/* Top clientes */}
          {data.topClients.length > 0 && (
            <div className="bg-white rounded-2xl border border-black/8 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3.5 border-b border-black/5">
                <Users size={16} className="text-[#EF9F27]" />
                <p className="font-semibold text-[#1B1B1B] text-sm">Principais clientes</p>
              </div>
              <div className="divide-y divide-black/5">
                {data.topClients.map((client, idx) => (
                  <div key={client.clientId} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="w-7 h-7 rounded-full bg-[#F5F5F5] flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-[#9B9B9B]">{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#1B1B1B] text-sm truncate">{client.name}</p>
                      <p className="text-xs text-[#9B9B9B]">
                        {client.visitCount} visit{client.visitCount !== 1 ? "as" : "a"} · último: {formatDate(client.lastVisit)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-[#EF9F27]">{formatCurrency(client.totalSpent)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.topClients.length === 0 && (
            <div className="text-center py-10 text-[#9B9B9B]">
              <Users size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum atendimento concluído neste período</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
