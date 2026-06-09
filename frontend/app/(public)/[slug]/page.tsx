"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin, Phone, Clock, ChevronDown, ChevronUp, Calendar,
  Scissors, Sparkles, Flower2, Star, Navigation,
} from "lucide-react";
import { publicApi } from "@/lib/api";
import { formatCurrency, formatDuration } from "@/lib/utils";

interface Establishment {
  id: string; name: string; category: number; description?: string;
  coverImageUrl?: string; address?: string; phone: string;
}
interface Service {
  id: string; name: string; category?: string; durationMinutes: number;
  price: number; description?: string;
}
interface Professional {
  id: string; name: string; photoUrl?: string; specialty?: string;
  serviceIds: string[];
}
interface PageData {
  establishment: Establishment;
  services: Service[];
  professionals: Professional[];
}

const CATEGORY_LABELS: Record<number, string> = {
  0: "Estabelecimento", 1: "Barbearia", 2: "Salão de Beleza",
  3: "Esmalteria", 4: "Estética", 5: "Spa", 6: "Outro",
};

// Ícone e gradiente por categoria para o hero sem foto
const CATEGORY_HERO: Record<number, { icon: React.ReactNode; gradient: string }> = {
  0: { icon: <Star size={56} className="text-[#EF9F27] opacity-60" />, gradient: "from-[#1B1B1B] via-[#2d2d2d] to-[#1B1B1B]" },
  1: { icon: <Scissors size={56} className="text-[#EF9F27] opacity-60" />, gradient: "from-[#0f1923] via-[#1a2a35] to-[#0f1923]" },
  2: { icon: <Sparkles size={56} className="text-pink-400 opacity-60" />, gradient: "from-[#1a0d1e] via-[#2d1a3a] to-[#1a0d1e]" },
  3: { icon: <Flower2 size={56} className="text-rose-400 opacity-60" />, gradient: "from-[#1a0d14] via-[#2a1020] to-[#1a0d14]" },
  4: { icon: <Sparkles size={56} className="text-purple-400 opacity-60" />, gradient: "from-[#0d0d1a] via-[#1a1a2d] to-[#0d0d1a]" },
  5: { icon: <Flower2 size={56} className="text-teal-400 opacity-60" />, gradient: "from-[#0d1a1a] via-[#1a2d2d] to-[#0d1a1a]" },
  6: { icon: <Star size={56} className="text-[#EF9F27] opacity-60" />, gradient: "from-[#1B1B1B] via-[#2d2d2d] to-[#1B1B1B]" },
};

export default function EstablishmentPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    publicApi.getPage(slug)
      .then(r => {
        setData(r.data);
        // Abrir todas as categorias por padrão
        const cats = Array.from(new Set((r.data.services as Service[]).map(s => s.category ?? "Outros")));
        setOpenCategories(Object.fromEntries(cats.map(c => [c, true])));
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const openWizard = (serviceId?: string, professionalId?: string) => {
    const params = new URLSearchParams();
    if (serviceId) params.set("serviceId", serviceId);
    if (professionalId) params.set("professionalId", professionalId);
    router.push(`/${slug}/book?${params.toString()}`);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#EF9F27] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound || !data) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="relative mb-8">
          <p className="text-[120px] font-extrabold text-gray-100 leading-none select-none">404</p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
            </div>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Página não encontrada</h1>
        <p className="text-gray-500 text-sm mb-8">
          O estabelecimento <span className="font-mono font-medium text-gray-700">{slug}</span> não existe ou foi removido.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-5 py-2.5 text-sm font-medium transition">
            Ir para o início
          </Link>
          <button onClick={() => router.back()} className="flex items-center justify-center gap-2 border hover:bg-gray-50 text-gray-700 rounded-lg px-5 py-2.5 text-sm font-medium transition">
            Voltar
          </button>
        </div>
      </div>
    </div>
  );

  const { establishment, services, professionals } = data;
  const servicesByCategory = services.reduce<Record<string, Service[]>>((acc, s) => {
    const cat = s.category ?? "Outros";
    (acc[cat] ??= []).push(s);
    return acc;
  }, {});

  const hero = CATEGORY_HERO[establishment.category as number] ?? CATEGORY_HERO[0];
  const mapsUrl = establishment.address
    ? `https://maps.google.com/?q=${encodeURIComponent(establishment.address)}`
    : null;

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-28">
      {/* Hero */}
      <div className="relative w-full" style={{ aspectRatio: "16/7", maxHeight: 320 }}>
        {establishment.coverImageUrl ? (
          <img
            src={establishment.coverImageUrl}
            alt={establishment.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${hero.gradient} flex flex-col items-center justify-center gap-3`}>
            {hero.icon}
            <p className="text-[#EF9F27] text-xs font-semibold uppercase tracking-widest opacity-80">
              {CATEGORY_LABELS[establishment.category as number] ?? "Estabelecimento"}
            </p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <p className="text-[#EF9F27] text-xs font-semibold uppercase tracking-widest mb-1">
            {CATEGORY_LABELS[establishment.category as number] ?? "Estabelecimento"}
          </p>
          <h1 className="text-white text-2xl font-bold leading-tight drop-shadow-sm">{establishment.name}</h1>
          {establishment.address && (
            <p className="text-white/70 text-xs mt-1 flex items-center gap-1">
              <MapPin size={11} />
              {establishment.address}
            </p>
          )}
        </div>
      </div>

      {/* Info bar */}
      <div className="bg-white border-b border-black/5">
        {establishment.description && (
          <p className="px-4 pt-4 pb-2 text-sm text-[#6B6B6B] leading-relaxed">{establishment.description}</p>
        )}
        <div className="flex gap-3 px-4 py-3 overflow-x-auto">
          {establishment.phone && (
            <a
              href={`https://wa.me/${establishment.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-xl bg-[#FAFAF8] border border-black/8 text-xs font-medium text-[#1B1B1B] hover:border-[#EF9F27] transition-colors"
            >
              <Phone size={13} className="text-[#EF9F27]" />
              {establishment.phone}
            </a>
          )}
          {mapsUrl && establishment.address && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-xl bg-[#FAFAF8] border border-black/8 text-xs font-medium text-[#1B1B1B] hover:border-[#EF9F27] transition-colors max-w-[200px] truncate"
            >
              <Navigation size={13} className="text-[#EF9F27] shrink-0" />
              <span className="truncate">Ver no Maps</span>
            </a>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-6">
        {/* Profissionais */}
        {professionals.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-[#1B1B1B] mb-3">Profissionais</h2>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 snap-x">
              {professionals.map(p => (
                <button
                  key={p.id}
                  onClick={() => openWizard(undefined, p.id)}
                  className="flex flex-col items-center gap-2 min-w-[72px] snap-start text-center group"
                >
                  <div className="w-14 h-14 rounded-full bg-[#FAEEDA] flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-[#EF9F27] transition-colors">
                    {p.photoUrl ? (
                      <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[#EF9F27] font-bold text-xl">{p.name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#1B1B1B] leading-tight">{p.name}</p>
                    {p.specialty && <p className="text-[10px] text-[#6B6B6B]">{p.specialty}</p>}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Serviços por categoria (acordeão) */}
        {Object.keys(servicesByCategory).length > 0 && (
          <section>
            <h2 className="text-base font-bold text-[#1B1B1B] mb-3">Serviços</h2>
            <div className="space-y-2">
              {Object.entries(servicesByCategory).map(([cat, catServices]) => (
                <div key={cat} className="bg-white rounded-2xl border border-black/8 overflow-hidden">
                  <button
                    onClick={() => setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }))}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#1B1B1B] text-sm">{cat}</span>
                      <span className="text-xs text-[#6B6B6B] bg-[#F5F5F5] px-2 py-0.5 rounded-full">
                        {catServices.length}
                      </span>
                    </div>
                    {openCategories[cat]
                      ? <ChevronUp size={16} className="text-[#6B6B6B]" />
                      : <ChevronDown size={16} className="text-[#6B6B6B]" />}
                  </button>

                  {openCategories[cat] && (
                    <div className="border-t border-black/5 divide-y divide-black/5">
                      {catServices.map(s => (
                        <div key={s.id} className="flex items-center justify-between px-4 min-h-[56px] gap-3">
                          <div className="flex-1 py-3">
                            <p className="font-medium text-[#1B1B1B] text-sm leading-tight">{s.name}</p>
                            <p className="flex items-center gap-1 text-xs text-[#6B6B6B] mt-0.5">
                              <Clock size={11} />
                              {formatDuration(s.durationMinutes)}
                            </p>
                            {s.description && (
                              <p className="text-[11px] text-[#9B9B9B] mt-0.5 line-clamp-1">{s.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-bold text-[#EF9F27] text-sm">{formatCurrency(s.price)}</span>
                            <button
                              onClick={() => openWizard(s.id)}
                              className="h-9 px-4 bg-[#1B1B1B] text-white text-xs font-semibold rounded-lg hover:bg-[#2d2d2d] active:scale-95 transition-all"
                            >
                              Agendar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* FAB mobile */}
      <div className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-50">
        <button
          onClick={() => openWizard()}
          className="w-full h-14 bg-[#1B1B1B] text-white font-semibold text-base rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <Calendar size={20} />
          Agendar agora
        </button>
      </div>
    </div>
  );
}
