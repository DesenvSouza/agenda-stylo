"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import {
  Calendar, Home, User, BarChart2, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/professional",          icon: Home,      label: "Início" },
  { href: "/professional/bookings", icon: Calendar,  label: "Agendamentos" },
  { href: "/professional/profile",  icon: User,      label: "Meu Perfil" },
  { href: "/professional/report",   icon: BarChart2, label: "Relatório" },
];

export default function ProfessionalLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [estName, setEstName] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
    if (!isLoading && user && user.role !== "Profissional") {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  // Busca nome do estabelecimento para o header
  useEffect(() => {
    if (user?.role === "Profissional") {
      import("@/lib/api").then(({ professionalPortalApi }) => {
        professionalPortalApi.getEstablishment()
          .then((res) => setEstName(res.data.name))
          .catch(() => {});
      });
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
        <div className="w-8 h-8 border-4 border-[#EF9F27] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "Profissional") return null;

  return (
    <div className="flex min-h-screen bg-[#FAFAF8]">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-black/8 bg-white">
        <div className="px-5 py-6 border-b border-black/5">
          <p className="font-bold text-[#1B1B1B] text-lg">AgendaEstilo</p>
          {estName && (
            <p className="text-xs text-[#9B9B9B] mt-0.5 truncate">{estName}</p>
          )}
          <span className="mt-2 inline-block text-[10px] font-semibold bg-[#FAEEDA] text-[#EF9F27] px-2 py-0.5 rounded-full">
            Portal Profissional
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/professional" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-[#FAEEDA] text-[#EF9F27]"
                    : "text-[#6B6B6B] hover:bg-[#F5F5F5] hover:text-[#1B1B1B]"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-black/5">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors w-full"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 min-w-0 bg-[#FAFAF8] pb-24 lg:pb-8">
        {/* Header mobile */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-black/5 sticky top-0 z-10">
          <div>
            <p className="font-bold text-[#1B1B1B] text-sm">Portal Profissional</p>
            {estName && <p className="text-[10px] text-[#9B9B9B]">{estName}</p>}
          </div>
          <button onClick={logout} className="p-2 rounded-xl text-[#9B9B9B] hover:bg-[#F5F5F5]">
            <LogOut size={18} />
          </button>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-6 lg:px-8">{children}</div>
      </main>

      {/* Bottom nav mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-black/8 z-20 pb-safe">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/professional" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors",
                  active ? "text-[#EF9F27]" : "text-[#9B9B9B]"
                )}
              >
                <item.icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
