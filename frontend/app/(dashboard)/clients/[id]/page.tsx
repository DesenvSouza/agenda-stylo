"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, DollarSign, Scissors, Phone, Mail, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clientsApi } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "sonner";

interface ClientDetail {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  visitCount: number;
  lastVisitAt?: string;
  totalSpent: number;
  lastServiceName?: string;
  recentBookings: BookingSummary[];
}

interface BookingSummary {
  id: string;
  serviceName: string;
  professionalName: string;
  scheduledAt: string;
  status: number;
  servicePrice: number;
}

const STATUS: Record<number, { label: string; badge: string }> = {
  1: { label: "Pendente", badge: "bg-amber-100 text-amber-700" },
  2: { label: "Confirmado", badge: "bg-blue-100 text-blue-700" },
  3: { label: "Concluído", badge: "bg-green-100 text-green-700" },
  4: { label: "Cancelado", badge: "bg-red-100 text-red-500 line-through" },
  5: { label: "Não compareceu", badge: "bg-gray-100 text-gray-500" },
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    clientsApi.get(id)
      .then(r => {
        setClient(r.data);
        setNotes(r.data.notes ?? "");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const saveNotes = async () => {
    if (!client) return;
    setSavingNotes(true);
    try {
      await clientsApi.update(id, { notes, email: client.email });
      toast.success("Observações salvas");
    } catch {
      toast.error("Erro ao salvar observações");
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-[#EF9F27] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-24 text-[#9B9B9B]">
        <p>Cliente não encontrado</p>
      </div>
    );
  }

  const initials = client.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-[#F5F5F5] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-xl text-[#1B1B1B]">Perfil do cliente</h1>
      </div>

      {/* Avatar + info */}
      <div className="bg-white rounded-2xl border border-black/8 p-5 flex items-start gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[#FAEEDA] flex items-center justify-center shrink-0">
          <span className="text-2xl font-bold text-[#EF9F27]">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-xl text-[#1B1B1B] leading-tight">{client.name}</h2>
          <div className="flex flex-col gap-1 mt-2">
            <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#EF9F27]">
              <Phone size={14} />
              {client.phone}
            </a>
            {client.email && (
              <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#EF9F27]">
                <Mail size={14} />
                {client.email}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<Calendar size={18} className="text-[#EF9F27]" />}
          label="Visitas"
          value={client.visitCount.toString()}
        />
        <StatCard
          icon={<DollarSign size={18} className="text-[#EF9F27]" />}
          label="Total gasto"
          value={formatCurrency(client.totalSpent)}
        />
        <StatCard
          icon={<Scissors size={18} className="text-[#EF9F27]" />}
          label="Último serviço"
          value={client.lastServiceName ?? "—"}
          small
        />
      </div>

      {/* Observações */}
      <div className="bg-white rounded-2xl border border-black/8 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} className="text-[#9B9B9B]" />
          <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Observações</p>
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Anotações sobre preferências, alergias, histórico..."
          className="w-full min-h-[100px] text-sm text-[#1B1B1B] placeholder:text-[#C4C4C4] resize-none outline-none"
        />
        <button
          onClick={saveNotes}
          disabled={savingNotes}
          className="mt-2 w-full h-10 bg-[#1B1B1B] text-white text-sm font-semibold rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {savingNotes && <Loader2 size={14} className="animate-spin" />}
          Salvar observações
        </button>
      </div>

      {/* Histórico de visitas */}
      <div>
        <h3 className="font-semibold text-[#1B1B1B] mb-3">Histórico de visitas</h3>
        {client.recentBookings.length === 0 ? (
          <div className="text-center py-8 text-[#9B9B9B] text-sm">
            Nenhuma visita registrada
          </div>
        ) : (
          <div className="space-y-2">
            {client.recentBookings.map(b => {
              const s = STATUS[b.status] ?? STATUS[1];
              return (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl border border-black/8 px-4 py-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[#1B1B1B] truncate">{b.serviceName}</p>
                    <p className="text-xs text-[#9B9B9B]">
                      {b.professionalName} · {format(new Date(b.scheduledAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", s.badge)}>
                      {s.label}
                    </span>
                    <span className="text-xs font-semibold text-[#EF9F27]">
                      {formatCurrency(b.servicePrice)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, small }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-black/8 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-[10px] font-semibold text-[#9B9B9B] uppercase tracking-wide">{label}</p>
      </div>
      <p className={cn("font-bold text-[#1B1B1B] leading-tight", small ? "text-sm" : "text-lg")}>{value}</p>
    </div>
  );
}
