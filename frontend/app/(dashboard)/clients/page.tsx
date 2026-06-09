"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, ChevronRight } from "lucide-react";
import { clientsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  visitCount: number;
  lastVisitAt?: string;
}

export default function ClientsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const t = setTimeout(() => {
      clientsApi
        .list({ establishmentId: user.establishmentId, search, page: 1 })
        .then(r => setClients(r.data.items))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [user, search]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#1B1B1B]">Clientes</h1>
        <p className="text-sm text-[#9B9B9B]">Gerencie seus clientes</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9B9B9B]" />
        <input
          type="search"
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-black/15 text-sm bg-white focus:outline-none focus:border-[#EF9F27]"
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-black/8 divide-y divide-black/5 overflow-hidden">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-4">
              <div className="w-10 h-10 rounded-full bg-[#F5F5F5] animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-[#F5F5F5] rounded animate-pulse w-32" />
                <div className="h-3 bg-[#F5F5F5] rounded animate-pulse w-24" />
              </div>
              <div className="h-3 bg-[#F5F5F5] rounded animate-pulse w-16" />
            </div>
          ))
        ) : clients.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? "Nenhum cliente encontrado" : "Ainda sem clientes"}
            description={
              search
                ? "Tente outro nome ou telefone"
                : "Os clientes aparecem aqui após o primeiro agendamento"
            }
          />
        ) : (
          clients.map(c => (
            <button
              key={c.id}
              onClick={() => router.push(`/clients/${c.id}`)}
              className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-[#FAFAF8] active:bg-[#F5F5F5] transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[#FAEEDA] flex items-center justify-center shrink-0">
                <span className="text-[#EF9F27] font-bold text-sm">
                  {c.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-[#1B1B1B] truncate">{c.name}</p>
                <p className="text-xs text-[#9B9B9B]">{c.phone}</p>
              </div>
              <div className="text-right shrink-0 mr-1">
                <p className="text-sm font-semibold text-[#1B1B1B]">
                  {c.visitCount} {c.visitCount === 1 ? "visita" : "visitas"}
                </p>
                {c.lastVisitAt && (
                  <p className="text-xs text-[#9B9B9B]">
                    {formatDistanceToNow(new Date(c.lastVisitAt), { addSuffix: true, locale: ptBR })}
                  </p>
                )}
              </div>
              <ChevronRight size={16} className="text-[#C4C4C4] shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
