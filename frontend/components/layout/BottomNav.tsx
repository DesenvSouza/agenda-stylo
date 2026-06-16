"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart2, Calendar, Home, MoreHorizontal,
  Scissors, Settings, Users, UserRound, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Itens principais (sempre visíveis no nav) ────────────────────────────────
const mainItems = [
  { href: "/dashboard",  icon: Home,     label: "Home" },
  { href: "/bookings",   icon: Calendar, label: "Agenda" },
  { href: "/professionals", icon: UserRound, label: "Profissionais" },
  { href: "/clients",    icon: Users,    label: "Clientes" },
];

// ── Itens secundários (aparecem no sheet "Mais") ─────────────────────────────
const moreItems = [
  { href: "/services",  icon: Scissors,  label: "Serviços" },
  { href: "/reports",   icon: BarChart2, label: "Relatórios" },
  { href: "/settings",  icon: Settings,  label: "Configurações" },
];

const morePaths = moreItems.map((i) => i.href);

export function BottomNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  const isMoreActive = morePaths.some(
    (p) => pathname === p || (p !== "/" && pathname?.startsWith(p))
  );

  return (
    <>
      {/* ── Bottom nav bar ─────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-black/8">
        <div className="flex">
          {mainItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMore(false)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] transition-colors",
                  isActive ? "text-[#EF9F27]" : "text-[#6B6B6B]"
                )}
              >
                <Icon size={22} className="mb-0.5" />
                <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Botão Mais */}
          <button
            onClick={() => setShowMore((v) => !v)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] transition-colors",
              (showMore || isMoreActive) ? "text-[#EF9F27]" : "text-[#6B6B6B]"
            )}
          >
            {showMore
              ? <X size={22} className="mb-0.5" />
              : <MoreHorizontal size={22} className="mb-0.5" />}
            <span className={cn(
              "text-[10px] font-medium",
              (showMore || isMoreActive) && "font-semibold"
            )}>
              Mais
            </span>
          </button>
        </div>
      </nav>

      {/* ── Overlay ────────────────────────────────────────────── */}
      {showMore && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* ── Sheet "Mais" ───────────────────────────────────────── */}
      {showMore && (
        <div className="lg:hidden fixed bottom-[56px] left-0 right-0 z-50 bg-white rounded-t-2xl border-t border-black/8 shadow-xl">
          <div className="px-4 pt-4 pb-3">
            <p className="text-[10px] font-bold text-[#9B9B9B] uppercase tracking-widest mb-3">
              Mais opções
            </p>
            <div className="grid grid-cols-3 gap-3">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-2xl transition-colors active:scale-95",
                      isActive ? "bg-[#FAEEDA]" : "hover:bg-[#F5F5F5]"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center",
                      isActive ? "bg-[#EF9F27]" : "bg-[#F5F5F5]"
                    )}>
                      <Icon size={22} className={isActive ? "text-white" : "text-[#6B6B6B]"} />
                    </div>
                    <span className={cn(
                      "text-xs font-medium",
                      isActive ? "text-[#EF9F27] font-semibold" : "text-[#1B1B1B]"
                    )}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
